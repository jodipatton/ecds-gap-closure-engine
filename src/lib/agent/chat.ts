// Agent chat orchestrator. Tool-call loop against OpenAI when OPENAI_API_KEY
// is present; otherwise a deterministic table-driven router that matches the
// user's question to a tool and renders the structured result, so the keyless
// demo covers every tool the model path does.

import OpenAI from 'openai';
import { MEASURE_IDS } from '@/lib/hedis/measures';
import { openAiToolSchema, toolMap } from './tools';
import { validateArgs } from './validate';
import { money } from '@/lib/shared/format';

const SYSTEM_PROMPT = `You are the ECDS Gap Closure agent for a health-plan demo.
You have tools that read computed HEDIS ECDS results, the engagement queue,
contract economics, risk adjustment, and the provider/EHR roster. Always call
tools to ground answers in actual data — never invent measure rates or member
counts. Cite measure IDs (${MEASURE_IDS.join(', ')}) and EHR platforms verbatim
from tool results. When the user asks about gap-closure impact of connecting to
an EHR, use ehr_platform_impact; for contract dollars use contract_value. Reply
concisely (≤120 words) unless the user asks for detail.`;

// Accept optional-hyphen variants (DSFE for DSF-E, etc.).
const MEASURE_RE = new RegExp(
  `\\b(${MEASURE_IDS.map((id) => id.replace(/-/g, '-?')).join('|')})\\b`,
  'i'
);
const MEMBER_RE = /\bM-?(\d{4,6})\b/i;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolCallId?: string;
}

export interface ChatTurnResult {
  reply: string;
  toolInvocations: Array<{ name: string; args: unknown; result: unknown }>;
  mode: 'openai' | 'fallback';
}

function normalizeMeasureId(raw: string): string {
  return raw.toUpperCase().replace('DSFE', 'DSF-E').replace('PNDE', 'PND-E');
}

function memberId(text: string): string | null {
  const m = text.match(MEMBER_RE);
  return m ? `M${m[1].padStart(5, '0')}` : null;
}

