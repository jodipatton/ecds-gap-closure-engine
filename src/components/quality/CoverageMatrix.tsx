import Link from 'next/link';
import { Check, FileText, FlaskConical, Pill, Receipt, Syringe } from 'lucide-react';
import { DATA_NEEDS, missingForKind, type ElementKind, type MeasureCoverage } from '@/lib/hedis/dataNeeds';
import type { HedisResult } from '@/lib/data/types';

// The "what can the plan see" matrix: measures × data-element kinds.
// Cell language: emerald = fully mapped, amber = partially mapped (N members
// still dark), rose = entirely unmapped, blank = the measure doesn't need it.
// Claims are always mapped — the payer owns its own adjudication feed.

const KINDS: Array<{ kind: ElementKind; label: string; icon: typeof Receipt; source: string }> = [
  { kind: 'claims', label: 'Claims', icon: Receipt, source: 'adjudication feed' },
  { kind: 'observation', label: 'Labs & vitals', icon: FlaskConical, source: 'EHR · FHIR Observation' },
  { kind: 'medication', label: 'Medications', icon: Pill, source: 'EHR · MedicationRequest' },
  { kind: 'document', label: 'Documents', icon: FileText, source: 'EHR · CCDA / DocumentReference' },
  { kind: 'immunization', label: 'Immunizations', icon: Syringe, source: 'registry / EHR' }
];

export function CoverageMatrix({
  results,
  coverage
}: {
  results: HedisResult[];
  coverage: Map<string, MeasureCoverage>;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid" style={{ gridTemplateColumns: `minmax(190px, 1.4fr) repeat(${KINDS.length}, minmax(84px, 1fr))` }}>
          {/* header */}
          <div />
          {KINDS.map(({ kind, label, icon: Icon, source }) => (
            <div key={kind} className="px-1 pb-3 text-center">
              <Icon size={17} strokeWidth={1.75} className="mx-auto text-slate-500" aria-hidden />
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div>
              <div className="text-[10px] leading-tight text-slate-400">{source}</div>
            </div>
          ))}

          {/* rows */}
          {results.map((r) => {
            const needs = DATA_NEEDS[r.measureId];
            const cov = coverage.get(r.measureId);
            const neededKinds = new Set(needs?.elements.map((e) => e.kind) ?? []);
            return (
              <div key={r.measureId} className="contents">
                <Link
                  href={`/measures/${r.measureId}`}
                  className="group flex items-center gap-2 border-t border-slate-100 py-2 pr-3"
                >
                  <span className="w-12 shrink-0 text-xs font-semibold text-slate-500 group-hover:text-accent">
                    {r.measureId}
                  </span>
                  <span className="truncate text-xs text-slate-600">{r.measureName}</span>
                </Link>
                {KINDS.map(({ kind }) => {
                  if (!neededKinds.has(kind)) {
                    return (
                      <div key={kind} className="flex items-center justify-center border-t border-slate-100 py-2">
                        <span className="text-xs text-slate-300">·</span>
                      </div>
                    );
                  }
                  const missing = missingForKind(cov, kind);
                  const have = kind === 'claims' ? (cov?.closedClaims ?? 0) : (cov?.closedClinical ?? 0);
                  const state = missing === 0 ? 'mapped' : have > 0 ? 'partial' : 'dark';
                  const cls =
                    state === 'mapped'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : state === 'partial'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-rose-200 bg-rose-50 text-rose-700';
                  const title =
                    kind === 'claims'
                      ? `${r.measureId} · claims: fully mapped from the adjudication feed`
                      : `${r.measureId} · ${kind}: ${missing === 0 ? 'fully mapped' : `${missing} member${missing === 1 ? '' : 's'} still dark`}${have ? ` · ${have} closed from this data` : ''}`;
                  return (
                    <div key={kind} className="flex items-center justify-center border-t border-slate-100 px-1 py-2">
                      <span
                        title={title}
                        className={`inline-flex min-w-[52px] items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium tabular-nums ${cls}`}
                      >
                        {state === 'mapped' ? (
                          <>
                            <Check size={12} strokeWidth={2.5} aria-hidden /> mapped
                          </>
                        ) : (
                          <>{missing} dark</>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-50" aria-hidden /> fully mapped
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-amber-200 bg-amber-50" aria-hidden /> partially mapped — some members dark
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-rose-200 bg-rose-50" aria-hidden /> unmapped — no members visible yet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="grid h-3 w-3 place-items-center text-slate-300">·</span> not required by the measure
          </span>
        </div>
      </div>
    </div>
  );
}
