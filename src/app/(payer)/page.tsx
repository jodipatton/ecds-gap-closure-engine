import Link from 'next/link';
import { Activity, ArrowUpRight } from 'lucide-react';
import { activeBackend } from '@/lib/data/repository';
import { getRisk, getSnapshot } from '@/lib/data/snapshot';
import { Card, CardHeader, StatTile } from '@/components/ui';
import { BarList, BulletBar } from '@/components/charts';
import { SeedAndRun } from '@/components/SeedAndRun';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { recommendedActions } from '@/lib/agent/recommendations';
import { allContractValues } from '@/lib/contracts/vbc';
import { ensureSeedAudit } from '@/lib/audit/audit';
import { denominator, gapValue, measureTarget } from '@/lib/analytics/projection';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

const SUGGESTIONS = [
  "Where's our biggest quality dollar opportunity?",
  'Show the value at stake in our VBC contracts',
  'What is the gap-closure impact if we connect to Epic?',
  'What is our RAF recapture opportunity?'
];

export default async function Home() {
  const onVercel = process.env.VERCEL === '1';
  const backend = activeBackend();
  const needsKvProvisioning = onVercel && backend === 'json';

  // Seed-provenance audit rows must exist before the snapshot reads them.
  await ensureSeedAudit();
  const snap = await getSnapshot();
  const { summary, results, gaps } = snap;
  const [ehrImpact, actions, risk] = await Promise.all([
    ehrPlatformGapImpact(snap),
    recommendedActions(4),
    getRisk()
  ]);

  const seeded = summary !== null;
  const hasResults = results.length > 0;
  const contractValues = hasResults ? await allContractValues() : [];

  const totalDenominator = results.reduce((s, r) => s + denominator(r), 0);
  const totalNumerator = results.reduce((s, r) => s + r.combinedNumerator, 0);
  const totalGaps = gaps.filter((g) => g.status.startsWith('open-')).length;
  const overallRate = totalDenominator === 0 ? 0 : (totalNumerator / totalDenominator) * 100;
  const contractValueAtStake = contractValues.reduce((s, v) => s + v.totalValueAtStake, 0);
  const dollarOpportunity = results.reduce((s, r) => s + r.gapCount * gapValue(r.dataTier), 0);

  const lastSync = snap.ehrConnections
    .map((c) => (c.lastSyncSummary ? { org: c.organizationName, platform: c.ehrPlatform, ...c.lastSyncSummary } : null))
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.at.localeCompare(a.at))[0];

  const dollarRanked = [...results]
    .map((r) => ({ ...r, impact: r.gapCount * gapValue(r.dataTier) }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  const recentAudit = [...snap.auditEvents].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 5);
  const heroPlatform = ehrImpact.find((r) => r.platform !== 'No PCP' && r.platform !== 'Unconnected');

  return (
    <div className="space-y-8">
      <AssistantPanel suggestions={SUGGESTIONS} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">Plan command center</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              One snapshot across quality, risk adjustment, value-based contracts, and outreach —
              computed from FHIR-normalized claims and clinical data.
            </p>
          </div>
          <SeedAndRun seeded={seeded} hasResults={hasResults} />
        </div>
        {needsKvProvisioning && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Storage not provisioned.</strong> Running on Vercel without a persistent backend,
            so Seed / Run Analytics won&apos;t persist between requests.
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Overall rate"
          value={hasResults ? `${overallRate.toFixed(1)}%` : '—'}
          hint="numerator / denominator"
          href="/measures"
        />
        <StatTile
          label="Open gaps"
          value={totalGaps}
          delta={lastSync ? `-${lastSync.gapsClosed} since last sync` : undefined}
          hint={hasResults ? `${money(dollarOpportunity)} opportunity` : 'Run analytics'}
          href="/measures"
        />
        <StatTile
          label="RAF recapture"
          value={money(risk.totalRevenueOpportunity)}
          hint={`${risk.membersWithSuspectedGap} members`}
          href="/risk"
        />
        <StatTile
          label="VBC value at stake"
          value={contractValues.length ? money(contractValueAtStake) : '—'}
          hint={`${contractValues.length} contracts`}
          href="/contracts"
        />
      </section>

      {lastSync && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm text-emerald-800">
          <Activity size={15} aria-hidden />
          <span>
            <strong>+{lastSync.gapsClosed} gaps closed via clinical data</strong> from {lastSync.org} (
            {lastSync.platform}) — {money(lastSync.dollarsUnlocked)} unlocked ·{' '}
            {new Date(lastSync.at).toLocaleString()}
          </span>
          <Link href="/audit" className="ml-auto text-xs font-medium text-emerald-700 hover:underline">
            Audit trail →
          </Link>
        </div>
      )}

      {hasResults && (
        <section>
          <Card>
            <CardHeader
              title="Measure performance vs target"
              action={<Link href="/measures" className="text-sm text-accent hover:underline">All measures →</Link>}
            />
            <div className="grid gap-x-10 gap-y-3.5 md:grid-cols-2">
              {results.map((r) => (
                <Link
                  key={r.measureId}
                  href={`/measures/${r.measureId}`}
                  className="group flex items-center gap-3"
                >
                  <span className="w-14 shrink-0 text-xs font-semibold text-slate-500 group-hover:text-accent">
                    {r.measureId}
                  </span>
                  <span className="flex-1">
                    <BulletBar value={r.rate} target={measureTarget(r.measureId)} height={10} />
                  </span>
                  <span className="w-11 shrink-0 text-right text-sm font-medium tabular-nums">{r.rate.toFixed(0)}%</span>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-bad">{r.gapCount} gaps</span>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      )}

      {hasResults && (
        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader
              title="Top dollar opportunities"
              action={<Link href="/analytics" className="text-sm text-accent hover:underline">Model it →</Link>}
            />
            <ol className="space-y-1 text-sm">
              {dollarRanked.map((r) => (
                <li key={r.measureId}>
                  <Link
                    href={`/measures/${r.measureId}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-slate-50"
                  >
                    <span>{r.measureName}</span>
                    <span className="tabular-nums text-slate-700">
                      {money(r.impact)} <span className="text-slate-400">({r.gapCount})</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader
              title="Recommended actions"
              action={<Link href="/chat" className="text-sm text-accent hover:underline">Ask why →</Link>}
            />
            <ol className="space-y-1">
              {actions.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-start justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <span>
                      <span className="text-sm font-medium text-ink">{a.title}</span>
                      <span className="mt-0.5 block max-w-md text-xs text-slate-500">{a.detail}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">
                      {money(a.estimatedValue)}
                    </span>
                  </Link>
                </li>
              ))}
              {actions.length === 0 && <li className="text-sm text-slate-500">Run analytics to populate.</li>}
            </ol>
          </Card>
        </section>
      )}

      {hasResults && (
        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader
              title="Open gaps by EHR platform"
              action={<Link href="/providers" className="text-sm text-accent hover:underline">Providers →</Link>}
            />
            <BarList
              rows={ehrImpact.map((row) => ({
                label: row.platform,
                value: row.openGaps,
                emphasized: row.platform === heroPlatform?.platform,
                hint: `${row.orgCount} orgs · ${row.sharePct}%`
              }))}
            />
            {heroPlatform && (
              <p className="mt-3 text-xs text-slate-500">
                {heroPlatform.platform} practices sit on {heroPlatform.sharePct}% of plan-wide open gaps —
                most closeable with a clinical-data sync, not outreach.{' '}
                <Link href="/provider/connect" className="text-accent hover:underline">
                  Walk the connection as a provider →
                </Link>
              </p>
            )}
          </Card>
          <Card>
            <CardHeader
              title="Recent activity"
              action={<Link href="/audit" className="text-sm text-accent hover:underline">Full audit trail →</Link>}
            />
            <ul className="space-y-2 text-xs">
              {recentAudit.map((e) => (
                <li key={e.id} className="flex items-start gap-2">
                  <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="text-slate-600">
                    <span className="font-medium text-ink">{e.sourceSystem}</span>
                    {e.organizationName ? ` · ${e.organizationName}` : ''} — {e.recordsAccepted} records accepted ·{' '}
                    {new Date(e.ts).toLocaleString()}
                  </span>
                </li>
              ))}
              {recentAudit.length === 0 && <li className="text-slate-500">No acquisition events yet.</li>}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
