import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSnapshot } from '@/lib/data/snapshot';
import { getMeasure } from '@/lib/hedis/measures';
import { Check, FileText, FlaskConical, Pill, Receipt, Syringe } from 'lucide-react';
import { Badge, Card, CardHeader, DataTable, StatTile, TierBadge, type Column } from '@/components/ui';
import { Waffle, Waterfall, CHART, GAP_STATUS_COLORS, GAP_STATUS_LABELS } from '@/components/charts';
import { gapValue, measureTarget } from '@/lib/analytics/projection';
import { DATA_NEEDS, type ElementKind } from '@/lib/hedis/dataNeeds';
import { money } from '@/lib/shared/format';
import type { GapStatus, MeasureGap } from '@/lib/data/types';

const KIND_ICON: Record<ElementKind, typeof Receipt> = {
  claims: Receipt,
  observation: FlaskConical,
  medication: Pill,
  document: FileText,
  immunization: Syringe
};

const WAFFLE_ORDER: GapStatus[] = ['closed-claims', 'closed-clinical', 'open-needs-clinical', 'open-needs-document', 'excluded'];
const WAFFLE_COLORS: Record<string, string> = { ...GAP_STATUS_COLORS, excluded: CHART.track };

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<GapStatus, 'green' | 'amber' | 'rose' | 'slate' | 'sky'> = {
  'closed-claims': 'green',
  'closed-clinical': 'sky',
  'open-needs-clinical': 'amber',
  'open-needs-document': 'rose',
  'excluded': 'slate',
  'not-eligible': 'slate'
};

const STATUS_LABEL: Record<GapStatus, string> = {
  ...GAP_STATUS_LABELS,
  excluded: 'Excluded',
  'not-eligible': 'Not eligible'
} as Record<GapStatus, string>;

