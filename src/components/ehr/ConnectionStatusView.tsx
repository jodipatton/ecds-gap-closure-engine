import Link from 'next/link';
import { Card, Pill } from '@/components/ui';
import { ResyncButton } from '@/components/ehr/ResyncButton';
import { ClinicalSyncButton } from '@/components/ehr/ClinicalSyncButton';
import type { EhrConnection, ProviderOrg } from '@/lib/data/types';

const STATUS_COLOR = {
  active: 'green',
  expired: 'amber',
  error: 'rose',
  'pending-setup': 'slate'
} as const;

// Connected-state view of /provider/connect: status tiles, connection detail,
// and the clinical-sync flow (the demo's hero moment lives here).
export function ConnectionStatusView({
  provider,
  connection
}: {
  provider: ProviderOrg;
  connection: EhrConnection;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
        <h2 className="mb-3 font-semibold text-ink">ECDS clinical-data pull</h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Fetches the FHIR Observations, Conditions, MedicationRequests, and DocumentReferences this
          practice surfaces for its attributed members, then re-runs the ECDS engine and reports the
          gaps closed.
        </p>
        <ClinicalSyncButton npi={provider.npi} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Connection detail</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          <DetailRow label="EHR platform" value={connection.ehrPlatform} />
          <DetailRow label="Connection type" value={connection.connectionType} />
          <DetailRow label="Auth method" value={connection.authMethod} />
          <DetailRow label="FHIR base URL" value={<code className="font-mono text-xs">{connection.fhirBaseUrl}</code>} />
          <DetailRow label="Token endpoint" value={<code className="font-mono text-xs">{connection.tokenEndpoint}</code>} />
          <DetailRow label="Client ID" value={<code className="font-mono text-xs">{connection.clientId}</code>} />
          {connection.publicKeyId && (
            <DetailRow label="JWK kid" value={<code className="font-mono text-xs">{connection.publicKeyId}</code>} />
          )}
          <DetailRow label="Last token refresh" value={fmt(connection.lastTokenRefresh)} />
          <DetailRow label="Setup completed by" value={connection.setupCompletedBy ?? '—'} />
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Supported resources & scopes</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Resources</div>
            <div className="flex flex-wrap gap-1">
              {connection.supportedResources.map((r) => (
                <Pill key={r} color="sky">{r}</Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Scopes granted</div>
            <ul className="space-y-0.5 font-mono text-xs text-slate-700">
              {connection.scopesGranted.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Re-sync data</h2>
            <p className="mt-1 text-xs text-slate-500">
              Pulls all configured resources from the EHR. Tokens refresh automatically.
            </p>
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
            href={`/provider/connect?restart=1`}
            className="mt-3 inline-flex rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            Restart wizard →
          </Link>
        </Card>
      )}
    </>
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
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
