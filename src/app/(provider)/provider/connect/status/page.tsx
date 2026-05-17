import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { Card, Pill } from '@/components/ui';
import { ResyncButton } from '@/components/ehr/ResyncButton';
import { ClinicalSyncButton } from '@/components/ehr/ClinicalSyncButton';

export const dynamic = 'force-dynamic';

interface SearchParams {
  npi?: string;
}

const STATUS_COLOR = {
  active: 'green',
  expired: 'amber',
  error: 'rose',
  'pending-setup': 'slate'
} as const;

export default async function ConnectionStatusPage({ searchParams }: { searchParams: SearchParams }) {
  const [providers, connections] = await Promise.all([
    repos.providers.list(),
    repos.ehrConnections.list()
  ]);
  if (providers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No providers in the directory yet. Run Seed from the{' '}
          <Link href="/" className="text-accent hover:underline">plan dashboard</Link>.
        </p>
      </Card>
    );
  }
  const selectedNpi = searchParams.npi ?? connections[0]?.providerNpi ?? providers[0].npi;
  const provider = providers.find((p) => p.npi === selectedNpi);
  if (!provider) {
    return <Card><p className="text-sm text-slate-600">Provider not found.</p></Card>;
  }
  const connection = connections.find((c) => c.providerNpi === selectedNpi);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Connection status</h1>
          <p className="text-sm text-slate-600 mt-1">
            {provider.organizationName} · NPI <span className="font-mono">{provider.npi}</span> ·{' '}
            {provider.ehrPlatform ?? 'unvalidated EHR'}
          </p>
        </div>
        <form action="/provider/connect/status" method="get" className="flex items-center gap-2">
          <select
            name="npi"
            defaultValue={provider.npi}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {providers.map((p) => (
              <option key={p.npi} value={p.npi}>
                {p.organizationName}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs">Switch</button>
        </form>
      </header>

      {!connection ? (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink">No connection yet</h2>
              <p className="mt-1 text-sm text-slate-600">
                This provider hasn\'t completed the EHR connection wizard.
              </p>
            </div>
            <Link
              href={`/provider/connect?npi=${provider.npi}`}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Start setup →
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <div className="text-xs text-slate-500">Status</div>
              <div className="mt-1">
                <Pill color={STATUS_COLOR[connection.connectionStatus]}>{connection.connectionStatus}</Pill>
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Connected since</div>
              <div className="mt-1 text-sm font-semibold">{fmt(connection.setupCompletedAt)}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Last successful sync</div>
              <div className="mt-1 text-sm font-semibold">{fmt(connection.lastSuccessfulSync)}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Records synced (total)</div>
              <div className="mt-1 text-2xl font-semibold">{connection.totalRecordsSynced.toLocaleString()}</div>
            </Card>
          </div>

          <Card>
            <h2 className="font-semibold text-ink mb-3">Connection detail</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <DetailRow label="EHR platform" value={connection.ehrPlatform} />
              <DetailRow label="Connection type" value={connection.connectionType} />
              <DetailRow label="Auth method" value={connection.authMethod} />
              <DetailRow label="FHIR base URL" value={<code className="font-mono text-xs">{connection.fhirBaseUrl}</code>} />
              <DetailRow label="Token endpoint" value={<code className="font-mono text-xs">{connection.tokenEndpoint}</code>} />
              <DetailRow label="Client ID" value={<code className="font-mono text-xs">{connection.clientId}</code>} />
              {connection.publicKeyId && <DetailRow label="JWK kid" value={<code className="font-mono text-xs">{connection.publicKeyId}</code>} />}
              <DetailRow label="Last token refresh" value={fmt(connection.lastTokenRefresh)} />
              <DetailRow label="Setup completed by" value={connection.setupCompletedBy ?? '—'} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink mb-3">Supported resources & scopes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Resources</div>
                <div className="flex flex-wrap gap-1">
                  {connection.supportedResources.map((r) => (
                    <Pill key={r} color="sky">{r}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Scopes granted</div>
                <ul className="text-xs font-mono text-slate-700 space-y-0.5">
                  {connection.scopesGranted.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink">ECDS clinical-data pull</h2>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Fetches the FHIR Observations, Conditions, MedicationRequests, and DocumentReferences
              this practice surfaces for its attributed members, then re-runs the ECDS engine and
              reports the gaps closed.
            </p>
            <ClinicalSyncButton npi={provider.npi} />
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink">Re-sync data</h2>
                <p className="text-xs text-slate-500 mt-1">Pulls all configured resources from the EHR. Tokens refresh automatically.</p>
              </div>
              <ResyncButton npi={provider.npi} />
            </div>
          </Card>

          {connection.connectionStatus !== 'active' && (
            <Card className="border-amber-300 bg-amber-50">
              <h2 className="font-semibold text-amber-800">Troubleshooting</h2>
              <p className="mt-1 text-sm text-amber-700">
                {connection.connectionStatus === 'expired'
                  ? 'Your connection token expired. Click "Re-sync now" to re-authenticate.'
                  : connection.connectionStatus === 'error'
                    ? `Last sync failed: ${connection.lastErrorMessage ?? 'unknown error'}. Re-sync to retry; if it still fails, restart the connection wizard.`
                    : 'Setup is not yet complete. Finish the connection wizard.'}
              </p>
              <Link
                href={`/provider/connect?npi=${provider.npi}`}
                className="mt-3 inline-flex rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white"
              >
                Restart wizard →
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
