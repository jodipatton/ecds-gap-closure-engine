import { describe, expect, it } from 'vitest';
import { validateArgs } from './validate';

const schema = {
  type: 'object',
  properties: {
    measureId: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    audience: { type: 'string', enum: ['payer', 'provider'] }
  },
  required: ['measureId'],
  additionalProperties: false
};

describe('validateArgs', () => {
  it('applies defaults and passes valid input', () => {
    const r = validateArgs(schema, { measureId: 'HBD' });
    expect(r).toEqual({ ok: true, value: { measureId: 'HBD', limit: 5 } });
  });
  it('rejects missing required args', () => {
    const r = validateArgs(schema, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('measureId');
  });
  it('coerces numeric strings and clamps via min/max errors', () => {
    expect(validateArgs(schema, { measureId: 'HBD', limit: '3' })).toEqual({
      ok: true,
      value: { measureId: 'HBD', limit: 3 }
    });
    expect(validateArgs(schema, { measureId: 'HBD', limit: 99 }).ok).toBe(false);
  });
  it('enforces enums and strips unknown keys', () => {
    expect(validateArgs(schema, { measureId: 'HBD', audience: 'payer', extra: 1 })).toEqual({
      ok: true,
      value: { measureId: 'HBD', limit: 5, audience: 'payer' }
    });
    expect(validateArgs(schema, { measureId: 'HBD', audience: 'nope' }).ok).toBe(false);
  });
  it('rejects non-object argument payloads', () => {
    expect(validateArgs(schema, 'HBD').ok).toBe(false);
    expect(validateArgs(schema, null).ok).toBe(false);
  });
});
