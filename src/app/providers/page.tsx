import { repos } from '@/lib/data/repository';
import { Card, Pill } from '@/components/ui';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const [providers, attribution, gaps, ehrImpact] = await Promise.all([
    repos.providers.list(),
    repos.attribution.list(),
    repos.gaps.list(),
    ehrPlatformGapImpact()
  ]);

  // Map per-org gap counts
  const gapsByMember: Record<string, number> = {};
  for (const g of gaps) {
    if (!g.status.startsWith('open-')) continue;
    gapsByMember[g.memberId] = (gapsByMember[g.memberId] ?? 0) + 1;
  }
  const orgGaps: Record<string, number> = {};
  for (const a of attribution) {
    if (!a.pcp) continue;
    orgGaps[a.pcp.npi] = (orgGaps[a.pcp.npi] ?? 0) + (gapsByMember[a.memberId] ?? 0);
  }

  const sortedProviders = [...providers].sort((a, b) => (orgGaps[b.npi] ?? 0) - (orgGaps[a.npi] ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider roster & EHR mapping</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Provider directory with EHR platform, FHIR endpoint, and HIE connectivity. Used by the engine
          to route clinical-data acquisition to the right source. EHR sources are illustrative
          (architected for CHPL, Lantern, and NPPES integration).
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Open gap impact by EHR platform</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ehrImpact.map((row) => (
            <Card key={row.platform}>
              <div className="font-medium">{row.platform}</div>
              <div className="mt-1 text-xs text-slate-500">{row.orgCount} orgs · {row.memberCount} members</div>
              <div className="mt-3 text-2xl font-semibold">{row.openGaps}</div>
              <div className="text-xs text-slate-500">{row.sharePct}% of plan-wide open gaps</div>
            </Card>
          ))}
          {ehrImpact.length === 0 && <Card><p className="text-slate-500 text-sm">Run the engine to populate.</p></Card>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Provider directory</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                  <th className="py-2 pr-4">Organization</th>
                  <th className="py-2 pr-4">Specialty</th>
                  <th className="py-2 pr-4">EHR</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">FHIR endpoint</th>
                  <th className="py-2 pr-4">HIE</th>
                  <th className="py-2 pr-4">Members</th>
                  <th className="py-2">Open gaps</th>
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map((p) => (
                  <tr key={p.npi} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{p.organizationName}</div>
                      <div className="text-xs text-slate-400">NPI {p.npi}</div>
                    </td>
                    <td className="py-2 pr-4 text-xs">{p.specialty}</td>
                    <td className="py-2 pr-4 text-xs">{p.ehrPlatform ?? <Pill color="rose">unvalidated</Pill>}</td>
                    <td className="py-2 pr-4 text-xs uppercase">{p.ehrSource}</td>
                    <td className="py-2 pr-4 text-xs">
                      {p.fhirEndpointUrl
                        ? <Pill color="green">FHIR ready</Pill>
                        : <Pill color="amber">no endpoint</Pill>}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {p.hieConnected ? <Pill color="sky">{p.hieNetwork ?? 'connected'}</Pill> : <Pill>—</Pill>}
                    </td>
                    <td className="py-2 pr-4 text-sm">{p.memberCount}</td>
                    <td className="py-2 text-sm font-medium">{orgGaps[p.npi] ?? 0}</td>
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
