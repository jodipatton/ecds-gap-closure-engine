import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      {icon && <span className="mb-2 text-slate-400">{icon}</span>}
      <div className="text-sm font-medium text-ink">{title}</div>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
