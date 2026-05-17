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

import { LogoMark } from '@/components/LogoMark';

// Payer tenant for the plan-facing tools.
export function PayerBadge({ height = 40 }: { height?: number }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2">
      <LogoMark
        domain="fallonhealth.org"
        name="Fallon Health"
        role="Payer"
        accent="#0F766E"
        height={height}
      />
    </span>
  );
}

// Provider tenant for the provider portal.
export function ProviderBadge({ height = 40 }: { height?: number }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2">
      <LogoMark
        domain="reliantmedicalgroup.org"
        name="Reliant Medical Group"
        role="Provider network"
        accent="#1F6FEB"
        height={height}
      />
    </span>
  );
}
