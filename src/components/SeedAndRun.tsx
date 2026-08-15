'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export function SeedAndRun({ seeded, hasResults }: { seeded: boolean; hasResults: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [busy, setBusy] = useState<'seed' | 'engine' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string, kind: 'seed' | 'engine') {
    setBusy(kind);
    setMsg(null);
    try {
      const r = await fetch(path, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'failed');
      setMsg(kind === 'seed'
        ? `Seeded ${j.summary.members} members, ${j.summary.claims} claims, ${j.summary.providers} providers.`
        : `Engine done. ${j.summary.totalGaps} open gaps across ${j.summary.results.length} measures.`);
      start(() => router.refresh());
    } catch (err: any) {
      setMsg(`Error: ${err.message ?? err}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        onClick={() => call('/api/seed', 'seed')}
        disabled={busy !== null}
      >
        {busy === 'seed' ? 'Seeding…' : seeded ? 'Re-seed synthetic data' : 'Seed synthetic data'}
      </Button>
      <Button
        onClick={() => call('/api/engine', 'engine')}
        disabled={busy !== null || !seeded}
      >
        {busy === 'engine' ? 'Running analytics…' : hasResults ? 'Re-run Analytics' : 'Run Analytics'}
      </Button>
      {!seeded && <span className="text-xs text-slate-500">Seed first to enable the engine.</span>}
      {(msg || isPending) && <span className="text-xs text-slate-600">{msg ?? 'Refreshing…'}</span>}
    </div>
  );
}
