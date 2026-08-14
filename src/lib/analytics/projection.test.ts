import { describe, expect, it } from 'vitest';
import type { HedisResult } from '@/lib/data/types';
import { denominator, gapValue, rateTrend, simulateMeasure, simulatePlan } from './projection';

function result(partial: Partial<HedisResult>): HedisResult {
  return {
    measureId: 'HBD',
    measureName: 'Hemoglobin A1c Control',
    dataTier: 'uscdi-v3',
    domain: 'Cardiometabolic',
    eligiblePopulation: 100,
    numeratorFromClaims: 0,
    numeratorFromClinical: 60,
    combinedNumerator: 60,
    exclusions: 0,
    gapCount: 40,
    rate: 60,
    dataCompleteness: 60,
    lastComputed: '2025-06-01T00:00:00.000Z',
    ...partial
  };
}

describe('gapValue / denominator', () => {
  it('prices gaps by data tier', () => {
    expect(gapValue('claims-only')).toBe(220);
    expect(gapValue('uscdi-v3')).toBe(380);
    expect(gapValue('ccda')).toBe(520);
  });
  it('uses numerator + open gaps as the effective denominator', () => {
    expect(denominator(result({}))).toBe(100);
    expect(denominator(result({ combinedNumerator: 30, gapCount: 10 }))).toBe(40);
  });
});

describe('simulateMeasure', () => {
  it('clamps closures to the open gap count', () => {
    const sim = simulateMeasure(result({}), 1000);
    expect(sim.closed).toBe(40);
    expect(sim.projectedRate).toBe(100);
    expect(sim.dollarsCaptured).toBe(40 * 380);
  });
  it('ignores negative closures', () => {
    const sim = simulateMeasure(result({}), -5);
    expect(sim.closed).toBe(0);
    expect(sim.projectedRate).toBe(60);
  });
});

describe('simulatePlan', () => {
  it('aggregates rates and dollars across measures', () => {
    const rs = [result({}), result({ measureId: 'BCS', dataTier: 'claims-only' })];
    const out = simulatePlan(rs, { HBD: 40, BCS: 0 });
    expect(out.baseOverallRate).toBe(60);
    expect(out.projectedOverallRate).toBe(80);
    expect(out.totalDollarsCaptured).toBe(40 * 380);
  });
});

describe('rateTrend', () => {
  it('is deterministic and anchored to the current rate', () => {
    const a = rateTrend(result({}));
    const b = rateTrend(result({}));
    expect(a.points).toEqual(b.points);
    expect(a.points).toHaveLength(12);
    expect(a.points[11]).toBe(60);
  });
});
