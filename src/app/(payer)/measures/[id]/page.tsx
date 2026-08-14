import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repos } from '@/lib/data/repository';
import { getMeasure } from '@/lib/hedis/measures';
import { Card, Pill, ProgressBar, TierBadge } from '@/components/ui';
import type { GapStatus } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<GapStatus, 'green' | 'amber' | 'rose' | 'slate' | 'sky'> = {
  'closed-claims': 'green',
  'closed-clinical': 'sky',
  'open-needs-clinical': 'amber',
  'open-needs-document': 'rose',
  'excluded': 'slate',
  'not-eligible': 'slate'
};

const STATUS_LABEL: Record<GapStatus, string> = {
  'closed-claims': 'Closed by claims',
  'closed-clinical': 'Closed by clinical data',
  'open-needs-clinical': 'Open · needs clinical data',
  'open-needs-document': 'Open · needs document',
  'excluded': 'Excluded',
  'not-eligible': 'Not eligible'
};

export default async function MeasureDetailPage({ params }: { params: { id: string } }) {
  const spec = getMeasure(params.id.toUpperCase()) ?? getMeasure(params.id);
  if (!spec) return notFound();
  const [results, gaps, members, attribution, providers] = await Promise.all([
    repos.hedisResults.list(),
    repos.gaps.list(),
    repos.members.list(),
    repos.attribution.list(),
    repos.providers.list()
  ]);
  const result = results.find((r) => r.measureId === spec.id);
  const measureGaps = gaps.filter((g) => g.measureId === spec.id);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const attrByMember = new Map(attribution.map((a) => [a.memberId, a]));
  const providerByNpi = new Map(providers.map((p) => [p.npi, p]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/measures" className="text-sm text-accent hover:underline">← All measures</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{spec.name}</h1>
          <TierBadge tier={spec.dataTier} />
        </div>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl">{spec.description}</p>
      </div>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><div className="text-xs text-slate-500">Eligible</div><div className="text-2xl font-semibold">{result.eligiblePopulation}</div></Card>
          <Card><div className="text-xs text-slate-500">Closed (claims)</div><div className="text-2xl font-semibold text-good">{result.numeratorFromClaims}</div></Card>
          <Card><div className="text-xs text-slate-500">Closed (clinical)</div><div className="text-2xl font-semibold text-accent">{result.numeratorFromClinical}</div></Card>
          <Card><div className="text-xs text-slate-500">Open gaps</div><div className="text-2xl font-semibold text-bad">{result.gapCount}</div></Card>
          <Card>
            <div className="text-xs text-slate-500">Rate</div>
            <div className="text-2xl font-semibold">{result.rate.toFixed(1)}%</div>
            <div className="mt-2"><ProgressBar value={result.rate} /></div>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-3">Member-level detail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Evidence / missing data</th>
                <th className="py-2 pr-4">Attributed PCP</th>
                <th className="py-2">EHR</th>
              </tr>
            </thead>
            <tbody>
              {measureGaps.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-slate-500">No data yet.</td></tr>
              )}
              {measureGaps.slice(0, 200).map((g) => {
                const m = memberById.get(g.memberId);
                const a = attrByMember.get(g.memberId);
                const p = a?.pcp ? providerByNpi.get(a.pcp.npi) : null;
                return (
                  <tr key={`${g.measureId}-${g.memberId}`} className="border-b last:border-0">
                    <td className="py-2 pr-4">{m?.name ?? g.memberId} <span className="text-slate-400 text-xs">{g.memberId}</span></td>
                    <td className="py-2 pr-4"><Pill color={STATUS_COLORS[g.status]}>{STATUS_LABEL[g.status]}</Pill></td>
                    <td className="py-2 pr-4 text-xs text-slate-600">
                      {g.status.startsWith('closed')
                        ? (g.evidence ?? []).join(', ')
                        : g.missingDataElement ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs">{a?.pcp?.name ?? <span className="text-rose-600">No PCP</span>}</td>
                    <td className="py-2 text-xs">{p?.ehrPlatform ?? <span className="text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {measureGaps.length > 200 && (
          <p className="mt-2 text-xs text-slate-500">Showing first 200 of {measureGaps.length} rows.</p>
        )}
      </Card>
    </div>
  );
}
