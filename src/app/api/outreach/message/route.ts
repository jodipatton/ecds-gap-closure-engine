import { NextResponse } from 'next/server';
import { buildOutreachMessage, type OutreachChannel } from '@/lib/outreach/letter';

export const dynamic = 'force-dynamic';

const CHANNELS: OutreachChannel[] = ['call', 'sms', 'letter'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  const measureId = searchParams.get('measureId');
  const channel = searchParams.get('channel') as OutreachChannel | null;
  if (!memberId || !measureId || !channel || !CHANNELS.includes(channel)) {
    return NextResponse.json(
      { ok: false, error: 'memberId, measureId, and a valid channel (call|sms|letter) are required' },
      { status: 400 }
    );
  }
  const msg = await buildOutreachMessage(memberId, measureId, channel);
  if ('error' in msg) {
    return NextResponse.json({ ok: false, error: msg.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, message: msg });
}
