import type { ReactNode } from 'react';

export type BadgeColor = 'slate' | 'green' | 'amber' | 'rose' | 'sky';

const COLORS: Record<BadgeColor, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700'
};

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: BadgeColor }) {
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${COLORS[color]}`}>{children}</span>;
}

/** @deprecated alias kept while call sites migrate — use Badge. */
export const Pill = Badge;

const TIER_STYLES: Record<string, string> = {
  'claims-only': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'uscdi-v3': 'bg-amber-50 text-amber-700 border-amber-200',
  'ccda': 'bg-rose-50 text-rose-700 border-rose-200'
};

export function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_STYLES[tier] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  const label =
    tier === 'claims-only' ? 'Tier 1 · Claims' :
    tier === 'uscdi-v3' ? 'Tier 2 · USCDI V3' :
    tier === 'ccda' ? 'Tier 3 · CCDA' : tier;
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
