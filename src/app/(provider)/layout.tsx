import { ProviderSideNav } from '@/components/provider/ProviderTabs';

// Provider portal shell. Section nav lives in a left rail (mirroring the
// payer console), with the page content to its right.
export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <ProviderSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
