import { CHART } from './colors';

// Single-hue column histogram with optional labeled marker lines (e.g. a RAF
// distribution with average markers). Columns ≤24px, 4px rounded caps, 2px
// gaps; per-column hover title carries the exact count.
export interface HistogramMarker {
  value: number;
  label: string;
  color?: string;
}

export function Histogram({
  values,
  binSize,
  min = 0,
  max,
  markers = [],
  format = (n: number) => n.toFixed(1),
  height = 150
}: {
  values: number[];
  binSize: number;
  min?: number;
  max?: number;
  markers?: HistogramMarker[];
  format?: (n: number) => string;
  height?: number;
}) {
  const hi = max ?? Math.max(...values, min + binSize);
  const binCount = Math.max(1, Math.ceil((hi - min) / binSize));
  const bins = Array.from({ length: binCount }, () => 0);
  for (const v of values) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / binSize)));
    bins[i]++;
  }
  const maxBin = Math.max(1, ...bins);
  const plotH = height - 34;

  return (
    <div>
      <div className="relative flex items-end gap-0.5" style={{ height: plotH }}>
        {bins.map((n, i) => {
          const from = min + i * binSize;
          const to = from + binSize;
          return (
            <div
              key={i}
              className="relative flex-1"
              style={{ maxWidth: 24, height: '100%' }}
              title={`${format(from)}–${format(to)}: ${n} member${n === 1 ? '' : 's'}`}
            >
              <div
                className="absolute bottom-0 w-full rounded-t"
                style={{
                  height: `${(n / maxBin) * 100}%`,
                  backgroundColor: n > 0 ? CHART.accent : CHART.track,
                  minHeight: n > 0 ? 3 : 2
                }}
              />
            </div>
          );
        })}
        {markers.map((m) => {
          const pct = Math.max(0, Math.min(100, ((m.value - min) / (binCount * binSize)) * 100));
          return (
            <div key={m.label} className="pointer-events-none absolute inset-y-0" style={{ left: `${pct}%` }} aria-hidden>
              <div className="h-full w-0.5 rounded" style={{ backgroundColor: m.color ?? '#0A1733' }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{format(min)}</span>
        <span>{format(min + (binCount * binSize) / 2)}</span>
        <span>{format(min + binCount * binSize)}</span>
      </div>
      {markers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {markers.map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded" style={{ backgroundColor: m.color ?? '#0A1733' }} aria-hidden />
              {m.label}
              <span className="font-medium tabular-nums text-ink">{format(m.value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
