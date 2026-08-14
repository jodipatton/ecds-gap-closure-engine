// Projection + simulation helpers shared by the analytics page, the agent
// tools, and the dashboard recommended-actions card. Pure functions over the
// computed HedisResult set — no I/O.

import type { DataTier, HedisResult } from '@/lib/data/types';
import { hash01 } from '@/lib/shared/hash';

// Illustrative per-gap closure value by data tier (mirrors the dashboard's
// dollar-opportunity heuristic — kept here so every surface agrees).
export const GAP_VALUE: Record<DataTier, number> = {
  'claims-only': 220,
  'uscdi-v3': 380,
  'ccda': 520
};

export function gapValue(tier: DataTier): number {
  return GAP_VALUE[tier] ?? 220;
}

/** Effective denominator for a measure (eligible minus exclusions). */
export function denominator(r: HedisResult): number {
  return r.combinedNumerator + r.gapCount;
}

/**
 * Recompute a measure's rate if `closeCount` open gaps were closed.
 * `closeCount` is clamped to [0, gapCount].
 */
export function simulateMeasure(r: HedisResult, closeCount: number) {
  const denom = denominator(r);
  const close = Math.max(0, Math.min(Math.round(closeCount), r.gapCount));
  const newNumerator = r.combinedNumerator + close;
  const rate = denom === 0 ? 0 : (newNumerator / denom) * 100;
  return {
    closed: close,
    projectedNumerator: newNumerator,
    projectedRate: Number(rate.toFixed(1)),
    rateDelta: Number((rate - r.rate).toFixed(1)),
    dollarsCaptured: close * gapValue(r.dataTier)
  };
}

export interface SimulationPlan {
  [measureId: string]: number; // gaps to close
}

/** Plan-wide simulation across all measures. */
export function simulatePlan(results: HedisResult[], plan: SimulationPlan) {
  let baseNum = 0;
  let projNum = 0;
  let denomTotal = 0;
  let dollars = 0;
  const perMeasure = results.map((r) => {
    const sim = simulateMeasure(r, plan[r.measureId] ?? 0);
    baseNum += r.combinedNumerator;
    projNum += sim.projectedNumerator;
    denomTotal += denominator(r);
    dollars += sim.dollarsCaptured;
    return { measureId: r.measureId, measureName: r.measureName, baseRate: r.rate, ...sim };
  });
  const baseRate = denomTotal === 0 ? 0 : (baseNum / denomTotal) * 100;
  const projRate = denomTotal === 0 ? 0 : (projNum / denomTotal) * 100;
  return {
    baseOverallRate: Number(baseRate.toFixed(1)),
    projectedOverallRate: Number(projRate.toFixed(1)),
    overallRateDelta: Number((projRate - baseRate).toFixed(1)),
    totalDollarsCaptured: dollars,
    perMeasure
  };
}

// Cheap deterministic hash so the synthetic trend is stable across renders.
const hash = hash01;

/**
 * Synthetic 12-month rate trajectory ending at the measure's current rate.
 * Deterministic: a gentle upward ramp with a little measure-specific jitter,
 * plus a naive end-of-year projection by extrapolating the recent slope.
 */
export function rateTrend(r: HedisResult): { points: number[]; projectedEoy: number } {
  const seed = hash(r.measureId);
  const ramp = 6 + seed * 8; // total improvement over the year
  const start = Math.max(0, r.rate - ramp);
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const jitter = (hash(`${r.measureId}:${i}`) - 0.5) * 1.6;
    const v = start + (r.rate - start) * t + jitter;
    points.push(Number(Math.max(0, Math.min(100, v)).toFixed(1)));
  }
  points[11] = r.rate;
  const recentSlope = points[11] - points[8]; // last quarter
  const projectedEoy = Number(
    Math.max(0, Math.min(100, r.rate + recentSlope * 0.66)).toFixed(1)
  );
  return { points, projectedEoy };
}
