// Brand marks. Text/CSS wordmarks (no external logo files) — intentionally
// generic so the demo doesn't ship third-party trademark assets. "For demo
// purposes only" is shown on every page.

export function OneUpWordmark({
  variant = 'light',
  withConsole = true
}: {
  variant?: 'light' | 'dark';
  withConsole?: boolean;
}) {
  const healthColor = variant === 'dark' ? 'text-white' : 'text-ink';
  const consoleColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';
  return (
    <span className="inline-flex items-baseline gap-1 font-semibold tracking-tight">
      <span>
        <span className="text-accent">1up</span>
        <span className={healthColor}>Health</span>
      </span>
      {withConsole && <span className={`text-sm font-medium ${consoleColor}`}>Console</span>}
    </span>
  );
}

function OrgBadge({
  name,
  role,
  accent
}: {
  name: string;
  role: string;
  accent: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <span
        className="grid h-6 w-6 place-items-center rounded text-[11px] font-bold text-white"
        style={{ backgroundColor: accent }}
      >
        {name
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0])
          .join('')}
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-semibold text-ink">{name}</span>
        <span className="block text-[10px] uppercase tracking-wide text-slate-500">{role}</span>
      </span>
    </span>
  );
}

// Payer tenant for the plan-facing tools.
export function PayerBadge() {
  return <OrgBadge name="Fallon Health" role="Payer" accent="#0F766E" />;
}

// Provider tenant for the provider portal.
export function ProviderBadge() {
  return <OrgBadge name="Reliant Medical Group" role="Provider network" accent="#1F6FEB" />;
}
