'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProviderMark } from '@/components/brand';
import { PROVIDER_NAV, isNavActive } from '@/lib/nav';

// The provider portal deliberately uses a different shell grammar from the
// payer console — a light top horizontal nav instead of a dark side rail —
// so a demo audience instantly reads "different product, different tenant."
export function ProviderHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-8 py-3">
        <Link href="/provider" className="shrink-0">
          <ProviderMark height={34} />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {PROVIDER_NAV.map((item) => {
            const active = isNavActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
                  active
                    ? 'bg-[#1F6FEB]/10 font-medium text-[#1F6FEB]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                ].join(' ')}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-xs font-medium text-ink">Dr. Aisha Okafor</span>
            <span className="block text-[11px] text-slate-500">Reliant Medical Group</span>
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
          >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
            Return to payer view
          </Link>
        </div>
      </div>
    </header>
  );
}
