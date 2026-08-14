'use client';

import { useState } from 'react';

export interface DocLink {
  label: string;
  href: string;
}

export interface BrandStep {
  title: string;
  body: React.ReactNode;
  /** Optional external link rendered as a primary button. */
  externalLink?: DocLink;
  /** Optional inline input fields rendered inside the step body. */
  fields?: Array<{
    name: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'url' | 'password';
    defaultValue?: string;
    helper?: string;
  }>;
}

export interface WizardProps {
  providerNpi: string;
  brandName: string;          // e.g. "Epic"
  brandHeadline: string;      // "We detected your practice runs Epic. Connect in 3 steps."
  brandAccentClass: string;   // tailwind classes for the brand-colored ribbon, e.g. "bg-red-50 border-red-200"
  brandBadgeClass: string;    // tailwind classes for the brand chip, e.g. "bg-red-100 text-red-700"
  authMethodLabel: string;    // "SMART Backend Services (client_credentials JWT)"
  scopes: string[];
  steps: BrandStep[];         // 3 steps
  docs: DocLink[];
  defaultFhirBaseUrl?: string;
}

export function ConnectionWizard(props: WizardProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { fhirBaseUrl: props.defaultFhirBaseUrl ?? '' };
    for (const s of props.steps) {
      for (const f of s.fields ?? []) {
        if (f.defaultValue) init[f.name] = f.defaultValue;
      }
    }
    return init;
  });
  const [stepState, setStepState] = useState<Array<'pending' | 'running' | 'done' | 'error'>>(
    () => props.steps.map(() => 'pending')
  );
  const [validateResult, setValidateResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setCompleting] = useState(false);

  function update(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function markStep1Done() {
    setStepState((s) => { const n = [...s]; n[0] = 'done'; return n; });
  }

  async function runValidate() {
    setError(null);
    setStepState((s) => { const n = [...s]; n[1] = 'running'; return n; });
    try {
      const resp = await fetch('/api/ehr-connect/validate-endpoint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fhirBaseUrl: values.fhirBaseUrl })
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok) throw new Error(j.error ?? 'Validate failed');
      setValidateResult(j);
      setStepState((s) => { const n = [...s]; n[1] = 'done'; return n; });
    } catch (err: any) {
      setError(err.message);
      setStepState((s) => { const n = [...s]; n[1] = 'error'; return n; });
    }
  }

  async function runTestConnection() {
    setError(null);
    setCompleting(true);
    setStepState((s) => { const n = [...s]; n[2] = 'running'; return n; });
    try {
      const resp = await fetch('/api/ehr-connect/test-connection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerNpi: props.providerNpi,
          fhirBaseUrl: values.fhirBaseUrl,
          clientId: values.clientId || `demo-${props.providerNpi}`,
          supportedResources: validateResult?.supportedResources ?? [],
          completedBy: 'demo-portal-user'
        })
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok) throw new Error(j.error ?? 'Connection test failed');
      setTestResult(j);
      setStepState((s) => { const n = [...s]; n[2] = 'done'; return n; });
    } catch (err: any) {
      setError(err.message);
      setStepState((s) => { const n = [...s]; n[2] = 'error'; return n; });
    } finally {
      setCompleting(false);
    }
  }

  const allDone = stepState.every((s) => s === 'done');

  return (
    <div className="space-y-5">
      <div className={`rounded-lg border p-5 ${props.brandAccentClass}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${props.brandBadgeClass}`}>{props.brandName}</span>
              <span className="text-xs text-slate-500">{props.authMethodLabel}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-ink">{props.brandHeadline}</h2>
          </div>
          {allDone && <span className="text-good text-sm font-semibold">✓ Connected</span>}
        </div>
      </div>

      <ol className="space-y-4">
        {props.steps.map((step, idx) => {
          const state = stepState[idx];
          const number = idx + 1;
          return (
            <li key={idx} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <StepNumber n={number} state={state} />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="font-medium text-ink">{step.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{step.body}</div>
                  </div>
                  {step.fields && step.fields.length > 0 && (
                    <div className="space-y-2">
                      {step.fields.map((f) => (
                        <div key={f.name}>
                          <label className="text-xs font-medium text-slate-600">{f.label}</label>
                          <input
                            type={f.type ?? 'text'}
                            placeholder={f.placeholder}
                            value={values[f.name] ?? ''}
                            onChange={(e) => update(f.name, e.target.value)}
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
                          />
                          {f.helper && <div className="mt-1 text-xs text-slate-500">{f.helper}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {step.externalLink && (
                    <a
                      href={step.externalLink.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      {step.externalLink.label} ↗
                    </a>
                  )}
                  <StepActions
                    state={state}
                    onComplete={
                      idx === 0 ? markStep1Done :
                      idx === 1 ? runValidate :
                      runTestConnection
                    }
                    canRun={
                      idx === 0 ? true :
                      idx === 1 ? Boolean(values.fhirBaseUrl) :
                      stepState[1] === 'done'
                    }
                    label={
                      idx === 0 ? 'Mark step complete' :
                      idx === 1 ? 'Validate endpoint' :
                      'Test connection'
                    }
                  />
                  {idx === 1 && validateResult && <ValidateResultPanel result={validateResult} />}
                  {idx === 2 && testResult && <TestResultPanel result={testResult} />}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="font-medium text-ink">Scopes that will be requested</div>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs font-mono text-slate-700">
          {props.scopes.map((s) => <li key={s}>• {s}</li>)}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="font-medium text-ink">Reference documentation</div>
        <ul className="mt-2 space-y-1 text-sm">
          {props.docs.map((d) => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
                {d.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {allDone && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="font-semibold text-emerald-800">Connection established.</div>
          <p className="mt-1 text-sm text-emerald-700">
            Heading to the connection status dashboard…
          </p>
          <a href={`/provider/connect/status?npi=${props.providerNpi}`} className="mt-3 inline-flex rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
            View connection status
          </a>
        </div>
      )}
    </div>
  );
}

function StepNumber({ n, state }: { n: number; state: 'pending' | 'running' | 'done' | 'error' }) {
  const cls =
    state === 'done' ? 'bg-emerald-500 text-white' :
    state === 'running' ? 'bg-accent text-white animate-pulse' :
    state === 'error' ? 'bg-rose-500 text-white' :
    'bg-slate-200 text-slate-600';
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${cls}`}>
      {state === 'done' ? '✓' : state === 'error' ? '!' : n}
    </div>
  );
}

function StepActions({ state, onComplete, canRun, label }: {
  state: 'pending' | 'running' | 'done' | 'error';
  onComplete: () => void;
  canRun: boolean;
  label: string;
}) {
  if (state === 'done') return <div className="text-xs text-emerald-700 font-medium">Step complete</div>;
  return (
    <button
      onClick={onComplete}
      disabled={!canRun || state === 'running'}
      className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
    >
      {state === 'running' ? 'Working…' : label}
    </button>
  );
}

function ValidateResultPanel({ result }: { result: any }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${result.mode === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {result.mode === 'live' ? 'Live response' : 'Simulated response'}
        </span>
        <span className="text-slate-600">FHIR {result.fhirVersion}</span>
        {result.publisher && <span className="text-slate-600">· {result.publisher}</span>}
      </div>
      {result.note && <p className="mt-2 text-slate-600">{result.note}</p>}
      <div className="mt-2">
        <div className="text-slate-500">Supported resources ({result.supportedResources?.length ?? 0}):</div>
        <div className="mt-1 font-mono text-slate-700">{(result.supportedResources ?? []).join(', ')}</div>
      </div>
    </div>
  );
}

function TestResultPanel({ result }: { result: any }) {
  return (
    <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
      <div className="font-semibold text-emerald-800">Authentication + test Patient pull succeeded</div>
      {result.note && <p className="mt-1 text-emerald-700">{result.note}</p>}
      <pre className="mt-2 max-h-32 overflow-auto bg-white p-2 rounded border border-emerald-100">{JSON.stringify(result.testPatient, null, 2)}</pre>
    </div>
  );
}
