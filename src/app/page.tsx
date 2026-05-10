import Link from 'next/link';
import { repos, readSeedSummary } from '@/lib/data/repository';
import { Card, Pill, ProgressBar, StatTile, TierBadge } from '@/components/ui';
import { SeedAndRun } from '@/components/SeedAndRun';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [summary, results, gaps, engagement, ehrImpact] = await Promise.all([
    readSeedSummary(),
    repos.hedisResults.list(),
    repos.gaps.list(),
    repos.engagement.list(),
    ehrPlatformGapImpact()
  ]);
  const seeded = summary !== null;
  const hasResults = results.length > 0;

  const totalEligible = results.reduce((s, r) => s + r.eligiblePopulation, 0);
  const totalNumerator = results.reduce((s, r) => s + r.combinedNumerator, 0);
  const totalGaps = gaps.filter((g) => g.status.startsWith('open-')).length;
  const overallRate = totalEligible === 0 ? 0 : ((totalNumerator / totalEligible) * 100);

  const dollarRanked = results
    .map((r) => ({ ...r, impact: r.gapCount * (r.dataTier === 'claims-only' ? 220 : r.dataTier === 'uscdi-v3' ? 380 : 520) }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink">Plan-wide quality posture</h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          ECDS reporting against FHIR-normalized claims and clinical data. Run the engine to compute
          eligible populations, numerator hits, and open gaps for ten HEDIS measures across three
          clinical-data tiers.
        </p>
        <SeedAndRun seeded={seeded} hasResults={hasResults} />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Members" value={summary?.members ?? 0} hint={seeded ? `MY ${summary?.measurementYear}` : 'Seed not run'} />
        <StatTile label="Eligible × measures" value={totalEligible} hint="across all measures" />
        <StatTile label="Open gaps" value={totalGaps} hint={hasResults ? '' : 'Run the engine'} />
        <StatTile label="Overall rate" value={`${overallRate.toFixed(1)}%`} hint="numerator / eligible" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Measures</h2>
          <Link href="/measures" className="text-sm text-accent hover:underline">View all →</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {results.length === 0 && (
            <Card><p className="text-sm text-slate-500">No results yet. Seed and run the engine to populate measures.</p></Card>
          )}
          {results.map((r) => (
            <Link key={r.measureId} href={`/measures/${r.measureId}`}>
              <Card className="hover:shadow transition">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-ink">{r.measureName}</div>
                    <div className="mt-1 text-xs text-slate-500">{r.domain}</div>
                  </div>
                  <TierBadge tier={r.dataTier} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500">Eligible</span><div className="text-base font-semibold">{r.eligiblePopulation}</div></div>
                  <div><span className="text-slate-500">Numerator</span><div className="text-base font-semibold">{r.combinedNumerator}</div></div>
                  <div><span className="text-slate-500">Gaps</span><div className="text-base font-semibold text-bad">{r.gapCount}</div></div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><ProgressBar value={r.rate} /></div>
                  <span className="text-sm font-medium">{r.rate.toFixed(1)}%</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {r.numeratorFromClaims} closed by claims · {r.numeratorFromClinical} closed by clinical data
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {hasResults && (
        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold mb-3">Top dollar-ranked opportunities</h2>
            <p className="text-xs text-slate-500 mb-3">
              Illustrative: gap count × per-gap closure value (Tier 1 $220, Tier 2 $380, Tier 3 $520).
            </p>
            <ol className="space-y-2 text-sm">
              {dollarRanked.map((r) => (
                <li key={r.measureId} className="flex justify-between gap-3 items-center">
                  <Link href={`/measures/${r.measureId}`} className="hover:underline">{r.measureName}</Link>
                  <span className="text-slate-700">${r.impact.toLocaleString()} <span className="text-slate-400">({r.gapCount} gaps)</span></span>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Open gap impact by EHR platform</h2>
              <Link href="/providers" className="text-sm text-accent hover:underline">Provider roster →</Link>
            </div>
            <ul className="space-y-2 text-sm">
              {ehrImpact.map((row) => (
                <li key={row.platform} className="flex justify-between items-center gap-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{row.platform}</span>
                    <Pill color={row.platform === 'No PCP' || row.platform === 'Unconnected' ? 'rose' : 'sky'}>
                      {row.orgCount} orgs
                    </Pill>
                  </span>
                  <span className="text-slate-700">{row.openGaps} gaps · <span className="text-slate-500">{row.sharePct}%</span></span>
                </li>
              ))}
              {ehrImpact.length === 0 && <li className="text-slate-500">No data yet.</li>}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Engagement queue</div>
              <div className="text-sm text-slate-500">Members with no visit, no PCP, or actionable gaps.</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{engagement.length}</div>
              <Link href="/engagement" className="text-sm text-accent hover:underline">Open queue →</Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
