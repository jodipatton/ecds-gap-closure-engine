import type { ISODate } from '@/lib/data/types';

/** Whole years of age on the reference date. */
export function ageOn(birthDate: ISODate, ref: ISODate): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  let a = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) a -= 1;
  return a;
}
