import { NextResponse } from 'next/server';
import { syncProviderClinicalData } from '@/lib/ehr/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Simulated clinical-data pull: synthesizes the FHIR resources this practice's
// EHR would surface, persists them, re-runs the engine, and returns the
// before/after gap impact.
export async function POST(_req: Request, { params }: { params: { npi: string } }) {
  try {
    const result = await syncProviderClinicalData(params.npi);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Sync failed' },
      { status: 400 }
    );
  }
}
