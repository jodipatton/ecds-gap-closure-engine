import { PayerSidebar } from '@/components/shell/PayerSidebar';
import { PayerTopBar } from '@/components/shell/PayerTopBar';

// Payer console shell: dark 1upHealth side rail + tenant top bar.
export default function PayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <PayerSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <PayerTopBar />
          {children}
        </div>
      </main>
    </div>
  );
}
