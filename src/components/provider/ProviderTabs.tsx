'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/provider', label: 'Dashboard', exact: true },
  { href: '/provider/connect', label: 'EHR Connection' },
  { href: '/provider/payer-access', label: 'Provider Access API' },
  { href: '/provider/contract', label: 'Contract & value' },
  { href: '/provider/care', label: 'Members & care' }
];

export function ProviderTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-ink'
            ].join(' ')}
          >
            {t.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="ml-auto px-4 py-2.5 text-sm text-slate-400 hover:text-ink"
      >
        ← Plan dashboard
      </Link>
    </nav>
  );
}
