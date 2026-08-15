'use client';

import { useMemo, useState } from 'react';
import type { HedisResult } from '@/lib/data/types';
import { simulatePlan, type SimulationPlan } from '@/lib/analytics/projection';
import { Badge, Button, Card } from '@/components/ui';
import { Dumbbell } from '@/components/charts';
import { money } from '@/lib/shared/format';

export interface ContractThreshold {
  id: string;
  organizationName: string;
  model: string;
  targetRatePct: number;
  measureIds: string[];
  qualityAtRisk: number;
  baseAvgRatePct: number;
}

export function GapSimulator({
  results,
  contracts = []
}: {
  results: HedisResult[];
  contracts?: ContractThreshold[];
}) {
  const [plan, setPlan] = useState<SimulationPlan>({});
  const sim = useMemo(() => simulatePlan(results, plan), [results, plan]);
  const denomById = useMemo(
    () => new Map(results.map((r) => [r.measureId, r.combinedNumerator + r.gapCount])),
    [results]
  );

  function set(measureId: string, v: number) {
    setPlan((p) => ({ ...p, [measureId]: v }));
  }

  // Live contract attainment under the simulated plan.
  const contractStates = useMemo(
    () =>
      contracts.map((c) => {
        let num = 0;
        let denom = 0;
        for (const id of c.measureIds) {
          const m = sim.perMeasure.find((x) => x.measureId === id);
          const d = denomById.get(id) ?? 0;
          if (!m || d === 0) continue;
          num += m.projectedNumerator;
          denom += d;
        }
        const projRate = denom === 0 ? 0 : Number(((num / denom) * 100).toFixed(1));
        const meets = projRate >= c.targetRatePct;
        const crossed = meets && c.baseAvgRatePct < c.targetRatePct;
        return { ...c, projRate, meets, crossed };
      }),
    [contracts, sim, denomById]
  );

  const changed = sim.perMeasure.filter((m) => m.closed > 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Dollars captured under this plan</div>
            <div className="mt-1 text-[44px] font-semibold leading-none tracking-tight text-ink">
              {money(sim.totalDollarsCaptured)}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-500">Overall rate</div>
              <div className="mt-0.5 font-semibold tabular-nums">
                {sim.baseOverallRate}% → {sim.projectedOverallRate}%
                {sim.overallRateDelta > 0 && <span className="ml-1 text-xs text-emerald-600">+{sim.overallRateDelta} pts</span>}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPlan(Object.fromEntries(results.map((r) => [r.measureId, r.gapCount])))}
              >
                Close all gaps
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPlan({})}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {contractStates.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {contractStates.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                c.crossed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : c.meets
                    ? 'border-slate-200 bg-white text-slate-600'
                    : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span>
                <span className="font-medium text-ink">{c.organizationName}</span> · {c.model} ·{' '}
                <span className="tabular-nums">{c.projRate}%</span> vs {c.targetRatePct}% target
              </span>
              {c.crossed ? (
                <span className="whitespace-nowrap font-semibold">✓ target crossed — {money(c.qualityAtRisk)} earned back</span>
              ) : (
                <Badge color={c.meets ? 'green' : 'amber'}>{c.meets ? 'meets target' : 'below target'}</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-medium">Measure</th>
              <th className="px-4 py-2 font-medium">Now</th>
              <th className="w-1/3 px-4 py-2 font-medium">Close gaps</th>
              <th className="px-4 py-2 font-medium">Projected</th>
              <th className="px-4 py-2 text-right font-medium">$ captured</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const m = sim.perMeasure.find((x) => x.measureId === r.measureId)!;
              const closed = plan[r.measureId] ?? 0;
              return (
                <tr key={r.measureId} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink">{r.measureId}</div>
                    <div className="text-xs text-slate-500">{r.gapCount} open gaps</div>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{r.rate.toFixed(1)}%</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={r.gapCount}
                        value={closed}
                        onChange={(e) => set(r.measureId, Number(e.target.value))}
                        disabled={r.gapCount === 0}
                        className="w-full accent-blue-600"
                        aria-label={`Close ${r.measureId} gaps`}
                      />
                      <span className="w-10 text-right text-xs tabular-nums text-slate-600">{closed}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium tabular-nums">
                    {m.projectedRate.toFixed(1)}%
                    {m.rateDelta > 0 && <span className="ml-1 text-xs text-emerald-600">+{m.rateDelta}</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {m.dollarsCaptured ? money(m.dollarsCaptured) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {changed.length > 0 && (
        <Card>
          <div className="mb-3 text-sm font-semibold text-ink">Before → after under this plan</div>
          <Dumbbell
            rows={changed.map((m) => ({ label: m.measureId, before: m.baseRate, after: m.projectedRate }))}
            beforeLabel="Current rate"
            afterLabel="Projected rate"
          />
        </Card>
      )}
    </div>
  );
}
