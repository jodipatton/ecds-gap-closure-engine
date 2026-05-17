'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const QUEUE_REASONS = [
  { value: 'no-visit', label: 'No visit in MY' },
  { value: 'no-pcp', label: 'No attributed PCP' },
  { value: 'gap-closeable', label: 'Gap-closeable' }
];

export function CampaignCreator({ measureIds }: { measureIds: string[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'measure' | 'queue-reason'>('measure');
  const [filterValue, setFilterValue] = useState(measureIds[0] ?? '');
  const [channel, setChannel] = useState('phone');
  const [name, setName] = useState('');

  async function create() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filterType, filterValue, channel, name })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Failed');
      setMsg(`Created "${j.campaign.name}" with ${j.campaign.members.length} members.`);
      setName('');
      start(() => router.refresh());
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const options =
    filterType === 'measure'
      ? measureIds.map((m) => ({ value: m, label: m }))
      : QUEUE_REASONS;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Build from">
        <select
          value={filterType}
          onChange={(e) => {
            const t = e.target.value as 'measure' | 'queue-reason';
            setFilterType(t);
            setFilterValue(t === 'measure' ? measureIds[0] ?? '' : QUEUE_REASONS[0].value);
          }}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="measure">Measure</option>
          <option value="queue-reason">Queue reason</option>
        </select>
      </Field>
      <Field label={filterType === 'measure' ? 'Measure' : 'Reason'}>
        <select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Channel">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="phone">Phone</option>
          <option value="sms">SMS</option>
          <option value="mail">Mail</option>
        </select>
      </Field>
      <Field label="Name (optional)">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Auto-named if blank"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm w-48"
        />
      </Field>
      <button
        onClick={create}
        disabled={busy || !filterValue}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create campaign'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
