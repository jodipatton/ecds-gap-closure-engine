'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProviderBadge } from '@/components/brand';

const ITEMS = [
  { href: '/provider', label: 'Dashboard', exact: true },
  { href: '/provider/connect', label: 'EHR Connection' },
  { href: '/provider/payer-access', label: 'Provider Access API' },
  { href: '/provider/contract', label: 'Contract & value' },
  { href: '/provider/care', label: 'Members & care' }
];

// Vertical section rail for the provider portal — mirrors the payer console's
// left sidebar styling (dark navy, accent active state).
export function ProviderSideNav() {
  const pathname = usePathname();

  function isActive(item: { href: string; exact?: boolean }) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col self-start rounded-xl bg-ink p-4 text-slate-300">
      <div className="mb-4">
        <ProviderBadge height={32} />
      </div>

      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Provider portal
      </div>
      <ul className="space-y-0.5">
        {ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  'group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                  active
                    ? 'bg-accent/20 font-medium text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                ].join(' ')}
              >
                <span
                  className={[
                    'h-4 w-0.5 rounded-full transition',
                    active ? 'bg-accent' : 'bg-transparent group-hover:bg-slate-600'
                  ].join(' ')}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/"
        className="mt-4 border-t border-white/10 px-3 pt-4 text-xs text-slate-500 hover:text-white"
      >
        ← Back to plan console
      </Link>
    </aside>
  );
}
