import Link from 'next/link';
import { Card, Pill, StatTile } from '@/components/ui';
import { buildRoster } from '@/lib/rosters/roster';
import { CareActions } from '@/components/provider/CareActions';
import { getPractice, practiceClinicians, clinicianForMember } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

interface SearchParams {
  clinician?: string;
}

export default async function CarePage({ searchParams }: { searchParams: SearchParams }) {
  const practice = await getPractice();
  if (!practice) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No data yet. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">plan console</Link>.
        </p>
      </Card>
    );
  }

  const clinicians = practiceClinicians(practice);
  const selected = searchParams.clinician ?? 'all';

  const roster = await buildRoster('provider', practice.npi);
  const withClinician = roster.rows
    .filter((r) => r.openGapCount > 0)
    .map((r) => ({ ...r, clinician: clinicianForMember(r.memberId, clinicians) }));
  const needCare =
    selected === 'all'
      ? withClinician
      : withClinician.filter((r) => r.clinician.id === selected);
  const totalGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Members needing care</h1>
          <p className="mt-1 text-sm text-slate-600">
            {practice.organizationName} · members with open HEDIS care gaps. Filter by the clinician
            the member is seeing, then generate a call, text, or letter — or push it into the EHR.
          </p>
        </div>
        <form action="/provider/care" method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-500">Seeing clinician</span>
            <select
              name="clinician"
              defaultValue={selected}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="all">All clinicians</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.specialty}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Filter
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Members needing care" value={needCare.length} />
        <StatTile label="Open care gaps" value={totalGaps} />
        <StatTile
          label="Clinician"
          value={selected === 'all' ? 'All' : clinicians.find((c) => c.id === selected)?.name ?? '—'}
        />
        <StatTile
          label="Suspected conditions"
          value={needCare.filter((r) => r.suspectedHccCount > 0).length}
          hint="to document"
        />
      </section>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Seeing</th>
                <th className="py-2 pr-4">Open care gaps</th>
                <th className="py-2 pr-4">Recommended action</th>
                <th className="py-2">Outreach</th>
              </tr>
            </thead>
            <tbody>
              {needCare.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-slate-500">No open care gaps for this selection.</td></tr>
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
                      <div>{r.clinician.name}</div>
                      <div className="text-slate-400">{r.clinician.specialty}</div>
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
