import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';
import {
  blankConnectionFor,
  defaultScopesFor,
  pickConnectionType,
  tokenEndpointFor
} from '@/lib/ehr/connect';

export const dynamic = 'force-dynamic';

// POST {
//   providerNpi, fhirBaseUrl, clientId, publicKeyJwksUrl?, supportedResources, completedBy
// }
//
// Simulates the full authentication + test Patient pull. Real Epic / Athena
// JWT client_credentials auth requires keys registered with the EHR's app
// console, which we can't synthesize here, so this route confirms inputs are
// well-formed and writes an "active" connection record to the repo.
export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const npi = String(body?.providerNpi ?? '').trim();
  const fhirBaseUrl = String(body?.fhirBaseUrl ?? '').trim();
  const clientId = String(body?.clientId ?? '').trim();
  const completedBy = String(body?.completedBy ?? 'demo-portal-user').trim();
  const supportedResources: string[] = Array.isArray(body?.supportedResources)
    ? body.supportedResources.filter(Boolean)
    : [];

  if (!npi) return NextResponse.json({ ok: false, error: 'providerNpi required' }, { status: 400 });
  if (!fhirBaseUrl) return NextResponse.json({ ok: false, error: 'fhirBaseUrl required' }, { status: 400 });
  if (!clientId) return NextResponse.json({ ok: false, error: 'clientId required' }, { status: 400 });

  const providers = await repos.providers.list();
  const provider = providers.find((p) => p.npi === npi);
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'Provider not found' }, { status: 404 });
  }

  const connectionType = pickConnectionType(provider.ehrPlatform);
  const now = new Date().toISOString();
  const conn = {
    ...blankConnectionFor(provider, fhirBaseUrl),
    clientId,
    fhirBaseUrl,
    tokenEndpoint: tokenEndpointFor(connectionType, fhirBaseUrl),
    supportedResources: supportedResources.length ? supportedResources : ['Patient', 'Observation', 'Condition'],
    scopesGranted: defaultScopesFor(connectionType),
    connectionStatus: 'active' as const,
    lastTokenRefresh: now,
    lastSuccessfulSync: now,
    totalRecordsSynced: 1, // the test Patient pull
    setupCompletedAt: now,
    setupCompletedBy: completedBy,
    lastErrorMessage: null
  };
  await repos.ehrConnections.upsertOne(conn, 'providerNpi');

  return NextResponse.json({
    ok: true,
    mode: 'simulated',
    note: 'Simulated client_credentials JWT auth + Patient.read. In production this exchanges the signed JWT at tokenEndpoint and pulls a real Patient resource.',
    connection: conn,
    testPatient: {
      resourceType: 'Patient',
      id: 'demo-patient-001',
      name: [{ family: 'Sample', given: ['Test'] }],
      birthDate: '1970-01-01',
      gender: 'female'
    }
  });
}
