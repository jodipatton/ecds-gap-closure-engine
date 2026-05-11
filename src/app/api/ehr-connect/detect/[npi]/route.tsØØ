import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';
import {
  blankConnectionFor,
  defaultScopesFor,
  pickAuthMethod,
  pickConnectionType
} from '@/lib/ehr/connect';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { npi: string } }) {
  const [providers, connections] = await Promise.all([
    repos.providers.list(),
    repos.ehrConnections.list()
  ]);
  const provider = providers.find((p) => p.npi === params.npi);
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'Provider not found' }, { status: 404 });
  }
  const connection = connections.find((c) => c.providerNpi === params.npi);
  const connectionType = pickConnectionType(provider.ehrPlatform);
  return NextResponse.json({
    ok: true,
    provider: {
      npi: provider.npi,
      organizationName: provider.organizationName,
      specialty: provider.specialty,
      ehrPlatform: provider.ehrPlatform,
      fhirEndpointUrl: provider.fhirEndpointUrl,
      ehrSource: provider.ehrSource
    },
    flow: {
      connectionType,
      authMethod: pickAuthMethod(connectionType),
      scopes: defaultScopesFor(connectionType)
    },
    connection: connection ?? blankConnectionFor(provider)
  });
}
