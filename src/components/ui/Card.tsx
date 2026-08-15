import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

/** Standard card title row: title left, optional action link/button right. */
export function CardHeader({
  title,
  icon,
  action,
  className = ''
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="inline-flex items-center gap-2 font-semibold text-ink">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
