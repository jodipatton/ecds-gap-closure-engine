'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface SyncResult {
  attributedMembers: number;
  recordsSynced: number;
  openGapsBefore: number;
  openGapsAfter: number;
  gapsClosed: number;
  byMeasure: Array<{ measureId: string; closed: number }>;
}

export function ClinicalSyncButton({ npi }: { npi: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SyncResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pull() {
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch(`/api/ehr-connect/sync/${npi}`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Sync failed');
      setRes(j);
      start(() => router.refresh());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={pull}
        disabled={busy}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Pulling clinical data…' : 'Pull clinical data & close gaps'}
      </button>

      {err && <p className="text-xs text-rose-600">Error: {err}</p>}

      {res && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-semibold text-emerald-800">
            Synced {res.recordsSynced} FHIR resources for {res.attributedMembers} attributed members.
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <Stat label="Open gaps before" value={res.openGapsBefore} />
            <Stat label="Closed this sync" value={res.gapsClosed} accent />
            <Stat label="Open gaps after" value={res.openGapsAfter} />
          </div>
          {res.byMeasure.length > 0 && (
            <div className="mt-3 text-xs text-emerald-800">
              By measure:{' '}
              {res.byMeasure.map((m) => `${m.measureId} (${m.closed})`).join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${accent ? 'text-emerald-600' : 'text-slate-700'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
