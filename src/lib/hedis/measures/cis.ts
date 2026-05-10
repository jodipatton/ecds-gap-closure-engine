// Childhood Immunization Status (CIS) — Tier 1, claims-only (combination 10).
// Children turning 2 during the measurement year, continuously enrolled
// 12 months → second birthday. Numerator: evidence of all 10 antigen series
// by the child's second birthday.

import type { MeasureSpec } from '@/lib/data/types';
import { ageOn, myEnd } from '../util';

const ANTIGENS: Record<string, string[]> = {
  DTaP: ['20'],
  IPV: ['10'],
  MMR: ['03'],
  HiB: ['48', '49', '50', '51'],
  HepB: ['08'],
  VZV: ['21'],
  PCV: ['133'],
  HepA: ['83'],
  Rotavirus: ['116', '119'],
  Influenza: ['88', '141', '150', '155']
};

export const cis: MeasureSpec = {
  id: 'CIS',
  name: 'Childhood Immunization Status — Combo 10',
  shortName: 'CIS',
  domain: 'Pediatric Preventive',
  dataTier: 'claims-only',
  description: 'Children turning 2 in the measurement year with all 10 recommended antigen series by their 2nd birthday.',
  isEligible(ctx) {
    const age = ageOn(ctx.member.birthDate, myEnd(ctx.measurementYear));
    return age === 2;
  },
  isExcluded() { return false; },
  satisfiedByClaims(ctx) {
    const evidence: string[] = [];
    let missing = 0;
    for (const [antigen, codes] of Object.entries(ANTIGENS)) {
      const set = new Set(codes);
      const hit = ctx.claims.find((c) => c.procedureCodes.some((p) => set.has(p)));
      if (hit) evidence.push(`${antigen}:${hit.procedureCodes.find((p) => set.has(p))}`);
      else missing++;
    }
    return { ok: missing === 0, evidence };
  },
  satisfiedByClinical() {
    return { ok: false, evidence: [], missingDataElement: 'Immunization records (CVX) for missing antigens' };
  }
};
