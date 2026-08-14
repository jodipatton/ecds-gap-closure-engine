import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-8">
      <div className="text-center">
        <div className="text-5xl font-semibold text-ink">404</div>
        <p className="mt-2 text-sm text-slate-600">This page doesn&apos;t exist in the console.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
