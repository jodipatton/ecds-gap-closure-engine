// Declarative "information needed" metadata per measure — the human-readable
// twin of the executable specs in measures/*.ts, sharing the same CODES
// catalog so the chips shown in the UI are the codes the engine checks.
// Powers the data-coverage matrix and the measure-anatomy explainer.

import { CODES } from './valuesets';
import type { Snapshot } from '@/lib/data/snapshot';

export type ElementKind = 'claims' | 'observation' | 'medication' | 'document' | 'immunization';
export type ElementRole = 'eligibility' | 'exclusion' | 'numerator';

export interface DataElement {
  kind: ElementKind;
  role: ElementRole;
  label: string;
  codeSystem: string;
  codes: string[];
  window: string;
}

export interface MeasureDataNeeds {
  measureId: string;
  eligibility: string;
  exclusion: string | null;
  numeratorClaims: string | null;
  numeratorClinical: string | null;
  elements: DataElement[];
}

export const DATA_NEEDS: Record<string, MeasureDataNeeds> = {
  BCS: {
    measureId: 'BCS',
    eligibility: 'Women 50–74, continuously enrolled through the measurement year and prior year.',
    exclusion: 'Bilateral mastectomy (active condition).',
    numeratorClaims: 'A mammogram billed in the measurement year or the year prior.',
    numeratorClinical: null,
    elements: [
      { kind: 'claims', role: 'numerator', label: 'Mammogram', codeSystem: 'CPT / HCPCS', codes: [...CODES.mammogram_cpt, ...CODES.mammogram_hcpcs], window: 'MY or prior year' },
      { kind: 'claims', role: 'exclusion', label: 'Bilateral mastectomy history', codeSystem: 'ICD-10', codes: CODES.mastectomy_icd10, window: 'any time' }
    ]
  },
  COL: {
    measureId: 'COL',
    eligibility: 'Adults 45–75, continuously enrolled in the measurement year.',
    exclusion: null,
    numeratorClaims: 'Any qualifying screening within its modality lookback: FOBT/FIT (1y), FIT-DNA (3y), flex sig (5y), colonoscopy (10y), CT colonography (5y).',
    numeratorClinical: 'A colonoscopy report DocumentReference when no billed CPT exists.',
    elements: [
      { kind: 'claims', role: 'numerator', label: 'FOBT / FIT', codeSystem: 'CPT', codes: CODES.fobt_fit_cpt, window: 'measurement year' },
      { kind: 'claims', role: 'numerator', label: 'Colonoscopy', codeSystem: 'CPT', codes: CODES.colonoscopy_cpt, window: '10-year lookback' },
      { kind: 'claims', role: 'numerator', label: 'FIT-DNA · flex sig · CT colonography', codeSystem: 'CPT', codes: [...CODES.fit_dna_cpt, ...CODES.flex_sig_cpt, ...CODES.ct_colonography_cpt], window: '3–5-year lookback' },
      { kind: 'document', role: 'numerator', label: 'Colonoscopy report', codeSystem: 'LOINC', codes: [CODES.colonoscopy_report_loinc], window: '10-year lookback' }
    ]
  },
  CIS: {
    measureId: 'CIS',
    eligibility: 'Children turning 2 during the measurement year.',
    exclusion: null,
    numeratorClaims: 'All 10 antigen series (Combo 10) evidenced by the 2nd birthday.',
    numeratorClinical: null,
    elements: [
      { kind: 'immunization', role: 'numerator', label: '10 antigen series (Combo 10)', codeSystem: 'CVX', codes: Object.values(CODES.cvx).map((c) => c[0]), window: 'by 2nd birthday' }
    ]
  },
  WCV: {
    measureId: 'WCV',
    eligibility: 'Members 3–21.',
    exclusion: null,
    numeratorClaims: 'At least one comprehensive well-care visit in the measurement year.',
    numeratorClinical: null,
    elements: [
      { kind: 'claims', role: 'numerator', label: 'Well-care visit', codeSystem: 'CPT', codes: CODES.well_visit_cpt, window: 'measurement year' }
    ]
  },
  HBD: {
    measureId: 'HBD',
    eligibility: 'Members 18–75 with ≥2 outpatient diabetes-diagnosis claims.',
    exclusion: null,
    numeratorClaims: null,
    numeratorClinical: 'Most recent HbA1c result in the measurement year < 8.0% — a discrete lab value that never appears on a claim.',
    elements: [
      { kind: 'claims', role: 'eligibility', label: 'Diabetes diagnosis', codeSystem: 'ICD-10', codes: CODES.diabetes_dx_prefixes, window: 'MY or prior year' },
      { kind: 'observation', role: 'numerator', label: 'HbA1c result with value', codeSystem: 'LOINC', codes: [CODES.a1c_loinc], window: 'measurement year' }
    ]
  },
  CBP: {
    measureId: 'CBP',
    eligibility: 'Members 18–85 with ≥2 hypertension-diagnosis claims.',
    exclusion: null,
    numeratorClaims: null,
    numeratorClinical: 'Most recent blood pressure in the measurement year < 140/90 — paired systolic/diastolic observations.',
    elements: [
      { kind: 'claims', role: 'eligibility', label: 'Hypertension diagnosis', codeSystem: 'ICD-10', codes: CODES.htn_dx_prefixes, window: 'MY or prior year' },
      { kind: 'observation', role: 'numerator', label: 'Systolic + diastolic BP', codeSystem: 'LOINC', codes: [CODES.bp_sys_loinc, CODES.bp_dia_loinc], window: 'measurement year' }
    ]
  },
  'DSF-E': {
    measureId: 'DSF-E',
    eligibility: 'Members 12 and older.',
    exclusion: null,
    numeratorClaims: null,
    numeratorClinical: 'A standardized depression screening (PHQ-9 / PHQ-2) recorded as an observation in the measurement year.',
    elements: [
      { kind: 'observation', role: 'numerator', label: 'PHQ-9 / PHQ-2 screening', codeSystem: 'LOINC', codes: CODES.phq_screening_loinc, window: 'measurement year' }
    ]
  },
  AMM: {
    measureId: 'AMM',
    eligibility: 'Members 18+ newly diagnosed with major depression and started on an antidepressant.',
    exclusion: null,
    numeratorClaims: null,
    numeratorClinical: '≥84 days of continuous antidepressant supply in the acute phase — requires MedicationRequest dispense records.',
    elements: [
      { kind: 'claims', role: 'eligibility', label: 'Major depression diagnosis', codeSystem: 'ICD-10', codes: CODES.mdd_dx_prefixes, window: 'measurement year' },
      { kind: 'medication', role: 'numerator', label: 'Antidepressant supply ≥84 days', codeSystem: 'RxNorm', codes: CODES.antidepressants_rxnorm, window: '114-day acute phase' }
    ]
  },
  FUM: {
    measureId: 'FUM',
    eligibility: 'Members 6+ with an ED visit carrying a primary mental-illness diagnosis.',
    exclusion: null,
    numeratorClaims: 'A follow-up visit with a mental-health practitioner within 30 days of the ED visit.',
    numeratorClinical: 'A CCDA discharge summary confirms the encounter type when claims are ambiguous.',
    elements: [
      { kind: 'claims', role: 'eligibility', label: 'ED visit with MH diagnosis', codeSystem: 'POS + ICD-10', codes: [CODES.ed_visit_pos, ...CODES.mental_illness_dx_prefixes.slice(0, 6)], window: 'measurement year' },
      { kind: 'claims', role: 'numerator', label: 'Follow-up visit', codeSystem: 'CPT', codes: CODES.followup_visit_cpt, window: '30 days post-ED' },
      { kind: 'document', role: 'numerator', label: 'Discharge summary', codeSystem: 'LOINC', codes: [CODES.discharge_summary_loinc], window: 'measurement year' }
    ]
  },
  'PND-E': {
    measureId: 'PND-E',
    eligibility: 'Women 16–50 with a delivery in the measurement year.',
    exclusion: null,
    numeratorClaims: 'A postpartum visit 7–84 days after delivery.',
    numeratorClinical: 'A CCDA postpartum care note confirms visit content when CPT codes are ambiguous.',
    elements: [
      { kind: 'claims', role: 'eligibility', label: 'Delivery', codeSystem: 'CPT', codes: CODES.delivery_cpt, window: 'measurement year' },
      { kind: 'claims', role: 'numerator', label: 'Postpartum visit', codeSystem: 'CPT', codes: CODES.postpartum_visit_cpt, window: '7–84 days post-delivery' },
      { kind: 'document', role: 'numerator', label: 'Postpartum care note', codeSystem: 'LOINC', codes: [CODES.postpartum_note_loinc], window: 'measurement year' }
    ]
  }
};

