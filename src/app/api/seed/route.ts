import { NextResponse } from 'next/server';
import { runSeed } from '@/lib/data/seed';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') ?? process.env.SEED_LIMIT ?? 60);
    const summary = await runSeed({ memberCount: limit });
    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'seed failed' }, { status: 500 });
  }
}
