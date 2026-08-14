'use client';

import { Card } from '@/components/ui';

export default function ProviderError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="border-rose-200">
      <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
      <p className="mt-1 text-sm text-slate-600">
        {error.message || 'The portal hit an unexpected error loading this page.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-[#1F6FEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Try again
      </button>
    </Card>
  );
}
