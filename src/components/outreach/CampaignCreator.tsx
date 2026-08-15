'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Select } from '@/components/ui';

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
      start(() => router.push(`/outreach/campaigns/${encodeURIComponent(j.campaign.id)}`));
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
        <Select
          value={filterType}
          onChange={(e) => {
            const t = e.target.value as 'measure' | 'queue-reason';
            setFilterType(t);
            setFilterValue(t === 'measure' ? measureIds[0] ?? '' : QUEUE_REASONS[0].value);
          }}
          className="w-auto"
        >
          <option value="measure">Measure</option>
          <option value="queue-reason">Queue reason</option>
        </Select>
      </Field>
      <Field label={filterType === 'measure' ? 'Measure' : 'Reason'}>
        <Select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="w-auto">
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Channel">
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-auto">
          <option value="phone">Phone</option>
          <option value="sms">SMS</option>
          <option value="mail">Mail</option>
        </Select>
      </Field>
      <Field label="Name (optional)">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Auto-named if blank"
          className="w-48"
        />
      </Field>
      <Button onClick={create} disabled={busy || !filterValue}>
        {busy ? 'Creating…' : 'Create campaign'}
      </Button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}

