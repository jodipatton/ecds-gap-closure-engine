import { CHART } from './colors';

// Before → after dumbbells: two ordered shades of the accent hue joined by a
// connector, ringed ≥8px dots, values direct-labeled at row end. Legend on
// top because there are two series.
export interface DumbbellRow {
  label: string;
  before: number;
  after: number;
}

export function Dumbbell({
  rows,
  max = 100,
  beforeLabel = 'Before',
  afterLabel = 'After',
  format = (n: number) => `${n}%`
}: {
  rows: DumbbellRow[];
  max?: number;
  beforeLabel?: string;
  afterLabel?: string;
  format?: (n: number) => string;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART.accentSoft }} aria-hidden />
          {beforeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART.accentDark }} aria-hidden />
          {afterLabel}
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const lo = Math.min(r.before, r.after);
          const hi = Math.max(r.before, r.after);
          return (
            <div key={r.label} className="flex items-center gap-3" title={`${r.label}: ${format(r.before)} → ${format(r.after)}`}>
              <span className="w-16 shrink-0 text-[13px] font-medium text-ink">{r.label}</span>
              <div className="relative h-5 flex-1">
                <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded" style={{ backgroundColor: CHART.track }} />
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2"
                  style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})`, backgroundColor: CHART.accentSoft }}
                />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                  style={{ left: pct(r.before), backgroundColor: CHART.accentSoft }}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                  style={{ left: pct(r.after), backgroundColor: CHART.accentDark }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-[13px] tabular-nums">
                <span className="text-slate-400">{format(r.before)}</span>{' '}
                <span className="font-semibold text-ink">→ {format(r.after)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
