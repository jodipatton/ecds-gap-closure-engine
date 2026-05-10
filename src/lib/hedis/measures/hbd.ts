// Hemoglobin A1c Control for Patients with Diabetes (HBD) — Tier 2, USCDI V3.
// Members 18–75 with a diabetes diagnosis and ≥2 outpatient or 1 inpatient/ED
// visit during MY or prior. Numerator: A1c result < 8.0% during MY,
// captured as FHIR Observation LOINC 4548-4.

import type { MeasureSpec } from '@/lib/data/types';
import {
  ageOn,
  claimsWithDx,
  continuouslyEnrolledFor,
  findObservation,
  myEnd,
  myStart,
  priorYearStart
} from '../util';

const DIABETES_PREFIXES = ['E10', 'E11', 'E13'];

export const hbd: MeasureSpec = {
  id: 'HBD',
  name: 'Hemoglobin A1c Control for Patients with Diabetes',
  shortName: 'HBD',
  domain: 'Cardiometabolic',
  dataTier: 'uscdi-v3',
  description: 'Members 18–75 with diabetes whose most recent A1c during the measurement year is <8.0%.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 18 || age > 75) return false;
    if (!continuouslyEnrolledFor(ctx, 0, 0)) return false;
    const dxClaims = claimsWithDx(ctx, DIABETES_PREFIXES, priorYearStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    return dxClaims.length >= 2;
  },
  isExcluded() { return false; },
  satisfiedByClaims() {
    // HBD's numerator requires a discrete result, which never appears on a
    // claim. Always falls through to clinical pass.
    return { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    const obs = findObservation(ctx, '4548-4', myStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    if (!obs?.valueQuantity) {
      return {
        ok: false,
        evidence: [],
        missingDataElement: 'FHIR Observation LOINC 4548-4 (HbA1c) with valueQuantity in measurement year'
      };
    }
    const ok = obs.valueQuantity.value < 8.0;
    return { ok, evidence: [`A1c=${obs.valueQuantity.value}${obs.valueQuantity.unit} on ${obs.effectiveDate}`] };
  }
};
