// Agent chat orchestrator. Tool-call loop against OpenAI when OPENAI_API_KEY
// is present; otherwise falls back to a deterministic rule-based router that
// matches the user's question to a tool and returns the structured result so
// the demo always produces output.

import OpenAI from 'openai';
import { openAiToolSchema, toolMap } from './tools';

const SYSTEM_PROMPT = `You are the ECDS Gap Closure agent for a health-plan demo.
You have tools that read computed HEDIS ECDS results, the engagement queue,
and the provider/EHR roster. Always call tools to ground answers in actual
data — never invent measure rates or member counts. Cite measure IDs (BCS, COL,
CIS, WCV, HBD, CBP, DSF-E, AMM, FUM, PND-E) and EHR platforms verbatim from
tool results. When the user asks about gap-closure impact of connecting to an
EHR, use ehr_platform_impact. Reply concisely (≤120 words) unless the user
asks for detail.`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolCallId?: string;
}

export interface ChatTurnResult {
  reply: string;
  toolInvocations: Array<{ name: string; args: any; result: any }>;
  mode: 'openai' | 'fallback';
}

async function fallbackTurn(userText: string): Promise<ChatTurnResult> {
  // Rule-based routing for the no-API-key demo path. Crude but always works.
  const lower = userText.toLowerCase();
  const invocations: ChatTurnResult['toolInvocations'] = [];
  let reply = '';

  const measureIdMatch = userText.match(/\b(BCS|COL|CIS|WCV|HBD|CBP|DSF-?E|AMM|FUM|PND-?E)\b/i);

  if (lower.includes('most gap') || lower.includes('biggest gap') || lower.includes('top gap') || lower.includes('which measures')) {
    const tool = toolMap.get('measures_with_most_gaps')!;
    const result = await tool.execute({ limit: 5 });
    invocations.push({ name: tool.name, args: { limit: 5 }, result });
    reply = `Top measures by open gap count:\n${(result as any[]).map((r) => `• ${r.measureId} (${r.measureName}) — ${r.gapCount} open gaps, rate ${r.ratePct}%`).join('\n')}`;
  } else if (lower.includes('ehr') || lower.includes('epic') || lower.includes('cerner') || lower.includes('platform') || lower.includes('connect')) {
    const tool = toolMap.get('ehr_platform_impact')!;
    const result = await tool.execute({});
    invocations.push({ name: tool.name, args: {}, result });
    const top = (result as any[])[0];
    reply = top
      ? `Connecting to ${top.platform} would address ${top.openGaps} open gaps (${top.sharePct}% of plan-wide gaps) across ${top.orgCount} provider organizations covering ${top.memberCount} members.`
      : 'No EHR impact data yet — run the engine first.';
  } else if (lower.includes('engagement') || lower.includes('outreach') || lower.includes('queue')) {
    const tool = toolMap.get('engagement_queue_summary')!;
    const result = await tool.execute({});
    invocations.push({ name: tool.name, args: {}, result });
    const r = result as any;
    reply = `Engagement queue: ${r.total} members. By reason: ${Object.entries(r.byReason).map(([k, v]) => `${k}=${v}`).join(', ')}.`;
  } else if (measureIdMatch && (lower.includes('missing') || lower.includes('clinical data') || lower.includes('need'))) {
    const measureId = measureIdMatch[1].toUpperCase().replace('DSFE', 'DSF-E').replace('PNDE', 'PND-E');
    const tool = toolMap.get('members_missing_clinical_data')!;
    const result = await tool.execute({ measureId, limit: 5 });
    invocations.push({ name: tool.name, args: { measureId }, result });
    reply = `Members on ${measureId} needing clinical data:\n${(result as any[]).map((m) => `• ${m.memberName} — ${m.missingDataElement} (PCP: ${m.attributedPcp ?? 'none'}, EHR: ${m.ehrPlatform ?? '—'})`).join('\n')}`;
  } else if (measureIdMatch) {
    const measureId = measureIdMatch[1].toUpperCase().replace('DSFE', 'DSF-E').replace('PNDE', 'PND-E');
    const tool = toolMap.get('measure_summary')!;
    const result = await tool.execute({ measureId });
    invocations.push({ name: tool.name, args: { measureId }, result });
    const r = result as any;
    reply = r.error
      ? r.error
      : `${measureId} (${r.measureName}, ${r.dataTier}): ${r.combinedNumerator}/${r.eligiblePopulation} = ${r.rate}%. Closed by claims: ${r.numeratorFromClaims}, by clinical: ${r.numeratorFromClinical}. Open gaps: ${r.gapCount}.`;
  } else if (lower.includes('list') || lower.includes('measures') || lower.includes('what')) {
    const tool = toolMap.get('list_measures')!;
    const result = await tool.execute({});
    invocations.push({ name: tool.name, args: {}, result });
    reply = `The engine covers 10 measures across three tiers:\n${(result as any[]).map((m) => `• ${m.id} — ${m.name} (${m.dataTier})`).join('\n')}`;
  } else {
    reply = 'Try asking: "Which measures have the most gaps?", "What is the gap-closure impact of connecting to Epic?", "Tell me about HBD", or "Who is missing clinical data for HBD?"';
  }
  return { reply, toolInvocations: invocations, mode: 'fallback' };
}

export async function chatTurn(history: ChatMessage[], userText: string): Promise<ChatTurnResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackTurn(userText);

  const client = new OpenAI({ apiKey });
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText }
  ];
  const invocations: ChatTurnResult['toolInvocations'] = [];

  for (let step = 0; step < 4; step++) {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
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
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
          result = tool ? await tool.execute(args) : { error: `Unknown tool ${call.function.name}` };
        } catch (err: any) {
          result = { error: err?.message ?? 'tool error' };
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
