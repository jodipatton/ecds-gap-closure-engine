import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSnapshot } from '@/lib/data/snapshot';
import { getMeasure } from '@/lib/hedis/measures';
import { Badge, Card, CardHeader, DataTable, StatTile, TierBadge, type Column } from '@/components/ui';
import { StackedBar, GAP_STATUS_COLORS, GAP_STATUS_LABELS } from '@/components/charts';
import { gapValue, measureTarget } from '@/lib/analytics/projection';
import { money } from '@/lib/shared/format';
import type { GapStatus, MeasureGap } from '@/lib/data/types';

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

          <Card>
            <CardHeader title="Where the denominator stands" />
            <StackedBar
              height={16}
              segments={(['closed-claims', 'closed-clinical', 'open-needs-clinical', 'open-needs-document'] as const).map(
                (s) => ({ label: GAP_STATUS_LABELS[s], value: statusCount(s), color: GAP_STATUS_COLORS[s] })
              )}
            />
            {spec.dataTier !== 'claims-only' && statusCount('open-needs-clinical') + statusCount('open-needs-document') > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Claims alone can&apos;t close the open segment — these members need {spec.dataTier === 'uscdi-v3' ? 'discrete clinical data (FHIR Observations, medications)' : 'CCDA documents'} pulled from their provider&apos;s EHR.
              </p>
            )}
          </Card>
        </>
      )}

      <Card>
        <CardHeader title="Member-level detail" />
        <DataTable columns={columns} rows={measureGaps} rowKey={(g) => g.id} limit={200} />
      </Card>
    </div>
  );
}
