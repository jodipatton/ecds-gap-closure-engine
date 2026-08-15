import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from './Card';

export function StatTile({
  label,
  value,
  hint,
  icon,
  delta,
  href
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  /** Signed change chip, e.g. "+12 since last sync"; tone by leading sign. */
  delta?: string;
  href?: string;
}) {
  const deltaTone = delta?.startsWith('-') ? 'text-rose-600' : 'text-emerald-600';
  const body = (
    <Card className={href ? 'h-full transition hover:shadow' : 'h-full'}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-ink">{value}</div>
        {delta && <span className={`text-xs font-medium ${deltaTone}`}>{delta}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
