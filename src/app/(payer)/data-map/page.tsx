import Link from 'next/link';
import { Database, FileText, FlaskConical, Pill, PlugZap, Receipt, Stethoscope } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader, StatTile } from '@/components/ui';
import { StackedBar, CHART } from '@/components/charts';
import { CoverageMatrix } from '@/components/quality/CoverageMatrix';
import { measureCoverage } from '@/lib/hedis/dataNeeds';
import { pct } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';

export default async function DataMapPage() {
  const snap = await getSnapshot();
  const { results } = snap;

  if (results.length === 0) {
    return (
      <EmptyState
        title="No computed results yet"
        description="Seed synthetic data and run analytics — then this page shows exactly which data elements the plan can and cannot see."
        action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
      />
    );
  }

  const coverage = measureCoverage(snap);
  let denom = 0;
  let visible = 0;
  let dark = 0;
  for (const c of coverage.values()) {
    denom += c.denominator;
    visible += c.closedClaims + c.closedClinical + c.openWithEvidence;
    dark += c.openDark;
  }
  const visiblePct = denom === 0 ? 0 : (visible / denom) * 100;

  // How much clinical data arrived through which acquisition path.
  const bySource: Record<string, number> = {};
  for (const e of snap.auditEvents) {
    bySource[e.source] = (bySource[e.source] ?? 0) + e.recordsAccepted;
  }
  const synced = (bySource['ehr-sync'] ?? 0) + (bySource['payer-access-pull'] ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Database size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Data coverage map"
        description="Every HEDIS measure is a data requirement in disguise. This is the map of what the plan can see today, element by element — and where members are still dark."
      />

      {/* Hero: how much of the denominator the plan can actually see */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Plan visibility</div>
            <div className="mt-1 text-[44px] font-semibold leading-none tracking-tight text-ink">
              {pct(visiblePct, 0)}
            </div>
            <p className="mt-2 max-w-md text-xs text-slate-500">
              of measure-denominator members have structured evidence the plan can read. The remaining{' '}
              <span className="font-semibold text-ink">{dark}</span> are <em>dark</em> — their care may
              have happened, but no claim or clinical record shows it.
            </p>
          </div>
          <div className="w-full max-w-md">
            <StackedBar
              height={16}
              segments={[
                { label: 'Closed via claims', value: results.reduce((s, r) => s + r.numeratorFromClaims, 0), color: CHART.good },
                { label: 'Closed via clinical data', value: results.reduce((s, r) => s + r.numeratorFromClinical, 0), color: CHART.accent },
                { label: 'Open · evidence visible', value: visible - results.reduce((s, r) => s + r.combinedNumerator, 0), color: CHART.attention },
                { label: 'Dark — no data', value: dark, color: '#334155' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* What's in the store, and how it got there */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Claims" value={snap.claims.length.toLocaleString()} icon={<Receipt size={15} aria-hidden />} hint="adjudication feed" />
        <StatTile label="Observations" value={snap.observations.length.toLocaleString()} icon={<FlaskConical size={15} aria-hidden />} hint="labs & vitals" />
        <StatTile label="Conditions" value={snap.conditions.length.toLocaleString()} icon={<Stethoscope size={15} aria-hidden />} hint="problem list" />
        <StatTile label="Medications" value={snap.medications.length.toLocaleString()} icon={<Pill size={15} aria-hidden />} hint="MedicationRequest" />
        <StatTile label="Documents" value={snap.documents.length.toLocaleString()} icon={<FileText size={15} aria-hidden />} hint="CCDA / reports" />
      </section>
      {synced > 0 && (
        <p className="-mt-4 text-xs text-slate-500">
          {synced.toLocaleString()} of these records arrived over 1upHealth rails (EHR sync + Provider
          Access API) — provenance in the{' '}
          <Link href="/audit" className="text-accent hover:underline">PSV audit trail</Link>.
        </p>
      )}

      {/* The matrix */}
      <Card>
        <CardHeader
          title="Measures × data elements — mapped today vs still dark"
          action={<Link href="/measures" className="text-sm text-accent hover:underline">Measure detail →</Link>}
        />
        <CoverageMatrix results={results} coverage={coverage} />
      </Card>

      {/* How to light it up */}
      <Card className="border-[#1F6FEB]/20 bg-gradient-to-r from-[#1F6FEB]/5 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="inline-flex items-center gap-2 font-semibold text-ink">
              <PlugZap size={18} className="text-accent" aria-hidden />
              Every amber and rose cell is one EHR connection away
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Labs, vitals, medications, and documents live in provider EHRs. Connecting a practice
              pulls exactly these elements for its attributed members — the{' '}
              <Link href="/providers" className="text-accent hover:underline">scatter on the providers page</Link>{' '}
              shows which connection lights up the most cells.
            </p>
          </div>
          <ButtonLink href="/provider/connect" icon={<PlugZap size={15} aria-hidden />}>
            Walk the connection flow
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
