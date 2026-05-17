import { ProviderTabs } from '@/components/provider/ProviderTabs';
import { ProviderBadge } from '@/components/brand';

// Provider portal shell. Distinct from the health-plan-facing console: the
// audience here is the practice (Reliant Medical Group). Dashboard-first with
// tabs for EHR connection, Provider Access API, contract value, and care.
export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4">
        <ProviderBadge height={48} />
        <span className="rounded-md bg-ink px-3 py-1 text-xs font-semibold text-white">
          Provider Portal
        </span>
      </div>
      <ProviderTabs />
      {children}
    </div>
  );
}
