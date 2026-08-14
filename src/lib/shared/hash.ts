// FNV-1a — deterministic across runs; the one hash used wherever synthetic
// data needs stable per-key variation without Math.random().

export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** fnv1a scaled to [0, 1). */
export function hash01(s: string): number {
  return fnv1a(s) / 4294967296;
}
