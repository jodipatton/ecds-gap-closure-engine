import Link from 'next/link';

// Provider portal shell. Distinct from the health-plan-facing dashboard:
// the audience here is the provider's IT admin / practice manager, not the
// quality director. Nav is intentionally narrow.
export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Provider portal</span>
          <span className="text-slate-500">EHR connection · payer access · data acquisition</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <Link href="/provider/connect" className="hover:text-ink">EHR Connect</Link>
          <Link href="/provider/connect/status" className="hover:text-ink">Status</Link>
          <Link href="/provider/payer-access" className="hover:text-ink">Payer Access API</Link>
          <Link href="/" className="hover:text-ink">← Plan dashboard</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
