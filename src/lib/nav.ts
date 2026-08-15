// Single source of truth for navigation and page titles across both shells.
// The payer sidebar, provider header, and PageHeader all render from here so
// labels can never drift between surfaces.

import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  Database,
  FileSignature,
  FileText,
  Gauge,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Network,
  PlugZap,
  ShieldCheck,
  Users
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string; // short nav label
  title: string; // full page title (PageHeader / titleFor)
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSection {
  section: string | null;
  items: NavItem[];
}

// Grouped to mirror the demo story: measure → monetize → act → connect.
export const PAYER_NAV: NavSection[] = [
  {
    section: null,
    items: [{ href: '/', label: 'Home', title: 'Plan command center', icon: LayoutDashboard, exact: true }]
  },
  {
    section: 'Quality',
    items: [
      { href: '/measures', label: 'Measures', title: 'HEDIS measures', icon: Gauge },
      { href: '/data-map', label: 'Data coverage', title: 'Data coverage map', icon: Database },
      { href: '/ecds-report', label: 'ECDS report', title: 'ECDS report', icon: FileText },
      { href: '/audit', label: 'PSV audit trail', title: 'PSV audit trail', icon: ShieldCheck }
    ]
  },
  {
    section: 'Economics',
    items: [
      { href: '/analytics', label: 'Analytics & simulator', title: 'Analytics & gap-closure simulator', icon: LineChart },
      { href: '/risk', label: 'Risk (RAF)', title: 'Risk adjustment (RAF)', icon: HeartPulse },
      { href: '/contracts', label: 'Value-based contracts', title: 'Value-based contracts', icon: FileSignature }
    ]
  },
  {
    section: 'Action',
    items: [
      { href: '/outreach', label: 'Outreach', title: 'Outreach', icon: Megaphone },
      { href: '/rosters', label: 'Rosters', title: 'Actionable rosters', icon: ClipboardList }
    ]
  },
  {
    section: 'Network',
    items: [
      { href: '/providers', label: 'Providers & EHR', title: 'Providers & EHR connectivity', icon: Network }
    ]
  }
];

export const PROVIDER_NAV: NavItem[] = [
  { href: '/provider', label: 'Dashboard', title: 'Practice dashboard', icon: LayoutDashboard, exact: true },
  { href: '/provider/care', label: 'My panel', title: 'Members needing care', icon: Users },
  { href: '/provider/connect', label: 'EHR connection', title: 'EHR connection', icon: PlugZap },
  { href: '/provider/payer-access', label: 'Payer data', title: 'Provider Access API (CMS-0057-F)', icon: KeyRound },
  { href: '/provider/contract', label: 'Contract', title: 'Your value-based contract', icon: FileSignature }
];

// Titles for routes that don't sit in either nav.
const EXTRA_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/chat', title: 'Assistant' },
  { prefix: '/outreach/queue', title: 'Outreach queue' },
  { prefix: '/outreach/campaigns', title: 'Campaign' }
];

export function titleFor(pathname: string): string {
  const candidates: Array<{ prefix: string; title: string; exact?: boolean }> = [
    ...EXTRA_TITLES,
    ...PAYER_NAV.flatMap((s) => s.items.map((i) => ({ prefix: i.href, title: i.title, exact: i.exact }))),
    ...PROVIDER_NAV.map((i) => ({ prefix: i.href, title: i.title, exact: i.exact }))
  ];
  let best: { prefix: string; title: string } | null = null;
  for (const c of candidates) {
    const match = c.exact
      ? pathname === c.prefix
      : pathname === c.prefix || pathname.startsWith(`${c.prefix}/`);
    if (match && (!best || c.prefix.length > best.prefix.length)) best = c;
  }
  return best?.title ?? '1upHealth Console';
}

export function isNavActive(item: Pick<NavItem, 'href' | 'exact'>, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
