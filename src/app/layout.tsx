import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ECDS Gap Closure Engine',
  description: 'HEDIS ECDS gap closure platform built on FHIR-normalized claims and clinical data.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-8">
            <Link href="/" className="font-semibold text-ink text-lg">
              ECDS Gap Closure Engine
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-600">
              <Link href="/" className="hover:text-ink">Dashboard</Link>
              <Link href="/measures" className="hover:text-ink">Measures</Link>
              <Link href="/analytics" className="hover:text-ink">Analytics</Link>
              <Link href="/providers" className="hover:text-ink">Provider roster</Link>
              <Link href="/engagement" className="hover:text-ink">Engagement queue</Link>
              <Link href="/campaigns" className="hover:text-ink">Campaigns</Link>
              <Link href="/ecds-report" className="hover:text-ink">ECDS report</Link>
              <Link href="/provider/connect" className="hover:text-ink">Provider portal</Link>
              <Link href="/chat" className="hover:text-ink">Agent chat</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
