import { CHART } from './colors';
import { linearScale, ticks } from './scale';

// Dot plot for relationship + outlier spotting (e.g. panel size vs open
// gaps). Uniform ≥8px ringed dots — color flags a status that is also in the
// tooltip, so identity never rides color alone. The top outliers are
// direct-labeled; everything else lives in the hover title.
export interface ScatterPoint {
  label: string;
  x: number;
  y: number;
  color?: string;
  hint?: string;
}

export function Scatter({
  points,
  xLabel,
  yLabel,
  labelTop = 2,
  width = 600,
  height = 260,
  legend
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  /** Direct-label the N highest-y points. */
  labelTop?: number;
  width?: number;
  height?: number;
  legend?: Array<{ label: string; color: string }>;
}) {
  const pad = { top: 14, right: 16, bottom: 34, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxX = Math.max(1, ...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const x = linearScale([0, maxX * 1.06], [pad.left, pad.left + innerW]);
  const y = linearScale([0, maxY * 1.12], [pad.top + innerH, pad.top]);
  const xTicks = ticks(0, maxX, 4);
  const yTicks = ticks(0, maxY, 3);

  const labeled = new Set(
    [...points].sort((a, b) => b.y - a.y).slice(0, labelTop).map((p) => p.label)
  );

  return (
    <div>
      {legend && legend.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={pad.left - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#94A3B8">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={height - 18} textAnchor="middle" fontSize={10} fill="#94A3B8">
            {t}
          </text>
        ))}
        <text x={pad.left + innerW / 2} y={height - 4} textAnchor="middle" fontSize={10} fill="#64748B">
          {xLabel}
        </text>
        <text
          x={12}
          y={pad.top + innerH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="#64748B"
          transform={`rotate(-90 12 ${pad.top + innerH / 2})`}
        >
          {yLabel}
        </text>

        {points.map((p) => (
          <g key={p.label}>
            <circle cx={x(p.x)} cy={y(p.y)} r={7.5} fill={CHART.surface} />
            <circle cx={x(p.x)} cy={y(p.y)} r={5.5} fill={p.color ?? CHART.accent}>
              <title>{`${p.label}: ${xLabel} ${p.x}, ${yLabel} ${p.y}${p.hint ? ` — ${p.hint}` : ''}`}</title>
            </circle>
            {labeled.has(p.label) && (
              <text x={x(p.x) + 9} y={y(p.y) + 3.5} fontSize={10} fontWeight={600} fill="#0A1733">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
