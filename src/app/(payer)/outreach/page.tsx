import Link from 'next/link';
import { getSnapshot } from '@/lib/data/snapshot';
import { Card, Pill } from '@/components/ui';
import { StackedBar, CHART } from '@/components/charts';
import { campaignProgress } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

const REASON_LABELS = {
  'no-visit': 'No visit in MY',
  'no-pcp': 'No attributed PCP',
  'gap-closeable': 'Gap-closeable'
} as const;

export default async function OutreachPage() {
  const { engagement: queue, campaigns } = await getSnapshot();
  const byReason: Record<string, number> = {};
  for (const e of queue) byReason[e.queueReason] = (byReason[e.queueReason] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Outreach</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            The engagement queue routes every member the engine couldn&apos;t close; campaigns snapshot a
            slice of that queue into a trackable roster with per-member contact status.
          </p>
        </div>
        <Link
          href="/outreach/queue"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Work the queue →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['no-visit', 'no-pcp', 'gap-closeable'] as const).map((r) => (
          <Link key={r} href="/outreach/queue" className="block">
            <Card className="transition hover:shadow">
              <div className="text-xs text-slate-500">{REASON_LABELS[r]}</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{byReason[r] ?? 0}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Campaigns</h2>
          <span className="text-xs text-slate-500">{campaigns.length} active</span>
        </div>
        {campaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No campaigns yet — select members on the{' '}
              <Link href="/outreach/queue" className="text-accent hover:underline">queue</Link> to start one.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const p = campaignProgress(c);
              return (
                <Link key={c.id} href={`/outreach/campaigns/${c.id}`} className="block">
                  <Card className="transition hover:shadow">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ink">{c.name}</div>
                        <div className="text-xs text-slate-500">
                          {c.filterType === 'measure' ? `Measure ${c.filterValue}` : `Reason: ${c.filterValue}`} ·{' '}
                          {c.channel} · {p.total} members
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Pill color={p.closedPct >= 50 ? 'green' : 'amber'}>{p.closedPct}% closed</Pill>
                      </div>
                    </div>
                    <div className="mt-3">
                      <StackedBar
                        height={10}
                        segments={[
                          { label: 'Closed', value: p.byStatus.closed, color: CHART.good },
                          { label: 'Scheduled', value: p.byStatus.scheduled, color: CHART.accent },
                          { label: 'Contacted', value: p.byStatus.contacted, color: CHART.attention },
                          { label: 'Not contacted', value: p.byStatus['not-contacted'], color: CHART.track }
                        ]}
                      />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
