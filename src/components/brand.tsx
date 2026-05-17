'use client';

import { useState } from 'react';
import { LogoMark } from '@/components/LogoMark';

// Brand marks. Logos are referenced from publicly hosted assets / a logo CDN
// (nothing trademarked is bundled); a styled text wordmark is the fallback.
// "For demo purposes only" is shown on every page.

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

// Official 1upHealth wordmark (publicly hosted asset). The "inverted" mark is
// the white version 1upHealth uses on dark backgrounds — matching how it sits
// in our navy sidebar. Falls back to a styled text wordmark if the asset is
// unavailable.
const ONEUP_LOGO_INVERTED =
  'https://1up.health/wp-content/uploads/2023/05/1uphealth-Web_Logo_Inverted_RGB_HIGHRES.png';

export function OneUpLogo({
  withConsole = true,
  height = 26
}: {
  withConsole?: boolean;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <OneUpWordmark variant="dark" withConsole={withConsole} />;
  }
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ONEUP_LOGO_INVERTED}
        alt="1upHealth"
        style={{ height }}
        className="object-contain"
        onError={() => setFailed(true)}
      />
      {withConsole && (
        <span className="text-sm font-medium text-slate-400">Console</span>
      )}
    </span>
  );
}

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
