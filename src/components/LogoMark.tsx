'use client';

import { useState } from 'react';

// Renders an organization's real logo from a public logo CDN (by domain),
// falling back to an initials mark if the CDN has no asset. No trademarked
// artwork is bundled; everything is clearly a "for demo purposes only" UI.
export function LogoMark({
  domain,
  name,
  role,
  accent = '#1F6FEB',
  height = 40
}: {
  domain: string;
  name: string;
  role?: string;
  accent?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center gap-3">
      {failed ? (
        <span
          className="grid place-items-center rounded-md font-bold text-white"
          style={{ backgroundColor: accent, height, width: height }}
        >
          {name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={`${name} logo`}
          style={{ height, maxWidth: height * 5 }}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      )}
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink">{name}</span>
        {role && (
          <span className="block text-[11px] uppercase tracking-wide text-slate-500">{role}</span>
        )}
      </span>
    </span>
  );
}
