import { CHART } from './colors';

// Emphasis bar list: the hero row in accent, the rest in neutral gray.
// Every row is direct-labeled (name + value), so identity never rides color.
export interface BarListRow {
  label: string;
  value: number;
  emphasized?: boolean;
  hint?: string;
}

export function BarList({
  rows,
  format = (n: number) => n.toLocaleString()
}: {
  rows: BarListRow[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className={r.emphasized ? 'font-semibold text-ink' : 'text-slate-600'}>
              {r.label}
              {r.hint && <span className="ml-2 text-xs font-normal text-slate-400">{r.hint}</span>}
            </span>
            <span className={`tabular-nums ${r.emphasized ? 'font-semibold text-ink' : 'text-slate-500'}`}>
              {format(r.value)}
            </span>
          </div>
          <div className="h-3.5 w-full rounded" style={{ backgroundColor: CHART.track }}>
            <div
              className="h-3.5 rounded"
              style={{
                width: `${(r.value / max) * 100}%`,
                backgroundColor: r.emphasized ? CHART.accent : CHART.neutral,
                minWidth: r.value > 0 ? 3 : 0
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
