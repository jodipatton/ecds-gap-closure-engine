// Tiny hand-built fixture builders for measure/engine tests. Every field has
// a sensible default so a test only states what it cares about.

import type {
  Claim,
  Condition,
  DocumentReference,
  MeasureContext,
  MedicationRequest,
  Member,
  MemberAttribution,
  Observation,
  ProviderOrg
} from '@/lib/data/types';

export const MY = 2025;

export function member(over: Partial<Member> = {}): Member {
  return {
    id: 'M00001',
    name: 'Test Member',
    birthDate: '1970-06-15',
    sex: 'F',
    zip: '12345',
    healthPlanId: 'HP-TEST',
    enrollmentStartDate: '2023-01-01',
    enrollmentEndDate: null,
    ...over
  };
}

let claimSeq = 0;
export function claim(memberId: string, over: Partial<Claim> = {}): Claim {
  return {
    id: `C${++claimSeq}`,
    memberId,
    claimType: 'professional',
    serviceDate: `${MY}-06-01`,
    diagnosisCodes: [],
    procedureCodes: [],
    providerNpi: '1999999999',
    providerOrgName: 'Test Org',
    placeOfService: '11',
    paidAmount: 100,
    ...over
  };
}

let obsSeq = 0;
export function observation(memberId: string, over: Partial<Observation> = {}): Observation {
  return {
    id: `O${++obsSeq}`,
    memberId,
    loinc: '4548-4',
    effectiveDate: `${MY}-06-01`,
    ...over
  };
}

let condSeq = 0;
export function condition(memberId: string, over: Partial<Condition> = {}): Condition {
  return {
    id: `CD${++condSeq}`,
    memberId,
    icd10: 'E11.9',
    onsetDate: `${MY - 1}-06-01`,
    clinicalStatus: 'active',
    ...over
  };
}

let rxSeq = 0;
export function medication(memberId: string, over: Partial<MedicationRequest> = {}): MedicationRequest {
  return {
    id: `RX${++rxSeq}`,
    memberId,
    rxnormOrName: 'sertraline',
    authoredOn: `${MY}-03-01`,
    status: 'active',
    daysSupply: 90,
    ...over
  };
}

let docSeq = 0;
export function documentRef(memberId: string, over: Partial<DocumentReference> = {}): DocumentReference {
  return {
    id: `D${++docSeq}`,
    memberId,
    loincType: '34117-2',
    date: `${MY}-06-01`,
    presentInIndex: true,
    ...over
  };
}

export function ctx(m: Member, over: Partial<Omit<MeasureContext, 'member' | 'measurementYear'>> = {}): MeasureContext {
  return {
    member: m,
    measurementYear: MY,
    claims: [],
    observations: [],
    conditions: [],
    medications: [],
    documents: [],
    ...over
  };
}

export function provider(over: Partial<ProviderOrg> = {}): ProviderOrg {
  return {
    npi: '1999999999',
    organizationName: 'Test Org',
    providerType: 'group',
    specialty: 'Family Medicine',
    address: { street: '1 Main St', city: 'Springfield', state: 'MA', zip: '01101' },
    ehrPlatform: 'Epic',
    ehrSource: 'chpl',
    fhirEndpointUrl: 'https://fhir.epic.example.com/1999999999/r4',
    hieConnected: true,
    hieNetwork: 'Carequality',
    lastValidated: `${MY}-01-15`,
    memberCount: 1,
    ...over
  };
}

export function attribution(memberId: string, over: Partial<MemberAttribution> = {}): MemberAttribution {
  return {
    memberId,
    memberName: 'Test Member',
    healthPlanId: 'HP-TEST',
    pcp: { npi: '1999999999', name: 'Test Org', lastVisitDate: `${MY}-06-01` },
    specialists: [],
    attributionMethod: 'claims-based',
    hasHadVisitInMeasurementYear: true,
    enrollmentStartDate: '2023-01-01',
    enrollmentEndDate: null,
    ...over
  };
}
