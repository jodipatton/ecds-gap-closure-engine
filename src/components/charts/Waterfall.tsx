import { CHART } from './colors';
import { linearScale } from './scale';

// Denominator waterfall: a total bar, floating decrements with dashed
// connectors, and a remainder bar — the anatomy of "eligible → open gaps"
// in one read. Every bar is direct-labeled (name above, value on the bar).
export interface WaterfallStep {
  label: string;
  value: number;
  color: string;
}

export function Waterfall({
  total,
  steps,
  remainder,
  width = 620,
  height = 210
}: {
  total: { label: string; value: number };
  steps: WaterfallStep[];
  remainder: { label: string; color: string };
  width?: number;
  height?: number;
}) {
  const pad = { top: 26, right: 12, bottom: 26, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const y = linearScale([0, Math.max(1, total.value)], [pad.top + innerH, pad.top]);

  const cols = steps.length + 2;
  const slot = innerW / cols;
  const barW = Math.min(24, slot * 0.55);
  const cx = (i: number) => pad.left + slot * i + slot / 2;

  let running = total.value;
  const drawn: Array<{
    x: number;
    topVal: number;
    bottomVal: number;
    color: string;
    label: string;
    value: number;
    kind: 'total' | 'step' | 'remainder';
  }> = [{ x: cx(0), topVal: total.value, bottomVal: 0, color: CHART.neutral, label: total.label, value: total.value, kind: 'total' }];

  steps.forEach((s, i) => {
    const topVal = running;
    running -= s.value;
    drawn.push({ x: cx(i + 1), topVal, bottomVal: running, color: s.color, label: s.label, value: s.value, kind: 'step' });
  });
  drawn.push({ x: cx(cols - 1), topVal: running, bottomVal: 0, color: remainder.color, label: remainder.label, value: running, kind: 'remainder' });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${total.label} waterfall`}>
      <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={CHART.grid} strokeWidth={1} />
      {drawn.map((d, i) => {
        const top = y(d.topVal);
        const bottom = y(d.bottomVal);
        const h = Math.max(bottom - top, d.value > 0 ? 3 : 0);
        const next = drawn[i + 1];
        return (
          <g key={d.label}>
            {h > 0 && (
              <rect x={d.x - barW / 2} y={top} width={barW} height={h} rx={3} fill={d.color}>
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
            )}
            {next && (
              <line
                x1={d.x + barW / 2}
                x2={next.x - barW / 2}
                y1={d.kind === 'total' ? top : y(d.bottomVal)}
                y2={d.kind === 'total' ? top : y(d.bottomVal)}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}
            <text x={d.x} y={top - 7} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0A1733">
              {d.kind === 'step' ? `−${d.value}` : d.value}
            </text>
            <text x={d.x} y={height - 8} textAnchor="middle" fontSize={9.5} fill="#64748B">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
