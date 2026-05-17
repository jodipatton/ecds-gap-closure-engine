import { NextResponse } from 'next/server';
import { setContactStatus } from '@/lib/outreach/campaigns';
import type { ContactStatus } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

const VALID: ContactStatus[] = ['not-contacted', 'contacted', 'scheduled', 'closed'];

// Advance one member's contact status within a campaign.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const memberId = String(body.memberId ?? '');
    const status = body.status as ContactStatus;
    if (!memberId || !VALID.includes(status)) {
      return NextResponse.json({ ok: false, error: 'memberId and a valid status are required' }, { status: 400 });
    }
    const campaign = await setContactStatus(params.id, memberId, status);
    return NextResponse.json({ ok: true, campaign });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Failed' }, { status: 400 });
  }
}
