// Synthetic data generator. Produces members, claims, FHIR-shaped clinical
// data, providers, and attribution rich enough to drive all 10 HEDIS measures
// with a realistic distribution of closed-by-claims, closed-by-clinical,
// open-needs-clinical, and engagement-queue cases.
//
// This is the analog of the PRD's "extend Synthea seed" requirement. Rather
// than parsing Synthea bundles (zip not present in this environment), it
// generates equivalent shapes deterministically from a seed.

import { repos, writeSeedSummary } from './repository';
import type {
  Claim,
  Condition,
  DocumentReference,
  EhrPlatform,
  ISODate,
  MemberAttribution,
  MedicationRequest,
  Member,
  Observation,
  ProviderOrg
} from './types';

// --- deterministic PRNG ----------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MEASUREMENT_YEAR = 2025;
const MY_START = `${MEASUREMENT_YEAR}-01-01`;
const MY_END = `${MEASUREMENT_YEAR}-12-31`;
const PRIOR_YEAR_START = `${MEASUREMENT_YEAR - 1}-01-01`;

function isoDate(y: number, m: number, d: number): ISODate {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randDateInMY(rand: () => number): ISODate {
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return isoDate(MEASUREMENT_YEAR, month, day);
}

function randDateInLast(rand: () => number, years: number): ISODate {
  const yearsAgo = Math.floor(rand() * years);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return isoDate(MEASUREMENT_YEAR - yearsAgo, month, day);
}

// --- catalogs --------------------------------------------------------------
const FIRST_NAMES = [
  'Aaliyah', 'Mateo', 'Sofia', 'Ezra', 'Noor', 'Hiroshi', 'Imani', 'Diego', 'Priya', 'Jamal',
  'Lin', 'Ahmed', 'Camila', 'Kai', 'Naomi', 'Amir', 'Zara', 'Tomas', 'Elena', 'Kenji',
  'Adaeze', 'Marcus', 'Yuki', 'Rosa', 'Wei', 'Khalil', 'Sana', 'Olufemi', 'Ines', 'Devon'
];
const LAST_NAMES = [
  'Okonkwo', 'Patel', 'Garcia', 'Nguyen', 'Lee', 'Rodriguez', 'Cohen', 'Tanaka', 'Singh', 'Mwangi',
  'Hassan', 'Schmidt', 'Park', 'Hernandez', 'Diallo', 'Romero', 'Ali', 'Sato', 'Brooks', 'Chen'
];

const EHR_DISTRIBUTION: Array<[EhrPlatform | null, number]> = [
  ['Epic', 0.35],
  ['Oracle Health', 0.20],
  ['Athena', 0.15],
  ['eClinicalWorks', 0.10],
  ['Veradigm', 0.10],
  [null, 0.10] // small/unknown
];

const ORG_NAMES = [
  'Riverbend Family Medicine', 'Cedar Point Internists', 'Parkside Pediatrics',
  'Lakeshore OB/GYN', 'Summit Cardiology Associates', 'Northgate Behavioral Health',
  'Maple Valley Endocrinology', 'Eastside Community Health', 'Sunset Primary Care',
  'Harbor Family Practice', 'Foothills Womens Health', 'Birchwood Childrens Clinic',
  'Granite Peak Internal Medicine', 'Cascade Behavioral Wellness', 'Trillium Pediatrics',
  'Bayview Diabetes Center', 'Glenview Adult Medicine', 'Pinecrest Pediatrics',
  'Ironwood Cardiology', 'Crescent Lake Counseling', 'Westridge Family Health',
  'Stonebridge Primary Care', 'Aurora Womens Care', 'Meridian Behavioral Group',
  'Brookline Internists', 'Arbor Lane Pediatrics', 'Highland Heart Specialists',
  'Quartz Mountain Health', 'Silverleaf OB/GYN', 'Coastal Community Pediatrics',
  'Willowbrook Family Medicine', 'Tidewater Internal Medicine', 'Mountainview Behavioral',
  'Sandhill Family Practice', 'Ridgeline Endocrine', 'Shorewood Adult Care',
  'Greenfield Pediatrics', 'Copper Creek Cardiology', 'Lighthouse Womens Health',
  'Evergreen Behavioral Wellness'
];

const SPECIALTIES_BY_ORG: Record<string, string> = {};

function chooseEhr(rand: () => number): EhrPlatform | null {
  let r = rand();
  for (const [ehr, p] of EHR_DISTRIBUTION) {
    if (r < p) return ehr;
    r -= p;
  }
  return null;
}

// --- code catalogs (illustrative; not licensed value sets) -----------------
export const CODES = {
  // Mammography
  mammogram_cpt: ['77067', '77066', '77065'],
  mammogram_hcpcs: ['G0202', 'G0204', 'G0206'],
  mastectomy_icd10: ['Z90.13'],

  // Colorectal screening
  fobt_fit_cpt: ['82270', '82274'],
  fit_dna_cpt: ['81528'],
  flex_sig_cpt: ['45330', '45331', '45332', '45333', '45334', '45335'],
  colonoscopy_cpt: ['45378', '45380', '45385', '45388', '45398'],
  ct_colonography_cpt: ['74263'],

  // Diabetes
  diabetes_icd10: ['E10.9', 'E11.9', 'E11.65', 'E13.9'],
  a1c_loinc: '4548-4',

  // Hypertension
  hypertension_icd10: ['I10', 'I11.9', 'I12.9', 'I13.10', 'I15.9'],
  bp_sys_loinc: '8480-6',
  bp_dia_loinc: '8462-4',

  // Depression screening
  phq9_loinc: ['44249-1', '44261-6'], // PHQ-9 & PHQ-2 panels
  positive_depression_icd10: ['F32.9', 'F33.0'],
  antidepressants_rxnorm: ['sertraline', 'escitalopram', 'fluoxetine', 'duloxetine'],

  // Follow-up after ED for mental illness (FUM)
  ed_visit_pos: '23',
  mental_illness_icd10: ['F20.9', 'F31.9', 'F32.9', 'F33.0', 'F41.9', 'F43.10'],
  followup_visit_cpt: ['90832', '90834', '90837', '99213', '99214'],

  // Prenatal & postpartum (PND-E)
  prenatal_visit_cpt: ['99201', '99202', '99203', '99204', '99205', '0500F'],
  pregnancy_icd10: ['Z34.00', 'Z34.80', 'Z34.90', 'O09.90'],
  delivery_cpt: ['59400', '59409', '59410', '59510', '59514', '59515'],
  postpartum_visit_cpt: ['0503F', '99213', '99214', '57170'],

  // AMM (antidepressant medication management)
  amm_diagnosis_icd10: ['F32.0', 'F32.1', 'F32.2', 'F32.9', 'F33.0', 'F33.1', 'F33.2'],

  // WCV (well-care visit)
  well_visit_cpt: ['99381', '99382', '99383', '99384', '99385', '99391', '99392', '99393', '99394', '99395'],

  // Childhood Immunization Status (CIS) — CVX codes
  cvx: {
    DTaP: ['20'],
    IPV: ['10'],
    MMR: ['03'],
    HiB: ['48', '49', '50', '51'],
    HepB: ['08'],
    VZV: ['21'],
    PCV: ['133'],
    HepA: ['83'],
    Rotavirus: ['116', '119'],
    Influenza: ['88', '141', '150', '155']
  } as const
};

// --- generation ------------------------------------------------------------

function genProviders(rand: () => number): ProviderOrg[] {
  const out: ProviderOrg[] = [];
  for (let i = 0; i < 40; i++) {
    const name = ORG_NAMES[i % ORG_NAMES.length];
    const specialty =
      name.includes('Pediatric') ? 'Pediatrics' :
      name.includes('Cardio') ? 'Cardiology' :
      name.includes('OB') || name.includes('Womens') ? 'Obstetrics & Gynecology' :
      name.includes('Behavioral') || name.includes('Counseling') ? 'Behavioral Health' :
      name.includes('Endocr') || name.includes('Diabetes') ? 'Endocrinology' :
      'Family Medicine';
    SPECIALTIES_BY_ORG[name] = specialty;
    const ehrPlatform = chooseEhr(rand);
    // 70% pre-validated, 30% unvalidated
    const validated = rand() < 0.7;
    const npi = `1${String(1000000000 + i * 137 + Math.floor(rand() * 1000)).slice(-9)}`;
    out.push({
      npi,
      organizationName: name,
      providerType: rand() < 0.7 ? 'group' : 'individual',
      specialty,
      address: {
        street: `${100 + i * 7} Main St`,
        city: pick(rand, ['Springfield', 'Riverdale', 'Fairview', 'Lakewood', 'Hillsboro']),
        state: pick(rand, ['CA', 'NY', 'TX', 'WA', 'IL', 'MA']),
        zip: String(10000 + Math.floor(rand() * 80000))
      },
      ehrPlatform: validated ? ehrPlatform : null,
      ehrSource: validated ? (rand() < 0.6 ? 'chpl' : rand() < 0.5 ? 'lantern' : 'manual') : 'manual',
      fhirEndpointUrl: validated && ehrPlatform
        ? `https://fhir.${ehrPlatform.toLowerCase().replace(/\s+/g, '')}.example.com/${npi}/r4`
        : null,
      hieConnected: rand() < 0.55,
      hieNetwork: rand() < 0.55 ? pick(rand, ['Carequality', 'CommonWell', 'eHealth Exchange', null as any]) : null,
      lastValidated: isoDate(2025, 1 + Math.floor(rand() * 4), 1 + Math.floor(rand() * 28)),
      memberCount: 0
    });
  }
  return out;
}

interface MemberPlan {
  // Determines what data the member ends up having.
  // Drives the ~60/30/10 distribution from the PRD.
  bucket: 'closed-claims' | 'open-needs-clinical' | 'minimal';
}

function genMembers(rand: () => number, count: number): { members: Member[]; plans: Map<string, MemberPlan> } {
  const members: Member[] = [];
  const plans = new Map<string, MemberPlan>();
  for (let i = 0; i < count; i++) {
    const id = `M${String(i + 1).padStart(5, '0')}`;
    const sex: 'F' | 'M' = rand() < 0.52 ? 'F' : 'M';
    // Age distribution: skew toward adult ages but include kids for CIS/WCV
    let age: number;
    const r = rand();
    if (r < 0.10) age = 1 + Math.floor(rand() * 2); // 1-2 (CIS)
    else if (r < 0.20) age = 3 + Math.floor(rand() * 18); // 3-20 (WCV)
    else if (r < 0.55) age = 30 + Math.floor(rand() * 30); // 30-60
    else if (r < 0.85) age = 50 + Math.floor(rand() * 20); // 50-70
    else age = 65 + Math.floor(rand() * 20); // 65-85
    const birthYear = MEASUREMENT_YEAR - age;
    const bMonth = 1 + Math.floor(rand() * 12);
    const bDay = 1 + Math.floor(rand() * 28);
    const enrollStart = isoDate(MEASUREMENT_YEAR - 2, 1, 1);
    const enrollEnd = rand() < 0.92 ? null : isoDate(MEASUREMENT_YEAR, 1 + Math.floor(rand() * 12), 28);
    members.push({
      id,
      name: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      birthDate: isoDate(birthYear, bMonth, bDay),
      sex,
      zip: String(10000 + Math.floor(rand() * 80000)),
      healthPlanId: 'HP-DEMO-001',
      enrollmentStartDate: enrollStart,
      enrollmentEndDate: enrollEnd,
      riskScore: Number((0.3 + rand() * 2.5).toFixed(2))
    });
    const br = rand();
    plans.set(id, {
      bucket: br < 0.6 ? 'closed-claims' : br < 0.9 ? 'open-needs-clinical' : 'minimal'
    });
  }
  return { members, plans };
}

function ageOn(birthDate: ISODate, ref: ISODate): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  let a = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) a -= 1;
  return a;
}

