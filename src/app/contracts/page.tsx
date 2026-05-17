import Link from 'next/link';
import { Card, Pill, StatTile } from '@/components/ui';
import { allContractValues } from '@/lib/contracts/vbc';

export const dynamic = 'force-dynamic';

const MODEL_COLOR = { 'P4P': 'sky', 'Shared Savings': 'amber', 'Full Risk': 'rose' } as const;

export default async function ContractsPage() {
  const values = await allContractValues();

  if (values.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No value-based contracts yet — seed providers and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">dashboard</Link>.
        </p>
      </Card>
    );
  }

  const totOpp = values.reduce((s, v) => s + v.openOpportunity, 0);
  const totRisk = values.reduce((s, v) => s + v.riskRecapture, 0);
  const totAtRisk = values.reduce((s, v) => s + v.qualityAtRisk, 0);
  const totEarned = values.reduce((s, v) => s + v.earnedToDate, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Value-based contracts</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Fallon Health value-based agreements with the provider network. Synthetic terms; the
          gap-value math is shared with the provider view so both sides see the same economics of
          closing member gaps.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Active contracts" value={values.length} />
        <StatTile label="Incentive earned" value={`$${totEarned.toLocaleString()}`} hint="closed gaps" />
        <StatTile label="Open gap opportunity" value={`$${totOpp.toLocaleString()}`} hint="if gaps close" />
        <StatTile label="Quality $ at risk" value={`$${totAtRisk.toLocaleString()}`} hint="withhold not yet earned" />
      </section>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Measures</th>
                <th className="py-2 pr-4">Panel</th>
                <th className="py-2 pr-4">Avg rate / target</th>
                <th className="py-2 pr-4">Open / closed</th>
                <th className="py-2 pr-4">Gap opportunity</th>
                <th className="py-2 pr-4">Risk recapture</th>
                <th className="py-2">Total at stake</th>
              </tr>
            </thead>
            <tbody>
              {values
                .sort((a, b) => b.totalValueAtStake - a.totalValueAtStake)
                .map((v) => (
                  <tr key={v.contract.id} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{v.contract.organizationName}</div>
                      <div className="text-xs text-slate-400">NPI {v.contract.providerNpi}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <Pill color={MODEL_COLOR[v.contract.model]}>{v.contract.model}</Pill>
                    </td>
                    <td className="py-2 pr-4 text-xs">{v.contract.measureIds.join(', ')}</td>
                    <td className="py-2 pr-4 text-sm">{v.panelSize}</td>
                    <td className="py-2 pr-4 text-xs">
                      <span className={v.avgRatePct >= v.contract.targetRatePct ? 'text-good' : 'text-bad'}>
                        {v.avgRatePct}%
                      </span>{' '}
                      <span className="text-slate-400">/ {v.contract.targetRatePct}%</span>
                    </td>
                    <td className="py-2 pr-4 text-xs tabular-nums">
                      <span className="text-bad">{v.openGapsInScope}</span>
                      {' / '}
                      <span className="text-good">{v.closedGapsInScope}</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">${v.openOpportunity.toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular-nums">${v.riskRecapture.toLocaleString()}</td>
                    <td className="py-2 font-semibold tabular-nums text-ink">
                      ${v.totalValueAtStake.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Risk recapture also reflected on the{' '}
          <Link href="/risk" className="text-accent hover:underline">RAF page</Link>. Providers see
          their own contract under the{' '}
          <Link href="/provider/contract" className="text-accent hover:underline">provider portal</Link>.
        </p>
      </Card>
    </div>
  );
}
