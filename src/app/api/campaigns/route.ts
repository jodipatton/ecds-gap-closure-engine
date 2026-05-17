import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';
import { createCampaign } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await repos.campaigns.list();
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const filterType = body.filterType === 'queue-reason' ? 'queue-reason' : 'measure';
    const filterValue = String(body.filterValue ?? '').trim();
    if (!filterValue) {
      return NextResponse.json({ ok: false, error: 'filterValue is required' }, { status: 400 });
    }
    const campaign = await createCampaign({
      name: body.name,
      filterType,
      filterValue,
      channel: ['phone', 'sms', 'mail'].includes(body.channel) ? body.channel : 'phone'
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Failed' }, { status: 400 });
  }
}
