// CMS Provider Access API onboarding (per CMS-0057-F). A provider with a
// treatment relationship can pull payer-held data (claims, encounters, USCDI
// clinical data) for their attributed patients. The OAuth2 / FHIR plumbing is
// illustrative; the attestation gate and the attributed-panel resolution are
// the substantive parts modeled here.

import { repos } from '@/lib/data/repository';
import { recordAudit } from '@/lib/audit/audit';
import type { PayerAccessGrant } from '@/lib/data/types';

const PAYER_FHIR_BASE = 'https://api.healthplan-demo.example.com/provider-access/fhir/r4';
const PAYER_TOKEN_ENDPOINT = 'https://api.healthplan-demo.example.com/oauth2/token';
const SCOPES = [
  'system/Patient.read',
  'system/ExplanationOfBenefit.read',
  'system/Coverage.read',
  'system/Observation.read',
  'system/Condition.read',
  'system/MedicationRequest.read',
  'system/Encounter.read'
];

export function payerAccessConfig() {
  return { payerFhirBaseUrl: PAYER_FHIR_BASE, tokenEndpoint: PAYER_TOKEN_ENDPOINT, scopes: SCOPES };
}

export interface RegisterInput {
  providerNpi: string;
  tin: string;
  attestedTreatmentRelationship: boolean;
  attestedMinimumNecessary: boolean;
}

export async function registerPayerAccess(input: RegisterInput): Promise<PayerAccessGrant> {
  const providers = await repos.providers.list();
  const provider = providers.find((p) => p.npi === input.providerNpi);
  if (!provider) throw new Error('Provider not found in directory');
  if (!input.tin?.trim()) throw new Error('TIN is required');

  const bothAttested =
    input.attestedTreatmentRelationship && input.attestedMinimumNecessary;
  if (!bothAttested) {
    throw new Error('Both attestations are required before registration (CMS-0057-F)');
  }

  const existing = (await repos.payerAccess.list()).find(
    (g) => g.providerNpi === input.providerNpi
  );
  const grant: PayerAccessGrant = {
    providerNpi: provider.npi,
    organizationName: provider.organizationName,
    tin: input.tin.trim(),
    attestedTreatmentRelationship: true,
    attestedMinimumNecessary: true,
    clientId: existing?.clientId ?? `pa-client-${provider.npi}`,
    payerFhirBaseUrl: PAYER_FHIR_BASE,
    tokenEndpoint: PAYER_TOKEN_ENDPOINT,
    scopesRequested: SCOPES,
    status: 'attested',
    attributedMemberCount: existing?.attributedMemberCount ?? 0,
    lastPullAt: existing?.lastPullAt ?? null,
    registeredAt: new Date().toISOString(),
    lastErrorMessage: null
  };
  await repos.payerAccess.upsertOne(grant, 'providerNpi');
  return grant;
}

// Simulated token exchange + attributed-panel resolution. The payer returns
// the set of members whose attributed PCP is this NPI.
export async function testPayerAccess(providerNpi: string): Promise<PayerAccessGrant> {
  const [grants, attribution] = await Promise.all([
    repos.payerAccess.list(),
    repos.attribution.list()
  ]);
  const grant = grants.find((g) => g.providerNpi === providerNpi);
  if (!grant) throw new Error('No registration found — complete the attestation step first');
  if (grant.status === 'pending') {
    throw new Error('Attestations not completed');
  }

  const panel = attribution.filter((a) => a.pcp?.npi === providerNpi).length;
  const updated: PayerAccessGrant = {
    ...grant,
    status: 'connected',
    attributedMemberCount: panel,
    lastPullAt: new Date().toISOString(),
    lastErrorMessage: null
  };
  await repos.payerAccess.upsertOne(updated, 'providerNpi');

  await recordAudit({
    source: 'payer-access-pull',
    sourceSystem: 'CMS Provider Access API',
    providerNpi: grant.providerNpi,
    organizationName: grant.organizationName,
    resourceCounts: { Patient: panel },
    recordsAccepted: panel,
    recordsRejected: 0,
    psvStatus: 'verified',
    psvBasis: 'Attested treatment relationship (CMS-0057-F) for attributed panel',
    initiatedBy: 'provider portal · Payer Access API'
  });

  return updated;
}
