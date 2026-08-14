// Controlling High Blood Pressure (CBP) — Tier 2, USCDI V3.
// Members 18–85 with hypertension diagnosis and ≥2 visits during MY or
// prior. Numerator: most recent BP reading in MY with systolic < 140 and
// diastolic < 90, captured as FHIR Observations LOINC 8480-6 / 8462-4.

import type { MeasureSpec } from '@/lib/data/types';
import {
  ageOn,
  claimsWithDx,
  continuouslyEnrolledFor,
  myEnd,
  myStart,
  priorYearStart
} from '../util';
import { CODES } from '../valuesets';

const HTN_PREFIXES = CODES.htn_dx_prefixes;

export const cbp: MeasureSpec = {
  id: 'CBP',
  name: 'Controlling High Blood Pressure',
  shortName: 'CBP',
  domain: 'Cardiometabolic',
  dataTier: 'uscdi-v3',
  description: 'Members 18–85 with hypertension whose most recent BP in the measurement year is <140/90.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 18 || age > 85) return false;
    if (!continuouslyEnrolledFor(ctx, 0, 0)) return false;
    const dxClaims = claimsWithDx(ctx, HTN_PREFIXES, priorYearStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    return dxClaims.length >= 2;
  },
  isExcluded() { return false; },
  satisfiedByClaims() {
    return { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    const sys = ctx.observations
      .filter((o) => o.loinc === CODES.bp_sys_loinc && o.effectiveDate >= myStart(ctx.measurementYear) && o.effectiveDate <= myEnd(ctx.measurementYear))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    const dia = ctx.observations
      .filter((o) => o.loinc === CODES.bp_dia_loinc && o.effectiveDate >= myStart(ctx.measurementYear) && o.effectiveDate <= myEnd(ctx.measurementYear))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (!sys?.valueQuantity || !dia?.valueQuantity) {
      return {
        ok: false,
        evidence: [],
        missing: { kind: 'observation', description: 'FHIR Observation LOINC 8480-6 / 8462-4 (BP) in measurement year' }
      };
    }
    const ok = sys.valueQuantity.value < 140 && dia.valueQuantity.value < 90;
    return { ok, evidence: [`BP ${sys.valueQuantity.value}/${dia.valueQuantity.value} on ${sys.effectiveDate}`] };
  }
};
