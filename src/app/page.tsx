import Link from 'next/link';
import { activeBackend, repos, readSeedSummary } from '@/lib/data/repository';
import { Card, Pill, ProgressBar, StatTile } from '@/components/ui';
import { SeedAndRun } from '@/components/SeedAndRun';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { recommendedActions } from '@/lib/agent/recommendations';
import { planRiskSummary } from '@/lib/risk/raf';
import { allContractValues } from '@/lib/contracts/vbc';
import { buildRoster } from '@/lib/rosters/roster';
import { ensureSeedAudit, listAudit } from '@/lib/audit/audit';
import { campaignProgress } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const onVercel = process.env.VERCEL === '1';
  const backend = activeBackend();
  const needsKvProvisioning = onVercel && backend === 'json';

  await ensureSeedAudit();
  const [
    summary,
    results,
    gaps,
    engagement,
    ehrImpact,
    actions,
    members,
    conditions,
    claims,
    campaigns,
    audit,
    payerRoster
  ] = await Promise.all([
    readSeedSummary(),
    repos.hedisResults.list(),
    repos.gaps.list(),
    repos.engagement.list(),
    ehrPlatformGapImpact(),
    recommendedActions(4),
    repos.members.list(),
    repos.conditions.list(),
    repos.claims.list(),
    repos.campaigns.list(),
    listAudit(),
    buildRoster('payer')
  ]);

  const seeded = summary !== null;
  const hasResults = results.length > 0;
  const my = summary?.measurementYear ?? new Date().getFullYear();

  const totalEligible = results.reduce((s, r) => s + r.eligiblePopulation, 0);
  const totalNumerator = results.reduce((s, r) => s + r.combinedNumerator, 0);
  const totalGaps = gaps.filter((g) => g.status.startsWith('open-')).length;
  const overallRate = totalEligible === 0 ? 0 : (totalNumerator / totalEligible) * 100;

  const risk = planRiskSummary(members, conditions, claims, my);
  const contractValues = hasResults ? await allContractValues() : [];
  const contractValueAtStake = contractValues.reduce((s, v) => s + v.totalValueAtStake, 0);
  const dollarOpportunity = results.reduce(
    (s, r) => s + r.gapCount * (r.dataTier === 'claims-only' ? 220 : r.dataTier === 'uscdi-v3' ? 380 : 520),
    0
  );
  const auditVerified = audit.filter((a) => a.psvStatus === 'verified').length;
  const campaignAvg =
    campaigns.length === 0
      ? 0
      : Math.round(
          campaigns.reduce((s, c) => s + campaignProgress(c).closedPct, 0) / campaigns.length
        );

  const dollarRanked = results
    .map((r) => ({
      ...r,
      impact: r.gapCount * (r.dataTier === 'claims-only' ? 220 : r.dataTier === 'uscdi-v3' ? 380 : 520)
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  const snapshots = [
    {
      href: '/measures',
      label: 'HEDIS measures',
      metric: hasResults ? `${overallRate.toFixed(1)}%` : '—',
      sub: `${results.length} measures · ${totalGaps} open gaps`,
      accent: 'sky' as const
    },
    {
      href: '/analytics',
      label: 'Analytics & forecast',
      metric: hasResults ? `$${dollarOpportunity.toLocaleString()}` : '—',
      sub: 'Gap-closure simulator & trends',
      accent: 'sky' as const
    },
    {
      href: '/risk',
      label: 'Risk (RAF)',
      metric: `$${risk.totalRevenueOpportunity.toLocaleString()}`,
      sub: `Avg RAF ${risk.avgCurrentRaf.toFixed(3)} · ${risk.membersWithSuspectedGap} recapture`,
      accent: 'amber' as const
    },
    {
      href: '/contracts',
      label: 'Value-based contracts',
      metric: contractValues.length ? `$${contractValueAtStake.toLocaleString()}` : '—',
      sub: `${contractValues.length} contracts · value at stake`,
      accent: 'amber' as const
    },
    {
      href: '/rosters',
      label: 'Rosters',
      metric: `${payerRoster.rowCount}`,
      sub: 'Actionable members (payer view)',
      accent: 'sky' as const
    },
    {
      href: '/engagement',
      label: 'Engagement queue',
      metric: `${engagement.length}`,
      sub: 'No visit · no PCP · gap-closeable',
      accent: 'rose' as const
    },
    {
      href: '/campaigns',
      label: 'Outreach campaigns',
      metric: `${campaigns.length}`,
      sub: campaigns.length ? `${campaignAvg}% avg closed` : 'None yet',
      accent: 'green' as const
    },
    {
      href: '/audit',
      label: 'PSV audit trail',
      metric: `${audit.length}`,
      sub: `${auditVerified}/${audit.length} primary-source verified`,
      accent: 'green' as const
    }
  ];

  return (
    <div className="space-y-8">
      {/* Assistant hero */}
      <section className="rounded-xl bg-ink p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">Start here</div>
            <h2 className="mt-1 text-xl font-semibold">Ask the 1upHealth assistant</h2>
            <p className="mt-1 text-sm text-slate-300">
              Skip the menus — ask in plain language and the assistant answers from live data across
              measures, risk, contracts, and rosters.
            </p>
          </div>
          <Link
            href="/chat"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Open assistant →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'Which measures have the most open gaps?',
            'What is our RAF recapture opportunity?',
            'Show the value at stake in our VBC contracts',
            'Generate a payer roster'
          ].map((q) => (
            <Link
              key={q}
              href={`/chat?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* Header + run controls */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Plan command center</h1>
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
        {backend === 'firestore' && (
          <div className="text-xs text-slate-500">Connected to Firebase Firestore.</div>
        )}
      </section>

      {/* Headline KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/measures" className="block transition hover:opacity-90">
          <StatTile label="Overall rate" value={hasResults ? `${overallRate.toFixed(1)}%` : '—'} hint="numerator / eligible" />
        </Link>
        <Link href="/measures" className="block transition hover:opacity-90">
          <StatTile label="Open gaps" value={totalGaps} hint={hasResults ? `${results.length} measures` : 'Run analytics'} />
        </Link>
        <Link href="/risk" className="block transition hover:opacity-90">
          <StatTile label="RAF recapture" value={`$${risk.totalRevenueOpportunity.toLocaleString()}`} hint={`${risk.membersWithSuspectedGap} members`} />
        </Link>
        <Link href="/contracts" className="block transition hover:opacity-90">
          <StatTile label="VBC value at stake" value={contractValues.length ? `$${contractValueAtStake.toLocaleString()}` : '—'} hint={`${contractValues.length} contracts`} />
        </Link>
      </section>

      {/* Cross-platform snapshot */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Across the platform</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshots.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition hover:shadow">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {s.label}
                  </div>
                  <Pill color={s.accent}>view</Pill>
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink">{s.metric}</div>
                <div className="mt-1 text-xs text-slate-500">{s.sub}</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Measure mini-grid */}
      {hasResults && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Measure performance</h2>
            <Link href="/measures" className="text-sm text-accent hover:underline">All measures →</Link>
          </div>
          <Card>
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {results.map((r) => (
                <Link
                  key={r.measureId}
                  href={`/measures/${r.measureId}`}
                  className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">{r.measureId}</span>
                  <span className="flex-1"><ProgressBar value={r.rate} /></span>
                  <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
                    {r.rate.toFixed(0)}%
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-bad tabular-nums">
                    {r.gapCount} gaps
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Opportunities + recommended actions */}
      {hasResults && (
        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top dollar opportunities</h2>
              <Link href="/analytics" className="text-sm text-accent hover:underline">Model it →</Link>
            </div>
            <ol className="space-y-1 text-sm">
              {dollarRanked.map((r) => (
                <li key={r.measureId}>
                  <Link
                    href={`/measures/${r.measureId}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-slate-50"
                  >
                    <span>{r.measureName}</span>
                    <span className="text-slate-700">
                      ${r.impact.toLocaleString()}{' '}
                      <span className="text-slate-400">({r.gapCount})</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recommended actions</h2>
              <Link href="/chat" className="text-sm text-accent hover:underline">Ask why →</Link>
            </div>
            <ol className="space-y-1">
              {actions.map((a, i) => (
                <li key={i}>
                  <Link
                    href={a.href}
                    className="flex items-start justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span>
                      <span className="text-sm font-medium text-ink">{a.title}</span>
                      <span className="mt-0.5 block max-w-md text-xs text-slate-500">{a.detail}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
                      ${a.estimatedValue.toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
              {actions.length === 0 && <li className="text-sm text-slate-500">Run analytics to populate.</li>}
            </ol>
          </Card>
        </section>
      )}

      {/* EHR platform impact */}
      {hasResults && (
        <section>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Open-gap impact by EHR platform</h2>
              <Link href="/providers" className="text-sm text-accent hover:underline">Provider roster →</Link>
            </div>
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              {ehrImpact.map((row) => (
                <Link
                  key={row.platform}
                  href="/providers"
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{row.platform}</span>
                    <Pill color={row.platform === 'No PCP' || row.platform === 'Unconnected' ? 'rose' : 'sky'}>
                      {row.orgCount} orgs
                    </Pill>
                  </span>
                  <span className="text-slate-700">
                    {row.openGaps} gaps · <span className="text-slate-500">{row.sharePct}%</span>
                  </span>
                </Link>
              ))}
              {ehrImpact.length === 0 && <div className="text-slate-500">No data yet.</div>}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
