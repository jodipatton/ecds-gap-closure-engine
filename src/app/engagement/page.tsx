import { repos } from '@/lib/data/repository';
import { Card, Pill } from '@/components/ui';

export const dynamic = 'force-dynamic';

const REASON_COLORS = {
  'no-visit': 'amber',
  'no-pcp': 'rose',
  'gap-closeable': 'sky'
} as const;

const REASON_LABELS = {
  'no-visit': 'No visit in MY',
  'no-pcp': 'No attributed PCP',
  'gap-closeable': 'Gap-closeable'
} as const;

export default async function EngagementPage() {
  const queue = await repos.engagement.list();
  const grouped: Record<string, typeof queue> = {};
  for (const e of queue) {
    grouped[e.queueReason] ??= [];
    grouped[e.queueReason].push(e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Engagement queue</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Members routed for outreach. Provider recommendations are filtered by specialty and synthetic
          distance, prioritizing in-network providers with FHIR-ready EHRs. Incentive eligibility is
          illustrative.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['no-visit', 'no-pcp', 'gap-closeable'] as const).map((r) => (
          <Card key={r}>
            <div className="text-xs text-slate-500">{REASON_LABELS[r]}</div>
            <div className="text-2xl font-semibold mt-1">{grouped[r]?.length ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Outreach</th>
                <th className="py-2 pr-4">Related measures</th>
                <th className="py-2 pr-4">Suggested providers</th>
                <th className="py-2">Incentive</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-slate-500">Queue empty (run the engine).</td></tr>
              )}
              {queue.slice(0, 250).map((e) => (
                <tr key={e.memberId} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4">
                    <div>{e.memberName}</div>
                    <div className="text-xs text-slate-400">{e.memberId}</div>
                  </td>
                  <td className="py-2 pr-4"><Pill color={REASON_COLORS[e.queueReason]}>{REASON_LABELS[e.queueReason]}</Pill></td>
                  <td className="py-2 pr-4 text-xs">{e.outreachType}</td>
                  <td className="py-2 pr-4 text-xs">{e.relatedMeasures.join(', ') || '—'}</td>
                  <td className="py-2 pr-4 text-xs">
                    <ul className="space-y-1">
                      {e.suggestedProviders.map((p) => (
                        <li key={p.npi}>
                          <span className="font-medium">{p.name}</span>{' '}
                          <span className="text-slate-500">{p.specialty} · {p.distance} mi</span>{' '}
                          {p.ehrPlatform && <Pill color="sky">{p.ehrPlatform}</Pill>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 text-xs">
                    {e.incentiveEligible
                      ? <span className="text-good">{e.incentiveDescription}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queue.length > 250 && <p className="mt-2 text-xs text-slate-500">Showing first 250 of {queue.length}.</p>}
      </Card>
    </div>
  );
}
