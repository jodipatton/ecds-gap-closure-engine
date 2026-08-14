import Link from 'next/link';
import { Card, Pill } from '@/components/ui';
import { ensureSeedAudit, listAudit } from '@/lib/audit/audit';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AuditPage() {
  await ensureSeedAudit();
  const events = await listAudit();

  const verified = events.filter((e) => e.psvStatus === 'verified').length;
  const totalAccepted = events.reduce((s, e) => s + e.recordsAccepted, 0);
  const totalRejected = events.reduce((s, e) => s + e.recordsRejected, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Clinical data provenance &amp; PSV audit trail
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every clinical-data acquisition (EHR sync, Provider Access API pull) is logged with its
          source system, attributed provider, resource counts, and a Primary Source Verification
          determination. Run an{' '}
          <Link href="/provider/connect" className="text-accent hover:underline">
            EHR clinical-data pull
          </Link>{' '}
          or a{' '}
          <Link href="/provider/payer-access" className="text-accent hover:underline">
            Payer Access test
          </Link>{' '}
          and it appears here.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Acquisition events</div>
          <div className="mt-1 text-2xl font-semibold">{events.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">PSV verified</div>
          <div className="mt-1 text-2xl font-semibold text-good">
            {verified}/{events.length}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Records accepted</div>
          <div className="mt-1 text-2xl font-semibold">{totalAccepted.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Records rejected</div>
          <div className="mt-1 text-2xl font-semibold text-bad">{totalRejected}</div>
        </Card>
      </section>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Timestamp</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Origin organization</th>
                <th className="py-2 pr-4">Resources</th>
                <th className="py-2 pr-4">Acc / Rej</th>
                <th className="py-2 pr-4">PSV</th>
                <th className="py-2">Initiated by</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-slate-500">No acquisition events yet.</td></tr>
              )}
              {events.map((e) => (
                <tr key={e.id} className="border-b align-top last:border-0">
                  <td className="py-2 pr-4 text-xs">{fmt(e.ts)}</td>
                  <td className="py-2 pr-4 text-xs">{e.sourceSystem}</td>
                  <td className="py-2 pr-4 text-xs">
                    <div>{e.organizationName ?? '—'}</div>
                    {e.providerNpi && <div className="text-slate-400">NPI {e.providerNpi}</div>}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {Object.entries(e.resourceCounts)
                      .filter(([, n]) => n > 0)
                      .map(([k, n]) => `${k}:${n}`)
                      .join('  ') || '—'}
                  </td>
                  <td className="py-2 pr-4 text-xs tabular-nums">
                    <span className="text-good">{e.recordsAccepted}</span>
                    {' / '}
                    <span className={e.recordsRejected ? 'text-bad' : 'text-slate-400'}>
                      {e.recordsRejected}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    <Pill color={e.psvStatus === 'verified' ? 'green' : 'amber'}>
                      {e.psvStatus}
                    </Pill>
                    <div className="mt-0.5 max-w-[16rem] text-[11px] text-slate-500">{e.psvBasis}</div>
                  </td>
                  <td className="py-2 text-xs">{e.initiatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
