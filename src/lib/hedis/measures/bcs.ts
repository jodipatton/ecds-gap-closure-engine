// Breast Cancer Screening (BCS) — Tier 1, claims-only.
// Women aged 50-74, continuously enrolled MY and prior. Numerator: mammogram
// in MY or prior year. Exclusion: bilateral mastectomy (Z90.13).

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, claimsWithProc, continuouslyEnrolledFor, myEnd, priorYearStart } from '../util';

const MAMMO_PROCS = ['77067', '77066', '77065', 'G0202', 'G0204', 'G0206'];

export const bcs: MeasureSpec = {
  id: 'BCS',
  name: 'Breast Cancer Screening',
  shortName: 'BCS',
  domain: 'Cancer Screening',
  dataTier: 'claims-only',
  description: 'Women aged 50–74 with a mammogram in the measurement year or prior year.',
  isEligible(ctx) {
    if (ctx.member.sex !== 'F') return false;
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 50 || age > 74) return false;
    return continuouslyEnrolledFor(ctx, -1, 0);
  },
  isExcluded(ctx) {
    return ctx.conditions.some((c) => c.icd10 === 'Z90.13' && c.clinicalStatus === 'active');
  },
  satisfiedByClaims(ctx) {
    const found = claimsWithProc(ctx, MAMMO_PROCS, priorYearStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    return { ok: found.length > 0, evidence: found.flatMap((c) => c.procedureCodes.filter((p) => MAMMO_PROCS.includes(p))) };
  },
  satisfiedByClinical() {
    // Tier 1 — no clinical-data fallback required by ECDS for BCS today.
    return { ok: false, evidence: [] };
  }
};
