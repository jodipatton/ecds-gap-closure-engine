import Link from 'next/link';
import { Dumbbell } from '@/components/charts';
import { money } from '@/lib/shared/format';

export interface SyncSummaryLike {
  recordsSynced: number;
  gapsClosed: number;
  dollarsUnlocked: number;
  byMeasure: Array<{ measureId: string; closed: number }>;
  rateShift: Array<{ measureId: string; before: number; after: number }>;
  attributedMembers?: number;
  openGapsBefore?: number;
  openGapsAfter?: number;
  at?: string;
}

// The demo's hero moment: what one clinical-data pull just did.
export function SyncResultPanel({ result }: { result: SyncSummaryLike }) {
  const moved = result.rateShift.filter((r) => r.after !== r.before);
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-emerald-800">
            Sync complete — {result.recordsSynced} FHIR resources pulled
            {result.attributedMembers ? ` for ${result.attributedMembers} attributed members` : ''}
            {result.at ? ` · ${new Date(result.at).toLocaleString()}` : ''}
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            No extra visits, no chart chases — care that already happened, now visible to the plan.
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-ink">{money(result.dollarsUnlocked)}</div>
          <div className="text-xs text-slate-500">incentive value unlocked</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-white/70 py-2">
          <div className="text-2xl font-semibold text-slate-700">{result.openGapsBefore ?? '—'}</div>
          <div className="text-xs text-slate-500">open gaps before</div>
        </div>
        <div className="rounded-md bg-white/70 py-2">
          <div className="text-2xl font-semibold text-emerald-600">{result.gapsClosed}</div>
          <div className="text-xs text-slate-500">closed this sync</div>
        </div>
        <div className="rounded-md bg-white/70 py-2">
          <div className="text-2xl font-semibold text-slate-700">{result.openGapsAfter ?? '—'}</div>
          <div className="text-xs text-slate-500">open gaps after</div>
        </div>
      </div>

      {moved.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Plan-wide rate movement
          </div>
          <Dumbbell
            rows={moved.map((r) => ({ label: r.measureId, before: r.before, after: r.after }))}
            beforeLabel="Before sync"
            afterLabel="After sync"
          />
        </div>
      )}

      <div className="mt-4 text-xs">
        <Link href="/" className="font-medium text-accent hover:underline">
          See it in the payer console →
        </Link>
      </div>
    </div>
  );
}
