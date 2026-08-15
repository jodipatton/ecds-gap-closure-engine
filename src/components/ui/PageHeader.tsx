import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  icon,
  actions,
  badge
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="inline-flex items-center gap-2.5 text-[28px] font-semibold leading-tight tracking-tight text-ink">
          {icon}
          {title}
          {badge}
        </h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
