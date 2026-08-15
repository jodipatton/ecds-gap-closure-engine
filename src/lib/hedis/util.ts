// Shared helpers for HEDIS measure logic. Kept narrow on purpose — each
// measure's denominator/numerator lives in its own file.

import type { Claim, ISODate, MeasureContext } from '@/lib/data/types';

export { ageOn } from '@/lib/shared/dates';

export function myStart(year: number): ISODate {
  return `${year}-01-01`;
}
export function myEnd(year: number): ISODate {
  return `${year}-12-31`;
}

export function priorYearStart(year: number): ISODate {
  return `${year - 1}-01-01`;
}

export function inRange(d: ISODate, start: ISODate, end: ISODate): boolean {
  return d >= start && d <= end;
}

export function continuouslyEnrolledFor(
  ctx: MeasureContext,
  fromYearOffset: number,
  throughYearOffset: number = 0
): boolean {
  // Members are continuously enrolled if their enrollment range covers
  // [measurementYear + fromYearOffset .. measurementYear + throughYearOffset].
  const start = `${ctx.measurementYear + fromYearOffset}-01-01`;
  const end = `${ctx.measurementYear + throughYearOffset}-12-31`;
  const memStart = ctx.member.enrollmentStartDate;
  const memEnd = ctx.member.enrollmentEndDate ?? '9999-12-31';
  return memStart <= start && memEnd >= end;
}

export function claimsWithProc(
  ctx: MeasureContext,
  procCodes: string[],
  start: ISODate,
  end: ISODate
): Claim[] {
  const set = new Set(procCodes);
  return ctx.claims.filter((c) => inRange(c.serviceDate, start, end) && c.procedureCodes.some((p) => set.has(p)));
}

export function claimsWithDx(
  ctx: MeasureContext,
  dxPrefixes: string[],
  start: ISODate,
  end: ISODate
): Claim[] {
  return ctx.claims.filter(
    (c) => inRange(c.serviceDate, start, end) && c.diagnosisCodes.some((d) => dxPrefixes.some((p) => d.startsWith(p)))
  );
}

export function hasObservation(
  ctx: MeasureContext,
  loincCodes: string[],
  start: ISODate,
  end: ISODate
): boolean {
  const set = new Set(loincCodes);
  return ctx.observations.some((o) => set.has(o.loinc) && inRange(o.effectiveDate, start, end));
}

export function findObservation(
  ctx: MeasureContext,
  loinc: string,
  start: ISODate,
  end: ISODate
) {
  return ctx.observations.find((o) => o.loinc === loinc && inRange(o.effectiveDate, start, end));
}
