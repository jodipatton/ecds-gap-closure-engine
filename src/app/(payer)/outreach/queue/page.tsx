import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { getSnapshot } from '@/lib/data/snapshot';
import { Badge, ButtonLink, Card, CardHeader, DataTable, EmptyState, PageHeader, type Column } from '@/components/ui';
import { MEASURES } from '@/lib/hedis/measures';
import { CampaignCreator } from '@/components/outreach/CampaignCreator';
import type { EngagementQueueEntry } from '@/lib/data/types';

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

export default async function OutreachQueuePage() {
  const { engagement: queue } = await getSnapshot();

  const columns: Array<Column<EngagementQueueEntry>> = [
    {
      key: 'member',
      header: 'Member',
      render: (e) => (
        <>
          {e.memberName}
          <div className="font-mono text-xs font-normal text-slate-400">{e.memberId}</div>
        </>
      )
    },
    { key: 'reason', header: 'Reason', render: (e) => <Badge color={REASON_COLORS[e.queueReason]}>{REASON_LABELS[e.queueReason]}</Badge> },
    { key: 'outreach', header: 'Outreach', className: 'text-xs', render: (e) => e.outreachType },
    { key: 'measures', header: 'Related measures', className: 'text-xs', render: (e) => e.relatedMeasures.join(', ') || '—' },
    {
      key: 'providers',
      header: 'Suggested providers',
      className: 'text-xs',
      render: (e) => (
        <ul className="space-y-1">
          {e.suggestedProviders.map((p) => (
            <li key={p.npi}>
              <span className="font-medium">{p.name}</span>{' '}
              <span className="text-slate-500">{p.specialty} · {p.distance} mi</span>{' '}
              {p.ehrPlatform && <Badge color="sky">{p.ehrPlatform}</Badge>}
            </li>
          ))}
        </ul>
      )
    },
    {
      key: 'incentive',
      header: 'Incentive',
      className: 'text-xs',
      render: (e) =>
        e.incentiveEligible ? <span className="text-good">{e.incentiveDescription}</span> : <span className="text-slate-400">—</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Megaphone size={24} strokeWidth={1.75} className="text-accent" aria-hidden />}
        title="Outreach queue"
        description={
          <>
            Members routed for outreach. Provider recommendations are filtered by specialty and synthetic
            distance, prioritizing in-network providers with FHIR-ready EHRs. Start a campaign from a
            measure or queue-reason slice below.{' '}
            <Link href="/outreach" className="text-accent hover:underline">← Outreach overview</Link>
          </>
        }
      />

      <Card>
        <CardHeader title="New campaign" />
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">
            The queue is empty — run analytics from the{' '}
            <Link href="/" className="text-accent hover:underline">dashboard</Link> first.
          </p>
        ) : (
          <CampaignCreator measureIds={MEASURES.map((m) => m.id)} />
        )}
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={queue}
          rowKey={(e) => e.memberId}
          limit={250}
          empty={
            <EmptyState
              title="Queue empty"
              description="Run analytics from the dashboard to populate the engagement queue."
              action={<ButtonLink href="/">Go to dashboard</ButtonLink>}
            />
          }
        />
      </Card>
    </div>
  );
}
