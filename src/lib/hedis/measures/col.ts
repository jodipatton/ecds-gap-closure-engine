// Colorectal Cancer Screening (COL) — Tier 1, claims-only.
// Adults 45–75 continuously enrolled. Numerator: any of the qualifying
// screening procedures within the look-back window for that modality.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, claimsWithProc, continuouslyEnrolledFor, myEnd, myStart } from '../util';

export const col: MeasureSpec = {
  id: 'COL',
  name: 'Colorectal Cancer Screening',
  shortName: 'COL',
  domain: 'Cancer Screening',
  dataTier: 'claims-only',
  description: 'Adults 45–75 with a qualifying colorectal cancer screening within the appropriate look-back period.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    if (age < 45 || age > 75) return false;
    return continuouslyEnrolledFor(ctx, 0, 0);
  },
  isExcluded() { return false; },
  satisfiedByClaims(ctx) {
    const yr = ctx.measurementYear;
    const lookbacks: Array<[string[], string, string]> = [
      [['82270', '82274'], myStart(yr), myEnd(yr)],
      [['81528'], `${yr - 2}-01-01`, myEnd(yr)],
      [['45330', '45331', '45332', '45333', '45334', '45335'], `${yr - 4}-01-01`, myEnd(yr)],
      [['45378', '45380', '45385', '45388', '45398'], `${yr - 9}-01-01`, myEnd(yr)],
      [['74263'], `${yr - 4}-01-01`, myEnd(yr)]
    ];
    const evidence: string[] = [];
    let ok = false;
    for (const [codes, s, e] of lookbacks) {
      const found = claimsWithProc(ctx, codes, s, e);
      if (found.length > 0) {
        ok = true;
        evidence.push(...found.flatMap((c) => c.procedureCodes.filter((p) => codes.includes(p))));
      }
    }
    return { ok, evidence };
  },
  satisfiedByClinical(ctx) {
    // Tier 1 measure; ECDS allows DocumentReference of colonoscopy report as
    // clinical-data confirmation in the absence of a billed CPT.
    const yr = ctx.measurementYear;
    const doc = ctx.documents.find(
      (d) => d.loincType === '34117-2' && d.date >= `${yr - 9}-01-01` && d.date <= myEnd(yr)
    );
    return doc
      ? { ok: true, evidence: [`DocumentReference LOINC 34117-2 dated ${doc.date}`] }
      : { ok: false, evidence: [], missingDataElement: 'Colonoscopy DocumentReference (LOINC 34117-2)' };
  }
};