// ---- Coverage: what of the needed data the plan can see today -------------

export interface MeasureCoverage {
  measureId: string;
  denominator: number;
  excluded: number;
  closedClaims: number;
  closedClinical: number;
  openWithEvidence: number; // open, but partial structured evidence exists
  openDark: number; // open with NO structured evidence — invisible members
  openNeedsClinical: number;
  openNeedsDocument: number;
}

export function measureCoverage(snap: Snapshot): Map<string, MeasureCoverage> {
  const out = new Map<string, MeasureCoverage>();
  for (const g of snap.gaps) {
    const c =
      out.get(g.measureId) ??
      ({
        measureId: g.measureId,
        denominator: 0,
        excluded: 0,
        closedClaims: 0,
        closedClinical: 0,
        openWithEvidence: 0,
        openDark: 0,
        openNeedsClinical: 0,
        openNeedsDocument: 0
      } satisfies MeasureCoverage);
    if (g.status === 'excluded') c.excluded++;
    else if (g.status === 'closed-claims') {
      c.denominator++;
      c.closedClaims++;
    } else if (g.status === 'closed-clinical') {
      c.denominator++;
      c.closedClinical++;
    } else if (g.status.startsWith('open-')) {
      c.denominator++;
      if (g.status === 'open-needs-document') c.openNeedsDocument++;
      else c.openNeedsClinical++;
      if ((g.evidence ?? []).length > 0) c.openWithEvidence++;
      else c.openDark++;
    }
    out.set(g.measureId, c);
  }
  return out;
}

/** How many members still lack the given element kind for a measure. */
export function missingForKind(cov: MeasureCoverage | undefined, kind: ElementKind): number {
  if (!cov) return 0;
  if (kind === 'claims') return 0; // the payer always has its own adjudicated claims
  if (kind === 'document') return cov.openNeedsDocument;
  return cov.openNeedsClinical;
}
