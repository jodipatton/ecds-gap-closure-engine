// Shared types for the ECDS gap closure engine.
// These mirror the Firestore collection shapes from the PRD so a Firestore
// adapter can drop in later behind the same Repository interface.

export type ISODate = string;

export type DataTier = 'claims-only' | 'uscdi-v3' | 'ccda';

export type EhrPlatform =
  | 'Epic'
  | 'Oracle Health'
  | 'Athena'
  | 'eClinicalWorks'
  | 'Veradigm'
  | 'NextGen'
  | 'Greenway'
  | 'Unknown';

export interface Member {
  id: string;
  name: string;
  birthDate: ISODate;
  sex: 'F' | 'M';
  zip: string;
  healthPlanId: string;
  enrollmentStartDate: ISODate;
  enrollmentEndDate: ISODate | null;
  riskScore?: number;
}

export interface Claim {
  id: string;
  memberId: string;
  claimType: 'professional' | 'institutional' | 'pharmacy';
  serviceDate: ISODate;
  diagnosisCodes: string[];
  procedureCodes: string[];
  providerNpi: string;
  providerOrgName: string;
  placeOfService: string;
  ndcCode?: string;
  paidAmount: number;
}

export interface MemberAttribution {
  memberId: string;
  memberName: string;
  healthPlanId: string;
  pcp: {
    npi: string;
    name: string;
    lastVisitDate: ISODate;
  } | null;
  specialists: Array<{
    npi: string;
    name: string;
    specialty: string;
    lastVisitDate: ISODate;
  }>;
  attributionMethod: 'claims-based' | 'plan-assigned';
  hasHadVisitInMeasurementYear: boolean;
  riskScore?: number;
  enrollmentStartDate: ISODate;
  enrollmentEndDate: ISODate | null;
}

export interface ProviderOrg {
  npi: string;
  organizationName: string;
  providerType: 'individual' | 'group';
  specialty: string;
  address: { street: string; city: string; state: string; zip: string };
  ehrPlatform: EhrPlatform | null;
  ehrSource: 'chpl' | 'lantern' | 'manual';
  fhirEndpointUrl: string | null;
  hieConnected: boolean;
  hieNetwork: string | null;
  lastValidated: ISODate;
  memberCount: number;
}

// Clinical FHIR-shaped resources, only the fields the engine actually reads.
export interface Observation {
  id: string;
  memberId: string;
  loinc: string;
  display?: string;
  valueQuantity?: { value: number; unit: string };
  valueCodeableConcept?: string;
  effectiveDate: ISODate;
}

export interface Condition {
  id: string;
  memberId: string;
  icd10: string;
  onsetDate: ISODate;
  clinicalStatus: 'active' | 'resolved';
}

export interface MedicationRequest {
  id: string;
  memberId: string;
  rxnormOrName: string;
  ndcCode?: string;
  authoredOn: ISODate;
  status: 'active' | 'completed' | 'stopped';
  daysSupply?: number;
}

export interface DocumentReference {
  id: string;
  memberId: string;
  loincType: string;
  date: ISODate;
  presentInIndex: boolean;
}

export type GapStatus =
  | 'closed-claims'
  | 'closed-clinical'
  | 'open-needs-clinical'
  | 'open-needs-document'
  | 'excluded'
  | 'not-eligible';

export interface MeasureGap {
  measureId: string;
  memberId: string;
  status: GapStatus;
  missingDataElement?: string; // e.g., "FHIR Observation LOINC 4548-4"
  evidence?: string[]; // codes that contributed
  computedAt: ISODate;
}

export interface HedisResult {
  measureId: string;
  measureName: string;
  dataTier: DataTier;
  domain: string;
  eligiblePopulation: number;
  numeratorFromClaims: number;
  numeratorFromClinical: number;
  combinedNumerator: number;
  exclusions: number;
  gapCount: number;
  rate: number; // 0-100
  dataCompleteness: number; // 0-100
  lastComputed: ISODate;
}

export interface EngagementQueueEntry {
  memberId: string;
  memberName: string;
  queueReason: 'no-visit' | 'no-pcp' | 'gap-closeable';
  relatedMeasures: string[];
  suggestedProviders: Array<{
    npi: string;
    name: string;
    specialty: string;
    distance: number; // miles, illustrative
    ehrPlatform: EhrPlatform | null;
  }>;
  outreachType: 'appointment-scheduling' | 'pcp-assignment' | 'gap-closure';
  incentiveEligible: boolean;
  incentiveDescription: string | null;
  outreachStatus: 'pending' | 'sent' | 'completed';
  createdAt: ISODate;
}

export interface MeasureSpec {
  id: string;
  name: string;
  shortName: string;
  domain:
    | 'Cancer Screening'
    | 'Pediatric Preventive'
    | 'Cardiometabolic'
    | 'Behavioral Health'
    | 'Maternal Health'
    | 'Wellness';
  dataTier: DataTier;
  description: string;
  // Pure functions implemented in src/lib/hedis/measures/<id>.ts
  isEligible: (ctx: MeasureContext) => boolean;
  isExcluded: (ctx: MeasureContext) => boolean;
  satisfiedByClaims: (ctx: MeasureContext) => { ok: boolean; evidence: string[] };
  satisfiedByClinical: (ctx: MeasureContext) => {
    ok: boolean;
    evidence: string[];
    missingDataElement?: string;
  };
}

export interface MeasureContext {
  member: Member;
  claims: Claim[];
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  documents: DocumentReference[];
  measurementYear: number;
}

export interface SeedSummary {
  members: number;
  claims: number;
  providers: number;
  observations: number;
  conditions: number;
  medications: number;
  documents: number;
  generatedAt: ISODate;
  measurementYear: number;
}

// ---- EHR connection (provider portal) ------------------------------------

export type ConnectionType = 'epic-backend' | 'athena-fhir' | 'smart-on-fhir-generic';
export type AuthMethod = 'jwt-backend-services' | 'oauth2-client-credentials' | 'smart-launch';
export type ConnectionStatus = 'active' | 'expired' | 'error' | 'pending-setup';

export interface EhrConnection {
  providerNpi: string;
  organizationName: string;
  ehrPlatform: string;
  connectionType: ConnectionType;
  fhirBaseUrl: string;
  authMethod: AuthMethod;
  clientId: string;
  publicKeyId: string | null; // Epic JWK kid reference
  tokenEndpoint: string;
  lastTokenRefresh: ISODate | null;
  connectionStatus: ConnectionStatus;
  lastSuccessfulSync: ISODate | null;
  totalRecordsSynced: number;
  supportedResources: string[];
  scopesGranted: string[];
  setupCompletedAt: ISODate | null;
  setupCompletedBy: string | null;
  // Diagnostic detail rendered in the status dashboard
  lastErrorMessage?: string | null;
}
