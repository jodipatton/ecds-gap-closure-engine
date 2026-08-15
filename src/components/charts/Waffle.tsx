// Unit ("waffle") chart: one rounded square per member, colored by status.
// Turns "75 open gaps" into countable people. Legend carries identity; each
// square carries its own tooltip. Caps the grid and reports the remainder so
// nothing silently truncates.
export interface WaffleUnit {
  key: string;
  color: string;
  title: string; // tooltip: member + status
}

export function Waffle({
  units,
  legend,
  cap = 240,
  size = 13
}: {
  units: WaffleUnit[];
  legend: Array<{ label: string; color: string; count: number }>;
  cap?: number;
  size?: number;
}) {
  const shown = units.slice(0, cap);
  return (
    <div>
      <div className="flex flex-wrap" style={{ gap: 3 }}>
        {shown.map((u) => (
          <span
            key={u.key}
            title={u.title}
            className="rounded-[3px] transition-transform hover:scale-125"
            style={{ width: size, height: size, backgroundColor: u.color }}
          />
        ))}
      </div>
      {units.length > cap && (
        <p className="mt-1.5 text-[11px] text-slate-400">Showing {cap} of {units.length} members.</p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {legend
          .filter((l) => l.count > 0)
          .map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: l.color }} aria-hidden />
              {l.label}
              <span className="font-medium tabular-nums text-ink">{l.count}</span>
            </span>
          ))}
      </div>
    </div>
  );
}
