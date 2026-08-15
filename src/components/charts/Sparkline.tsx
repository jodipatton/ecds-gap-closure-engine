import { CHART } from './colors';

// 12-point inline sparkline: de-emphasis hue with the current period in accent.
export function Sparkline({
  points,
  width = 96,
  height = 28,
  accentLast = true
}: {
  points: number[];
  width?: number;
  height?: number;
  accentLast?: boolean;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (width - 8) + 4;
  const y = (v: number) => height - 5 - ((v - min) / span) * (height - 10);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const li = points.length - 1;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={CHART.neutral} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {accentLast && (
        <>
          <circle cx={x(li)} cy={y(points[li])} r={4} fill={CHART.surface} />
          <circle cx={x(li)} cy={y(points[li])} r={2.75} fill={CHART.accent} />
        </>
      )}
    </svg>
  );
}
