const TONES = {
  accent: 'bg-accent',
  good: 'bg-good',
  bad: 'bg-bad',
  amber: 'bg-amber-500'
} as const;

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent'
}: {
  value: number;
  max?: number;
  tone?: keyof typeof TONES;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded bg-slate-100">
      <div className={`h-2 rounded ${TONES[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
