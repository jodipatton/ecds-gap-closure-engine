// Brand marks. Logo assets are served locally from public/logos (fetched once
// at setup; nothing trademarked is bundled beyond demo use). Server-component
// safe — no client state.
//
// Tenant rule: the shell logo tells you whose product you're in. The payer
// console shows 1upHealth alone in the sidebar and Fallon once in the top
// bar; the provider portal shows Reliant alone in its header with 1upHealth
// demoted to a "Powered by" footer.

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

/** White 1upHealth logo for dark backgrounds (the payer sidebar). */
export function OneUpLogo({
  withConsole = true,
  height = 26
}: {
  withConsole?: boolean;
  height?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/logos/1uphealth-inverted.png"
        alt="1upHealth"
        style={{ height }}
        className="object-contain"
      />
      {withConsole && <span className="text-sm font-medium text-slate-400">Console</span>}
    </span>
  );
}

/** Payer tenant lockup for the console top bar. */
export function PayerLockup() {
  return (
    <span className="inline-flex items-center gap-3">
      <img src="/logos/fallon.png" alt="Fallon Health" className="h-8 object-contain" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink">Fallon Health</span>
        <span className="block text-[11px] uppercase tracking-wide text-slate-500">Medicare Advantage · payer tenant</span>
      </span>
    </span>
  );
}

/** Provider tenant mark (initials tile — no public logo asset). */
export function ProviderMark({ height = 36, withName = true }: { height?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className="grid place-items-center rounded-md text-sm font-bold text-white"
        style={{ backgroundColor: '#1F6FEB', height, width: height }}
      >
        RM
      </span>
      {withName && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-ink">Reliant Medical Group</span>
          <span className="block text-[11px] uppercase tracking-wide text-slate-500">Provider portal</span>
        </span>
      )}
    </span>
  );
}
