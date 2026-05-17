import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';
import type { FeedbackEntry } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const all = await repos.feedback.list();
  return NextResponse.json({ ok: true, feedback: all });
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const valuable = ['yes', 'somewhat', 'not-yet', 'unsure'].includes(b.valuable)
      ? b.valuable
      : 'unsure';
    const entry: FeedbackEntry = {
      id: `FB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      page: String(b.page ?? '/').slice(0, 200),
      pageTitle: String(b.pageTitle ?? b.page ?? 'Unknown').slice(0, 120),
      createdAt: new Date().toISOString(),
      role: String(b.role ?? 'Unspecified').slice(0, 80),
      valuable,
      rating: Math.max(1, Math.min(5, Number(b.rating) || 3)),
      whoWouldUse: String(b.whoWouldUse ?? '').slice(0, 1000),
      improvements: String(b.improvements ?? '').slice(0, 4000),
      wouldChampion: !!b.wouldChampion,
      email: b.email ? String(b.email).slice(0, 160) : undefined
    };
    const all = await repos.feedback.list();
    await repos.feedback.put([entry, ...all].slice(0, 1000));
    return NextResponse.json({ ok: true, id: entry.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Failed' }, { status: 400 });
  }
}