interface Route {
  tool: string;
  /** Return tool args when this route matches, else null. */
  match: (lower: string, text: string) => Record<string, unknown> | null;
  render: (result: never, args: Record<string, unknown>) => string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const ROUTES: Route[] = [
  {
    tool: 'care_gap_letter',
    match: (lower, text) => {
      if (!lower.includes('letter')) return null;
      const member = memberId(text);
      const measure = text.match(MEASURE_RE);
      return member && measure ? { memberId: member, measureId: normalizeMeasureId(measure[1]) } : null;
    },
    render: (r: any) => (r.error ? r.error : `Care-gap letter for ${r.memberName} (${r.measureId}) — "${r.subject}":\n\n${r.body}`)
  },
  {
    tool: 'member_risk',
    match: (lower, text) => {
      const member = memberId(text);
      return member && /\b(risk|raf|hcc)\b/.test(lower) ? { memberId: member } : null;
    },
    render: (r: any) =>
      r.error
        ? r.error
        : `${r.memberId}: current RAF ${r.currentRaf}, ${r.documentedHccs?.length ?? 0} documented HCCs, ${r.suspectedHccs?.length ?? 0} suspected — ${money(r.annualRevenueOpportunity ?? 0)} recapture opportunity.`
  },
  {
    tool: 'member_360',
    match: (_lower, text) => {
      const member = memberId(text);
      return member ? { memberId: member } : null;
    },
    render: (r: any) =>
      r.error
        ? r.error
        : `${r.member.name} (${r.member.id}): ${r.openGaps.length} open gaps${
            r.openGaps.length ? ` (${r.openGaps.map((g: any) => g.measureId).join(', ')})` : ''
          }, ${r.closedGaps.length} closed. PCP: ${r.attribution?.pcp?.name ?? 'none'}. Clinical footprint: ${r.clinicalFootprint.claims} claims, ${r.clinicalFootprint.observations} observations, ${r.clinicalFootprint.conditions} conditions.`
  },
  {
    tool: 'contract_value',
    match: (lower) =>
      /\b(contract|vbc|value at stake|withhold|value-based)\b/.test(lower) ? {} : null,
    render: (r: any) =>
      r.contractCount === 0
        ? 'No contracts yet — seed and run analytics first.'
        : `${r.contractCount} value-based contracts. Total value at stake ${money(r.totalValueAtStake)}: ${money(r.totalOpenOpportunity)} open gap incentives, ${money(r.totalWithholdAtRisk)} quality withhold exposure, ${money(r.totalRiskRecapture)} risk recapture. Earned to date: ${money(r.totalEarnedToDate)}. Largest: ${r.contracts[0]?.organizationName} (${r.contracts[0]?.model}, ${money(r.contracts[0]?.totalValueAtStake ?? 0)} at stake).`
  },
  {
    tool: 'simulate_gap_closure',
    match: (lower, text) => {
      const measure = text.match(MEASURE_RE);
      const count = lower.match(/\bclos(?:e|ing)\s+(\d+)|\b(\d+)\s+gaps?\b/);
      if (!measure || !(lower.includes('simulate') || lower.includes('what if') || count)) return null;
      const n = count ? Number(count[1] ?? count[2]) : NaN;
      return Number.isFinite(n)
        ? { measureId: normalizeMeasureId(measure[1]), closeCount: n }
        : null;
    },
    render: (r: any) =>
      r.error
        ? r.error
        : `Closing ${r.closed} ${r.measureId} gaps moves the rate ${r.currentRate}% → ${r.projectedRate}% (+${r.rateDelta} pts) and captures ${money(r.dollarsCaptured)}.`
  },
  {
    tool: 'risk_summary',
    match: (lower) => (/\b(risk|raf|hcc|recapture)\b/.test(lower) ? {} : null),
    render: (r: any) =>
      `Plan risk: avg RAF ${r.avgCurrentRaf}, ${r.membersWithSuspectedGap} members with suspected HCC gaps, ${money(r.totalRevenueOpportunity)} recapture opportunity.`
  },
  {
    tool: 'generate_roster',
    match: (lower) => (/\b(roster|worklist)\b/.test(lower) ? { audience: 'payer', limit: 10 } : null),
    render: (r: any) =>
      r.error
        ? r.error
        : `${r.scope}: ${r.rowCount} actionable members. Top: ${r.rows
            .slice(0, 5)
            .map((x: any) => `${x.memberName} (${x.openGapCount} gaps${x.suspectedHccCount ? `, ${x.suspectedHccCount} HCC` : ''})`)
            .join('; ')}. Full roster on /rosters.`
  },
  {
    tool: 'recommended_actions',
    match: (lower) =>
      /\b(recommend|next action|what should|where should|prioritize|opportunit|dollar)\b/.test(lower)
        ? { limit: 4 }
        : null,
    render: (r: any) =>
      (r as any[]).length === 0
        ? 'No recommendations yet — run analytics first.'
        : `Highest-value next actions:\n${(r as any[])
            .map((a) => `• ${a.title} — ~${money(a.estimatedValue)}. ${a.detail}`)
            .join('\n')}`
  },
  {
    tool: 'measures_with_most_gaps',
    match: (lower) =>
      lower.includes('most gap') || lower.includes('biggest gap') || lower.includes('top gap') || lower.includes('which measures')
        ? { limit: 5 }
        : null,
    render: (r: any) =>
      `Top measures by open gap count:\n${(r as any[])
        .map((x) => `• ${x.measureId} (${x.measureName}) — ${x.gapCount} open gaps, rate ${x.ratePct}%`)
        .join('\n')}`
  },
  {
    tool: 'ehr_platform_impact',
    match: (lower) =>
      /\b(ehr|epic|cerner|oracle|athena|platform|connect)\b/.test(lower) ? {} : null,
    render: (r: any) => {
      const top = (r as any[])[0];
      return top
        ? `Connecting to ${top.platform} would address ${top.openGaps} open gaps (${top.sharePct}% of plan-wide gaps) across ${top.orgCount} provider organizations covering ${top.memberCount} members.`
        : 'No EHR impact data yet — run analytics first.';
    }
  },
  {
    tool: 'engagement_queue_summary',
    match: (lower) => (/\b(engagement|outreach|queue)\b/.test(lower) ? {} : null),
    render: (r: any) =>
      `Engagement queue: ${r.total} members. By reason: ${Object.entries(r.byReason)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}.`
  },
  {
    tool: 'members_missing_clinical_data',
    match: (lower, text) => {
      const measure = text.match(MEASURE_RE);
      return measure && (lower.includes('missing') || lower.includes('clinical data') || lower.includes('need'))
        ? { measureId: normalizeMeasureId(measure[1]), limit: 5 }
        : null;
    },
    render: (r: any, args) =>
      `Members on ${args.measureId} needing clinical data:\n${(r as any[])
        .map((m) => `• ${m.memberName} — ${m.missingDataElement} (PCP: ${m.attributedPcp ?? 'none'}, EHR: ${m.ehrPlatform ?? '—'})`)
        .join('\n')}`
  },
  {
    tool: 'measure_spec',
    match: (lower, text) => {
      const measure = text.match(MEASURE_RE);
      return measure && /\b(spec|criteria|numerator|denominator|eligib)\w*/.test(lower)
        ? { measureId: normalizeMeasureId(measure[1]) }
        : null;
    },
    render: (r: any) => (r.error ? r.error : `${r.id} — ${r.name} (${r.dataTier}, ${r.domain}): ${r.description}`)
  },
  {
    tool: 'measure_summary',
    match: (_lower, text) => {
      const measure = text.match(MEASURE_RE);
      return measure ? { measureId: normalizeMeasureId(measure[1]) } : null;
    },
    render: (r: any, args) =>
      r.error
        ? r.error
        : `${args.measureId} (${r.measureName}, ${r.dataTier}): ${r.combinedNumerator}/${r.combinedNumerator + r.gapCount} = ${r.rate}%. Closed by claims: ${r.numeratorFromClaims}, by clinical: ${r.numeratorFromClinical}. Open gaps: ${r.gapCount}.`
  },
  {
    tool: 'list_measures',
    match: (lower) => (/\b(list|measures|what)\b/.test(lower) ? {} : null),
    render: (r: any) =>
      `The engine covers ${(r as any[]).length} measures across three tiers:\n${(r as any[])
        .map((m) => `• ${m.id} — ${m.name} (${m.dataTier})`)
        .join('\n')}`
  }
];
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fallbackTurn(userText: string): Promise<ChatTurnResult> {
  const lower = userText.toLowerCase();
  for (const route of ROUTES) {
    const args = route.match(lower, userText);
    if (!args) continue;
    const tool = toolMap.get(route.tool);
    if (!tool) continue;
    const validated = validateArgs(tool.parameters, args);
    if (!validated.ok) continue;
    const result = await tool.execute(validated.value);
    return {
      reply: route.render(result as never, validated.value),
      toolInvocations: [{ name: route.tool, args: validated.value, result }],
      mode: 'fallback'
    };
  }
  return {
    reply:
      'Try asking: "Where\'s our biggest dollar opportunity?", "What\'s the gap-closure impact of connecting to Epic?", "Show the value at stake in our VBC contracts", "Tell me about HBD", or "Who is missing clinical data for HBD?"',
    toolInvocations: [],
    mode: 'fallback'
  };
}

export async function chatTurn(history: ChatMessage[], userText: string): Promise<ChatTurnResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackTurn(userText);

  const client = new OpenAI({ apiKey });
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.ChatCompletionMessageParam),
    { role: 'user', content: userText }
  ];
  const invocations: ChatTurnResult['toolInvocations'] = [];

  for (let step = 0; step < 4; step++) {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages,
      tools: openAiToolSchema(),
      tool_choice: 'auto'
    });
    const msg = completion.choices[0].message;
    messages.push(msg);
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        const tool = toolMap.get(call.function.name);
        let result: unknown;
        let args: unknown = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
          if (!tool) {
            result = { error: `Unknown tool ${call.function.name}` };
          } else {
            const validated = validateArgs(tool.parameters, args);
            if (!validated.ok) {
              result = { error: `Invalid arguments: ${validated.error}` };
            } else {
              args = validated.value;
              result = await tool.execute(validated.value);
            }
          }
        } catch (err) {
          result = { error: err instanceof Error ? err.message : 'tool error' };
        }
        invocations.push({ name: call.function.name, args, result });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }
      continue;
    }
    return { reply: msg.content ?? '', toolInvocations: invocations, mode: 'openai' };
  }
  return { reply: '(agent halted after max tool steps)', toolInvocations: invocations, mode: 'openai' };
}
