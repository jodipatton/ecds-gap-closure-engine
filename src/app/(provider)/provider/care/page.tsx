import Link from 'next/link';
import { Users } from 'lucide-react';
import { Badge, ButtonLink, Card, DataTable, EmptyState, PageHeader, StatTile, type Column } from '@/components/ui';
import { buildRoster, type RosterRow } from '@/lib/rosters/roster';
import { CareActions } from '@/components/provider/CareActions';
import { getPractice, practiceClinicians, clinicianForMember, type Clinician } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

interface SearchParams {
  clinician?: string;
}

type Row = RosterRow & { clinician: Clinician };

export default async function CarePage({ searchParams }: { searchParams: SearchParams }) {
  const practice = await getPractice();
  if (!practice) {
    return (
      <EmptyState
        title="No data yet"
        description="Seed and run analytics from the plan console first."
        action={<ButtonLink href="/">Open plan console</ButtonLink>}
      />
    );
  }

  const clinicians = practiceClinicians(practice);
  const selected = searchParams.clinician ?? 'all';

  const roster = await buildRoster('provider', practice.npi);
  const withClinician: Row[] = roster.rows
    .filter((r) => r.openGapCount > 0)
    .map((r) => ({ ...r, clinician: clinicianForMember(r.memberId, clinicians) }));
  const needCare = selected === 'all' ? withClinician : withClinician.filter((r) => r.clinician.id === selected);
  const totalGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  const columns: Array<Column<Row>> = [
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
    {
      key: 'seeing',
      header: 'Seeing',
      className: 'text-xs',
      render: (r) => (
        <>
          <div>{r.clinician.name}</div>
          <div className="text-slate-400">{r.clinician.specialty}</div>
        </>
      )
    },
    {
      key: 'gaps',
      header: 'Open care gaps',
      className: 'text-xs',
      render: (r) => (
        <>
          <Badge color="rose">{r.openGapCount}</Badge> <span className="text-slate-600">{r.openGapMeasures}</span>
        </>
      )
    },
    { key: 'action', header: 'Recommended action', className: 'text-xs', render: (r) => r.recommendedAction },
    {
      key: 'outreach',
      header: 'Outreach',
      render: (r) => <CareActions memberId={r.memberId} measureId={r.openGapMeasures.split('; ')[0]} />
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users size={24} strokeWidth={1.75} className="text-[#1F6FEB]" aria-hidden />}
        title="Members needing care"
        description={`${practice.organizationName} · members with open HEDIS care gaps. Filter by the clinician the member is seeing, then generate a call, text, or letter — or push it into the EHR.`}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/provider/care"
          className={`rounded-full border px-3 py-1 font-medium transition ${
            selected === 'all' ? 'border-[#1F6FEB] bg-[#1F6FEB]/10 text-[#1F6FEB]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All clinicians
        </Link>
        {clinicians.map((c) => (
          <Link
            key={c.id}
            href={`/provider/care?clinician=${c.id}`}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              selected === c.id ? 'border-[#1F6FEB] bg-[#1F6FEB]/10 text-[#1F6FEB]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Members needing care" value={needCare.length} />
        <StatTile label="Open care gaps" value={totalGaps} />
        <StatTile label="Clinician" value={selected === 'all' ? 'All' : clinicians.find((c) => c.id === selected)?.name ?? '—'} />
        <StatTile label="Suspected conditions" value={needCare.filter((r) => r.suspectedHccCount > 0).length} hint="to document" />
      </section>

      <Card>
        <DataTable
          columns={columns}
          rows={needCare}
          rowKey={(r) => r.memberId}
          limit={150}
          empty={<EmptyState title="No open care gaps for this selection" description="Pick another clinician or clear the filter." />}
        />
      </Card>
    </div>
  );
}
