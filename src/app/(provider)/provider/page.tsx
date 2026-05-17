import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, StatTile, Pill } from '@/components/ui';
import { buildRoster } from '@/lib/rosters/roster';
import { contractForProvider } from '@/lib/contracts/vbc';

export const dynamic = 'force-dynamic';

interface SearchParams {
  npi?: string;
}

export default async function ProviderDashboard({ searchParams }: { searchParams: SearchParams }) {
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
  const provider = providers.find((p) => p.npi === npi) ?? byPanel[0];

  const [roster, contract] = await Promise.all([
    buildRoster('provider', npi),
    contractForProvider(npi)
  ]);
  const needCare = roster.rows.filter((r) => r.openGapCount > 0);
  const openGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  const cards: Array<{ href: string; title: string; desc: string }> = [
    { href: '/provider/connect', title: 'EHR Connection', desc: 'Connect this practice’s EHR and pull clinical data to close gaps.' },
    { href: '/provider/payer-access', title: 'Provider Access API', desc: 'Attest and connect to Fallon Health’s Provider Access API.' },
    { href: '/provider/contract', title: 'Contract & value', desc: 'See your value-based contract and the value of closing gaps.' },
    { href: '/provider/care', title: 'Members & care', desc: 'Work the panel — generate calls, texts, and letters.' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Provider dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {provider.organizationName} · NPI {provider.npi} · {provider.specialty}
          </p>
        </div>
        <form action="/provider" method="get" className="flex items-end gap-2">
          <select name="npi" defaultValue={npi} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
            {byPanel.map((p) => (
              <option key={p.npi} value={p.npi}>{p.organizationName} ({p.memberCount})</option>
            ))}
          </select>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">Switch</button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Attributed panel" value={provider.memberCount} />
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
          <h2 className="font-semibold text-ink">Top members needing care</h2>
          <Link href={`/provider/care?npi=${npi}`} className="text-sm text-accent hover:underline">
            Work the full list →
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {needCare.slice(0, 6).map((r) => (
            <li key={r.memberId} className="flex items-center justify-between py-2">
              <span>
                {r.memberName}{' '}
                <span className="text-xs text-slate-400">{r.memberId}</span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                <Pill color="rose">{r.openGapCount} gaps</Pill>
                <span className="text-slate-500">{r.openGapMeasures}</span>
              </span>
            </li>
          ))}
          {needCare.length === 0 && <li className="py-3 text-slate-500">No open care gaps for this panel.</li>}
        </ul>
      </Card>
    </div>
  );
}
