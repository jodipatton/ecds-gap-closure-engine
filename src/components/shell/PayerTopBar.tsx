import { PayerLockup } from '@/components/brand';

// One-line console top bar: the tenant lockup (the only place Fallon appears
// in the payer chrome) plus a quiet synthetic-data disclosure.
export function PayerTopBar() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <PayerLockup />
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        Demo · synthetic data
      </span>
    </div>
  );
}
