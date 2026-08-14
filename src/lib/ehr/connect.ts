// Helpers shared by the ehr-connect API routes. Real-ish FHIR introspection
// (the metadata endpoint check actually fetches and parses CapabilityStatement);
// the auth flow is illustrative for the prototype since real Epic / Athena
// client_credentials JWT auth requires registered keys we can't synthesize here.

import type {
  AuthMethod,
  ConnectionType,
  EhrConnection,
  ProviderOrg
} from '@/lib/data/types';

export function pickConnectionType(platform: ProviderOrg['ehrPlatform']): ConnectionType {
  if (platform === 'Epic') return 'epic-backend';
  if (platform === 'Athena') return 'athena-fhir';
  return 'smart-on-fhir-generic';
}

export function pickAuthMethod(connectionType: ConnectionType): AuthMethod {
  if (connectionType === 'epic-backend') return 'jwt-backend-services';
  if (connectionType === 'athena-fhir') return 'oauth2-client-credentials';
  return 'smart-launch';
}

export function defaultScopesFor(_connectionType: ConnectionType): string[] {
  // ECDS-aligned read scopes for HEDIS measure data
  return [
    'system/Patient.read',
    'system/Observation.read',
    'system/Condition.read',
    'system/MedicationRequest.read',
    'system/Procedure.read',
    'system/DocumentReference.read',
    'system/Encounter.read'
  ];
}

export function tokenEndpointFor(connectionType: ConnectionType, fhirBaseUrl: string): string {
  // Epic: <baseUrl>/oauth2/token. Athena & generic vary; reasonable defaults.
  if (connectionType === 'epic-backend') return `${trimSlash(fhirBaseUrl)}/oauth2/token`;
  if (connectionType === 'athena-fhir') return 'https://api.preview.platform.athenahealth.com/oauth2/v1/token';
  return `${trimSlash(fhirBaseUrl)}/oauth2/token`;
}

export function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export interface CapabilityStatementSummary {
  fhirVersion?: string;
  software?: { name?: string; version?: string };
  publisher?: string;
  resources: Array<{ type: string; interactions: string[] }>;
  securityServiceCodes: string[];
}

export async function fetchCapabilityStatement(
  fhirBaseUrl: string,
  signal?: AbortSignal
): Promise<CapabilityStatementSummary> {
  const url = `${trimSlash(fhirBaseUrl)}/metadata`;
  const resp = await fetch(url, {
    headers: { accept: 'application/fhir+json,application/json' },
    signal
  });
  if (!resp.ok) {
    throw new Error(`Metadata endpoint returned ${resp.status} ${resp.statusText}`);
  }
  const body = await resp.json().catch(() => {
    throw new Error('Metadata endpoint did not return JSON');
  });
  if (body?.resourceType !== 'CapabilityStatement') {
    throw new Error(`Expected CapabilityStatement, got ${body?.resourceType ?? 'unknown'}`);
  }
  const resources: CapabilityStatementSummary['resources'] = [];
  const security: string[] = [];
  for (const rest of body.rest ?? []) {
    for (const r of rest.resource ?? []) {
      resources.push({
        type: r.type,
        interactions: (r.interaction ?? []).map((i: any) => i.code).filter(Boolean)
      });
    }
    for (const svc of rest?.security?.service ?? []) {
      for (const c of svc.coding ?? []) {
        if (c.code) security.push(c.code);
      }
    }
  }
  return {
    fhirVersion: body.fhirVersion,
    software: body.software,
    publisher: body.publisher,
    resources,
    securityServiceCodes: security
  };
}

export function blankConnectionFor(
  provider: ProviderOrg,
  fhirBaseUrl?: string
): EhrConnection {
  const platform = provider.ehrPlatform ?? 'Unknown';
  const connectionType = pickConnectionType(platform);
  const baseUrl = fhirBaseUrl ?? provider.fhirEndpointUrl ?? '';
  return {
    providerNpi: provider.npi,
    organizationName: provider.organizationName,
    ehrPlatform: platform,
    connectionType,
    fhirBaseUrl: baseUrl,
    authMethod: pickAuthMethod(connectionType),
    clientId: '',
    publicKeyId: connectionType === 'epic-backend' ? `kid-${provider.npi}` : null,
    tokenEndpoint: baseUrl ? tokenEndpointFor(connectionType, baseUrl) : '',
    lastTokenRefresh: null,
    connectionStatus: 'pending-setup',
    lastSuccessfulSync: null,
    totalRecordsSynced: 0,
    supportedResources: [],
    scopesGranted: defaultScopesFor(connectionType),
    setupCompletedAt: null,
    setupCompletedBy: null,
    lastErrorMessage: null
  };
}
