import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSnapshot } from '@/lib/data/snapshot';
import { Card, DataTable, type Column } from '@/components/ui';
import { campaignProgress } from '@/lib/outreach/campaigns';
import { ContactControls } from '@/components/outreach/ContactControls';
import type { CampaignMember } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const { campaigns } = await getSnapshot();
  const c = campaigns.find((x) => x.id === decodeURIComponent(params.id));
  if (!c) notFound();
  const p = campaignProgress(c);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/outreach" className="text-xs text-accent hover:underline">← All outreach</Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{c.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {c.filterType === 'measure' ? `Measure ${c.filterValue}` : `Reason: ${c.filterValue}`} ·{' '}
              {c.channel} · {p.total} members · created {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold text-ink">{p.closedPct}%</div>
            <div className="text-xs text-slate-500">{p.byStatus.closed}/{p.total} closed</div>
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>closed {p.byStatus.closed}</span>
          <span>scheduled {p.byStatus.scheduled}</span>
          <span>contacted {p.byStatus.contacted}</span>
          <span>not contacted {p.byStatus['not-contacted']}</span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${pctOf(p.byStatus.closed, p.total)}%` }} />
          <div className="bg-sky-400" style={{ width: `${pctOf(p.byStatus.scheduled, p.total)}%` }} />
          <div className="bg-amber-400" style={{ width: `${pctOf(p.byStatus.contacted, p.total)}%` }} />
        </div>
      </Card>

      <Card>
        <DataTable
          columns={[
            {
              key: 'member',
              header: 'Member',
              render: (m) => (
                <>
                  {m.memberName}
                  <div className="font-mono text-xs font-normal text-slate-400">{m.memberId}</div>
                </>
              )
            },
            { key: 'measures', header: 'Measures', className: 'text-xs', render: (m) => m.relatedMeasures.join(', ') || '—' },
            { key: 'provider', header: 'Suggested provider', className: 'text-xs', render: (m) => m.suggestedProviderName ?? '—' },
            {
              key: 'outreach',
              header: 'Outreach',
              render: (m) => (
                <ContactControls
                  campaignId={c.id}
                  memberId={m.memberId}
                  status={m.contactStatus}
                  measureId={m.relatedMeasures[0] ?? null}
                />
              )
            }
          ] satisfies Array<Column<CampaignMember>>}
          rows={c.members}
          rowKey={(m) => m.memberId}
          limit={100}
        />
      </Card>
    </div>
  );
}

function pctOf(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
