// Follow-Up After ED Visit for Mental Illness (FUM) — Tier 3, full CCDA.
// Members 6+ with an ED visit and a primary mental-illness diagnosis.
// Numerator: follow-up encounter with a mental health practitioner within
// 30 days of the ED visit. Tier 3 because in production the discharge
// summary is required to confirm follow-up encounter type when claims are
// ambiguous.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, myEnd } from '../util';
import { CODES } from '../valuesets';

const MH_DX = CODES.mental_illness_dx_prefixes;

function startsWithAny(s: string, prefixes: string[]) {
  return prefixes.some((p) => s.startsWith(p));
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export const fum: MeasureSpec = {
  id: 'FUM',
  name: 'Follow-Up After ED Visit for Mental Illness',
  shortName: 'FUM-30',
  domain: 'Behavioral Health',
  dataTier: 'ccda',
  description: 'Members with an ED visit for mental illness who had a follow-up visit with a mental health practitioner within 30 days.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 6) return false;
    return ctx.claims.some(
      (c) =>
        c.placeOfService === CODES.ed_visit_pos &&
        c.serviceDate.startsWith(String(ctx.measurementYear)) &&
        c.diagnosisCodes.some((d) => startsWithAny(d, MH_DX))
    );
  },
  isExcluded() { return false; },
  satisfiedByClaims(ctx) {
    const edVisits = ctx.claims.filter(
      (c) => c.placeOfService === CODES.ed_visit_pos && c.diagnosisCodes.some((d) => startsWithAny(d, MH_DX))
    );
    for (const ed of edVisits) {
      const window = addDays(ed.serviceDate, 30);
      const followup = ctx.claims.find(
        (c) =>
          c.serviceDate > ed.serviceDate &&
          c.serviceDate <= window &&
          c.diagnosisCodes.some((d) => startsWithAny(d, MH_DX)) &&
          c.procedureCodes.some((p) => CODES.followup_visit_cpt.includes(p))
      );
      if (followup) {
        return { ok: true, evidence: [`ED ${ed.serviceDate} → follow-up ${followup.serviceDate}`] };
      }
    }
    return { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    // Discharge summary CCDA confirms a follow-up encounter type when claims
    // are ambiguous. Illustrative.
    const ok = ctx.documents.some(
      (d) => d.loincType === CODES.discharge_summary_loinc && d.date.startsWith(String(ctx.measurementYear))
    );
    return ok
      ? { ok: true, evidence: ['Discharge summary DocumentReference (LOINC 18842-5) in MY'] }
      : { ok: false, evidence: [], missingDataElement: 'CCDA Discharge Summary (LOINC 18842-5) for ED encounter' };
  }
};
