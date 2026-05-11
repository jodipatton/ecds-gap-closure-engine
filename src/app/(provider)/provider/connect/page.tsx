import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { ConnectionWizard } from '@/components/ehr/ConnectionWizard';
import { athenaWizardProps, epicWizardProps, genericSmartWizardProps } from '@/components/ehr/brands';
import { pickConnectionType } from '@/lib/ehr/connect';

export const dynamic = 'force-dynamic';

interface SearchParams {
  npi?: string;
}

export default async function ConnectPage({ searchParams }: { searchParams: SearchParams }) {
  const providers = await repos.providers.list();
  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">EHR connection setup</h1>
        <p className="mt-2 text-sm text-slate-600">
          No providers in the directory yet. Go to the{' '}
          <Link href="/" className="text-accent hover:underline">plan dashboard</Link> and run Seed.
        </p>
      </div>
    );
  }
  const selectedNpi = searchParams.npi ?? providers[0].npi;
  const provider = providers.find((p) => p.npi === selectedNpi) ?? providers[0];

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
        <p className="text-sm text-slate-600 max-w-3xl">
          Auto-detected from the provider directory. The flow below is tailored to your EHR platform —
          you don\'t need to figure out the right protocol; the portal walks you through registration,
          endpoint validation against the CapabilityStatement, and a real test query.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo: switch provider</span>
        <form action="/provider/connect" method="get" className="flex items-center gap-2">
          <select
            name="npi"
            defaultValue={provider.npi}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {providers.map((p) => (
              <option key={p.npi} value={p.npi}>
                {p.organizationName} — {p.ehrPlatform ?? 'unvalidated'}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs">Switch</button>
        </form>
        <div className="ml-auto text-xs text-slate-500">
          NPI <span className="font-mono">{provider.npi}</span> · attributed members:{' '}
          <span className="font-semibold">{provider.memberCount}</span>
        </div>
      </div>

      <ConnectionWizard {...wizardProps} />
    </div>
  );
}
