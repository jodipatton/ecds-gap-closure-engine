// Typed tool surface exposed to the agent. Each tool is a pure async function
// over the request snapshot with a JSON Schema for OpenAI tool calling. Args
// are validated against that schema (see validate.ts) before execute runs, so
// executors can trust their input shape.

import { getRisk, getSnapshot } from '@/lib/data/snapshot';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { MEASURES, getMeasure } from '@/lib/hedis/measures';
import { recommendedActions } from './recommendations';
import { simulateMeasure } from '@/lib/analytics/projection';
import { buildCareGapLetter } from '@/lib/outreach/letter';
import { allContractValues } from '@/lib/contracts/vbc';
import { buildRoster } from '@/lib/rosters/roster';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/** Types the executor's args; validation upstream guarantees the shape. */
function defineTool<A>(def: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: A) => Promise<unknown>;
}): ToolDef {
  return { ...def, execute: (args) => def.execute(args as A) };
}

const normalizeMeasureId = (id: string) =>
  id.toUpperCase().replace('DSFE', 'DSF-E').replace('PNDE', 'PND-E');

export const tools: ToolDef[] = [
  defineTool<Record<string, never>>({
    name: 'list_measures',
    description: 'List all HEDIS ECDS measures the engine supports, with their data tier and domain.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return MEASURES.map((m) => ({
        id: m.id, name: m.name, dataTier: m.dataTier, domain: m.domain, description: m.description
      }));
    }
  }),
  defineTool<{ limit?: number }>({
    name: 'measures_with_most_gaps',
    description: 'Return the top N measures ranked by open gap count.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
      additionalProperties: false
    },
    async execute({ limit = 5 }) {
      const { results } = await getSnapshot();
      return [...results].sort((a, b) => b.gapCount - a.gapCount).slice(0, limit).map((r) => ({
        measureId: r.measureId,
        measureName: r.measureName,
        gapCount: r.gapCount,
        eligiblePopulation: r.eligiblePopulation,
        ratePct: r.rate,
        dataTier: r.dataTier
      }));
    }
  }),
  defineTool<{ measureId: string }>({
    name: 'measure_summary',
    description: 'Return computed ECDS results for a single measure by ID (e.g., HBD, BCS, FUM).',
    parameters: {
      type: 'object',
      properties: { measureId: { type: 'string' } },
      required: ['measureId'],
      additionalProperties: false
    },
    async execute({ measureId }) {
      const { results } = await getSnapshot();
      const found = results.find((r) => r.measureId === normalizeMeasureId(measureId));
      if (!found) return { error: `No result for ${measureId}. Run analytics first.` };
      return found;
    }
  }),
  defineTool<Record<string, never>>({
    name: 'ehr_platform_impact',
    description: 'Estimate gap-closure impact of connecting to each EHR platform across the provider directory.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return ehrPlatformGapImpact(await getSnapshot());
    }
  }),
  defineTool<Record<string, never>>({
    name: 'engagement_queue_summary',
    description: 'Summarize the engagement queue by reason (no-visit, no-pcp, gap-closeable).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      const { engagement: queue } = await getSnapshot();
      const byReason: Record<string, number> = {};
      for (const e of queue) byReason[e.queueReason] = (byReason[e.queueReason] ?? 0) + 1;
      return { total: queue.length, byReason };
    }
  }),
  defineTool<{ measureId: string; limit?: number }>({
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
      const snap = await getSnapshot();
      const id = normalizeMeasureId(measureId);
      return snap.gaps
        .filter((g) => g.measureId === id && (g.status === 'open-needs-clinical' || g.status === 'open-needs-document'))
        .slice(0, limit)
        .map((g) => {
          const m = snap.memberById.get(g.memberId);
          const a = snap.attributionByMember.get(g.memberId);
          const p = a?.pcp ? snap.providerByNpi.get(a.pcp.npi) : null;
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
  }),
  defineTool<{ measureId: string }>({
    name: 'measure_spec',
    description: 'Return the human-readable specification (eligibility, numerator, exclusions) for a measure.',
    parameters: {
      type: 'object',
      properties: { measureId: { type: 'string' } },
      required: ['measureId'],
      additionalProperties: false
    },
    async execute({ measureId }) {
      const spec = getMeasure(normalizeMeasureId(measureId));
      if (!spec) return { error: `Unknown measure ${measureId}` };
      return {
        id: spec.id,
        name: spec.name,
        domain: spec.domain,
        dataTier: spec.dataTier,
        description: spec.description
      };
    }
  }),
  defineTool<{ limit?: number }>({
    name: 'recommended_actions',
    description: 'Rank the highest-value next actions for the quality team (measure outreach, EHR connection, queue engagement) with illustrative dollar value.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
      additionalProperties: false
    },
    async execute({ limit = 5 }) {
      return recommendedActions(limit);
    }
  }),
  defineTool<{ measureId: string; closeCount: number }>({
    name: 'simulate_gap_closure',
    description: "Project a measure's rate and illustrative dollars captured if a given number of its open gaps were closed.",
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
      const { results } = await getSnapshot();
      const r = results.find((x) => x.measureId === normalizeMeasureId(measureId));
      if (!r) return { error: `No result for ${measureId}. Run analytics first.` };
      return { measureId: r.measureId, currentRate: r.rate, openGaps: r.gapCount, ...simulateMeasure(r, closeCount) };
    }
  }),
  defineTool<{ memberId: string; measureId: string }>({
    name: 'care_gap_letter',
    description: 'Generate a member-facing care-gap outreach letter for a member and measure.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' }, measureId: { type: 'string' } },
      required: ['memberId', 'measureId'],
      additionalProperties: false
    },
    async execute({ memberId, measureId }) {
      return buildCareGapLetter(memberId, normalizeMeasureId(measureId));
    }
  }),
  defineTool<{ memberId: string }>({
    name: 'member_360',
    description: 'Return a 360 view of one member: demographics, attribution, open gaps, and clinical-data footprint.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' } },
      required: ['memberId'],
      additionalProperties: false
    },
    async execute({ memberId }) {
      const snap = await getSnapshot();
      const id = memberId.toUpperCase();
      const member = snap.memberById.get(id);
      if (!member) return { error: `Member ${memberId} not found` };
      const memberGaps = snap.gaps.filter((g) => g.memberId === id);
      return {
        member,
        attribution: snap.attributionByMember.get(id) ?? null,
        openGaps: memberGaps
          .filter((g) => g.status.startsWith('open-'))
          .map((g) => ({ measureId: g.measureId, status: g.status, missingDataElement: g.missingDataElement })),
        closedGaps: memberGaps.filter((g) => g.status.startsWith('closed-')).map((g) => g.measureId),
        clinicalFootprint: {
          claims: snap.claimsByMember.get(id)?.length ?? 0,
          observations: snap.observations.filter((o) => o.memberId === id).length,
          conditions: snap.conditionsByMember.get(id)?.length ?? 0,
          medications: snap.medications.filter((m) => m.memberId === id).length,
          documents: snap.documents.filter((d) => d.memberId === id).length
        }
      };
    }
  }),
  defineTool<Record<string, never>>({
    name: 'risk_summary',
    description: 'Plan-wide Medicare risk-adjustment (CMS-HCC / RAF) summary: average RAF, suspected-HCC recapture opportunity, and illustrative revenue.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      const r = await getRisk();
      const { members: _members, ...rest } = r;
      return rest;
    }
  }),
  defineTool<{ memberId: string }>({
    name: 'member_risk',
    description: 'Per-member RAF detail: demographic factor, documented HCCs, suspected (recapturable) HCCs, and revenue opportunity.',
    parameters: {
      type: 'object',
      properties: { memberId: { type: 'string' } },
      required: ['memberId'],
      additionalProperties: false
    },
    async execute({ memberId }) {
      const r = await getRisk();
      const found = r.members.find((m) => m.memberId === memberId.toUpperCase());
      return found ?? { error: `No member ${memberId}` };
    }
  }),
  defineTool<{ audience: 'payer' | 'provider'; npi?: string; limit?: number }>({
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
      const result = await buildRoster(audience, npi);
      return { ...result, rows: result.rows.slice(0, limit) };
    }
  }),
  defineTool<Record<string, never>>({
    name: 'contract_value',
    description: 'Value-based contract economics across all provider contracts: earned incentives, open opportunity, quality withhold at risk, risk recapture, and total value at stake.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      const values = await allContractValues();
      return {
        contractCount: values.length,
        totalValueAtStake: values.reduce((s, v) => s + v.totalValueAtStake, 0),
        totalEarnedToDate: values.reduce((s, v) => s + v.earnedToDate, 0),
        totalOpenOpportunity: values.reduce((s, v) => s + v.openOpportunity, 0),
        totalWithholdAtRisk: values.reduce((s, v) => s + v.withholdAtRisk, 0),
        totalRiskRecapture: values.reduce((s, v) => s + v.riskRecapture, 0),
        contracts: values.map((v) => ({
          organizationName: v.contract.organizationName,
          model: v.contract.model,
          measureIds: v.contract.measureIds,
          panelSize: v.panelSize,
          avgRatePct: v.avgRatePct,
          targetRatePct: v.contract.targetRatePct,
          earnedToDate: v.earnedToDate,
          openOpportunity: v.openOpportunity,
          qualityAtRisk: v.qualityAtRisk,
          riskRecapture: v.riskRecapture,
          totalValueAtStake: v.totalValueAtStake
        }))
      };
    }
  })
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