interface GenContext {
  rand: () => number;
  providers: ProviderOrg[];
  member: Member;
  plan: MemberPlan;
  age: number;
}

function genClaimsAndClinicalForMember(ctx: GenContext): {
  claims: Claim[];
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  documents: DocumentReference[];
  attribution: MemberAttribution;
} {
  const { rand, providers, member, plan, age } = ctx;
  const claims: Claim[] = [];
  const observations: Observation[] = [];
  const conditions: Condition[] = [];
  const medications: MedicationRequest[] = [];
  const documents: DocumentReference[] = [];

  // Pick a primary attributed PCP based on age. ~15% have no PCP.
  let pcp: ProviderOrg | null = null;
  const noPcpRoll = rand();
  if (noPcpRoll >= 0.15) {
    const wantSpecialty =
      age <= 18 ? 'Pediatrics' :
      member.sex === 'F' && age >= 18 && age <= 50 && rand() < 0.35 ? 'Obstetrics & Gynecology' :
      'Family Medicine';
    const pool = providers.filter((p) => p.specialty === wantSpecialty);
    pcp = pool.length ? pick(rand, pool) : pick(rand, providers);
  }

  // Members in the "minimal" bucket have no claims, no clinical data, no visits.
  const hasMinimal = plan.bucket === 'minimal';

  // Helper to push a professional claim
  const pushClaim = (date: ISODate, dx: string[], proc: string[], pos = '11', org?: ProviderOrg) => {
    const provider = org ?? pcp ?? pick(rand, providers);
    claims.push({
      id: `C${claims.length}-${member.id}`,
      memberId: member.id,
      claimType: 'professional',
      serviceDate: date,
      diagnosisCodes: dx,
      procedureCodes: proc,
      providerNpi: provider.npi,
      providerOrgName: provider.organizationName,
      placeOfService: pos,
      paidAmount: Number((50 + rand() * 350).toFixed(2))
    });
    return provider;
  };

  let lastVisitDate: ISODate | null = null;
  if (!hasMinimal && pcp) {
    // Routine visit in MY
    const d = randDateInMY(rand);
    pushClaim(d, ['Z00.00'], ['99213'], '11', pcp);
    lastVisitDate = d;
  }

  // BCS — women 50-74, mammogram in MY or prior year (closed-claims bucket)
  if (member.sex === 'F' && age >= 50 && age <= 74 && plan.bucket === 'closed-claims' && rand() < 0.85) {
    const date = rand() < 0.6 ? randDateInMY(rand) : randDateInLast(rand, 1);
    pushClaim(date, [], [pick(rand, [...CODES.mammogram_cpt, ...CODES.mammogram_hcpcs])]);
  }
  // ~3% of women had bilateral mastectomy — exclusion path
  if (member.sex === 'F' && age >= 50 && age <= 74 && rand() < 0.03) {
    conditions.push({
      id: `CD${conditions.length}-${member.id}`,
      memberId: member.id,
      icd10: 'Z90.13',
      onsetDate: randDateInLast(rand, 5),
      clinicalStatus: 'active'
    });
  }

  // COL — adults 45-75
  if (age >= 45 && age <= 75) {
    if (plan.bucket === 'closed-claims' && rand() < 0.7) {
      const which = rand();
      if (which < 0.4) pushClaim(randDateInMY(rand), [], [pick(rand, CODES.fobt_fit_cpt)]);
      else if (which < 0.55) pushClaim(randDateInLast(rand, 3), [], CODES.fit_dna_cpt);
      else if (which < 0.65) pushClaim(randDateInLast(rand, 5), [], [pick(rand, CODES.flex_sig_cpt)]);
      else if (which < 0.95) pushClaim(randDateInLast(rand, 10), [], [pick(rand, CODES.colonoscopy_cpt)]);
      else pushClaim(randDateInLast(rand, 5), [], CODES.ct_colonography_cpt);
    } else if (plan.bucket === 'open-needs-clinical' && rand() < 0.5) {
      // Has a colonoscopy DocumentReference but not a billed CPT
      documents.push({
        id: `D${documents.length}-${member.id}`,
        memberId: member.id,
        loincType: '34117-2', // History and physical with colonoscopy report
        date: randDateInLast(rand, 8),
        presentInIndex: true
      });
    }
  }

  // Diabetes — ~12% of adults 18-75
  const hasDiabetes = age >= 18 && age <= 75 && rand() < 0.12;
  if (hasDiabetes) {
    const dxCode = pick(rand, CODES.diabetes_icd10);
    conditions.push({
      id: `CD${conditions.length}-${member.id}`,
      memberId: member.id,
      icd10: dxCode,
      onsetDate: randDateInLast(rand, 3),
      clinicalStatus: 'active'
    });
    // 2 outpatient visits with diabetes diagnosis
    pushClaim(randDateInMY(rand), [dxCode], ['99213']);
    pushClaim(randDateInMY(rand), [dxCode], ['99214']);
    // Tier 2: A1c lab requires Observation. Closed-claims bucket gets a
    // good A1c result; open-needs-clinical bucket has the order claim but
    // no result Observation (the gap to demonstrate).
    if (plan.bucket === 'closed-claims') {
      const value = 5.5 + rand() * 2.0; // mostly < 8.0
      observations.push({
        id: `O${observations.length}-${member.id}`,
        memberId: member.id,
        loinc: CODES.a1c_loinc,
        display: 'Hemoglobin A1c',
        valueQuantity: { value: Number(value.toFixed(1)), unit: '%' },
        effectiveDate: randDateInMY(rand)
      });
    } else if (plan.bucket === 'open-needs-clinical') {
      // Lab order claim but no result. The engine should record this gap.
      pushClaim(randDateInMY(rand), [dxCode], ['83036']); // A1c lab order CPT
    }
  }

  // Hypertension — ~25% of adults 18-85
  const hasHtn = age >= 18 && age <= 85 && rand() < 0.25;
  if (hasHtn) {
    const dxCode = pick(rand, CODES.hypertension_icd10);
    conditions.push({
      id: `CD${conditions.length}-${member.id}`,
      memberId: member.id,
      icd10: dxCode,
      onsetDate: randDateInLast(rand, 4),
      clinicalStatus: 'active'
    });
    pushClaim(randDateInMY(rand), [dxCode], ['99213']);
    pushClaim(randDateInMY(rand), [dxCode], ['99214']);
    if (plan.bucket === 'closed-claims') {
      // Controlled BP reading — Tier 2 closed
      const sys = 110 + Math.floor(rand() * 25);
      const dia = 65 + Math.floor(rand() * 15);
      const date = randDateInMY(rand);
      observations.push({
        id: `O${observations.length}-${member.id}`,
        memberId: member.id,
        loinc: CODES.bp_sys_loinc,
        display: 'Systolic BP',
        valueQuantity: { value: sys, unit: 'mmHg' },
        effectiveDate: date
      });
      observations.push({
        id: `O${observations.length}-${member.id}`,
        memberId: member.id,
        loinc: CODES.bp_dia_loinc,
        display: 'Diastolic BP',
        valueQuantity: { value: dia, unit: 'mmHg' },
        effectiveDate: date
      });
    }
    // open-needs-clinical: visit claim but no BP observation captured
  }

  // Depression screening (DSF-E) — adults 18+
  if (age >= 18) {
    if (plan.bucket === 'closed-claims' && rand() < 0.55) {
      observations.push({
        id: `O${observations.length}-${member.id}`,
        memberId: member.id,
        loinc: pick(rand, CODES.phq9_loinc),
        display: 'PHQ-9 total score',
        valueQuantity: { value: Math.floor(rand() * 28), unit: 'score' },
        effectiveDate: randDateInMY(rand)
      });
    }
  }

  // FUM — ED visit with mental illness diagnosis, possible 30-day follow-up
  if (age >= 6 && rand() < 0.04) {
    const edDate = isoDate(MEASUREMENT_YEAR, 2 + Math.floor(rand() * 9), 1 + Math.floor(rand() * 25));
    pushClaim(edDate, [pick(rand, CODES.mental_illness_icd10)], ['99284'], CODES.ed_visit_pos);
    // 65% of these get a follow-up visit
    if (rand() < 0.65) {
      const [y, m, d] = edDate.split('-').map(Number);
      const followDays = Math.floor(rand() * 28);
      const fd = new Date(y, m - 1, d + followDays + 1);
      const followDate = isoDate(fd.getFullYear(), fd.getMonth() + 1, fd.getDate());
      const bhPool = providers.filter((p) => p.specialty === 'Behavioral Health');
      pushClaim(followDate, [pick(rand, CODES.mental_illness_icd10)], [pick(rand, CODES.followup_visit_cpt)], '11', bhPool.length ? pick(rand, bhPool) : pcp ?? undefined);
    }
  }

  // Prenatal & Postpartum (PND-E) — pregnant women 16-45
  if (member.sex === 'F' && age >= 16 && age <= 45 && rand() < 0.35) {
    const deliveryDate = randDateInMY(rand);
    // Prenatal visits in 1st trimester
    pushClaim(randDateInMY(rand), [pick(rand, CODES.pregnancy_icd10)], [pick(rand, CODES.prenatal_visit_cpt)]);
    pushClaim(deliveryDate, [], [pick(rand, CODES.delivery_cpt)]);
    // Postpartum visit ~6 weeks after for closed-claims bucket
    if (plan.bucket === 'closed-claims') {
      const [y, m, d] = deliveryDate.split('-').map(Number);
      const pp = new Date(y, m - 1, d + 42);
      const ppDate = isoDate(pp.getFullYear(), pp.getMonth() + 1, pp.getDate());
      pushClaim(ppDate, [], [pick(rand, CODES.postpartum_visit_cpt)]);
    }
  }

  // AMM — adults 18+ with major depression and antidepressant Rx
  if (age >= 18 && rand() < 0.12) {
    const dxCode = pick(rand, CODES.amm_diagnosis_icd10);
    conditions.push({
      id: `CD${conditions.length}-${member.id}`,
      memberId: member.id,
      icd10: dxCode,
      onsetDate: randDateInMY(rand),
      clinicalStatus: 'active'
    });
    pushClaim(randDateInMY(rand), [dxCode], ['99213']);
    // Effective acute (84d supply) for closed-claims
    if (plan.bucket === 'closed-claims') {
      medications.push({
        id: `RX${medications.length}-${member.id}`,
        memberId: member.id,
        rxnormOrName: pick(rand, CODES.antidepressants_rxnorm),
        authoredOn: randDateInMY(rand),
        status: 'active',
        daysSupply: 90
      });
    } else if (plan.bucket === 'open-needs-clinical') {
      medications.push({
        id: `RX${medications.length}-${member.id}`,
        memberId: member.id,
        rxnormOrName: pick(rand, CODES.antidepressants_rxnorm),
        authoredOn: randDateInMY(rand),
        status: 'active',
        daysSupply: 30 // less than 84-day requirement
      });
    }
  }

  // WCV — children/adolescents 3-21
  if (age >= 3 && age <= 21) {
    if (plan.bucket === 'closed-claims' && rand() < 0.7) {
      pushClaim(randDateInMY(rand), ['Z00.129'], [pick(rand, CODES.well_visit_cpt)]);
    }
  }

  // CIS — children turning 2 in MY (illustrative)
  if (age === 2) {
    // Generate the 10 antigens with varying completeness
    const antigens = Object.entries(CODES.cvx);
    for (const [, codes] of antigens) {
      const completeness =
        plan.bucket === 'closed-claims' ? 0.95 :
        plan.bucket === 'open-needs-clinical' ? 0.55 : 0.15;
      if (rand() < completeness) {
        // Immunization recorded as procedure on a claim
        pushClaim(randDateInLast(rand, 2), [], [pick(rand, [...codes])]);
      }
    }
  }

  // Build attribution
  const attribution: MemberAttribution = {
    memberId: member.id,
    memberName: member.name,
    healthPlanId: member.healthPlanId,
    pcp: pcp ? {
      npi: pcp.npi,
      name: pcp.organizationName,
      lastVisitDate: lastVisitDate ?? randDateInLast(rand, 2)
    } : null,
    specialists: [],
    attributionMethod: pcp ? 'claims-based' : 'plan-assigned',
    hasHadVisitInMeasurementYear: !hasMinimal && claims.some((c) => c.serviceDate >= MY_START && c.serviceDate <= MY_END),
    riskScore: member.riskScore,
    enrollmentStartDate: member.enrollmentStartDate,
    enrollmentEndDate: member.enrollmentEndDate
  };

  return { claims, observations, conditions, medications, documents, attribution };
}

