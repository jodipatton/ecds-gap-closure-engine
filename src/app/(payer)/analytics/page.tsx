import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader, TierBadge } from '@/components/ui';
import { BarList, TrendLine } from '@/components/charts';
import { GapSimulator, type ContractThreshold } from '@/components/analytics/GapSimulator';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { allContractValues } from '@/lib/contracts/vbc';
import { measureTarget, rateTrend } from '@/lib/analytics/projection';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function AnalyticsPage() {
  const snap = await getSnapshot();
  const { results } = snap;

  if (results.length === 0) {
    return (
      <EmptyState
        title="No computed results yet"
        description="Seed synthetic data and run analytics from the dashboard."
        action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
      />
    );
  }

  const [ehrImpact, contractValues] = await Promise.all([ehrPlatformGapImpact(snap), allContractValues()]);
  const heroPlatform = ehrImpact.find((r) => r.platform !== 'No PCP' && r.platform !== 'Unconnected');
  const thresholds: ContractThreshold[] = contractValues.map((v) => ({
    id: v.contract.id,
    organizationName: v.contract.organizationName,
    model: v.contract.model,
    targetRatePct: v.contract.targetRatePct,
    measureIds: v.contract.measureIds,
    qualityAtRisk: v.qualityAtRisk,
    baseAvgRatePct: v.avgRatePct
  }));

  const trends = results.map((r) => ({ r, ...rateTrend(r) }));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<LineChart size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Analytics & gap-closure simulator"
        description="Where the open gaps sit, what closing them is worth, and which contract thresholds flip when you do. Trend trajectories are synthetic (deterministic backfill ending at the current computed rate)."
      />

      {/* Act 1 — the lever: where open gaps concentrate */}
      <Card>
        <CardHeader
          title="Where the open gaps sit — by EHR platform"
          action={<Link href="/providers" className="text-sm text-accent hover:underline">Providers →</Link>}
        />
        <BarList
          rows={ehrImpact.map((row) => ({
            label: row.platform,
            value: row.openGaps,
            emphasized: row.platform === heroPlatform?.platform,
            hint: `${row.orgCount} orgs · ${row.memberCount} members`
          }))}
        />
        {heroPlatform && (
          <p className="mt-3 text-xs text-slate-500">
            {heroPlatform.platform} alone covers {heroPlatform.sharePct}% of plan-wide open gaps. A
            clinical-data connection closes those without a single extra member visit —{' '}
            <Link href="/provider/connect" className="text-accent hover:underline">
              see the provider-side flow →
            </Link>
          </p>
        )}
      </Card>

      {/* Act 2 — the money: simulate closures, watch thresholds flip */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Gap-closure simulator</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Drag a measure&apos;s slider to project rate lift and dollars captured. Contract chips flip live
          when a plan crosses a provider&apos;s quality target.
        </p>
        <GapSimulator results={results} contracts={thresholds} />
      </section>

      {/* Act 3 — the trajectory */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Rate trends & end-of-year projection</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {trends.map(({ r, points, projectedEoy }) => {
            const delta = Number((projectedEoy - r.rate).toFixed(1));
            return (
              <Card key={r.measureId}>
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/measures/${r.measureId}`} className="font-medium text-ink hover:underline">
                      {r.measureName}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <TierBadge tier={r.dataTier} />
                      <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta >= 0 ? '+' : ''}{delta} pts proj. EOY
                      </span>
                    </div>
                  </div>
                </div>
                <TrendLine
                  points={points}
                  labels={MONTHS}
                  projected={projectedEoy}
                  target={measureTarget(r.measureId)}
                  height={150}
                />
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
