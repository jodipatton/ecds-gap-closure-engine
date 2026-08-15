import { CHART } from './colors';

// Population age pyramid: mirrored horizontal bars around a center axis.
// Position (left vs right) is the primary identity channel; the legend and
// end-labels back it up, so the two hues never carry identity alone.
// Pair (#2563EB / #10B981) validated with the dataviz palette checker.
export interface PyramidBand {
  band: string; // e.g. "20–29"
  left: number;
  right: number;
}

const LEFT_COLOR = CHART.accent;
const RIGHT_COLOR = CHART.good;

export function AgePyramid({
  bands,
  leftLabel,
  rightLabel
}: {
  bands: PyramidBand[];
  leftLabel: string;
  rightLabel: string;
}) {
  const max = Math.max(1, ...bands.flatMap((b) => [b.left, b.right]));
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LEFT_COLOR }} aria-hidden />
          {leftLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {rightLabel}
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: RIGHT_COLOR }} aria-hidden />
        </span>
      </div>
      <div className="space-y-1">
        {bands.map((b) => (
          <div key={b.band} className="flex items-center gap-2" title={`${b.band}: ${b.left} ${leftLabel}, ${b.right} ${rightLabel}`}>
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <span className="text-[10px] tabular-nums text-slate-400">{b.left || ''}</span>
              <div
                className="h-3.5 rounded-l"
                style={{ width: pct(b.left), backgroundColor: LEFT_COLOR, minWidth: b.left > 0 ? 3 : 0 }}
              />
            </div>
            <span className="w-12 shrink-0 text-center text-[11px] font-medium tabular-nums text-slate-500">
              {b.band}
            </span>
            <div className="flex flex-1 items-center gap-1.5">
              <div
                className="h-3.5 rounded-r"
                style={{ width: pct(b.right), backgroundColor: RIGHT_COLOR, minWidth: b.right > 0 ? 3 : 0 }}
              />
              <span className="text-[10px] tabular-nums text-slate-400">{b.right || ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
