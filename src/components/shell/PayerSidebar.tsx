'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRightLeft } from 'lucide-react';
import { OneUpLogo } from '@/components/brand';
import { PAYER_NAV, isNavActive } from '@/lib/nav';

export function PayerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-ink text-slate-300">
      <div className="px-5 py-6">
        <Link href="/">
          <OneUpLogo height={28} />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {PAYER_NAV.map((section) => (
          <div key={section.section ?? 'root'}>
            {section.section && (
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.section}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition',
                        active
                          ? 'bg-sky-500/15 font-medium text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      ].join(' ')}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.75}
                        className={active ? 'text-accent' : 'text-slate-500 group-hover:text-slate-300'}
                        aria-hidden
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href="/provider"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowRightLeft size={16} strokeWidth={1.75} aria-hidden />
          View as Reliant Medical Group →
        </Link>
        <div className="px-3 pt-3 text-[11px] text-slate-600">HEDIS ECDS · synthetic data</div>
      </div>
    </aside>
  );
}
