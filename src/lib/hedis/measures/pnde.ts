// Prenatal and Postpartum Care (PND-E) — Tier 3, full CCDA.
// Postpartum component: women who had a delivery in the measurement year and
// a postpartum visit on or between 7–84 days after delivery. Tier 3 because
// the postpartum visit content (depression screen, BP, labs) is best
// confirmed via CCDA when CPT codes alone are ambiguous.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, myEnd } from '../util';

function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

const DELIVERY_CPT = new Set(['59400', '59409', '59410', '59510', '59514', '59515']);
const POSTPARTUM_CPT = new Set(['0503F', '99213', '99214', '57170']);

export const pnde: MeasureSpec = {
  id: 'PND-E',
  name: 'Prenatal & Postpartum Care (Postpartum Component)',
  shortName: 'PND-E',
  domain: 'Maternal Health',
  dataTier: 'ccda',
  description: 'Women who delivered in the measurement year and had a postpartum visit 7–84 days after delivery.',
  isEligible(ctx) {
    if (ctx.member.sex !== 'F') return false;
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 16 || age > 50) return false;
    return ctx.claims.some((c) => c.procedureCodes.some((p) => DELIVERY_CPT.has(p)));
  },
  isExcluded() { return false; },
  satisfiedByClaims(ctx) {
    const delivery = ctx.claims.find((c) => c.procedureCodes.some((p) => DELIVERY_CPT.has(p)));
    if (!delivery) return { ok: false, evidence: [] };
    const pp = ctx.claims.find((c) => {
      if (!c.procedureCodes.some((p) => POSTPARTUM_CPT.has(p))) return false;
      const days = diffDays(delivery.serviceDate, c.serviceDate);
      return days >= 7 && days <= 84;
    });
    return pp
      ? { ok: true, evidence: [`Delivery ${delivery.serviceDate} → postpartum ${pp.serviceDate}`] }
      : { ok: false, evidence: [] };
  },
  satisfiedByClinical(ctx) {
    // CCDA postpartum care plan note (LOINC 57133-1) confirms visit content.
    const ok = ctx.documents.some(
      (d) => d.loincType === '57133-1' && d.date.startsWith(String(ctx.measurementYear))
    );
    return ok
      ? { ok: true, evidence: ['CCDA Postpartum care note (LOINC 57133-1)'] }
      : { ok: false, evidence: [], missingDataElement: 'CCDA Postpartum care note (LOINC 57133-1)' };
  }
};
