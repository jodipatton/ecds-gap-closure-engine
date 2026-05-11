'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ResyncButton({ npi }: { npi: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function resync() {
    setPending(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/ehr-connect/status/${npi}`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Re-sync failed');
      setMsg(`Synced ${j.synced} records.`);
      start(() => router.refresh());
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
      <button
        onClick={resync}
        disabled={pending}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Syncing…' : 'Re-sync now'}
      </button>
    </div>
  );
}
