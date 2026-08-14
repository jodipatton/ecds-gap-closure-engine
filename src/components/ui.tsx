import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

const TIER_STYLES: Record<string, string> = {
  'claims-only': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'uscdi-v3': 'bg-amber-50 text-amber-700 border-amber-200',
  'ccda': 'bg-rose-50 text-rose-700 border-rose-200'
};

export function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_STYLES[tier] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  const label = tier === 'claims-only' ? 'Tier 1 · Claims' : tier === 'uscdi-v3' ? 'Tier 2 · USCDI V3' : tier === 'ccda' ? 'Tier 3 · CCDA' : tier;
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function Pill({ children, color = 'slate' }: { children: ReactNode; color?: 'slate' | 'green' | 'amber' | 'rose' | 'sky' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700'
  };
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${map[color]}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded bg-slate-100">
      <div className="h-2 rounded bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} aria-hidden />;
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </Card>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <Skeleton className="h-3 w-40" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </Card>
  );
}
