'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardHeader, Field, Input, Select, Stepper } from '@/components/ui';
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
      <Stepper steps={[{ label: 'Identify' }, { label: 'Attest' }, { label: 'Connected' }]} current={grant?.status === 'connected' ? 3 : step - 1} />

      <Card>
        <CardHeader title="1 · Identify the practice" />
        <div className="flex flex-wrap gap-4">
          <Field label="Provider organization">
            <Select value={npi} onChange={(e) => setNpi(e.target.value)} className="w-auto">
              {providers.map((p) => (
                <option key={p.npi} value={p.npi}>{p.organizationName}</option>
              ))}
            </Select>
          </Field>
          <Field label="NPI">
            <Input value={npi} readOnly className="w-auto bg-slate-50 font-mono" />
          </Field>
          <Field label="Group TIN">
            <Input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="XX-XXXXXXX" className="w-auto" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="2 · Attestations (CMS-0057-F)" />
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
        <Button
          onClick={() => call('register')}
          disabled={busy !== null || !treat || !minNec || !tin.trim()}
          className="mt-4"
        >
          {busy === 'register' ? 'Registering…' : 'Attest & register app'}
        </Button>
      </Card>

      <Card>
        <CardHeader title="3 · Connection" />
        {grant ? (
          <dl className="grid grid-cols-1 gap-y-1.5 text-sm md:grid-cols-2">
            <Row k="Status" v={<Badge color={grant.status === 'connected' ? 'green' : grant.status === 'attested' ? 'amber' : grant.status === 'error' ? 'rose' : 'slate'}>{grant.status}</Badge>} />
            <Row k="Client ID" v={<code className="font-mono text-xs">{grant.clientId}</code>} />
            <Row k="Payer FHIR base" v={<code className="font-mono text-xs">{grant.payerFhirBaseUrl}</code>} />
            <Row k="Token endpoint" v={<code className="font-mono text-xs">{grant.tokenEndpoint}</code>} />
            <Row k="Attributed panel" v={`${grant.attributedMemberCount} members`} />
            <Row k="Last pull" v={grant.lastPullAt ? new Date(grant.lastPullAt).toLocaleString() : '—'} />
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Complete attestation to register and reveal credentials.</p>
        )}
        <Button
          variant="secondary"
          onClick={() => call('test')}
          disabled={busy !== null || !grant || grant.status === 'pending'}
          className="mt-4"
        >
          {busy === 'test' ? 'Connecting…' : 'Test connection & resolve attributed panel'}
        </Button>
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




function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

