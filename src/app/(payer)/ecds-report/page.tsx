import { repos, readSeedSummary } from '@/lib/data/repository';
import { Card, TierBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EcdsReport() {
  const [results, summary] = await Promise.all([repos.hedisResults.list(), readSeedSummary()]);
  const my = summary?.measurementYear;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ECDS Summary Report</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Illustrative preview of what NCQA IDSS submission data looks like. Rates by measure, with
            the data-source breakdown (claims-only, clinical-data, document-based) that an ECDS
            submission requires. Not a licensed IDSS export.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/ecds-report?format=csv" className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">Export CSV</a>
          <a href="/api/ecds-report?format=json" className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">Export JSON</a>
        </div>
      </div>

      <Card>
        <div className="text-sm text-slate-500">Measurement year: <span className="font-medium text-ink">{my ?? '—'}</span></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="py-2 pr-4">Measure</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Domain</th>
                <th className="py-2 pr-4 text-right">Eligible</th>
                <th className="py-2 pr-4 text-right">Excluded</th>
                <th className="py-2 pr-4 text-right">Numerator (claims)</th>
                <th className="py-2 pr-4 text-right">Numerator (clinical)</th>
                <th className="py-2 pr-4 text-right">Open gaps</th>
                <th className="py-2 text-right">Rate %</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.measureId} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.measureName}</div>
                    <div className="text-xs text-slate-500">{r.measureId}</div>
                  </td>
                  <td className="py-2 pr-4"><TierBadge tier={r.dataTier} /></td>
                  <td className="py-2 pr-4 text-xs">{r.domain}</td>
                  <td className="py-2 pr-4 text-right">{r.eligiblePopulation}</td>
                  <td className="py-2 pr-4 text-right">{r.exclusions}</td>
                  <td className="py-2 pr-4 text-right text-good">{r.numeratorFromClaims}</td>
                  <td className="py-2 pr-4 text-right text-accent">{r.numeratorFromClinical}</td>
                  <td className="py-2 pr-4 text-right text-bad">{r.gapCount}</td>
                  <td className="py-2 text-right font-semibold">{r.rate.toFixed(1)}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={9} className="py-6 text-slate-500">Run the engine first.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
