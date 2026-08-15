'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { SyncResultPanel, type SyncSummaryLike } from './SyncResultPanel';

export function ClinicalSyncButton({
  npi,
  lastSummary
}: {
  npi: string;
  /** Persisted summary from a previous sync, shown until a fresh one runs. */
  lastSummary?: SyncSummaryLike | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SyncSummaryLike | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pull() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/ehr-connect/sync/${npi}`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Sync failed');
      setRes(j);
      start(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  const shown = res ?? lastSummary ?? null;

  return (
    <div className="space-y-3">
      <Button onClick={pull} disabled={busy}>
        {busy ? 'Pulling clinical data…' : 'Pull clinical data & close gaps'}
      </Button>
      {err && <p className="text-xs text-rose-600">Error: {err}</p>}
      {shown && <SyncResultPanel result={shown} />}
    </div>
  );
}
