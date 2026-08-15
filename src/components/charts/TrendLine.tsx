import { CHART } from './colors';
import { linearScale, ticks } from './scale';

// Rate-over-time line: 2px actual line + 10% area wash, dashed projection,
// hairline target reference, ringed end dot, sparse month labels, per-point
// hover via <title>. Single series — the card title names it, so no legend.
export function TrendLine({
  points,
  labels,
  projected,
  target,
  width = 560,
  height = 170,
  format = (n: number) => `${n}%`
}: {
  points: number[];
  labels?: string[]; // one per point (rendered sparsely)
  projected?: number; // EOY projection, drawn dashed from the last point
  target?: number;
  width?: number;
  height?: number;
  format?: (n: number) => string;
}) {
  const pad = { top: 14, right: 46, bottom: 22, left: 38 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const all = [...points, ...(projected !== undefined ? [projected] : []), ...(target !== undefined ? [target] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const domainPad = Math.max(2, (max - min) * 0.15);
  const y = linearScale([Math.max(0, min - domainPad), Math.min(100, max + domainPad)], [pad.top + innerH, pad.top]);
  const xStep = points.length > 1 ? innerW / (points.length - 1 + (projected !== undefined ? 1 : 0)) : innerW;
  const x = (i: number) => pad.left + i * xStep;

  const yTicks = ticks(Math.max(0, min - domainPad), Math.min(100, max + domainPad), 3);
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${pad.left},${(pad.top + innerH).toFixed(1)} Z`;
  const lastI = points.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Rate trend">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
          <text x={pad.left - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#94A3B8">
            {t}
          </text>
        </g>
      ))}

      {target !== undefined && (
        <g>
          <line x1={pad.left} x2={pad.left + innerW} y1={y(target)} y2={y(target)} stroke="#64748B" strokeWidth={1} strokeDasharray="1 3" />
          <text x={pad.left + innerW + 4} y={y(target) + 3.5} fontSize={10} fill="#64748B">
            target
          </text>
        </g>
      )}

      <path d={area} fill={CHART.accent} opacity={0.08} />
      <path d={path} fill="none" stroke={CHART.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {projected !== undefined && (
        <g>
          <line
            x1={x(lastI)}
            y1={y(points[lastI])}
            x2={x(lastI + 1)}
            y2={y(projected)}
            stroke={CHART.accent}
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <circle cx={x(lastI + 1)} cy={y(projected)} r={4.5} fill={CHART.surface} stroke={CHART.accent} strokeWidth={2} />
          <text x={x(lastI + 1)} y={y(projected) - 8} textAnchor="middle" fontSize={10} fill="#64748B">
            {format(projected)}
          </text>
        </g>
      )}

      <circle cx={x(lastI)} cy={y(points[lastI])} r={6.5} fill={CHART.surface} />
      <circle cx={x(lastI)} cy={y(points[lastI])} r={4.5} fill={CHART.accent} />
      <text x={x(lastI)} y={y(points[lastI]) - 9} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0A1733">
        {format(points[lastI])}
      </text>

      {points.map((v, i) => (
        <g key={i}>
          <rect x={x(i) - xStep / 2} y={pad.top} width={xStep} height={innerH} fill="transparent">
            <title>{`${labels?.[i] ?? `#${i + 1}`}: ${format(v)}`}</title>
          </rect>
        </g>
      ))}

      {labels &&
        labels.map((l, i) =>
          i === 0 || i === Math.floor(labels.length / 2) || i === labels.length - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="#94A3B8">
              {l}
            </text>
          ) : null
        )}
    </svg>
  );
}
