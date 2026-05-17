import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card } from '@/components/ui';
import { MEASURES } from '@/lib/hedis/measures';
import { campaignProgress } from '@/lib/outreach/campaigns';
import { CampaignCreator } from '@/components/outreach/CampaignCreator';
import { ContactControls } from '@/components/outreach/ContactControls';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const [campaigns, queue] = await Promise.all([
    repos.campaigns.list(),
    repos.engagement.list()
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Outreach campaigns</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Snapshot a slice of the{' '}
          <Link href="/engagement" className="text-accent hover:underline">engagement queue</Link>{' '}
          into a trackable campaign, then advance each member through contact → scheduled → closed.
          Generate a member-facing care-gap letter inline.
        </p>
      </div>

      <Card>
        <h2 className="font-semibold text-ink mb-3">New campaign</h2>
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">
            Engagement queue is empty — run the engine first.
          </p>
        ) : (
          <CampaignCreator measureIds={MEASURES.map((m) => m.id)} />
        )}
      </Card>

      {campaigns.length === 0 && (
        <Card><p className="text-sm text-slate-500">No campaigns yet.</p></Card>
      )}

      {campaigns.map((c) => {
        const p = campaignProgress(c);
        return (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold text-ink">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {c.filterType === 'measure' ? `Measure ${c.filterValue}` : `Reason: ${c.filterValue}`} ·{' '}
                  {c.channel} · {p.total} members · created {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{p.closedPct}%</div>
                <div className="text-xs text-slate-500">{p.byStatus.closed}/{p.total} closed</div>
              </div>
            </div>

            <div className="mb-4 flex h-2 w-full overflow-hidden rounded bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${pct(p.byStatus.closed, p.total)}%` }} />
              <div className="bg-sky-400" style={{ width: `${pct(p.byStatus.scheduled, p.total)}%` }} />
              <div className="bg-amber-400" style={{ width: `${pct(p.byStatus.contacted, p.total)}%` }} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                    <th className="py-2 pr-4">Member</th>
                    <th className="py-2 pr-4">Measures</th>
                    <th className="py-2 pr-4">Suggested provider</th>
                    <th className="py-2">Outreach</th>
                  </tr>
                </thead>
                <tbody>
                  {c.members.slice(0, 100).map((m) => (
                    <tr key={m.memberId} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4">
                        <div>{m.memberName}</div>
                        <div className="text-xs text-slate-400">{m.memberId}</div>
                      </td>
                      <td className="py-2 pr-4 text-xs">{m.relatedMeasures.join(', ') || '—'}</td>
                      <td className="py-2 pr-4 text-xs">{m.suggestedProviderName ?? '—'}</td>
                      <td className="py-2">
                        <ContactControls
                          campaignId={c.id}
                          memberId={m.memberId}
                          status={m.contactStatus}
                          measureId={m.relatedMeasures[0] ?? null}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.members.length > 100 && (
                <p className="mt-2 text-xs text-slate-500">Showing first 100 of {c.members.length}.</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
