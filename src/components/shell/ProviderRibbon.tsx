'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const KEY = 'provider-ribbon-dismissed';

// First-visit ribbon that makes the tenant switch legible to a demo audience.
export function ProviderRibbon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="border-b border-[#1F6FEB]/20 bg-[#1F6FEB]/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-2 text-xs text-[#1F6FEB]">
        <span>
          You are viewing the <strong>provider experience</strong> — what Reliant Medical Group sees on
          1upHealth&apos;s rails.
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          className="rounded p-0.5 transition hover:bg-[#1F6FEB]/10"
          onClick={() => {
            try {
              sessionStorage.setItem(KEY, '1');
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
