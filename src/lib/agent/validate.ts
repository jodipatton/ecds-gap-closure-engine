// Hand-rolled validator for exactly the JSON-Schema subset the agent tools
// use: type object/string/integer/number/boolean, properties, required, enum,
// minimum/maximum, default. Extras are stripped (additionalProperties: false
// semantics). No dependency; the model self-corrects from the error strings.

interface PropSchema {
  type?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

export interface ObjectSchema {
  type: 'object';
  properties?: Record<string, PropSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

export function validateArgs(schema: Record<string, unknown>, args: unknown): ValidationResult {
  const s = schema as unknown as ObjectSchema;
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, error: 'arguments must be a JSON object' };
  }
  const input = args as Record<string, unknown>;
  const props = s.properties ?? {};
  const out: Record<string, unknown> = {};

  for (const key of s.required ?? []) {
    if (input[key] === undefined || input[key] === null || input[key] === '') {
      return { ok: false, error: `missing required argument "${key}"` };
    }
  }

  for (const [key, prop] of Object.entries(props)) {
    let v = input[key];
    if (v === undefined) {
      if (prop.default !== undefined) out[key] = prop.default;
      continue;
    }
    switch (prop.type) {
      case 'string':
        if (typeof v !== 'string') v = String(v);
        break;
      case 'integer':
      case 'number': {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) return { ok: false, error: `"${key}" must be a number` };
        v = prop.type === 'integer' ? Math.round(n) : n;
        if (prop.minimum !== undefined && (v as number) < prop.minimum) {
          return { ok: false, error: `"${key}" must be >= ${prop.minimum}` };
        }
        if (prop.maximum !== undefined && (v as number) > prop.maximum) {
          return { ok: false, error: `"${key}" must be <= ${prop.maximum}` };
        }
        break;
      }
      case 'boolean':
        if (typeof v !== 'boolean') v = v === 'true' || v === 1;
        break;
    }
    if (prop.enum && !prop.enum.includes(v)) {
      return { ok: false, error: `"${key}" must be one of: ${prop.enum.join(', ')}` };
    }
    out[key] = v;
  }
  // keys not in properties are stripped (additionalProperties: false)
  return { ok: true, value: out };
}
