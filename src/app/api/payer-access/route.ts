import { NextResponse } from 'next/server';
import { registerPayerAccess, testPayerAccess } from '@/lib/payer/access';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'register') {
      const grant = await registerPayerAccess({
        providerNpi: String(body.providerNpi ?? ''),
        tin: String(body.tin ?? ''),
        attestedTreatmentRelationship: !!body.attestedTreatmentRelationship,
        attestedMinimumNecessary: !!body.attestedMinimumNecessary
      });
      return NextResponse.json({ ok: true, grant });
    }

    if (action === 'test') {
      const grant = await testPayerAccess(String(body.providerNpi ?? ''));
      return NextResponse.json({ ok: true, grant });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Failed' }, { status: 400 });
  }
}
