import Link from 'next/link';
import { ClipboardList, Download } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { Badge, ButtonLink, Card, CardHeader, DataTable, EmptyState, PageHeader, Select, type Column } from '@/components/ui';
import { buildRoster, type RosterAudience, type RosterRow } from '@/lib/rosters/roster';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

interface SearchParams {
  audience?: string;
  npi?: string;
}

export default async function RostersPage({ searchParams }: { searchParams: SearchParams }) {
  const { providers } = await getSnapshot();
  if (providers.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="Seed synthetic data and run analytics from the dashboard first."
        action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
      />
    );
  }

  const audience: RosterAudience = searchParams.audience === 'provider' ? 'provider' : 'payer';
  const npi =
    audience === 'provider'
      ? searchParams.npi ?? [...providers].sort((a, b) => b.memberCount - a.memberCount)[0]?.npi
      : undefined;

  const result = await buildRoster(audience, npi);
  const csvHref =
    audience === 'provider'
      ? `/api/rosters?audience=provider&npi=${npi}&format=csv`
      : `/api/rosters?audience=payer&format=csv`;

  const payerOnly = audience === 'payer';
  const columns: Array<Column<RosterRow>> = [
    {
      key: 'member',
      header: 'Member',
      render: (r) => (
        <>
          {r.memberName}
          <div className="font-mono text-xs font-normal text-slate-400">{r.memberId}</div>
        </>
      )
    },
    ...(payerOnly ? [{ key: 'pcp', header: 'PCP', className: 'text-xs', render: (r: RosterRow) => r.pcpName }] : []),
    { key: 'gaps', header: 'Open gaps', className: 'text-xs', render: (r) => r.openGapMeasures },
    { key: 'hcc', header: 'Suspected conditions', className: 'text-xs', render: (r) => r.suspectedHccs },
    ...(payerOnly
      ? [
          { key: 'raf', header: 'RAF', align: 'right' as const, render: (r: RosterRow) => r.currentRaf.toFixed(3) },
          {
            key: 'opp',
            header: '$ opp.',
            align: 'right' as const,
            render: (r: RosterRow) => (r.revenueOpportunity ? <span className="text-good">{money(r.revenueOpportunity)}</span> : '—')
          }
        ]
      : []),
    { key: 'action', header: 'Recommended action', className: 'text-xs', render: (r) => r.recommendedAction }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Actionable rosters"
        description={
          <>
            Auto-generated from current gaps + suspected HCCs. The <strong>payer</strong> view spans the
            whole population with a revenue lens; the <strong>provider</strong> view is a per-panel
            worklist without plan economics.
          </>
        }
        actions={
          <ButtonLink href={csvHref} size="sm" icon={<Download size={14} aria-hidden />}>
            Download CSV
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href="/rosters?audience=payer"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              audience === 'payer' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Payer
          </Link>
          <Link
            href={`/rosters?audience=provider${npi ? `&npi=${npi}` : ''}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              audience === 'provider' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Provider
          </Link>
        </div>

        {audience === 'provider' && (
          <form action="/rosters" method="get" className="flex items-end gap-2">
            <input type="hidden" name="audience" value="provider" />
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">Provider</span>
              <Select name="npi" defaultValue={npi} className="w-auto py-1.5">
                {[...providers]
                  .sort((a, b) => b.memberCount - a.memberCount)
                  .map((p) => (
                    <option key={p.npi} value={p.npi}>
                      {p.organizationName} ({p.memberCount})
                    </option>
                  ))}
              </Select>
            </label>
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Switch
            </button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader
          title={
            <>
              {result.scope}{' '}
              <Badge color={audience === 'payer' ? 'sky' : 'green'}>{audience} roster</Badge>
            </>
          }
          action={<span className="text-sm text-slate-500">{result.rowCount} actionable members</span>}
        />
        <DataTable
          columns={columns}
          rows={result.rows}
          rowKey={(r) => r.memberId}
          limit={200}
          empty={<EmptyState title="No actionable members for this scope" description="Every member in this panel is either fully closed or has no suspected conditions." />}
        />
      </Card>
    </div>
  );
}
