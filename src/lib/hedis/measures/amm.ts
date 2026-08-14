// Antidepressant Medication Management (AMM) — Tier 2, USCDI V3.
// Members 18+ newly diagnosed with major depression and treated with
// antidepressant medication. Effective Acute Phase: ≥84 days of continuous
// antidepressant treatment in the 114 days following IPSD.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, claimsWithDx, myEnd } from '../util';
import { CODES } from '../valuesets';

const MDD_PREFIXES = CODES.mdd_dx_prefixes;

export const amm: MeasureSpec = {
  id: 'AMM',
  name: 'Antidepressant Medication Management — Effective Acute Phase',
  shortName: 'AMM',
  domain: 'Behavioral Health',
  dataTier: 'uscdi-v3',
  description: 'Members 18+ with major depression who remained on antidepressants for ≥84 days during the acute phase.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 18) return false;
    const dx = claimsWithDx(ctx, MDD_PREFIXES, `${ctx.measurementYear}-01-01`, myEnd(ctx.measurementYear));
    return dx.length > 0 && ctx.medications.length > 0;
  },
  isExcluded() { return false; },
  satisfiedByClaims() {
    return { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    // Sum days supply of antidepressant medications authored in MY.
    const totalDays = ctx.medications
      .filter((m) => m.authoredOn.startsWith(String(ctx.measurementYear)))
      .reduce((s, m) => s + (m.daysSupply ?? 0), 0);
    const ok = totalDays >= 84;
    return ok
      ? { ok: true, evidence: [`Antidepressant days supply: ${totalDays}`] }
      : {
          ok: false,
          evidence: [`Antidepressant days supply observed: ${totalDays} (need ≥84)`],
          missing: { kind: 'medication', description: 'Additional FHIR MedicationRequest dispense records (RxNorm) covering 84-day acute phase' }
        };
  }
};
