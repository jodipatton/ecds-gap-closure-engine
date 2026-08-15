import { describe, expect, it } from 'vitest';
import { computeResults, type EngineInput } from '../engine';
import { attribution, claim, condition, member, observation, provider, MY } from './fixtures';

// Five-member fixture population exercising the interesting paths:
//   M1: woman 62, mammogram claim            → BCS closed-claims
//   M2: woman 62, no screening, no visit     → BCS open, queue no-visit
//   M3: woman 62, bilateral mastectomy       → BCS excluded
//   M4: diabetic 55, dx claims + good A1c    → HBD closed-clinical
//   M5: diabetic 55, dx claims, no A1c, no PCP → HBD open (evidence via claims), queue
const M1 = member({ id: 'M1', birthDate: `${MY - 62}-03-01` });
const M2 = member({ id: 'M2', birthDate: `${MY - 62}-03-01` });
const M3 = member({ id: 'M3', birthDate: `${MY - 62}-03-01` });
const M4 = member({ id: 'M4', sex: 'M', birthDate: `${MY - 55}-03-01` });
const M5 = member({ id: 'M5', sex: 'M', birthDate: `${MY - 55}-03-01` });

function input(): EngineInput {
  return {
    measurementYear: MY,
    ranAt: `${MY}-07-01T00:00:00.000Z`,
    members: [M1, M2, M3, M4, M5],
    claims: [
      claim('M1', { procedureCodes: ['77067'] }),
      claim('M4', { diagnosisCodes: ['E11.9'] }),
      claim('M4', { diagnosisCodes: ['E11.9'] }),
      claim('M5', { diagnosisCodes: ['E11.9'] }),
      claim('M5', { diagnosisCodes: ['E11.9'] })
    ],
    observations: [observation('M4', { valueQuantity: { value: 7.1, unit: '%' } })],
    conditions: [condition('M3', { icd10: 'Z90.13' })],
    medications: [],
    documents: [],
    providers: [provider()],
    attribution: [
      attribution('M1'),
      attribution('M2', { hasHadVisitInMeasurementYear: false }),
      attribution('M3'),
      attribution('M4'),
      attribution('M5', { pcp: null, attributionMethod: 'plan-assigned' })
    ]
  };
}

describe('computeResults', () => {
  const { results, gaps, engagement } = computeResults(input());
  const byMeasure = new Map(results.map((r) => [r.measureId, r]));

  it('locks the denominator invariant for every measure', () => {
    for (const r of results) {
      expect(r.combinedNumerator + r.gapCount).toBe(r.eligiblePopulation - r.exclusions);
    }
  });

  it('routes BCS members to closed / open / excluded correctly', () => {
    const bcs = byMeasure.get('BCS')!;
    expect(bcs.eligiblePopulation).toBe(3);
    expect(bcs.exclusions).toBe(1);
    expect(bcs.numeratorFromClaims).toBe(1);
    expect(bcs.gapCount).toBe(1);
    const statuses = new Map(gaps.filter((g) => g.measureId === 'BCS').map((g) => [g.memberId, g.status]));
    expect(statuses.get('M1')).toBe('closed-claims');
    expect(statuses.get('M2')).toBe('open-needs-clinical');
    expect(statuses.get('M3')).toBe('excluded');
  });

  it('closes HBD clinically and types the open gap via the missing-data kind', () => {
    const hbd = byMeasure.get('HBD')!;
    expect(hbd.numeratorFromClinical).toBe(1);
    expect(hbd.gapCount).toBe(1);
    const open = gaps.find((g) => g.measureId === 'HBD' && g.memberId === 'M5')!;
    expect(open.status).toBe('open-needs-clinical');
    expect(open.missingDataElement).toContain('4548-4');
  });

  it('gives every gap a stable composite id', () => {
    for (const g of gaps) expect(g.id).toBe(`${g.measureId}:${g.memberId}`);
  });

  it('dataCompleteness counts open gaps that carry evidence, unlike rate', () => {
    // M5's HBD gap has no A1c observation, but the two dx claims mean the plan
    // HAS structured evidence for the member — the gap needs data, not outreach
    // visibility. HBD: denom 2, closed 1, open-with-evidence 0 (HBD claims pass
    // returns no evidence) → completeness == rate here; BCS: M2 has zero claims
    // → completeness == rate too. DSF-E (all 5 eligible, 0 closed, 0 evidence)
    // pins completeness at 0 while CBP-style evidence would lift it.
    const dsfe = byMeasure.get('DSF-E')!;
    expect(dsfe.dataCompleteness).toBe(0);
    expect(dsfe.rate).toBe(0);
    for (const r of results) {
      expect(r.dataCompleteness).toBeGreaterThanOrEqual(r.rate);
      expect(r.dataCompleteness).toBeLessThanOrEqual(100);
    }
  });

  it('queues open-gap members once with the right reason', () => {
    const byId = new Map(engagement.map((e) => [e.memberId, e]));
    expect(byId.get('M2')?.queueReason).toBe('no-visit');
    expect(byId.get('M5')?.queueReason).toBe('no-pcp'); // pcp: null wins over gap-closeable
    expect(byId.get('M4')?.queueReason).toBe('gap-closeable'); // has PCP + visit, open DSF-E/COL gaps
    // M1/M4 fully closed on their measures may still queue only via open gaps
    // on other measures (e.g. COL/DSF-E) — but never twice.
    const ids = engagement.map((e) => e.memberId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
