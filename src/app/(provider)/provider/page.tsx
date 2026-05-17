import Link from 'next/link';
import { Card, StatTile, Pill } from '@/components/ui';
import { buildRoster } from '@/lib/rosters/roster';
import { contractForProvider } from '@/lib/contracts/vbc';
import { getPractice, practiceClinicians, clinicianForMember } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

export default async function ProviderDashboard() {
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
  const [roster, contract] = await Promise.all([
    buildRoster('provider', practice.npi),
    contractForProvider(practice.npi)
  ]);
  const needCare = roster.rows.filter((r) => r.openGapCount > 0);
  const openGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  // Open-gap load per clinician within the practice.
  const perClinician = clinicians.map((c) => {
    const rows = needCare.filter((r) => clinicianForMember(r.memberId, clinicians).id === c.id);
    return {
      clinician: c,
      members: rows.length,
      gaps: rows.reduce((s, r) => s + r.openGapCount, 0)
    };
  });

  const cards = [
    { href: '/provider/connect', title: 'EHR Connection', desc: 'Connect this practice’s EHR and pull clinical data to close gaps.' },
    { href: '/provider/payer-access', title: 'Provider Access API', desc: 'Attest and connect to Fallon Health’s Provider Access API.' },
    { href: '/provider/contract', title: 'Contract & value', desc: 'Your value-based contract and the value of closing gaps.' },
    { href: '/provider/care', title: 'Members & care', desc: 'Work the panel by clinician — call, text, letter, push to EHR.' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Provider dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {practice.organizationName} · NPI {practice.npi} · {practice.specialty} ·{' '}
          {practice.ehrPlatform ?? 'unvalidated EHR'}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Attributed panel" value={practice.memberCount} />
        <StatTile label="Members needing care" value={needCare.length} hint={`${openGaps} open gaps`} />
        <StatTile
          label="Value at stake"
          value={contract ? `$${contract.totalValueAtStake.toLocaleString()}` : '—'}
          hint={contract ? contract.contract.model : 'no contract'}
        />
        <StatTile
          label="Risk recapture"
          value={contract ? `$${contract.riskRecapture.toLocaleString()}` : '—'}
          hint="document HCCs"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition hover:shadow">
              <div className="font-medium text-ink">{c.title}</div>
              <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
              <div className="mt-2 text-sm text-accent">Open →</div>
            </Card>
          </Link>
        ))}
      </section>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Open gaps by clinician</h2>
          <Link href="/provider/care" className="text-sm text-accent hover:underline">
            Work the panel →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Clinician</th>
              <th className="py-2 pr-4">Specialty</th>
              <th className="py-2 pr-4">Members needing care</th>
              <th className="py-2">Open gaps</th>
            </tr>
          </thead>
          <tbody>
            {perClinician.map((p) => (
              <tr key={p.clinician.id} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <Link
                    href={`/provider/care?clinician=${p.clinician.id}`}
                    className="text-accent hover:underline"
                  >
                    {p.clinician.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-xs text-slate-500">{p.clinician.specialty}</td>
                <td className="py-2 pr-4">{p.members}</td>
                <td className="py-2">
                  <Pill color={p.gaps > 0 ? 'rose' : 'green'}>{p.gaps}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
