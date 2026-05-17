'use client';

import { usePathname } from 'next/navigation';
import { PayerBadge } from '@/components/brand';

// Top chrome shown on every page: a persistent "demo only" notice plus the
// active tenant badge (Fallon Health for plan tools, Reliant Medical Group
// inside the provider portal).
export function Chrome() {
  const pathname = usePathname();
  const isProvider = pathname === '/provider' || pathname.startsWith('/provider/');

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        For demo purposes only — synthetic data
      </span>
      {/* Provider portal renders its own large tenant logo in its shell. */}
      {!isProvider && <PayerBadge height={44} />}
    </div>
  );
}
