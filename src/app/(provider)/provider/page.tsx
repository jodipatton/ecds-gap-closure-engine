import Link from 'next/link';
import { PlugZap, RefreshCw } from 'lucide-react';
import { Badge, ButtonLink, Card, CardHeader, DataTable, EmptyState, StatTile, type Column } from '@/components/ui';
import { getSnapshot } from '@/lib/data/snapshot';
import { buildRoster } from '@/lib/rosters/roster';
import { contractForProvider } from '@/lib/contracts/vbc';
import { getPractice, practiceClinicians, clinicianForMember, type Clinician } from '@/lib/provider/practice';
import { money } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

export default async function ProviderDashboard() {
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
  const [snap, roster, contract] = await Promise.all([
    getSnapshot(),
    buildRoster('provider', practice.npi),
    contractForProvider(practice.npi)
  ]);
  const connection = snap.ehrConnections.find((c) => c.providerNpi === practice.npi);
  const needCare = roster.rows.filter((r) => r.openGapCount > 0);
  const openGaps = needCare.reduce((s, r) => s + r.openGapCount, 0);

  const perClinician = clinicians.map((c) => {
    const rows = needCare.filter((r) => clinicianForMember(r.memberId, clinicians).id === c.id);
    return { clinician: c, members: rows.length, gaps: rows.reduce((s, r) => s + r.openGapCount, 0) };
  });

  const columns: Array<Column<{ clinician: Clinician; members: number; gaps: number }>> = [
    { key: 'name', header: 'Clinician', render: (p) => p.clinician.name },
    { key: 'spec', header: 'Specialty', className: 'text-xs text-slate-500', render: (p) => p.clinician.specialty },
    { key: 'members', header: 'Members needing care', align: 'right', render: (p) => p.members },
    { key: 'gaps', header: 'Open gaps', align: 'right', render: (p) => <Badge color={p.gaps > 0 ? 'rose' : 'green'}>{p.gaps}</Badge> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">
          Good morning, {practice.organizationName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          NPI <span className="font-mono">{practice.npi}</span> · {practice.specialty} ·{' '}
          {practice.ehrPlatform ?? 'unvalidated EHR'}
        </p>
      </div>

      {!connection ? (
        <Card className="border-[#1F6FEB]/30 bg-[#1F6FEB]/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="inline-flex items-center gap-2 font-semibold text-ink">
                <PlugZap size={18} className="text-[#1F6FEB]" aria-hidden />
                Your EHR isn&apos;t connected yet
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                {openGaps} of your panel&apos;s quality gaps can&apos;t be closed from claims alone — Fallon can&apos;t see
                the care you&apos;ve already delivered. Connecting {practice.ehrPlatform ?? 'your EHR'} takes about
                three steps and unlocks{' '}
                <span className="font-semibold text-ink">
                  {contract ? money(contract.openOpportunity + contract.qualityAtRisk) : 'incentive dollars'}
                </span>{' '}
                under your contract.
              </p>
            </div>
            <ButtonLink href="/provider/connect" icon={<PlugZap size={16} aria-hidden />}>
              Connect your EHR
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="inline-flex items-center gap-2 font-semibold text-ink">
                <RefreshCw size={16} className="text-good" aria-hidden />
                {connection.ehrPlatform} connected
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Last sync{' '}
                {connection.lastSuccessfulSync ? new Date(connection.lastSuccessfulSync).toLocaleString() : 'never'} ·{' '}
                {connection.totalRecordsSynced.toLocaleString()} records total. Syncing clinical data closes gaps
                without extra visits.
              </p>
            </div>
            <ButtonLink href="/provider/connect" variant="secondary">
              Connection & sync →
            </ButtonLink>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Attributed panel" value={practice.memberCount} />
        <StatTile label="Members needing care" value={needCare.length} hint={`${openGaps} open gaps`} href="/provider/care" />
        <StatTile
          label="Value at stake"
          value={contract ? money(contract.totalValueAtStake) : '—'}
          hint={contract ? contract.contract.model : 'no contract'}
          href="/provider/contract"
        />
        <StatTile
          label="Risk recapture"
          value={contract ? money(contract.riskRecapture) : '—'}
          hint="document HCCs"
          href="/provider/contract"
        />
      </section>

      <Card>
        <CardHeader
          title="Open gaps by clinician"
          action={
            <Link href="/provider/care" className="text-sm text-accent hover:underline">
              Work the panel →
            </Link>
          }
        />
        <DataTable
          columns={columns}
          rows={perClinician}
          rowKey={(p) => p.clinician.id}
          rowHref={(p) => `/provider/care?clinician=${p.clinician.id}`}
        />
      </Card>
    </div>
  );
}
