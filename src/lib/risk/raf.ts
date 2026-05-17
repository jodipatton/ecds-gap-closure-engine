// Illustrative Medicare Risk Adjustment (CMS-HCC) model.
//
// NOT the licensed CMS-HCC software or official coefficients. It demonstrates
// the mechanics: a member's RAF = demographic factor + additive HCC factors
// for documented conditions. "Suspected" HCCs are conditions implied by claim
// diagnosis codes that were never carried into a documented FHIR Condition —
// the classic recapture opportunity that drives MA revenue accuracy.

import type { Claim, Condition, Member } from '@/lib/data/types';

// Illustrative dollars of annual MA revenue per 1.0 RAF point.
export const RAF_DOLLARS = 11000;

interface HccDef {
  hcc: string;
  label: string;
  coef: number;
}

// ICD-10 prefix → HCC. Longest matching prefix wins. Hypertension (I10),
// asthma, and uncomplicated routine codes are intentionally absent — they are
// not risk-adjusted, a useful teaching point in the UI.
const HCC_TABLE: Array<{ prefix: string } & HccDef> = [
  { prefix: 'E1166', hcc: 'HCC18', label: 'Diabetes with chronic complications', coef: 0.302 },
  { prefix: 'E1165', hcc: 'HCC18', label: 'Diabetes with hyperglycemia', coef: 0.302 },
  { prefix: 'E114', hcc: 'HCC18', label: 'Diabetes with neurological complications', coef: 0.302 },
  { prefix: 'E113', hcc: 'HCC18', label: 'Diabetes with ophthalmic complications', coef: 0.302 },
  { prefix: 'E10', hcc: 'HCC19', label: 'Diabetes (type 1)', coef: 0.105 },
  { prefix: 'E11', hcc: 'HCC19', label: 'Diabetes without complication', coef: 0.105 },
  { prefix: 'E13', hcc: 'HCC19', label: 'Diabetes, other', coef: 0.105 },
  { prefix: 'I50', hcc: 'HCC85', label: 'Congestive heart failure', coef: 0.331 },
  { prefix: 'I48', hcc: 'HCC96', label: 'Specified heart arrhythmias', coef: 0.268 },
  { prefix: 'I25', hcc: 'HCC88', label: 'Ischemic / coronary artery disease', coef: 0.139 },
  { prefix: 'I70', hcc: 'HCC108', label: 'Vascular disease', coef: 0.288 },
  { prefix: 'I73', hcc: 'HCC108', label: 'Peripheral vascular disease', coef: 0.288 },
  { prefix: 'J44', hcc: 'HCC111', label: 'COPD', coef: 0.328 },
  { prefix: 'N185', hcc: 'HCC137', label: 'CKD stage 5 / ESRD', coef: 0.289 },
  { prefix: 'N186', hcc: 'HCC137', label: 'End-stage renal disease', coef: 0.289 },
  { prefix: 'N18', hcc: 'HCC138', label: 'Chronic kidney disease', coef: 0.127 },
  { prefix: 'F33', hcc: 'HCC59', label: 'Major depression, recurrent', coef: 0.309 },
  { prefix: 'F32', hcc: 'HCC59', label: 'Major depressive disorder', coef: 0.309 },
  { prefix: 'F31', hcc: 'HCC59', label: 'Bipolar disorder', coef: 0.309 },
  { prefix: 'F20', hcc: 'HCC57', label: 'Schizophrenia', coef: 0.524 },
  { prefix: 'E660', hcc: 'HCC22', label: 'Morbid obesity', coef: 0.25 },
  { prefix: 'C50', hcc: 'HCC12', label: 'Breast / other cancer', coef: 0.15 }
];

function norm(code: string): string {
  return code.replace(/\./g, '').toUpperCase();
}

function matchHcc(icd10: string): HccDef | null {
  const c = norm(icd10);
  let best: (typeof HCC_TABLE)[number] | null = null;
  for (const row of HCC_TABLE) {
    if (c.startsWith(row.prefix) && (!best || row.prefix.length > best.prefix.length)) {
      best = row;
    }
  }
  return best ? { hcc: best.hcc, label: best.label, coef: best.coef } : null;
}

// Illustrative community demographic factor (non-dual, aged).
function demographicFactor(member: Member, measurementYear: number): number {
  const birthYear = Number(member.birthDate.slice(0, 4));
  const age = measurementYear - birthYear;
  const f = member.sex === 'F';
  if (age < 65) return f ? 0.207 : 0.232; // disabled/under-65 proxy
  if (age <= 69) return f ? 0.323 : 0.395;
  if (age <= 74) return f ? 0.359 : 0.452;
  if (age <= 79) return f ? 0.418 : 0.508;
  if (age <= 84) return f ? 0.514 : 0.617;
  return f ? 0.732 : 0.79;
}

export interface HccHit {
  hcc: string;
  label: string;
  coef: number;
  evidenceIcd10: string;
}

export interface MemberRisk {
  memberId: string;
  memberName: string;
  age: number;
  sex: 'F' | 'M';
  medicareEligible: boolean;
  demographicFactor: number;
  documentedHccs: HccHit[];
  suspectedHccs: HccHit[]; // implied by claims, not in documented Conditions
  currentRaf: number;
  potentialRaf: number; // current + suspected recapture
  rafGap: number;
  annualRevenueCurrent: number;
  annualRevenueOpportunity: number; // $ from recapturing suspected HCCs
}

