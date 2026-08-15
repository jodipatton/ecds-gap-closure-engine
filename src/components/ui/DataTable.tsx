import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  render: (row: T) => ReactNode;
}

/**
 * The one table. Dense 13px rows, uppercase 12px header, right-aligned
 * tabular numerics, optional whole-row links, built-in "showing first N"
 * footer and empty state.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  limit,
  empty
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | null;
  /** Render at most this many rows, with a "showing first N of X" footer. */
  limit?: number;
  empty?: ReactNode;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="No data yet" description="Seed and run analytics from the dashboard." />}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`py-2 pr-4 font-medium last:pr-0 ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const href = rowHref?.(row) ?? null;
            return (
              <tr key={rowKey(row)} className="border-b border-slate-100 align-top transition last:border-0 hover:bg-slate-50/60">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={[
                      'py-2.5 pr-4 last:pr-0',
                      i === 0 ? 'font-medium text-ink' : '',
                      c.align === 'right' ? 'text-right tabular-nums' : '',
                      c.className ?? ''
                    ].join(' ')}
                  >
                    {href && i === 0 ? (
                      <Link href={href} className="hover:text-accent">
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {limit !== undefined && rows.length > limit && (
        <p className="mt-2 text-xs text-slate-500">
          Showing first {limit} of {rows.length.toLocaleString()}.
        </p>
      )}
    </div>
  );
}
