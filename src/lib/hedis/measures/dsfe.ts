// Depression Screening and Follow-Up for Adolescents and Adults (DSF-E) —
// Tier 2, USCDI V3. Members 12+ screened with a standardized depression
// screening tool (PHQ-9 or PHQ-2) during the measurement year.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, hasObservation, myEnd, myStart } from '../util';
import { CODES } from '../valuesets';

const PHQ_LOINCS = CODES.phq_screening_loinc;

export const dsfe: MeasureSpec = {
  id: 'DSF-E',
  name: 'Depression Screening and Follow-Up (ECDS)',
  shortName: 'DSF-E',
  domain: 'Behavioral Health',
  dataTier: 'uscdi-v3',
  description: 'Members 12+ screened for clinical depression with a standardized tool during the measurement year.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    return age >= 12;
  },
  isExcluded() { return false; },
  satisfiedByClaims() {
    return { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    const ok = hasObservation(ctx, PHQ_LOINCS, myStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    return ok
      ? { ok: true, evidence: ['PHQ-9/PHQ-2 Observation present in MY'] }
      : { ok: false, evidence: [], missingDataElement: 'FHIR Observation PHQ-9/PHQ-2 (LOINC 44249-1 / 44261-6) in measurement year' };
  }
};
