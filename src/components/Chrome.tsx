'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PayerBadge } from '@/components/brand';

// Friendly page titles for the feedback link + launch banner.
const TITLES: Record<string, string> = {
  '/': 'Plan dashboard',
  '/measures': 'Measures',
  '/analytics': 'Analytics',
  '/risk': 'Risk (RAF)',
  '/rosters': 'Rosters',
  '/contracts': 'Value-based contracts',
  '/audit': 'PSV audit trail',
  '/providers': 'Provider roster',
  '/engagement': 'Engagement queue',
  '/campaigns': 'Campaigns',
  '/ecds-report': 'ECDS report',
  '/chat': '1upHealth assistant',
  '/provider': 'Provider dashboard',
  '/provider/connect': 'EHR connection',
  '/provider/connect/status': 'EHR connection status',
  '/provider/payer-access': 'Provider Access API',
  '/provider/contract': 'Provider contract',
  '/provider/care': 'Members & care',
  '/internal/feedback': 'Feedback (internal)',
  '/feedback': 'Feedback'
};

// Made-up but stable launch windows, all in 2026/2027.
const LAUNCH_WINDOWS = [
  'September 2026',
  'November 2026',
  'October 2026',
  'January 2027',
  'March 2027',
  'June 2027'
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Chrome() {
  const pathname = usePathname();
  const isProvider = pathname === '/provider' || pathname.startsWith('/provider/');
  const title = TITLES[pathname] ?? 'this page';
  const launch = LAUNCH_WINDOWS[hash(pathname) % LAUNCH_WINDOWS.length];
  const hideFeedback = pathname === '/feedback';

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          For demo purposes only — synthetic data
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Launching {launch}
        </span>
        {!hideFeedback && (
          <Link
            href={`/feedback?page=${encodeURIComponent(pathname)}&title=${encodeURIComponent(title)}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            💬 Give feedback on this page
          </Link>
        )}
      </div>
      {/* Provider portal renders its own large tenant logo in its shell. */}
      {!isProvider && <PayerBadge height={44} />}
    </div>
  );
}
