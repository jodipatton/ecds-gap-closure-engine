import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { Chrome } from '@/components/Chrome';
import './globals.css';

export const metadata: Metadata = {
  title: '1upHealth Console',
  description: 'Health-data interoperability console for HEDIS ECDS gap closure, risk adjustment, and value-based care.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-8 py-8">
            <Chrome />
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