function uniqueByHcc(hits: HccHit[]): HccHit[] {
  const byHcc = new Map<string, HccHit>();
  for (const h of hits) {
    const prev = byHcc.get(h.hcc);
    if (!prev || h.coef > prev.coef) byHcc.set(h.hcc, h);
  }
  return [...byHcc.values()];
}

export function computeMemberRisk(
  member: Member,
  conditions: Condition[],
  claims: Claim[],
  measurementYear: number
): MemberRisk {
  const age = measurementYear - Number(member.birthDate.slice(0, 4));
  const myStr = String(measurementYear);

  // CMS-HCC requires *annual* re-documentation: an HCC only counts toward the
  // current RAF if a Condition was recorded in the measurement year. Chronic
  // conditions with an earlier onset that weren't re-documented this year are
  // recapture candidates, exactly like HCCs implied only by claim diagnoses.
  const documented = uniqueByHcc(
    conditions
      .filter((c) => c.onsetDate.startsWith(myStr))
      .map((c) => {
        const m = matchHcc(c.icd10);
        return m ? { ...m, evidenceIcd10: c.icd10 } : null;
      })
      .filter((x): x is HccHit => x !== null)
  );
  const documentedHccSet = new Set(documented.map((d) => d.hcc));

  // Recapture candidates: HCCs evidenced by any claim diagnosis, OR by a
  // prior-year ("stale") chronic Condition — that were not re-documented in
  // the measurement year.
  const candidateHits: HccHit[] = [];
  for (const cl of claims) {
    for (const dx of cl.diagnosisCodes) {
      const m = matchHcc(dx);
      if (m && !documentedHccSet.has(m.hcc)) candidateHits.push({ ...m, evidenceIcd10: dx });
    }
  }
  for (const c of conditions) {
    if (c.onsetDate.startsWith(myStr)) continue; // already documented this year
    const m = matchHcc(c.icd10);
    if (m && !documentedHccSet.has(m.hcc)) candidateHits.push({ ...m, evidenceIcd10: c.icd10 });
  }
  const suspected = uniqueByHcc(candidateHits).filter((s) => !documentedHccSet.has(s.hcc));

  const demo = Number(demographicFactor(member, measurementYear).toFixed(3));
  const docCoef = documented.reduce((s, h) => s + h.coef, 0);
  const suspectedCoef = suspected.reduce((s, h) => s + h.coef, 0);
  const currentRaf = Number((demo + docCoef).toFixed(3));
  const potentialRaf = Number((currentRaf + suspectedCoef).toFixed(3));

  return {
    memberId: member.id,
    memberName: member.name,
    age,
    sex: member.sex,
    medicareEligible: age >= 65,
    demographicFactor: demo,
    documentedHccs: documented,
    suspectedHccs: suspected,
    currentRaf,
    potentialRaf,
    rafGap: Number((potentialRaf - currentRaf).toFixed(3)),
    annualRevenueCurrent: Math.round(currentRaf * RAF_DOLLARS),
    annualRevenueOpportunity: Math.round(suspectedCoef * RAF_DOLLARS)
  };
}

export interface PlanRiskSummary {
  scoredMembers: number;
  medicareEligible: number;
  avgCurrentRaf: number;
  avgPotentialRaf: number;
  membersWithSuspectedGap: number;
  totalRevenueCurrent: number;
  totalRevenueOpportunity: number;
  members: MemberRisk[];
}

export function planRiskSummary(
  members: Member[],
  conditions: Condition[],
  claims: Claim[],
  measurementYear: number
): PlanRiskSummary {
  const condByMember = new Map<string, Condition[]>();
  for (const c of conditions) {
    const l = condByMember.get(c.memberId) ?? [];
    l.push(c);
    condByMember.set(c.memberId, l);
  }
  const claimByMember = new Map<string, Claim[]>();
  for (const c of claims) {
    const l = claimByMember.get(c.memberId) ?? [];
    l.push(c);
    claimByMember.set(c.memberId, l);
  }

  const scored = members.map((m) =>
    computeMemberRisk(
      m,
      condByMember.get(m.id) ?? [],
      claimByMember.get(m.id) ?? [],
      measurementYear
    )
  );

  const n = scored.length || 1;
  return {
    scoredMembers: scored.length,
    medicareEligible: scored.filter((s) => s.medicareEligible).length,
    avgCurrentRaf: Number((scored.reduce((s, x) => s + x.currentRaf, 0) / n).toFixed(3)),
    avgPotentialRaf: Number((scored.reduce((s, x) => s + x.potentialRaf, 0) / n).toFixed(3)),
    membersWithSuspectedGap: scored.filter((s) => s.suspectedHccs.length > 0).length,
    totalRevenueCurrent: scored.reduce((s, x) => s + x.annualRevenueCurrent, 0),
    totalRevenueOpportunity: scored.reduce((s, x) => s + x.annualRevenueOpportunity, 0),
    members: scored.sort((a, b) => b.annualRevenueOpportunity - a.annualRevenueOpportunity)
  };
}
