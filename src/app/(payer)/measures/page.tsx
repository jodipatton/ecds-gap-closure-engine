import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, ProgressBar, TierBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MeasuresPage() {
  const results = await repos.hedisResults.list();
  const tiers: Array<['claims-only' | 'uscdi-v3' | 'ccda', string]> = [
    ['claims-only', 'Tier 1 — Claims only'],
    ['uscdi-v3', 'Tier 2 — USCDI V3 discrete data via FHIR'],
    ['ccda', 'Tier 3 — Full CCDA required']
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">HEDIS ECDS Measures</h1>
        <p className="text-sm text-slate-600 mt-1">Grouped by clinical-data tier.</p>
      </div>
      {tiers.map(([tier, label]) => {
        const inTier = results.filter((r) => r.dataTier === tier);
        return (
          <section key={tier}>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-lg font-semibold">{label}</h2>
              <TierBadge tier={tier} />
            </div>
            {inTier.length === 0 ? (
              <Card><p className="text-sm text-slate-500">No measures in this tier yet (run the engine).</p></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {inTier.map((r) => (
                  <Link key={r.measureId} href={`/measures/${r.measureId}`}>
                    <Card className="hover:shadow transition">
                      <div className="font-medium">{r.measureName}</div>
                      <div className="text-xs text-slate-500 mt-1">{r.domain}</div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-500">Eligible</span><div className="text-base font-semibold">{r.eligiblePopulation}</div></div>
                        <div><span className="text-slate-500">Numerator</span><div className="text-base font-semibold">{r.combinedNumerator}</div></div>
                        <div><span className="text-slate-500">Gaps</span><div className="text-base font-semibold text-bad">{r.gapCount}</div></div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1"><ProgressBar value={r.rate} /></div>
                        <span className="text-sm font-medium">{r.rate.toFixed(1)}%</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
