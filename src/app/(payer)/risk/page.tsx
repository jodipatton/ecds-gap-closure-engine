import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { getRisk, getSnapshot } from '@/lib/data/snapshot';
import { Badge, ButtonLink, Card, CardHeader, DataTable, EmptyState, PageHeader, StatTile, type Column } from '@/components/ui';
import { BarList, Histogram, CHART } from '@/components/charts';
import { RAF_DOLLARS, type MemberRisk } from '@/lib/risk/raf';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

export default async function RiskPage() {
  const snap = await getSnapshot();
  if (snap.members.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        description="Seed synthetic data and run analytics from the dashboard first."
        action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
      />
    );
  }

  const risk = await getRisk();
  const topGap = risk.members.filter((m) => m.suspectedHccs.length > 0).slice(0, 40);

  // Recapture $ aggregated by suspected HCC.
  const byHcc = new Map<string, { label: string; count: number; dollars: number }>();
  for (const m of risk.members) {
    for (const h of m.suspectedHccs) {
      const cur = byHcc.get(h.hcc) ?? { label: h.label, count: 0, dollars: 0 };
      cur.count++;
      cur.dollars += Math.round(h.coef * RAF_DOLLARS);
      byHcc.set(h.hcc, cur);
    }
  }
  const hccRows = [...byHcc.entries()]
    .map(([hcc, v]) => ({ hcc, ...v }))
    .sort((a, b) => b.dollars - a.dollars)
    .slice(0, 8);

  const columns: Array<Column<MemberRisk>> = [
    {
      key: 'member',
      header: 'Member',
      render: (m) => (
        <>
          {m.memberName}
          <div className="font-mono text-xs font-normal text-slate-400">{m.memberId}</div>
        </>
      )
    },
    {
      key: 'demo',
      header: 'Age/Sex',
      className: 'text-xs',
      render: (m) => (
        <>
          {m.age}/{m.sex} {m.medicareEligible && <Badge color="sky">MA</Badge>}
        </>
      )
    },
    { key: 'raf', header: 'Current RAF', align: 'right', render: (m) => m.currentRaf.toFixed(3) },
    {
      key: 'documented',
      header: 'Documented HCCs',
      className: 'text-xs',
      render: (m) => (m.documentedHccs.length ? m.documentedHccs.map((h) => `${h.hcc} ${h.label}`).join('; ') : '—')
    },
    {
      key: 'suspected',
      header: 'Suspected HCCs (recapture)',
      className: 'text-xs',
      render: (m) => (
        <ul className="space-y-0.5">
          {m.suspectedHccs.map((h) => (
            <li key={h.hcc}>
              <Badge color="amber">{h.hcc}</Badge> <span className="text-slate-600">{h.label}</span>{' '}
              <span className="text-slate-400">({h.evidenceIcd10})</span>
            </li>
          ))}
        </ul>
      )
    },
    {
      key: 'opp',
      header: '$ opportunity',
      align: 'right',
      render: (m) => <span className="font-medium text-good">{money(m.annualRevenueOpportunity)}</span>
    },
    {
      key: 'ask',
      header: '',
      className: 'text-xs',
      render: (m) => (
        <Link href={`/chat?q=${encodeURIComponent(`What is the RAF detail for ${m.memberId}?`)}`} className="whitespace-nowrap text-accent hover:underline">
          Ask assistant →
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<HeartPulse size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Risk adjustment (RAF / HCC)"
        description={
          <>
            Illustrative CMS-HCC model. RAF = demographic factor + additive HCC factors for documented
            conditions. <strong>Suspected HCCs</strong> are conditions implied by claim diagnoses that were
            never carried into a documented clinical Condition — the recapture opportunity. Not licensed
            CMS-HCC software; {money(RAF_DOLLARS)} / 1.0 RAF assumed.
          </>
        }
        actions={<ButtonLink href="/rosters?audience=payer" size="sm">Generate roster →</ButtonLink>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Avg current RAF" value={risk.avgCurrentRaf.toFixed(3)} hint={`${risk.scoredMembers} scored`} />
        <StatTile label="Avg potential RAF" value={risk.avgPotentialRaf.toFixed(3)} hint="with recapture" />
        <StatTile label="Members w/ suspected gap" value={risk.membersWithSuspectedGap} hint={`${risk.medicareEligible} MA-eligible`} />
        <StatTile label="Revenue opportunity" value={money(risk.totalRevenueOpportunity)} hint="annual, illustrative" />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="RAF score distribution" />
          <Histogram
            values={risk.members.map((m) => m.currentRaf)}
            binSize={0.25}
            min={0}
            max={Math.max(2.5, ...risk.members.map((m) => m.currentRaf))}
            format={(n) => n.toFixed(2)}
            markers={[
              { value: risk.avgCurrentRaf, label: 'avg current', color: '#0A1733' },
              { value: risk.avgPotentialRaf, label: 'avg with recapture', color: CHART.recapture }
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            The gap between the two markers is the documentation opportunity — same members, same
            conditions, better capture.
          </p>
        </Card>
        {hccRows.length > 0 && (
          <Card>
            <CardHeader title="Top suspected HCCs by recapture value" />
            <BarList
              format={money}
              rows={hccRows.map((h, i) => ({
                label: `${h.hcc} · ${h.label}`,
                value: h.dollars,
                emphasized: i === 0,
                hint: `${h.count} member${h.count > 1 ? 's' : ''}`
              }))}
            />
          </Card>
        )}
      </section>

      <Card>
        <CardHeader title="Recapture worklist — top suspected RAF gaps" />
        <DataTable
          columns={columns}
          rows={topGap}
          rowKey={(m) => m.memberId}
          empty={<EmptyState title="No suspected gaps" description="Run analytics after seeding." />}
        />
      </Card>
    </div>
  );
}
