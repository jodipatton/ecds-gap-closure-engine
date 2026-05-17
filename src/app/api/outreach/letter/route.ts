import { NextResponse } from 'next/server';
import { buildCareGapLetter } from '@/lib/outreach/letter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  const measureId = searchParams.get('measureId');
  if (!memberId || !measureId) {
    return NextResponse.json({ ok: false, error: 'memberId and measureId are required' }, { status: 400 });
  }
  const letter = await buildCareGapLetter(memberId, measureId);
  if ('error' in letter) {
    return NextResponse.json({ ok: false, error: letter.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, letter });
}
