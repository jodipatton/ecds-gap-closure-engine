import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, Pill } from '@/components/ui';
import { buildRoster, type RosterAudience } from '@/lib/rosters/roster';

export const dynamic = 'force-dynamic';

interface SearchParams {
  audience?: string;
  npi?: string;
}

export default async function RostersPage({ searchParams }: { searchParams: SearchParams }) {
  const providers = await repos.providers.list();
  if (providers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No data yet. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">dashboard</Link>.
        </p>
      </Card>
    );
  }

  const audience: RosterAudience = searchParams.audience === 'provider' ? 'provider' : 'payer';
  const npi =
    audience === 'provider'
      ? searchParams.npi ??
        [...providers].sort((a, b) => b.memberCount - a.memberCount)[0]?.npi
      : undefined;

  const result = await buildRoster(audience, npi);
  const csvHref =
    audience === 'provider'
      ? `/api/rosters?audience=provider&npi=${npi}&format=csv`
      : `/api/rosters?audience=payer&format=csv`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Rosters</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Auto-generated actionable rosters from current gaps + suspected HCCs. The{' '}
          <strong>payer</strong> view spans the whole population with revenue lens; the{' '}
          <strong>provider</strong> view is a per-panel worklist without plan economics.
        </p>
      </div>

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
              <select name="npi" defaultValue={npi} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
                {[...providers]
                  .sort((a, b) => b.memberCount - a.memberCount)
                  .map((p) => (
                    <option key={p.npi} value={p.npi}>
                      {p.organizationName} ({p.memberCount})
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">Switch</button>
          </form>
        )}

        <a
          href={csvHref}
          className="ml-auto rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          ↓ Download CSV
        </a>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="font-semibold text-ink">{result.scope}</span>{' '}
            <Pill color={audience === 'payer' ? 'sky' : 'green'}>{audience} roster</Pill>
          </div>
          <div className="text-sm text-slate-500">{result.rowCount} actionable members</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Member</th>
                {audience === 'payer' && <th className="py-2 pr-4">PCP</th>}
                <th className="py-2 pr-4">Open gaps</th>
                <th className="py-2 pr-4">Suspected conditions</th>
                {audience === 'payer' && <th className="py-2 pr-4">RAF</th>}
                {audience === 'payer' && <th className="py-2 pr-4">$ opp.</th>}
                <th className="py-2">Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 200).map((r) => (
                <tr key={r.memberId} className="border-b align-top last:border-0">
                  <td className="py-2 pr-4">
                    <div>{r.memberName}</div>
                    <div className="text-xs text-slate-400">{r.memberId}</div>
                  </td>
                  {audience === 'payer' && <td className="py-2 pr-4 text-xs">{r.pcpName}</td>}
                  <td className="py-2 pr-4 text-xs">{r.openGapMeasures}</td>
                  <td className="py-2 pr-4 text-xs">{r.suspectedHccs}</td>
                  {audience === 'payer' && <td className="py-2 pr-4 tabular-nums">{r.currentRaf.toFixed(3)}</td>}
                  {audience === 'payer' && (
                    <td className="py-2 pr-4 tabular-nums text-good">
                      {r.revenueOpportunity ? `$${r.revenueOpportunity.toLocaleString()}` : '—'}
                    </td>
                  )}
                  <td className="py-2 text-xs">{r.recommendedAction}</td>
                </tr>
              ))}
              {result.rows.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-slate-500">No actionable members for this scope.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {result.rows.length > 200 && (
          <p className="mt-2 text-xs text-slate-500">Showing first 200 of {result.rowCount}. Full set in the CSV.</p>
        )}
      </Card>
    </div>
  );
}
