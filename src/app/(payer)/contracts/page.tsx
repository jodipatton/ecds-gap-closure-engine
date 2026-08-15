import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import { Badge, ButtonLink, Card, CardHeader, DataTable, EmptyState, PageHeader, StatTile, type Column } from '@/components/ui';
import { StackedBar, CHART } from '@/components/charts';
import { allContractValues, type ContractValue } from '@/lib/contracts/vbc';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

const MODEL_COLOR = { 'P4P': 'sky', 'Shared Savings': 'amber', 'Full Risk': 'rose' } as const;

export default async function ContractsPage() {
  const values = await allContractValues();

  if (values.length === 0) {
    return (
      <EmptyState
        title="No value-based contracts yet"
        description="Seed providers and run analytics from the dashboard first."
        action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
      />
    );
  }

  const totOpp = values.reduce((s, v) => s + v.openOpportunity, 0);
  const totAtRisk = values.reduce((s, v) => s + v.qualityAtRisk, 0);
  const totEarned = values.reduce((s, v) => s + v.earnedToDate, 0);
  const totRecapture = values.reduce((s, v) => s + v.riskRecapture, 0);

  const columns: Array<Column<ContractValue>> = [
    {
      key: 'provider',
      header: 'Provider',
      render: (v) => (
        <>
          {v.contract.organizationName}
          <div className="font-mono text-xs font-normal text-slate-400">NPI {v.contract.providerNpi}</div>
        </>
      )
    },
    { key: 'model', header: 'Model', render: (v) => <Badge color={MODEL_COLOR[v.contract.model]}>{v.contract.model}</Badge> },
    { key: 'measures', header: 'Measures', className: 'text-xs', render: (v) => v.contract.measureIds.join(', ') },
    { key: 'panel', header: 'Panel', align: 'right', render: (v) => v.panelSize },
    {
      key: 'rate',
      header: 'Avg rate / target',
      className: 'text-xs whitespace-nowrap',
      render: (v) => (
        <>
          <span className={v.avgRatePct >= v.contract.targetRatePct ? 'text-good' : 'text-bad'}>{v.avgRatePct}%</span>{' '}
          <span className="text-slate-400">/ {v.contract.targetRatePct}%</span>
        </>
      )
    },
    {
      key: 'split',
      header: 'Value composition',
      className: 'min-w-[150px]',
      render: (v) => (
        <StackedBar
          height={10}
          legend={false}
          format={money}
          segments={[
            { label: 'Earned', value: v.earnedToDate, color: CHART.good },
            { label: 'Open opportunity', value: v.openOpportunity, color: CHART.accent },
            { label: 'Withhold at risk', value: v.qualityAtRisk, color: CHART.attention },
            { label: 'Risk recapture', value: v.riskRecapture, color: CHART.recapture }
          ]}
        />
      )
    },
    { key: 'stake', header: 'Total at stake', align: 'right', render: (v) => <span className="font-semibold text-ink">{money(v.totalValueAtStake)}</span> },
    {
      key: 'model-link',
      header: '',
      className: 'text-xs',
      render: () => (
        <Link href="/analytics" className="whitespace-nowrap text-accent hover:underline">
          Model →
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileSignature size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Value-based contracts"
        description="Fallon Health value-based agreements with the provider network. Synthetic terms; the gap-value math is shared with the provider view so both sides see the same economics of closing member gaps."
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active contracts" value={values.length} />
        <StatTile label="Incentive earned" value={money(totEarned)} hint="closed gaps" />
        <StatTile label="Open gap opportunity" value={money(totOpp)} hint="if gaps close" />
        <StatTile label="Quality $ at risk" value={money(totAtRisk)} hint="withhold not yet earned" />
      </section>

      <Card>
        <CardHeader
          title="Portfolio value composition"
          action={<Link href="/analytics" className="text-sm text-accent hover:underline">Simulate closures →</Link>}
        />
        <StackedBar
          height={16}
          format={money}
          segments={[
            { label: 'Earned to date', value: totEarned, color: CHART.good },
            { label: 'Open gap opportunity', value: totOpp, color: CHART.accent },
            { label: 'Quality withhold at risk', value: totAtRisk, color: CHART.attention },
            { label: 'Risk recapture', value: totRecapture, color: CHART.recapture }
          ]}
        />
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={[...values].sort((a, b) => b.totalValueAtStake - a.totalValueAtStake)}
          rowKey={(v) => v.contract.id}
        />
        <p className="mt-3 text-xs text-slate-500">
          Risk recapture also reflected on the{' '}
          <Link href="/risk" className="text-accent hover:underline">RAF page</Link>. Providers see their own
          contract in the{' '}
          <Link href="/provider/contract" className="text-accent hover:underline">provider portal</Link> —
          same math, other side of the table.
        </p>
      </Card>
    </div>
  );
}
