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

/** What kind of clinical data would close a still-open gap. */
export type MissingDataKind = 'observation' | 'document' | 'condition' | 'medication' | 'immunization';

export interface MissingData {
  kind: MissingDataKind;
  description: string; // e.g., "FHIR Observation LOINC 4548-4"
}

export interface MeasureGap {
  id: string; // `${measureId}:${memberId}`
  measureId: string;
  memberId: string;
  status: GapStatus;
  missingDataElement?: string; // human-readable form of MissingData.description
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
    missing?: MissingData;
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

// ---- Outreach campaigns ---------------------------------------------------

export type ContactStatus = 'not-contacted' | 'contacted' | 'scheduled' | 'closed';

export interface CampaignMember {
  memberId: string;
  memberName: string;
  relatedMeasures: string[];
  suggestedProviderName: string | null;
  contactStatus: ContactStatus;
  lastTouchedAt: ISODate | null;
}

// ---- Per-page feedback ----------------------------------------------------

export interface FeedbackEntry {
  id: string;
  page: string; // pathname the feedback is about
  pageTitle: string;
  createdAt: ISODate;
  role: string;
  valuable: 'yes' | 'somewhat' | 'not-yet' | 'unsure';
  rating: number; // 1–5 overall
  whoWouldUse: string;
  improvements: string;
  wouldChampion: boolean;
  email?: string;
}

// ---- Clinical data provenance / PSV audit trail ---------------------------

export type AuditSource = 'ehr-sync' | 'payer-access-pull' | 'seed';

export interface AuditEvent {
  id: string;
  ts: ISODate;
  source: AuditSource;
  sourceSystem: string; // e.g. "Epic FHIR R4", "Provider Access API"
  providerNpi: string | null;
  organizationName: string | null;
  resourceCounts: Record<string, number>; // { Observation: 5, Condition: 2, ... }
  recordsAccepted: number;
  recordsRejected: number;
  // Primary Source Verification: was the source a validated, attributed origin?
  psvStatus: 'verified' | 'unverified';
  psvBasis: string;
  initiatedBy: string;
}

// ---- Value-based contracts ------------------------------------------------

export type VbcModel = 'P4P' | 'Shared Savings' | 'Full Risk';

export interface ValueContract {
  id: string;
  providerNpi: string;
  organizationName: string;
  payerName: string;
  model: VbcModel;
  measureIds: string[];
  panelSize: number;
  targetRatePct: number;
  perGapIncentive: number; // $ earned per closed gap
  qualityWithholdPct: number; // % of capitation at risk on quality
  estimatedCapitation: number; // annual $, illustrative
  effectiveYear: number;
}

// ---- CMS Provider Access API onboarding (CMS-0057-F) ----------------------

export type PayerAccessStatus = 'pending' | 'attested' | 'connected' | 'error';

export interface PayerAccessGrant {
  providerNpi: string;
  organizationName: string;
  tin: string;
  attestedTreatmentRelationship: boolean;
  attestedMinimumNecessary: boolean;
  clientId: string;
  payerFhirBaseUrl: string;
  tokenEndpoint: string;
  scopesRequested: string[];
  status: PayerAccessStatus;
  attributedMemberCount: number;
  lastPullAt: ISODate | null;
  registeredAt: ISODate | null;
  lastErrorMessage?: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  // What seeded this campaign's roster.
  filterType: 'measure' | 'queue-reason';
  filterValue: string;
  channel: 'phone' | 'sms' | 'mail';
  createdAt: ISODate;
  members: CampaignMember[];
}
