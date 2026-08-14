// Outreach campaign logic. A campaign snapshots a slice of the engagement
// queue (by measure or by queue reason) into a trackable roster whose
// per-member contact status can be advanced from the UI or the agent.

import { repos } from '@/lib/data/repository';
import type { Campaign, CampaignMember, ContactStatus } from '@/lib/data/types';


export interface CreateCampaignInput {
  name?: string;
  filterType: 'measure' | 'queue-reason';
  filterValue: string;
  channel?: Campaign['channel'];
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const queue = await repos.engagement.list();
  const matched = queue.filter((e) =>
    input.filterType === 'measure'
      ? e.relatedMeasures.map((m) => m.toUpperCase()).includes(input.filterValue.toUpperCase())
      : e.queueReason === input.filterValue
  );

  const members: CampaignMember[] = matched.map((e) => ({
    memberId: e.memberId,
    memberName: e.memberName,
    relatedMeasures: e.relatedMeasures,
    suggestedProviderName: e.suggestedProviders[0]?.name ?? null,
    contactStatus: 'not-contacted',
    lastTouchedAt: null
  }));

  const now = new Date().toISOString();
  const defaultName =
    input.filterType === 'measure'
      ? `${input.filterValue.toUpperCase()} gap outreach`
      : `${input.filterValue} outreach`;

  const campaign: Campaign = {
    id: `CMP-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.floor(Math.random() * 1000)}`,
    name: input.name?.trim() || defaultName,
    filterType: input.filterType,
    filterValue: input.filterValue,
    channel: input.channel ?? 'phone',
    createdAt: now,
    members
  };

  const all = await repos.campaigns.list();
  await repos.campaigns.put([campaign, ...all]);
  return campaign;
}

export async function setContactStatus(
  campaignId: string,
  memberId: string,
  status: ContactStatus
): Promise<Campaign> {
  const all = await repos.campaigns.list();
  const campaign = all.find((c) => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');
  const cm = campaign.members.find((m) => m.memberId === memberId);
  if (!cm) throw new Error('Member not in campaign');
  cm.contactStatus = status;
  cm.lastTouchedAt = new Date().toISOString();
  await repos.campaigns.put(all);
  return campaign;
}

export function campaignProgress(c: Campaign) {
  const total = c.members.length;
  const by: Record<ContactStatus, number> = {
    'not-contacted': 0,
    contacted: 0,
    scheduled: 0,
    closed: 0
  };
  for (const m of c.members) by[m.contactStatus]++;
  const reached = total - by['not-contacted'];
  return {
    total,
    byStatus: by,
    reachedPct: total === 0 ? 0 : Math.round((reached / total) * 100),
    closedPct: total === 0 ? 0 : Math.round((by.closed / total) * 100)
  };
}
