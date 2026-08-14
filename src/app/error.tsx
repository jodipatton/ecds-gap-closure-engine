'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-8">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-ink">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">{error.message || 'Unexpected error.'}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
