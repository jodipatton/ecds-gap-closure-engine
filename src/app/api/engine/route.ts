import { NextResponse } from 'next/server';
import { runEngine } from '@/lib/hedis/engine';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const summary = await runEngine();
    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'engine failed' }, { status: 500 });
  }
}
