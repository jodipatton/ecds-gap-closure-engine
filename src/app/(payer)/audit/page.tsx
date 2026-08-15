import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge, Card, DataTable, PageHeader, StatTile, type Column } from '@/components/ui';
import { ensureSeedAudit, listAudit } from '@/lib/audit/audit';
import type { AuditEvent } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AuditPage({ searchParams }: { searchParams: { psv?: string } }) {
  await ensureSeedAudit();
  const events = await listAudit();
  const filter = searchParams.psv === 'verified' || searchParams.psv === 'unverified' ? searchParams.psv : null;
  const shown = filter ? events.filter((e) => e.psvStatus === filter) : events;

  const verified = events.filter((e) => e.psvStatus === 'verified').length;
  const totalAccepted = events.reduce((s, e) => s + e.recordsAccepted, 0);
  const totalRejected = events.reduce((s, e) => s + e.recordsRejected, 0);

  const columns: Array<Column<AuditEvent>> = [
    { key: 'ts', header: 'Timestamp', className: 'text-xs whitespace-nowrap', render: (e) => fmt(e.ts) },
    { key: 'source', header: 'Source', className: 'text-xs', render: (e) => e.sourceSystem },
    {
      key: 'org',
      header: 'Origin organization',
      className: 'text-xs',
      render: (e) => (
        <>
          <div>{e.organizationName ?? '—'}</div>
          {e.providerNpi && <div className="font-mono text-slate-400">NPI {e.providerNpi}</div>}
        </>
      )
    },
    {
      key: 'resources',
      header: 'Resources',
      className: 'text-xs',
      render: (e) =>
        Object.entries(e.resourceCounts)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${k}:${n}`)
          .join('  ') || '—'
    },
    {
      key: 'accrej',
      header: 'Acc / Rej',
      align: 'right',
      className: 'text-xs',
      render: (e) => (
        <>
          <span className="text-good">{e.recordsAccepted}</span>
          {' / '}
          <span className={e.recordsRejected ? 'text-bad' : 'text-slate-400'}>{e.recordsRejected}</span>
        </>
      )
    },
    {
      key: 'psv',
      header: 'PSV',
      className: 'text-xs',
      render: (e) => (
        <>
          <span className="inline-flex items-center gap-1">
            {e.psvStatus === 'verified' ? (
              <CheckCircle2 size={14} className="text-good" aria-hidden />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" aria-hidden />
            )}
            <Badge color={e.psvStatus === 'verified' ? 'green' : 'amber'}>{e.psvStatus}</Badge>
          </span>
          <div className="mt-0.5 max-w-[16rem] text-[11px] text-slate-500">{e.psvBasis}</div>
        </>
      )
    },
    { key: 'by', header: 'Initiated by', className: 'text-xs', render: (e) => e.initiatedBy }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldCheck size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="PSV audit trail"
        description={
          <>
            Every clinical-data acquisition (EHR sync, Provider Access API pull) is logged with its source
            system, attributed provider, resource counts, and a Primary Source Verification determination.
            Run an{' '}
            <Link href="/provider/connect" className="text-accent hover:underline">EHR clinical-data pull</Link>{' '}
            or a{' '}
            <Link href="/provider/payer-access" className="text-accent hover:underline">Payer Access test</Link>{' '}
            and it appears here.
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Acquisition events" value={events.length} />
        <StatTile label="PSV verified" value={`${verified}/${events.length}`} />
        <StatTile label="Records accepted" value={totalAccepted.toLocaleString()} />
        <StatTile label="Records rejected" value={totalRejected} />
      </section>

      <div className="flex gap-2 text-xs">
        {([
          [null, 'All'],
          ['verified', 'Verified'],
          ['unverified', 'Unverified']
        ] as const).map(([v, label]) => (
          <Link
            key={label}
            href={v ? `/audit?psv=${v}` : '/audit'}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              filter === v ? 'border-accent bg-accent/10 text-accent' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card>
        <DataTable columns={columns} rows={shown} rowKey={(e) => e.id} limit={100} />
      </Card>
    </div>
  );
}
