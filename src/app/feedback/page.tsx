'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';

const ROLES = [
  'Quality / HEDIS',
  'Risk adjustment',
  'Care management',
  'Provider network / VBC',
  'IT / interoperability',
  'Executive / strategy',
  'Provider / clinician',
  'Other'
];

export default function FeedbackPage() {
  const [page, setPage] = useState('/');
  const [pageTitle, setPageTitle] = useState('this page');
  const [role, setRole] = useState(ROLES[0]);
  const [valuable, setValuable] = useState<'yes' | 'somewhat' | 'not-yet' | 'unsure'>('yes');
  const [rating, setRating] = useState(4);
  const [whoWouldUse, setWho] = useState('');
  const [improvements, setImpr] = useState('');
  const [wouldChampion, setChampion] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('page')) setPage(sp.get('page')!);
    if (sp.get('title')) setPageTitle(sp.get('title')!);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          page,
          pageTitle,
          role,
          valuable,
          rating,
          whoWouldUse,
          improvements,
          wouldChampion,
          email
        })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Failed');
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-ink">Thank you 🙌</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your feedback on <span className="font-medium">{pageTitle}</span> was recorded. It helps
          shape what we build before launch.
        </p>
        <Link
          href={page}
          className="mt-4 inline-flex rounded bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          ← Back to {pageTitle}
        </Link>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Share feedback</h1>
        <p className="mt-1 text-sm text-slate-600">
          About: <span className="font-medium">{pageTitle}</span>{' '}
          <span className="text-slate-400">({page})</span>. This is a pre-launch preview — your
          input directly steers the roadmap.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Card className="space-y-4">
          <Field label="Your role / team">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Would this page be valuable to your organization?">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['yes', 'Yes — clearly'],
                  ['somewhat', 'Somewhat'],
                  ['not-yet', 'Not yet'],
                  ['unsure', 'Unsure']
                ] as const
              ).map(([v, label]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setValuable(v)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    valuable === v
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Overall, how compelling is this? (1–5)">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  className={`h-9 w-9 rounded-full border text-sm ${
                    rating >= n
                      ? 'border-accent bg-accent text-white'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Who at your organization would use this page?">
            <textarea
              value={whoWouldUse}
              onChange={(e) => setWho(e.target.value)}
              rows={2}
              placeholder="e.g. quality directors, RAF/coding team, care coordinators…"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="What improvements would you like to see?">
            <textarea
              value={improvements}
              onChange={(e) => setImpr(e.target.value)}
              rows={4}
              placeholder="Missing data, workflow, integrations, anything…"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wouldChampion}
              onChange={(e) => setChampion(e.target.checked)}
            />
            I&apos;d be willing to champion piloting this internally.
          </label>

          <Field label="Email (optional, for follow-up)">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@org.com"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>

          {err && <p className="text-sm text-rose-600">Error: {err}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit feedback'}
            </button>
            <Link href={page} className="text-sm text-slate-500 hover:underline">
              Cancel
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
