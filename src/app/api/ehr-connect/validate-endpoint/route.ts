import { NextResponse } from 'next/server';
import { fetchCapabilityStatement } from '@/lib/ehr/connect';

export const dynamic = 'force-dynamic';

// POST { fhirBaseUrl: string }
// Hits <baseUrl>/metadata and parses the CapabilityStatement.
// For demo URLs that aren't reachable, returns a clearly-labeled simulated
// response so the wizard can keep moving without a real Epic/Athena sandbox.
export async function POST(req: Request) {
  let fhirBaseUrl = '';
  try {
    const body = await req.json();
    fhirBaseUrl = String(body?.fhirBaseUrl ?? '').trim();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!fhirBaseUrl || !/^https?:\/\//i.test(fhirBaseUrl)) {
    return NextResponse.json(
      { ok: false, error: 'fhirBaseUrl must be an http(s) URL' },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const summary = await fetchCapabilityStatement(fhirBaseUrl, controller.signal);
    return NextResponse.json({
      ok: true,
      mode: 'live',
      fhirVersion: summary.fhirVersion ?? null,
      software: summary.software ?? null,
      publisher: summary.publisher ?? null,
      supportedResources: summary.resources.map((r) => r.type).sort(),
      securityServiceCodes: summary.securityServiceCodes
    });
  } catch (err: any) {
    // The synthetic provider URLs in this prototype aren't real endpoints,
    // so the demo falls back to a simulated CapabilityStatement that mirrors
    // what an Epic / Athena instance would return.
    const platformHint =
      /epic/i.test(fhirBaseUrl) ? 'Epic'
      : /athena/i.test(fhirBaseUrl) ? 'Athena'
      : 'Generic';
    return NextResponse.json({
      ok: true,
      mode: 'simulated',
      note: `Endpoint not reachable (${err?.message ?? 'unknown error'}). Returning simulated CapabilityStatement for ${platformHint}.`,
      fhirVersion: '4.0.1',
      software: { name: platformHint === 'Epic' ? 'Epic FHIR' : platformHint === 'Athena' ? 'athenahealth FHIR R4' : 'SMART on FHIR Generic', version: 'illustrative' },
      publisher: platformHint,
      supportedResources: [
        'Patient', 'Observation', 'Condition', 'MedicationRequest',
        'Procedure', 'DocumentReference', 'Encounter', 'Immunization',
        'AllergyIntolerance', 'CarePlan'
      ],
      securityServiceCodes: ['SMART-on-FHIR']
    });
  } finally {
    clearTimeout(timer);
  }
}
