import Link from 'next/link';
import { getSnapshot } from '@/lib/data/snapshot';
import { ConnectionWizard } from '@/components/ehr/ConnectionWizard';
import { ConnectionStatusView } from '@/components/ehr/ConnectionStatusView';
import { athenaWizardProps, epicWizardProps, genericSmartWizardProps } from '@/components/ehr/brands';
import { pickConnectionType } from '@/lib/ehr/connect';
import { getPractice } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

// Stateful connection page: the setup wizard until a connection exists, the
// status + clinical-sync view once one does. `?restart=1` forces the wizard.
export default async function ConnectPage({
  searchParams
}: {
  searchParams: { restart?: string };
}) {
  const provider = await getPractice();
  if (!provider) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">EHR connection</h1>
        <p className="mt-2 text-sm text-slate-600">
          No providers in the directory yet. Go to the{' '}
          <Link href="/" className="text-accent hover:underline">plan console</Link> and run Seed.
        </p>
      </div>
    );
  }

  const { ehrConnections } = await getSnapshot();
  const connection = ehrConnections.find((c) => c.providerNpi === provider.npi);
  const showStatus = connection && searchParams.restart !== '1';

  if (showStatus) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-ink">EHR connection</h1>
          <p className="mt-1 text-sm text-slate-600">
            {provider.organizationName} · NPI <span className="font-mono">{provider.npi}</span> ·{' '}
            {provider.ehrPlatform ?? 'unvalidated EHR'}
          </p>
        </header>
        <ConnectionStatusView provider={provider} connection={connection} />
      </div>
    );
  }

  const connectionType = pickConnectionType(provider.ehrPlatform);
  const wizardProps =
    connectionType === 'epic-backend'
      ? epicWizardProps({ providerNpi: provider.npi, defaultFhirBaseUrl: provider.fhirEndpointUrl ?? '' })
    : connectionType === 'athena-fhir'
      ? athenaWizardProps({ providerNpi: provider.npi, defaultFhirBaseUrl: provider.fhirEndpointUrl ?? '' })
      : genericSmartWizardProps({
          providerNpi: provider.npi,
          ehrPlatform: provider.ehrPlatform ?? 'Unknown',
          defaultFhirBaseUrl: provider.fhirEndpointUrl ?? ''
        });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink">EHR connection setup</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Auto-detected from the provider directory. The flow below is tailored to your EHR platform —
          you don&apos;t need to figure out the right protocol; the portal walks you through registration,
          endpoint validation against the CapabilityStatement, and a real test query.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <span className="font-medium text-ink">{provider.organizationName}</span>
        <span className="text-slate-500">
          {provider.ehrPlatform ?? 'unvalidated EHR'} · NPI{' '}
          <span className="font-mono">{provider.npi}</span>
        </span>
        <span className="ml-auto text-xs text-slate-500">
          Attributed members: <span className="font-semibold">{provider.memberCount}</span>
        </span>
      </div>

      <ConnectionWizard {...wizardProps} />
    </div>
  );
}
