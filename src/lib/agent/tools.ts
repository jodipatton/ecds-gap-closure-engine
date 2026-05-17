// Typed tool surface exposed to the agent. Each tool is a pure async function
// over the repository/engine layer with a JSON Schema for OpenAI tool calling.

import { repos } from '@/lib/data/repository';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { MEASURES, getMeasure } from '@/lib/hedis/measures';
import { recommendedActions } from './recommendations';
import { simulateMeasure } from '@/lib/analytics/projection';
import { buildCareGapLetter } from '@/lib/outreach/letter';
import { readSeedSummary } from '@/lib/data/repository';
import { planRiskSummary } from '@/lib/risk/raf';
import { buildRoster } from '@/lib/rosters/roster';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<unknown>;
}

export const tools: ToolDef[] = [
  {
    name: 'list_measures',
    description: 'List all HEDIS ECDS measures the engine supports, with their data tier and domain.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return MEASURES.map((m) => ({
        id: m.id, name: m.name, dataTier: m.dataTier, domain: m.domain, description: m.description
      }));
    }
  },
  {
    name: 'measures_with_most_gaps',
    description: 'Return the top N measures ranked by open gap count.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
      additionalProperties: false
    },
    async execute({ limit = 5 }) {
      const results = await repos.hedisResults.list();
      return [...results].sort((a, b) => b.gapCount - a.gapCount).slice(0, limit).map((r) => ({
        measureId: r.measureId,
        measureName: r.measureName,
        gapCount: r.gapCount,
        eligiblePopulation: r.eligiblePopulation,
        ratePct: r.rate,
        dataTier: r.dataTier
      }));
    }
  },
  {
    name: 'measure_summary',
    description: 'Return computed ECDS results for a single measure by ID (e.g., HBD, BCS, FUM).',
    parameters: {
      type: 'object',
      properties: { measureId: { type: 'string' } },
      required: ['measureId'],
      additionalProperties: false
    },
    async execute({ measureId }) {
      const results = await repos.hedisResults.list();
      const found = results.find((r) => r.measureId.toUpperCase() === String(measureId).toUpperCase());
      if (!found) return { error: `No result for ${measureId}. Run the engine first.` };
      return found;
    }
  },
  {
    name: 'ehr_platform_impact',
    description: 'Estimate gap-closure impact of connecting to each EHR platform across the provider directory.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return await ehrPlatformGapImpact();
    }
  },
  {
    name: 'engagement_queue_summary',
    description: 'Summarize the engagement queue by reason (no-visit, no-pcp, gap-closeable).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      const queue = await repos.engagement.list();
      const byReason: Record<string, number> = {};
      for (const e of queue) byReason[e.queueReason] = (byReason[e.queueReason] ?? 0) + 1;
      return { total: queue.length, byReason };
    }
  },
  {
    name: 'members_missing_clinical_data',
    description: 'For a given measure, return members whose gap is open because clinical data (Tier 2/3) is missing — and the specific data element required.',
    parameters: {
      type: 'object',
      properties: {
        measureId: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
      },
      required: ['measureId'],
      additionalProperties: false
    },
    async execute({ measureId, limit = 25 }) {
      const [gaps, members, attribution, providers] = await Promise.all([
        repos.gaps.list(), repos.members.list(), repos.attribution.list(), repos.providers.list()
      ]);
      const memById = new Map(members.map((m) => [m.id, m]));
      const attrById = new Map(attribution.map((a) => [a.memberId, a]));
      const providerByNpi = new Map(providers.map((p) => [p.npi, p]));
      return gaps
        .filter((g) => g.measureId.toUpperCase() === String(measureId).toUpperCase() && (g.status === 'open-needs-clinical' || g.status === 'open-needs-document'))
        .slice(0, limit)
        .map((g) => {
          const m = memById.get(g.memberId);
          const a = attrById.get(g.memberId);
          const p = a?.pcp ? providerByNpi.get(a.pcp.npi) : null;
          return {
            memberId: g.memberId,
            memberName: m?.name,
            missingDataElement: g.missingDataElement,
            attributedPcp: a?.pcp?.name ?? null,
            ehrPlatform: p?.ehrPlatform ?? null,
            fhirEndpointUrl: p?.fhirEndpointUrl ?? null
          };
        });
    }
  },
  {
    name: 'measure_spec',
    description: 'Return the human-readable specification (eligibility, numerator, exclusions) for a measure.',
    parameters: {
      type: 'object',
      properties: { measureId: { type: 'string' } },
      required: ['measureId'],
      additionalProperties: false
    },
    async execute({ measureId }) {
      const spec = getMeasure(String(measureId).toUpperCase());
      if (!spec) return { error: `Unknown measure ${measureId}` };
      return {
        id: spec.id,
        name: spec.name,
        domain: spec.domain,
        dataTier: spec.dataTier,
        description: spec.description
      };
    }
  },
  {
    name: 'recommended_actions',
    description: 'Rank the highest-value next actions for the quality team (measure outreach, EHR connection, queue engagement) with illustrative dollar value.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
      additionalProperties: false
    },
    async execute({ limit = 5 }) {
      return await recommendedActions(limit);
    }
  },
  {
    name: 'simulate_gap_closure',
    description: 'Project a measure\'s rate and illustrative dollars captured if a given number of its open gaps were closed.',
    parameters: {
      type: 'object',
      properties: {
        measureId: { type: 'string' },
        closeCount: { type: 'integer', minimum: 0 }
      },
      required: ['measureId', 'closeCount'],
      additionalProperties: false
    },
    async execute({ measureId, closeCount }) {
      const results = await repos.hedisResults.list();
      const r = results.find((x) => x.measureId.toUpperCase() === String(measureId).toUpperCase());
      if (!r) return { error: `No result for ${measureId}. Run the engine first.` };
      return { measureId: r.measureId, currentRate: r.rate, openGaps: r.gapCount, ...simulateMeasure(r, Number(closeCount)) };
    }
  },
  {
    name: 'care_gap_letter',
    description: 'Generate a member-facing care-gap outreach letter for a member and measure.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' }, measureId: { type: 'string' } },
      required: ['memberId', 'measureId'],
      additionalProperties: false
    },
    async execute({ memberId, measureId }) {
      return await buildCareGapLetter(String(memberId), String(measureId));
    }
  },
  {
    name: 'member_360',
    description: 'Return a 360 view of one member: demographics, attribution, open gaps, and clinical-data footprint.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' } },
      required: ['memberId'],
      additionalProperties: false
    },
    async execute({ memberId }) {
      const id = String(memberId);
      const [members, attribution, gaps, claims, obs, cond, rx, docs] = await Promise.all([
        repos.members.list(), repos.attribution.list(), repos.gaps.list(),
        repos.claims.list(), repos.observations.list(), repos.conditions.list(),
        repos.medications.list(), repos.documents.list()
      ]);
      const member = members.find((m) => m.id === id);
      if (!member) return { error: `Member ${id} not found` };
      const memberGaps = gaps.filter((g) => g.memberId === id);
      return {
        member,
        attribution: attribution.find((a) => a.memberId === id) ?? null,
        openGaps: memberGaps.filter((g) => g.status.startsWith('open-')).map((g) => ({ measureId: g.measureId, status: g.status, missingDataElement: g.missingDataElement })),
        closedGaps: memberGaps.filter((g) => g.status.startsWith('closed-')).map((g) => g.measureId),
        clinicalFootprint: {
          claims: claims.filter((c) => c.memberId === id).length,
          observations: obs.filter((o) => o.memberId === id).length,
          conditions: cond.filter((c) => c.memberId === id).length,
          medications: rx.filter((m) => m.memberId === id).length,
          documents: docs.filter((d) => d.memberId === id).length
        }
      };
    }
  },
  {
    name: 'risk_summary',
    description: 'Plan-wide Medicare risk-adjustment (CMS-HCC / RAF) summary: average RAF, suspected-HCC recapture opportunity, and illustrative revenue.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      const [members, conditions, claims, summary] = await Promise.all([
        repos.members.list(), repos.conditions.list(), repos.claims.list(), readSeedSummary()
      ]);
      const r = planRiskSummary(members, conditions, claims, summary?.measurementYear ?? new Date().getFullYear());
      const { members: _m, ...rest } = r;
      return rest;
    }
  },
  {
    name: 'member_risk',
    description: 'Per-member RAF detail: demographic factor, documented HCCs, suspected (recapturable) HCCs, and revenue opportunity.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' } },
      required: ['memberId'],
      additionalProperties: false
    },
    async execute({ memberId }) {
      const [members, conditions, claims, summary] = await Promise.all([
        repos.members.list(), repos.conditions.list(), repos.claims.list(), readSeedSummary()
      ]);
      const r = planRiskSummary(members, conditions, claims, summary?.measurementYear ?? new Date().getFullYear());
      const found = r.members.find((m) => m.memberId === String(memberId));
      return found ?? { error: `No member ${memberId}` };
    }
  },
  {
    name: 'generate_roster',
    description: 'Generate an actionable roster (open gaps + suspected HCCs). audience "payer" spans the population; "provider" requires an NPI and is panel-scoped.',
    parameters: {
      type: 'object',
      properties: {
        audience: { type: 'string', enum: ['payer', 'provider'] },
        npi: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
      },
      required: ['audience'],
      additionalProperties: false
    },
    async execute({ audience, npi, limit = 25 }) {
      if (audience === 'provider' && !npi) return { error: 'npi is required for a provider roster' };
      const result = await buildRoster(audience === 'provider' ? 'provider' : 'payer', npi);
      return { ...result, rows: result.rows.slice(0, limit) };
    }
  }
];

export const toolMap = new Map(tools.map((t) => [t.name, t]));

export function openAiToolSchema() {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}
