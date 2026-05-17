'use client';

import { useState } from 'react';

type Channel = 'call' | 'sms' | 'letter';

const LABEL: Record<Channel, string> = { call: 'Call', sms: 'Text', letter: 'Letter' };

export function CareActions({ memberId, measureId }: { memberId: string; measureId: string }) {
  const [busy, setBusy] = useState<Channel | null>(null);
  const [open, setOpen] = useState<Channel | null>(null);
  const [content, setContent] = useState<{ subject: string; body: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function gen(channel: Channel) {
    setBusy(channel);
    setErr(null);
    try {
      const r = await fetch(
        `/api/outreach/message?memberId=${memberId}&measureId=${encodeURIComponent(measureId)}&channel=${channel}`
      );
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Failed');
      setContent({ subject: j.message.subject, body: j.message.body });
      setOpen(channel);
    } catch (e: any) {
      setErr(e.message);
      setOpen(channel);
      setContent(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {(['call', 'sms', 'letter'] as Channel[]).map((c) => (
          <button
            key={c}
            onClick={() => gen(c)}
            disabled={busy !== null || !measureId}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === c ? '…' : LABEL[c]}
          </button>
        ))}
      </div>
      {open && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
          {err ? (
            <span className="text-rose-600">Error: {err}</span>
          ) : (
            <>
              <div className="mb-1 font-medium text-ink">{content?.subject}</div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-sans text-slate-600">
                {content?.body}
              </pre>
              <div className="mt-1 flex gap-3">
                <button
                  onClick={() => content && navigator.clipboard?.writeText(content.body)}
                  className="text-accent hover:underline"
                >
                  Copy
                </button>
                <button onClick={() => setOpen(null)} className="text-slate-400 hover:underline">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
