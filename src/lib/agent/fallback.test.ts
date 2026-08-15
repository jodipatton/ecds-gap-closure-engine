import { describe, expect, it } from 'vitest';
import { fallbackTurn } from './chat';

// Routing-focused: assert each question reaches the intended tool. Results
// come from whatever is in the local store (possibly empty) — the routing and
// render paths must not throw either way.
async function routedTool(q: string): Promise<string | undefined> {
  const r = await fallbackTurn(q);
  expect(r.mode).toBe('fallback');
  expect(typeof r.reply).toBe('string');
  return r.toolInvocations[0]?.name;
}

describe('fallbackTurn routing', () => {
  it('covers every scripted demo beat without an API key', async () => {
    expect(await routedTool("Where's our biggest quality dollar opportunity?")).toBe('recommended_actions');
    expect(await routedTool('What is the gap-closure impact of connecting to Epic?')).toBe('ehr_platform_impact');
    expect(await routedTool('Show the value at stake in our VBC contracts')).toBe('contract_value');
  });
  it('routes measure questions', async () => {
    expect(await routedTool('Which measures have the most gaps?')).toBe('measures_with_most_gaps');
    expect(await routedTool('Tell me about HBD')).toBe('measure_summary');
    expect(await routedTool('Who is missing clinical data for HBD?')).toBe('members_missing_clinical_data');
    expect(await routedTool('What are the eligibility criteria for BCS?')).toBe('measure_spec');
    expect(await routedTool('What if we close 40 HBD gaps?')).toBe('simulate_gap_closure');
  });
  it('routes risk, roster, member, letter, and queue questions', async () => {
    expect(await routedTool('Summarize our RAF recapture opportunity')).toBe('risk_summary');
    expect(await routedTool('Generate the payer roster')).toBe('generate_roster');
    expect(await routedTool('Show me a 360 for member M00007')).toBe('member_360');
    expect(await routedTool('What is the RAF detail for M00007?')).toBe('member_risk');
    expect(await routedTool('Draft a care-gap letter for M00007 about HBD')).toBe('care_gap_letter');
    expect(await routedTool('How big is the engagement queue?')).toBe('engagement_queue_summary');
    expect(await routedTool('List the measures')).toBe('list_measures');
  });
  it('falls through to help text on unroutable input', async () => {
    const r = await fallbackTurn('sing me a song');
    expect(r.toolInvocations).toHaveLength(0);
    expect(r.reply).toContain('Try asking');
  });
});
