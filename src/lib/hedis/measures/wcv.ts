// Child and Adolescent Well-Care Visits (WCV) — Tier 1, claims-only.
// Members 3–21 with at least one comprehensive well-care visit in MY.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, claimsWithProc, myEnd, myStart } from '../util';

const WCV_PROCS = ['99381', '99382', '99383', '99384', '99385', '99391', '99392', '99393', '99394', '99395'];

export const wcv: MeasureSpec = {
  id: 'WCV',
  name: 'Child and Adolescent Well-Care Visits',
  shortName: 'WCV',
  domain: 'Pediatric Preventive',
  dataTier: 'claims-only',
  description: 'Members 3–21 with at least one comprehensive well-care visit during the measurement year.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    return age >= 3 && age <= 21;
  },
  isExcluded() { return false; },
  satisfiedByClaims(ctx) {
    const found = claimsWithProc(ctx, WCV_PROCS, myStart(ctx.measurementYear), myEnd(ctx.measurementYear));
    return { ok: found.length > 0, evidence: found.flatMap((c) => c.procedureCodes.filter((p) => WCV_PROCS.includes(p))) };
  },
  satisfiedByClinical() {
    return { ok: false, evidence: [] };
  }
};
