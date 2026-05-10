// Typed tool surface exposed to the agent. Each tool is a pure async function
// over the repository/engine layer with a JSON Schema for OpenAI tool calling.

import { repos } from '@/lib/data/repository';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { MEASURES, getMeasure } from '@/lib/hedis/measures';

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