export async function runSeed({ memberCount = 60, seed = 42 } = {}) {
  const rand = mulberry32(seed);
  const providers = genProviders(rand);
  const { members, plans } = genMembers(rand, memberCount);

  const allClaims: Claim[] = [];
  const allObs: Observation[] = [];
  const allCond: Condition[] = [];
  const allMeds: MedicationRequest[] = [];
  const allDocs: DocumentReference[] = [];
  const allAttribution: MemberAttribution[] = [];

  const memberCountByNpi: Record<string, number> = {};

  for (const member of members) {
    const plan = plans.get(member.id)!;
    const age = ageOn(member.birthDate, MY_END);
    const out = genClaimsAndClinicalForMember({ rand, providers, member, plan, age });
    allClaims.push(...out.claims);
    allObs.push(...out.observations);
    allCond.push(...out.conditions);
    allMeds.push(...out.medications);
    allDocs.push(...out.documents);
    allAttribution.push(out.attribution);
    if (out.attribution.pcp) {
      memberCountByNpi[out.attribution.pcp.npi] = (memberCountByNpi[out.attribution.pcp.npi] ?? 0) + 1;
    }
  }

  // Update provider memberCount
  for (const p of providers) p.memberCount = memberCountByNpi[p.npi] ?? 0;

  await Promise.all([
    repos.members.put(members),
    repos.providers.put(providers),
    repos.claims.put(allClaims),
    repos.observations.put(allObs),
    repos.conditions.put(allCond),
    repos.medications.put(allMeds),
    repos.documents.put(allDocs),
    repos.attribution.put(allAttribution),
    // Reset derived state — engine will repopulate on run
    repos.hedisResults.clear(),
    repos.gaps.clear(),
    repos.engagement.clear()
  ]);

  const summary = {
    members: members.length,
    claims: allClaims.length,
    providers: providers.length,
    observations: allObs.length,
    conditions: allCond.length,
    medications: allMeds.length,
    documents: allDocs.length,
    generatedAt: new Date().toISOString(),
    measurementYear: MEASUREMENT_YEAR
  };
  await writeSeedSummary(summary);
  return summary;
}

// CLI: `npm run seed`
if (typeof require !== 'undefined' && require.main === module) {
  const limit = Number(process.env.SEED_LIMIT ?? 60);
  runSeed({ memberCount: limit }).then((s) => {
    // eslint-disable-next-line no-console
    console.log('Seed complete:', s);
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
