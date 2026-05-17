'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PayerAccessGrant } from '@/lib/data/types';

interface ProviderOpt {
  npi: string;
  organizationName: string;
}

export function PayerAccessWizard({
  providers,
  config,
  existing
}: {
  providers: ProviderOpt[];
  config: { payerFhirBaseUrl: string; tokenEndpoint: string; scopes: string[] };
  existing: PayerAccessGrant | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [npi, setNpi] = useState(existing?.providerNpi ?? providers[0]?.npi ?? '');
  const [tin, setTin] = useState(existing?.tin ?? '');
  const [treat, setTreat] = useState(existing?.attestedTreatmentRelationship ?? false);
  const [minNec, setMinNec] = useState(existing?.attestedMinimumNecessary ?? false);
  const [busy, setBusy] = useState<'register' | 'test' | null>(null);
  const [grant, setGrant] = useState<PayerAccessGrant | null>(existing);
  const [err, setErr] = useState<string | null>(null);

  async function call(action: 'register' | 'test') {
    setBusy(action);
    setErr(null);
    try {
      const r = await fetch('/api/payer-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          providerNpi: npi,
          tin,
          attestedTreatmentRelationship: treat,
          attestedMinimumNecessary: minNec
        })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'Failed');
      setGrant(j.grant);
      start(() => router.refresh());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const step = grant?.status === 'connected' ? 3 : grant?.status === 'attested' ? 2 : 1;

  return (
    <div className="space-y-5">
      <Stepper step={step} />

      <Card title="1 · Identify the practice">
        <div className="flex flex-wrap gap-4">
          <Field label="Provider organization">
            <select
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {providers.map((p) => (
                <option key={p.npi} value={p.npi}>{p.organizationName}</option>
              ))}
            </select>
          </Field>
          <Field label="NPI">
            <input value={npi} readOnly className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-sm" />
          </Field>
          <Field label="Group TIN">
            <input
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="XX-XXXXXXX"
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
      </Card>

      <Card title="2 · Attestations (CMS-0057-F)">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={treat} onChange={(e) => setTreat(e.target.checked)} className="mt-0.5" />
          <span>
            I attest there is a <strong>current treatment relationship</strong> between this provider
            and the members whose data will be accessed.
          </span>
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={minNec} onChange={(e) => setMinNec(e.target.checked)} className="mt-0.5" />
          <span>
            I attest data access will follow the <strong>minimum-necessary</strong> standard and be
            used only for treatment, care coordination, and quality.
          </span>
        </label>
        <button
          onClick={() => call('register')}
          disabled={busy !== null || !treat || !minNec || !tin.trim()}
          className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === 'register' ? 'Registering…' : 'Attest & register app'}
        </button>
      </Card>

      <Card title="3 · Connection">
        {grant ? (
          <dl className="grid grid-cols-1 gap-y-1.5 text-sm md:grid-cols-2">
            <Row k="Status" v={<StatusPill s={grant.status} />} />
            <Row k="Client ID" v={<code className="font-mono text-xs">{grant.clientId}</code>} />
            <Row k="Payer FHIR base" v={<code className="font-mono text-xs">{grant.payerFhirBaseUrl}</code>} />
            <Row k="Token endpoint" v={<code className="font-mono text-xs">{grant.tokenEndpoint}</code>} />
            <Row k="Attributed panel" v={`${grant.attributedMemberCount} members`} />
            <Row k="Last pull" v={grant.lastPullAt ? new Date(grant.lastPullAt).toLocaleString() : '—'} />
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Complete attestation to register and reveal credentials.</p>
        )}
        <button
          onClick={() => call('test')}
          disabled={busy !== null || !grant || grant.status === 'pending'}
          className="mt-4 rounded border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy === 'test' ? 'Connecting…' : 'Test connection & resolve attributed panel'}
        </button>
        {grant?.status === 'connected' && (
          <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Connected. The payer returned {grant.attributedMemberCount} attributed members this
            provider may pull claims and clinical data for.
          </p>
        )}
        <div className="mt-3 text-xs text-slate-500">
          Scopes requested: {config.scopes.join(', ')}
        </div>
      </Card>

      {err && <p className="text-sm text-rose-600">Error: {err}</p>}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ['Identify', 'Attest', 'Connected'];
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full ${
              i + 1 <= step ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {i + 1}
          </span>
          <span className={i + 1 <= step ? 'font-medium text-ink' : 'text-slate-500'}>{l}</span>
          {i < labels.length - 1 && <span className="mx-1 text-slate-300">→</span>}
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-3 font-semibold text-ink">{title}</h3>
      {children}
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    connected: 'bg-emerald-100 text-emerald-700',
    attested: 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-600',
    error: 'bg-rose-100 text-rose-700'
  };
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${map[s] ?? map.pending}`}>{s}</span>;
}
