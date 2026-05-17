import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, Pill, StatTile } from '@/components/ui';
import { buildRoster } from '@/lib/rosters/roster';
import { CareActions } from '@/components/provider/CareActions';

export const dynamic = 'force-dynamic';

interface SearchParams {
  npi?: string;
}

export default async function CarePage({ searchParams }: { searchParams: SearchParams }) {
  const providers = await repos.providers.list();
  if (providers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No data yet. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">plan dashboard</Link>.
        </p>
      </Card>
    );
  }

  const byPanel = [...providers].sort((a, b) => b.memberCount - a.memberCount);
  const npi = searchParams.npi ?? byPanel[0].npi;
  const roster = await buildRoster('provider', npi);
  const needCare = roster.rows.filter((r) => r.openGapCount > 0);
  const totalGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Members needing care</h1>
          <p className="mt-1 text-sm text-slate-600">
            {roster.scope} · members with open HEDIS care gaps. Generate a call script, text, or
            letter per member.
          </p>
        </div>
        <form action="/provider/care" method="get" className="flex items-end gap-2">
          <select name="npi" defaultValue={npi} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
            {byPanel.map((p) => (
              <option key={p.npi} value={p.npi}>{p.organizationName} ({p.memberCount})</option>
            ))}
          </select>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">Switch</button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Members needing care" value={needCare.length} />
        <StatTile label="Open care gaps" value={totalGaps} />
        <StatTile label="Panel members" value={roster.rowCount} hint="actionable" />
        <StatTile label="Suspected conditions" value={needCare.filter((r) => r.suspectedHccCount > 0).length} hint="to document" />
      </section>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Open care gaps</th>
                <th className="py-2 pr-4">Recommended action</th>
                <th className="py-2">Outreach</th>
              </tr>
            </thead>
            <tbody>
              {needCare.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-slate-500">No open care gaps for this panel.</td></tr>
              )}
              {needCare.slice(0, 150).map((r) => {
                const firstMeasure = r.openGapMeasures.split('; ')[0];
                return (
                  <tr key={r.memberId} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4">
                      <div>{r.memberName}</div>
                      <div className="text-xs text-slate-400">{r.memberId}</div>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <Pill color="rose">{r.openGapCount}</Pill>{' '}
                      <span className="text-slate-600">{r.openGapMeasures}</span>
                    </td>
                    <td className="py-2 pr-4 text-xs">{r.recommendedAction}</td>
                    <td className="py-2">
                      <CareActions memberId={r.memberId} measureId={firstMeasure} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {needCare.length > 150 && (
          <p className="mt-2 text-xs text-slate-500">Showing first 150 of {needCare.length}.</p>
        )}
      </Card>
    </div>
  );
}
