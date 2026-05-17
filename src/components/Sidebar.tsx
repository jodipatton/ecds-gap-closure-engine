'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  // active also when the path is nested under href (but not for '/')
  exact?: boolean;
}

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Plan',
    items: [
      { href: '/', label: 'Dashboard', exact: true },
      { href: '/measures', label: 'Measures' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/risk', label: 'Risk (RAF)' },
      { href: '/rosters', label: 'Rosters' },
      { href: '/providers', label: 'Provider roster' }
    ]
  },
  {
    title: 'Outreach',
    items: [
      { href: '/engagement', label: 'Engagement queue' },
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/ecds-report', label: 'ECDS report' }
    ]
  },
  {
    title: 'Provider',
    items: [
      { href: '/provider/connect', label: 'Provider portal' },
      { href: '/chat', label: 'Agent chat' }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-ink text-slate-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold text-white">
          ◆
        </span>
        <span className="text-sm font-semibold text-white">ECDS Gap Engine</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                        active
                          ? 'bg-sky-500/15 font-medium text-white'
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
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-slate-500">
        HEDIS ECDS · synthetic data
      </div>
    </aside>
  );
}
