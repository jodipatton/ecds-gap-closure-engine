import Link from 'next/link';
import { repos, readSeedSummary } from '@/lib/data/repository';
import { Card, Pill, StatTile } from '@/components/ui';
import { planRiskSummary, RAF_DOLLARS } from '@/lib/risk/raf';

export const dynamic = 'force-dynamic';

export default async function RiskPage() {
  const [members, conditions, claims, summary] = await Promise.all([
    repos.members.list(),
    repos.conditions.list(),
    repos.claims.list(),
    readSeedSummary()
  ]);

  if (members.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No members yet. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">dashboard</Link>.
        </p>
      </Card>
    );
  }

  const my = summary?.measurementYear ?? new Date().getFullYear();
  const risk = planRiskSummary(members, conditions, claims, my);
  const topGap = risk.members.filter((m) => m.suspectedHccs.length > 0).slice(0, 40);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Medicare risk adjustment (RAF / HCC)</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Illustrative CMS-HCC model. RAF = demographic factor + additive HCC factors for documented
          conditions. <strong>Suspected HCCs</strong> are conditions implied by claim diagnoses that
          were never carried into a documented clinical Condition — the recapture opportunity. Not
          licensed CMS-HCC software; ${RAF_DOLLARS.toLocaleString()} / 1.0 RAF assumed.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Avg current RAF" value={risk.avgCurrentRaf.toFixed(3)} hint={`${risk.scoredMembers} scored`} />
        <StatTile label="Avg potential RAF" value={risk.avgPotentialRaf.toFixed(3)} hint="with recapture" />
        <StatTile label="Members w/ suspected gap" value={risk.membersWithSuspectedGap} hint={`${risk.medicareEligible} MA-eligible`} />
        <StatTile
          label="Revenue opportunity"
          value={`$${risk.totalRevenueOpportunity.toLocaleString()}`}
          hint="annual, illustrative"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recapture worklist — top suspected RAF gaps</h2>
          <Link
            href="/rosters?audience=payer"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Generate roster →
          </Link>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Age/Sex</th>
                  <th className="py-2 pr-4">Current RAF</th>
                  <th className="py-2 pr-4">Documented HCCs</th>
                  <th className="py-2 pr-4">Suspected HCCs (recapture)</th>
                  <th className="py-2">$ opportunity</th>
                </tr>
              </thead>
              <tbody>
                {topGap.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-slate-500">No suspected gaps — run the engine after seeding.</td></tr>
                )}
                {topGap.map((m) => (
                  <tr key={m.memberId} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4">
                      <div>{m.memberName}</div>
                      <div className="text-xs text-slate-400">{m.memberId}</div>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {m.age}/{m.sex} {m.medicareEligible && <Pill color="sky">MA</Pill>}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{m.currentRaf.toFixed(3)}</td>
                    <td className="py-2 pr-4 text-xs">
                      {m.documentedHccs.length
                        ? m.documentedHccs.map((h) => `${h.hcc} ${h.label}`).join('; ')
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <ul className="space-y-0.5">
                        {m.suspectedHccs.map((h) => (
                          <li key={h.hcc}>
                            <Pill color="amber">{h.hcc}</Pill>{' '}
                            <span className="text-slate-600">{h.label}</span>{' '}
                            <span className="text-slate-400">({h.evidenceIcd10})</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-2 font-medium text-good">
                      ${m.annualRevenueOpportunity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
