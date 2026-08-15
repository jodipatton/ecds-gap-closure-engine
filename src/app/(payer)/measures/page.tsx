import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { Card, CardHeader, EmptyState, ButtonLink, PageHeader, TierBadge } from '@/components/ui';
import { AgePyramid, BulletBar, type PyramidBand } from '@/components/charts';
import { gapValue, measureTarget } from '@/lib/analytics/projection';
import { ageOn } from '@/lib/shared/dates';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

const TIERS: Array<['claims-only' | 'uscdi-v3' | 'ccda', string]> = [
  ['claims-only', 'Tier 1 — Claims only'],
  ['uscdi-v3', 'Tier 2 — USCDI V3 discrete data via FHIR'],
  ['ccda', 'Tier 3 — Full CCDA required']
];

export default async function MeasuresPage() {
  const snap = await getSnapshot();
  const { results } = snap;

  // Covered population by age band × sex — why the denominators look the way
  // they do (kids drive CIS/WCV, 45+ drives COL/BCS, 65+ drives risk).
  const ref = `${snap.measurementYear}-12-31`;
  const BAND_SIZE = 10;
  const bandMap = new Map<number, { left: number; right: number }>();
  for (const m of snap.members) {
    const band = Math.min(8, Math.floor(ageOn(m.birthDate, ref) / BAND_SIZE));
    const cur = bandMap.get(band) ?? { left: 0, right: 0 };
    if (m.sex === 'F') cur.left++;
    else cur.right++;
    bandMap.set(band, cur);
  }
  const bands: PyramidBand[] = Array.from({ length: 9 }, (_, i) => ({
    band: i === 8 ? '80+' : `${i * BAND_SIZE}–${i * BAND_SIZE + 9}`,
    left: bandMap.get(i)?.left ?? 0,
    right: bandMap.get(i)?.right ?? 0
  })).reverse();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Gauge size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="HEDIS measures"
        description="Ten ECDS measures grouped by the clinical-data tier required to close them. Bars show rate against the illustrative plan target (tick)."
      />

      {results.length === 0 ? (
        <EmptyState
          title="No measure results yet"
          description="Seed synthetic data and run analytics to compute all ten measures."
          action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
        />
      ) : (
        TIERS.map(([tier, label]) => {
          const inTier = results.filter((r) => r.dataTier === tier);
          if (inTier.length === 0) return null;
          return (
            <section key={tier}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-semibold text-ink">{label}</h2>
                <TierBadge tier={tier} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {inTier.map((r) => {
                  const target = measureTarget(r.measureId);
                  return (
                    <Link key={r.measureId} href={`/measures/${r.measureId}`} className="block">
                      <Card className="h-full transition hover:shadow">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-medium text-ink">{r.measureName}</div>
                          <span className="text-lg font-semibold tabular-nums text-ink">{r.rate.toFixed(1)}%</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">{r.domain}</div>
                        <div className="mt-3">
                          <BulletBar value={r.rate} target={target} />
                          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                            <span>
                              {r.combinedNumerator}/{r.combinedNumerator + r.gapCount} closed
                            </span>
                            <span>target {target}%</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs">
                          <span className="text-slate-600">
                            <span className="font-semibold text-bad">{r.gapCount}</span> open gaps
                          </span>
                          <span className="text-slate-600">
                            <span className="font-semibold text-ink">{money(r.gapCount * gapValue(r.dataTier))}</span>{' '}
                            opportunity
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {snap.members.length > 0 && (
        <Card>
          <CardHeader
            title="Covered population"
            action={<span className="text-xs text-slate-500">{snap.members.length} members · MY {snap.measurementYear}</span>}
          />
          <div className="mx-auto max-w-xl">
            <AgePyramid bands={bands} leftLabel="Female" rightLabel="Male" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            The age mix explains the denominators above: the pediatric bands drive CIS and WCV, the 45–75
            bands drive COL and BCS, and the 65+ bands carry most of the RAF opportunity.
          </p>
        </Card>
      )}
    </div>
  );
}
