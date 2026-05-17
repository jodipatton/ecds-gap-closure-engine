'use client';

import { useMemo, useState } from 'react';
import type { HedisResult } from '@/lib/data/types';
import { simulatePlan, type SimulationPlan } from '@/lib/analytics/projection';

export function GapSimulator({ results }: { results: HedisResult[] }) {
  const [plan, setPlan] = useState<SimulationPlan>({});

  const sim = useMemo(() => simulatePlan(results, plan), [results, plan]);

  function set(measureId: string, v: number) {
    setPlan((p) => ({ ...p, [measureId]: v }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Overall rate now" value={`${sim.baseOverallRate}%`} />
        <Tile
          label="Projected rate"
          value={`${sim.projectedOverallRate}%`}
          accent={sim.overallRateDelta > 0}
        />
        <Tile
          label="Rate lift"
          value={`${sim.overallRateDelta >= 0 ? '+' : ''}${sim.overallRateDelta} pts`}
          accent={sim.overallRateDelta > 0}
        />
        <Tile
          label="Dollars captured"
          value={`$${sim.totalDollarsCaptured.toLocaleString()}`}
          accent={sim.totalDollarsCaptured > 0}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
              <th className="py-2 px-4">Measure</th>
              <th className="py-2 px-4">Now</th>
              <th className="py-2 px-4 w-1/3">Close gaps</th>
              <th className="py-2 px-4">Projected</th>
              <th className="py-2 px-4">$ captured</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const m = sim.perMeasure.find((x) => x.measureId === r.measureId)!;
              const closed = plan[r.measureId] ?? 0;
              return (
                <tr key={r.measureId} className="border-b last:border-0">
                  <td className="py-2 px-4">
                    <div className="font-medium">{r.measureId}</div>
                    <div className="text-xs text-slate-500">{r.gapCount} open gaps</div>
                  </td>
                  <td className="py-2 px-4 tabular-nums text-slate-600">{r.rate.toFixed(1)}%</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={r.gapCount}
                        value={closed}
                        onChange={(e) => set(r.measureId, Number(e.target.value))}
                        disabled={r.gapCount === 0}
                        className="w-full accent-sky-600"
                      />
                      <span className="w-10 text-right tabular-nums text-xs text-slate-600">{closed}</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 tabular-nums font-medium">
                    {m.projectedRate.toFixed(1)}%
                    {m.rateDelta > 0 && (
                      <span className="ml-1 text-xs text-emerald-600">+{m.rateDelta}</span>
                    )}
                  </td>
                  <td className="py-2 px-4 tabular-nums text-slate-600">
                    {m.dollarsCaptured ? `$${m.dollarsCaptured.toLocaleString()}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setPlan(Object.fromEntries(results.map((r) => [r.measureId, r.gapCount])))}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs"
        >
          Close all gaps
        </button>
        <button
          onClick={() => setPlan({})}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? 'text-emerald-600' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}
