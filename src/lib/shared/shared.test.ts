import { describe, expect, it } from 'vitest';
import { fnv1a, hash01 } from './hash';
import { groupBy, keyBy } from './collections';
import { ageOn } from './dates';
import { money, num, pct } from './format';

describe('fnv1a / hash01', () => {
  it('is deterministic', () => {
    expect(fnv1a('M00001')).toBe(fnv1a('M00001'));
    expect(hash01('abc')).toBe(hash01('abc'));
  });
  it('returns a uint32 and a [0,1) float', () => {
    const h = fnv1a('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    const f = hash01('anything');
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThan(1);
  });
  it('differs across inputs', () => {
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });
});

describe('groupBy / keyBy', () => {
  const rows = [
    { id: 'a', k: 1 },
    { id: 'b', k: 2 },
    { id: 'c', k: 1 }
  ];
  it('groups preserving order', () => {
    const g = groupBy(rows, (r) => r.k);
    expect(g.get(1)?.map((r) => r.id)).toEqual(['a', 'c']);
    expect(g.get(2)?.map((r) => r.id)).toEqual(['b']);
  });
  it('keys with last-wins on duplicates', () => {
    const k = keyBy(rows, (r) => r.k);
    expect(k.get(1)?.id).toBe('c');
    expect(k.size).toBe(2);
  });
});

describe('ageOn', () => {
  it('counts whole years', () => {
    expect(ageOn('1972-06-15', '2025-12-31')).toBe(53);
  });
  it('subtracts a year before the birthday', () => {
    expect(ageOn('2000-12-31', '2025-12-30')).toBe(24);
    expect(ageOn('2000-12-31', '2025-12-31')).toBe(25);
  });
});

describe('format', () => {
  it('formats money rounded with separators', () => {
    expect(money(46200.4)).toBe('$46,200');
    expect(money(0)).toBe('$0');
  });
  it('formats percents and numbers', () => {
    expect(pct(78.25)).toBe('78.3%');
    expect(pct(78.25, 0)).toBe('78%');
    expect(num(1234567)).toBe('1,234,567');
  });
});
