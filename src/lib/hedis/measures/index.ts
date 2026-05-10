// Measure registry. Order here drives display order on the dashboard.

import type { MeasureSpec } from '@/lib/data/types';
import { bcs } from './bcs';
import { col } from './col';
import { cis } from './cis';
import { wcv } from './wcv';
import { hbd } from './hbd';
import { cbp } from './cbp';
import { dsfe } from './dsfe';
import { amm } from './amm';
import { fum } from './fum';
import { pnde } from './pnde';

export const MEASURES: MeasureSpec[] = [
  // Tier 1 — claims-only
  bcs,
  col,
  cis,
  wcv,
  // Tier 2 — USCDI V3 discrete data
  hbd,
  cbp,
  dsfe,
  amm,
  // Tier 3 — full CCDA
  fum,
  pnde
];

export function getMeasure(id: string): MeasureSpec | undefined {
  return MEASURES.find((m) => m.id === id);
}
