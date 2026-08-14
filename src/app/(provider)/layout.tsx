import { ProviderHeader } from '@/components/shell/ProviderHeader';
import { ProviderRibbon } from '@/components/shell/ProviderRibbon';
import { OneUpWordmark } from '@/components/brand';

// Standalone provider portal shell — a deliberately different product surface
// from the payer console: light top nav, Reliant identity, 1upHealth demoted
// to a "Powered by" footer.
export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ProviderRibbon />
      <ProviderHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-8 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            Powered by <OneUpWordmark withConsole={false} />
          </span>
          <span>Data shared by Fallon Health · demo · synthetic data</span>
        </div>
      </footer>
    </div>
  );
}
