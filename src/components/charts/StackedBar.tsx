// Horizontal stacked bar (HTML flex — responsive, server-rendered).
// Segments carry 2px surface gaps; identity comes from the legend (with
// values), never from color alone. Interior segments are not inline-labeled —
// the legend and per-segment tooltip carry them.

export interface StackSegment {
  label: string;
  value: number;
  color: string;
}

export function StackedBar({
  segments,
  height = 14,
  legend = true,
  format = (n: number) => n.toLocaleString()
}: {
  segments: StackSegment[];
  height?: number;
  legend?: boolean;
  format?: (n: number) => string;
}) {
  const visible = segments.filter((s) => s.value > 0);
  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <div className="flex w-full overflow-hidden rounded" style={{ height, gap: 2 }}>
        {total === 0 ? (
          <div className="w-full rounded bg-slate-100" />
        ) : (
          visible.map((s, i) => (
            <div
              key={s.label}
              title={`${s.label}: ${format(s.value)}`}
              className={[
                i === 0 ? 'rounded-l' : '',
                i === visible.length - 1 ? 'rounded-r' : ''
              ].join(' ')}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, minWidth: s.value > 0 ? 3 : 0 }}
            />
          ))
        )}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
              <span className="font-medium tabular-nums text-ink">{format(s.value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
