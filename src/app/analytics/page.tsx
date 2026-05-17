import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, TierBadge } from '@/components/ui';
import { GapSimulator } from '@/components/analytics/GapSimulator';
import { Sparkline } from '@/components/analytics/Sparkline';
import { rateTrend } from '@/lib/analytics/projection';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const results = await repos.hedisResults.list();

  if (results.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No computed results yet. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">dashboard</Link>.
        </p>
      </Card>
    );
  }

  const trends = results.map((r) => ({ r, ...rateTrend(r) }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Analytics & forecasting</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Model the rate and dollar impact of closing gaps before committing outreach effort.
          Trend trajectories are synthetic (deterministic backfill ending at the current computed
          rate) for illustration.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Gap-closure simulator</h2>
        <p className="text-sm text-slate-600">
          Drag a measure&apos;s slider to see the projected rate and illustrative dollars captured,
          plan-wide.
        </p>
        <GapSimulator results={results} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rate trends & end-of-year projection</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {trends.map(({ r, points, projectedEoy }) => {
            const delta = Number((projectedEoy - r.rate).toFixed(1));
            return (
              <Card key={r.measureId}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/measures/${r.measureId}`} className="font-medium text-ink hover:underline">
                      {r.measureName}
                    </Link>
                    <div className="mt-1"><TierBadge tier={r.dataTier} /></div>
                  </div>
                  <Sparkline points={points} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Current</span>
                    <div className="text-base font-semibold">{r.rate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Proj. EOY</span>
                    <div className="text-base font-semibold">{projectedEoy.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Trajectory</span>
                    <div className={`text-base font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {delta >= 0 ? '+' : ''}{delta} pts
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
