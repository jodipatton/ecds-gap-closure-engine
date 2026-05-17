'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ContactStatus } from '@/lib/data/types';

const FLOW: ContactStatus[] = ['not-contacted', 'contacted', 'scheduled', 'closed'];
const LABEL: Record<ContactStatus, string> = {
  'not-contacted': 'Not contacted',
  contacted: 'Contacted',
  scheduled: 'Scheduled',
  closed: 'Closed'
};
const COLOR: Record<ContactStatus, string> = {
  'not-contacted': 'bg-slate-100 text-slate-600',
  contacted: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-sky-100 text-sky-700',
  closed: 'bg-emerald-100 text-emerald-700'
};

export function ContactControls({
  campaignId,
  memberId,
  status,
  measureId
}: {
  campaignId: string;
  memberId: string;
  status: ContactStatus;
  measureId: string | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState<{ subject: string; body: string } | null>(null);

  async function advance(next: ContactStatus) {
    setBusy(true);
    try {
      const r = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId, status: next })
      });
      if (r.ok) start(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function viewLetter() {
    if (!measureId) return;
    const r = await fetch(`/api/outreach/letter?memberId=${memberId}&measureId=${measureId}`);
    const j = await r.json();
    if (j.ok) setLetter({ subject: j.letter.subject, body: j.letter.body });
  }

  const idx = FLOW.indexOf(status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${COLOR[status]}`}>
          {LABEL[status]}
        </span>
        {next && (
          <button
            onClick={() => advance(next)}
            disabled={busy}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50"
          >
            → {LABEL[next]}
          </button>
        )}
        {measureId && (
          <button
            onClick={viewLetter}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
          >
            Letter
          </button>
        )}
      </div>
      {letter && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
          <div className="font-medium mb-1">{letter.subject}</div>
          <pre className="whitespace-pre-wrap font-sans text-slate-600">{letter.body}</pre>
          <button onClick={() => setLetter(null)} className="mt-1 text-slate-400 hover:underline">
            close
          </button>
        </div>
      )}
    </div>
  );
}
