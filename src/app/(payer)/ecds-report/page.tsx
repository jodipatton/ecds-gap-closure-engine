import { FileText } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { ButtonLink, Card, DataTable, EmptyState, PageHeader, TierBadge, type Column } from '@/components/ui';
import { StackedBar, CHART } from '@/components/charts';
import type { HedisResult } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export default async function EcdsReport() {
  const { results, summary } = await getSnapshot();
  const my = summary?.measurementYear;

  const columns: Array<Column<HedisResult>> = [
    {
      key: 'measure',
      header: 'Measure',
      render: (r) => (
        <>
          {r.measureName}
          <div className="font-mono text-xs font-normal text-slate-500">{r.measureId}</div>
        </>
      )
    },
    { key: 'tier', header: 'Tier', render: (r) => <TierBadge tier={r.dataTier} /> },
    { key: 'domain', header: 'Domain', className: 'text-xs', render: (r) => r.domain },
    { key: 'eligible', header: 'Eligible', align: 'right', render: (r) => r.eligiblePopulation },
    { key: 'excluded', header: 'Excluded', align: 'right', render: (r) => r.exclusions },
    {
      key: 'split',
      header: 'Numerator split (claims vs clinical)',
      className: 'min-w-[160px]',
      render: (r) => (
        <StackedBar
          height={10}
          legend={false}
          segments={[
            { label: 'Claims', value: r.numeratorFromClaims, color: CHART.good },
            { label: 'Clinical', value: r.numeratorFromClinical, color: CHART.accent },
            { label: 'Open', value: r.gapCount, color: CHART.track }
          ]}
        />
      )
    },
    { key: 'claims', header: 'Claims', align: 'right', render: (r) => r.numeratorFromClaims },
    { key: 'clinical', header: 'Clinical', align: 'right', render: (r) => r.numeratorFromClinical },
    { key: 'gaps', header: 'Open gaps', align: 'right', render: (r) => <span className="text-bad">{r.gapCount}</span> },
    { key: 'rate', header: 'Rate %', align: 'right', render: (r) => <span className="font-semibold">{r.rate.toFixed(1)}</span> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="ECDS report"
        description={`Illustrative preview of NCQA IDSS submission data for measurement year ${my ?? '—'}: rates by measure with the claims-vs-clinical numerator split an ECDS submission requires. Not a licensed IDSS export.`}
        actions={
          <>
            <ButtonLink href="/api/ecds-report?format=csv" variant="primary" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/api/ecds-report?format=json" variant="secondary" size="sm">
              Export JSON
            </ButtonLink>
          </>
        }
      />

      <Card>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART.good }} aria-hidden /> Numerator from claims
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART.accent }} aria-hidden /> Numerator from clinical data
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART.track }} aria-hidden /> Open gaps
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={results}
          rowKey={(r) => r.measureId}
          rowHref={(r) => `/measures/${r.measureId}`}
          empty={<EmptyState title="No results yet" description="Seed and run analytics from the dashboard first." />}
        />
      </Card>
    </div>
  );
}