export default async function MeasureDetailPage({ params }: { params: { id: string } }) {
  const spec = getMeasure(params.id.toUpperCase()) ?? getMeasure(params.id);
  if (!spec) return notFound();
  const snap = await getSnapshot();
  const result = snap.results.find((r) => r.measureId === spec.id);
  const measureGaps = snap.gaps.filter((g) => g.measureId === spec.id);

  const statusCount = (s: GapStatus) => measureGaps.filter((g) => g.status === s).length;

  type Row = MeasureGap;
  const columns: Array<Column<Row>> = [
    {
      key: 'member',
      header: 'Member',
      render: (g) => {
        const m = snap.memberById.get(g.memberId);
        return (
          <>
            {m?.name ?? g.memberId} <span className="ml-1 font-mono text-xs font-normal text-slate-400">{g.memberId}</span>
          </>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (g) => <Badge color={STATUS_BADGE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
    },
    {
      key: 'evidence',
      header: 'Evidence / missing data',
      className: 'text-xs text-slate-600',
      render: (g) => (g.status.startsWith('closed') ? (g.evidence ?? []).join(', ') : g.missingDataElement ?? '—')
    },
    {
      key: 'pcp',
      header: 'Attributed PCP',
      className: 'text-xs',
      render: (g) => {
        const a = snap.attributionByMember.get(g.memberId);
        return a?.pcp?.name ?? <span className="text-rose-600">No PCP</span>;
      }
    },
    {
      key: 'ehr',
      header: 'EHR',
      className: 'text-xs',
      render: (g) => {
        const a = snap.attributionByMember.get(g.memberId);
        const p = a?.pcp ? snap.providerByNpi.get(a.pcp.npi) : null;
        return p?.ehrPlatform ?? <span className="text-slate-400">—</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/measures" className="text-xs text-accent hover:underline">← All measures</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{spec.name}</h1>
          <TierBadge tier={spec.dataTier} />
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{spec.description}</p>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Eligible" value={result.eligiblePopulation} hint={`${result.exclusions} excluded`} />
            <StatTile label="Closed (claims)" value={result.numeratorFromClaims} />
            <StatTile label="Closed (clinical)" value={result.numeratorFromClinical} />
            <StatTile label="Open gaps" value={result.gapCount} hint={money(result.gapCount * gapValue(result.dataTier)) + ' opportunity'} />
            <StatTile label="Rate" value={`${result.rate.toFixed(1)}%`} hint={`target ${measureTarget(result.measureId)}% · completeness ${result.dataCompleteness.toFixed(0)}%`} />
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="How the denominator resolves" />
              <Waterfall
                total={{ label: 'Eligible', value: result.eligiblePopulation }}
                steps={[
                  { label: 'Excluded', value: result.exclusions, color: CHART.neutral },
                  { label: 'Closed by claims', value: result.numeratorFromClaims, color: CHART.good },
                  { label: 'Closed by clinical', value: result.numeratorFromClinical, color: CHART.accent }
                ]}
                remainder={{ label: 'Open gaps', color: CHART.attention }}
              />
            </Card>
            <Card>
              <CardHeader title="Every member, one square" />
              <Waffle
                units={WAFFLE_ORDER.flatMap((s) =>
                  measureGaps
                    .filter((g) => g.status === s)
                    .map((g) => ({
                      key: g.id,
                      color: WAFFLE_COLORS[s],
                      title: `${snap.memberById.get(g.memberId)?.name ?? g.memberId} — ${STATUS_LABEL[s]}${
                        g.missingDataElement ? ` (${g.missingDataElement})` : ''
                      }`
                    }))
                )}
                legend={WAFFLE_ORDER.map((s) => ({
                  label: STATUS_LABEL[s],
                  color: WAFFLE_COLORS[s],
                  count: statusCount(s)
                }))}
              />
              {spec.dataTier !== 'claims-only' && statusCount('open-needs-clinical') + statusCount('open-needs-document') > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  The amber{statusCount('open-needs-document') > 0 ? ' and rose' : ''} squares can&apos;t be closed
                  from claims — they need{' '}
                  {spec.dataTier === 'uscdi-v3' ? 'discrete clinical data from the EHR' : 'CCDA documents'}.
                </p>
              )}
            </Card>
          </section>

          {DATA_NEEDS[spec.id] && (
            <Card>
              <CardHeader
                title="The information this measure needs"
                action={
                  <a href="/data-map" className="text-sm text-accent hover:underline">
                    Full coverage map →
                  </a>
                }
              />
              <div className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Eligible population</div>
                  <p className="mt-1 text-xs text-slate-600">{DATA_NEEDS[spec.id].eligibility}</p>
                  {DATA_NEEDS[spec.id].exclusion && (
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Excluded:</span> {DATA_NEEDS[spec.id].exclusion}
                    </p>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Closes from claims</div>
                  <p className="mt-1 text-xs text-slate-600">{DATA_NEEDS[spec.id].numeratorClaims ?? '— no claims path; a discrete clinical value is required.'}</p>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Closes from clinical data</div>
                  <p className="mt-1 text-xs text-slate-600">{DATA_NEEDS[spec.id].numeratorClinical ?? '— claims-only measure.'}</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {DATA_NEEDS[spec.id].elements.map((el) => {
                  const Icon = KIND_ICON[el.kind];
                  const missing =
                    el.kind === 'claims'
                      ? 0
                      : el.kind === 'document'
                        ? statusCount('open-needs-document')
                        : statusCount('open-needs-clinical');
                  return (
                    <div key={el.label} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                      <span className="inline-flex w-56 shrink-0 items-center gap-2 text-[13px] font-medium text-ink">
                        <Icon size={15} strokeWidth={1.75} className="text-slate-400" aria-hidden />
                        {el.label}
                      </span>
                      <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">{el.role}</span>
                      <span className="flex flex-1 flex-wrap items-center gap-1">
                        {el.codes.slice(0, 8).map((c) => (
                          <code key={c} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                            {c}
                          </code>
                        ))}
                        {el.codes.length > 8 && (
                          <span className="text-[11px] text-slate-400">+{el.codes.length - 8} more</span>
                        )}
                        <span className="ml-1 text-[11px] text-slate-400">
                          {el.codeSystem} · {el.window}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {missing === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <Check size={12} strokeWidth={2.5} aria-hidden /> mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-800">
                            {missing} member{missing === 1 ? '' : 's'} dark
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader title="Member-level detail" />
        <DataTable columns={columns} rows={measureGaps} rowKey={(g) => g.id} limit={200} />
      </Card>
    </div>
  );
}
