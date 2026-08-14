import Link from 'next/link';
import { Card, StatTile, Pill, ProgressBar } from '@/components/ui';
import { ensureContracts, valueForContract } from '@/lib/contracts/vbc';
import { getSnapshot } from '@/lib/data/snapshot';
import { getPractice } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

export default async function ProviderContractPage() {
  const [contracts, practice] = await Promise.all([
    ensureContracts(),
    getPractice()
  ]);

  const contract = practice
    ? contracts.find((c) => c.providerNpi === practice.npi)
    : undefined;

  if (!contract) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No value-based contract on file for this practice. Seed and run the engine from the{' '}
          <Link href="/" className="text-accent hover:underline">plan console</Link>.
        </p>
      </Card>
    );
  }

  const v = valueForContract(await getSnapshot(), contract);
  const attainmentPct = Math.min(
    100,
    contract.targetRatePct === 0 ? 100 : Math.round((v.avgRatePct / contract.targetRatePct) * 100)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Your value-based contract</h1>
        <p className="mt-1 text-sm text-slate-600">
          {contract.organizationName} · {contract.payerName} · {contract.model} ·{' '}
          effective {contract.effectiveYear}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Incentive earned" value={`$${v.earnedToDate.toLocaleString()}`} hint={`${v.closedGapsInScope} gaps closed`} />
        <StatTile label="Left on the table" value={`$${v.openOpportunity.toLocaleString()}`} hint={`${v.openGapsInScope} open gaps`} />
        <StatTile label="Quality withhold at risk" value={`$${v.qualityAtRisk.toLocaleString()}`} hint={`of $${v.withholdAtRisk.toLocaleString()}`} />
        <StatTile label="Risk recapture upside" value={`$${v.riskRecapture.toLocaleString()}`} hint="document suspected HCCs" />
      </section>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Quality attainment</h2>
          <span className="text-sm text-slate-600">
            {v.avgRatePct}% vs {contract.targetRatePct}% target
          </span>
        </div>
        <ProgressBar value={attainmentPct} />
        <p className="mt-2 text-xs text-slate-500">
          {attainmentPct >= 100
            ? 'Target met — full quality withhold earned back.'
            : `Closing the ${v.openGapsInScope} open in-scope gaps moves you toward target and unlocks the remaining $${v.qualityAtRisk.toLocaleString()} withhold.`}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Contract terms</h2>
        <dl className="grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2">
          <Row k="Payer" v={contract.payerName} />
          <Row k="Model" v={<Pill color="sky">{contract.model}</Pill>} />
          <Row k="In-scope measures" v={contract.measureIds.join(', ')} />
          <Row k="Attributed panel" v={`${v.panelSize} members`} />
          <Row k="Incentive per closed gap" v={`$${contract.perGapIncentive}`} />
          <Row k="Quality withhold" v={`${contract.qualityWithholdPct}% of capitation`} />
          <Row k="Quality target" v={`${contract.targetRatePct}%`} />
          {contract.estimatedCapitation > 0 && (
            <Row k="Est. annual capitation" v={`$${contract.estimatedCapitation.toLocaleString()}`} />
          )}
        </dl>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/rosters?audience=provider&npi=${contract.providerNpi}`}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Open my worklist roster →
          </Link>
          <Link
            href="/provider/connect"
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Pull clinical data to close gaps
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
