import { CHART } from './colors';

// Rate-vs-target bullet: accent fill on a light track with an ink target tick.
// Single series — no legend; the row label + value live with the caller.
export function BulletBar({
  value,
  target,
  max = 100,
  height = 12
}: {
  value: number; // 0..max
  target?: number;
  max?: number;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const targetPct = target === undefined ? null : Math.max(0, Math.min(100, (target / max) * 100));
  return (
    <div
      className="relative w-full rounded"
      style={{ height, backgroundColor: CHART.track }}
      title={target !== undefined ? `${value}% vs ${target}% target` : `${value}%`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l"
        style={{ width: `${pct}%`, backgroundColor: CHART.accent, borderRadius: pct >= 99 ? 4 : '4px 4px 4px 4px' }}
      />
      {targetPct !== null && (
        <div
          className="absolute -inset-y-0.5 w-0.5 rounded bg-ink"
          style={{ left: `calc(${targetPct}% - 1px)` }}
          aria-hidden
        />
      )}
    </div>
  );
}
