import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';
import { recordAudit } from '@/lib/audit/audit';
import { getMeasure } from '@/lib/hedis/measures';

export const dynamic = 'force-dynamic';

// Simulated write-back: push an outreach task / Communication into the
// practice EHR. Logged to the PSV audit trail as a provenance event.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const memberId = String(body.memberId ?? '');
    const measureId = String(body.measureId ?? '');
    if (!memberId || !measureId) {
      return NextResponse.json(
        { ok: false, error: 'memberId and measureId are required' },
        { status: 400 }
      );
    }
    const [members, providers] = await Promise.all([
      repos.members.list(),
      repos.providers.list()
    ]);
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      return NextResponse.json({ ok: false, error: `Member ${memberId} not found` }, { status: 404 });
    }
    const practice = [...providers].sort((a, b) => b.memberCount - a.memberCount)[0];
    const spec = getMeasure(measureId.toUpperCase());

    await recordAudit({
      source: 'ehr-sync',
      sourceSystem: `EHR write-back · ${practice?.ehrPlatform ?? 'SMART'} (Communication + Task)`,
      providerNpi: practice?.npi ?? null,
      organizationName: practice?.organizationName ?? null,
      resourceCounts: { Communication: 1, Task: 1 },
      recordsAccepted: 2,
      recordsRejected: 0,
      psvStatus: 'verified',
      psvBasis: `Care-gap outreach task written to practice EHR for ${member.name}`,
      initiatedBy: 'provider portal · Members & care'
    });

    return NextResponse.json({
      ok: true,
      message: `Outreach task created in EHR for ${member.name}${
        spec ? ` (${spec.shortName})` : ''
      }`
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Failed' }, { status: 400 });
  }
}
