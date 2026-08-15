import Link from 'next/link';
import { Network } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { Badge, Card, CardHeader, DataTable, PageHeader, type Column } from '@/components/ui';
import { BarList, Scatter, CHART } from '@/components/charts';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { gapValue } from '@/lib/analytics/projection';
import { money } from '@/lib/shared/format';
import type { ProviderOrg } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const snap = await getSnapshot();
  const ehrImpact = await ehrPlatformGapImpact(snap);

  const gapsByMember: Record<string, number> = {};
  for (const g of snap.gaps) {
    if (!g.status.startsWith('open-')) continue;
    gapsByMember[g.memberId] = (gapsByMember[g.memberId] ?? 0) + 1;
  }
  const orgGaps: Record<string, number> = {};
  for (const a of snap.attribution) {
    if (!a.pcp) continue;
    orgGaps[a.pcp.npi] = (orgGaps[a.pcp.npi] ?? 0) + (gapsByMember[a.memberId] ?? 0);
  }
  const connectedNpis = new Set(snap.ehrConnections.map((c) => c.providerNpi));

  const sorted = [...snap.providers].sort((a, b) => (orgGaps[b.npi] ?? 0) - (orgGaps[a.npi] ?? 0));
  const heroPlatform = ehrImpact.find((r) => r.platform !== 'No PCP' && r.platform !== 'Unconnected');

  const columns: Array<Column<ProviderOrg>> = [
    {
      key: 'org',
      header: 'Organization',
      render: (p) => (
        <>
          {p.organizationName}
          <span className="ml-2 font-mono text-xs font-normal text-slate-400">NPI {p.npi}</span>
        </>
      )
    },
    { key: 'specialty', header: 'Specialty', className: 'text-xs', render: (p) => p.specialty },
    {
      key: 'ehr',
      header: 'EHR',
      className: 'text-xs',
      render: (p) => p.ehrPlatform ?? <Badge color="rose">unvalidated</Badge>
    },
    {
      key: 'connection',
      header: 'Connection',
      className: 'text-xs',
      render: (p) =>
        connectedNpis.has(p.npi) ? (
          <Badge color="green">connected</Badge>
        ) : p.fhirEndpointUrl ? (
          <Badge color="amber">FHIR-ready · not connected</Badge>
        ) : (
          <Badge>no endpoint</Badge>
        )
    },
    {
      key: 'hie',
      header: 'HIE',
      className: 'text-xs',
      render: (p) => (p.hieConnected ? <Badge color="sky">{p.hieNetwork ?? 'connected'}</Badge> : <Badge>—</Badge>)
    },
    { key: 'members', header: 'Members', align: 'right', render: (p) => p.memberCount },
    {
      key: 'gaps',
      header: 'Open gaps',
      align: 'right',
      render: (p) => <span className="font-medium">{orgGaps[p.npi] ?? 0}</span>
    },
    {
      key: 'yield',
      header: 'Yield if connected',
      align: 'right',
      className: 'text-xs',
      render: (p) => {
        const n = orgGaps[p.npi] ?? 0;
        return n > 0 && !connectedNpis.has(p.npi) ? money(n * gapValue('uscdi-v3')) : '—';
      }
    },
    {
      key: 'roster',
      header: 'Roster',
      className: 'text-xs',
      render: (p) => (
        <Link href={`/rosters?audience=provider&npi=${p.npi}`} className="text-accent hover:underline">
          Generate →
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Network size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Providers & EHR connectivity"
        description="The provider directory with EHR platform, FHIR endpoint, and HIE connectivity — how the engine routes clinical-data acquisition. EHR sources are illustrative (architected for CHPL / Lantern / NPPES)."
        actions={
          <Link href="/provider/connect" className="text-sm text-accent hover:underline">
            Walk through connection as a provider →
          </Link>
        }
      />

      {ehrImpact.length > 0 && (
        <Card>
          <CardHeader
            title="Open gaps by EHR platform"
            action={
              heroPlatform && (
                <span className="text-xs text-slate-500">
                  {heroPlatform.platform} alone covers {heroPlatform.sharePct}% of plan-wide open gaps
                </span>
              )
            }
          />
          <BarList
            rows={ehrImpact.map((r) => ({
              label: r.platform,
              value: r.openGaps,
              emphasized: r.platform === heroPlatform?.platform,
              hint: `${r.orgCount} orgs · ${r.memberCount} members`
            }))}
          />
        </Card>
      )}

      <Card>
        <CardHeader title="Which practices are worth connecting first" />
        <Scatter
          xLabel="attributed panel size"
          yLabel="open gaps"
          points={snap.providers
            .filter((p) => p.memberCount > 0 || (orgGaps[p.npi] ?? 0) > 0)
            .map((p) => ({
              label: p.organizationName,
              x: p.memberCount,
              y: orgGaps[p.npi] ?? 0,
              color: connectedNpis.has(p.npi) ? CHART.good : p.fhirEndpointUrl ? CHART.attention : CHART.neutral,
              hint: `${p.ehrPlatform ?? 'unvalidated EHR'} · ${
                connectedNpis.has(p.npi) ? 'connected' : p.fhirEndpointUrl ? 'FHIR-ready, not connected' : 'no endpoint'
              }`
            }))}
          legend={[
            { label: 'Connected', color: CHART.good },
            { label: 'FHIR-ready · not connected', color: CHART.attention },
            { label: 'No endpoint', color: CHART.neutral }
          ]}
        />
        <p className="mt-2 text-xs text-slate-500">
          Up and to the right = large panels carrying many open gaps. An amber dot there is the highest-yield
          connection target — one clinical-data sync instead of member-by-member outreach.
        </p>
      </Card>

      <Card>
        <CardHeader title="Provider directory" />
        <DataTable columns={columns} rows={sorted} rowKey={(p) => p.npi} />
      </Card>
    </div>
  );
}
