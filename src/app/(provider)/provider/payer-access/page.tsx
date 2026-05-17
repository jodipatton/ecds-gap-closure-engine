import Link from 'next/link';
import { repos } from '@/lib/data/repository';
import { payerAccessConfig } from '@/lib/payer/access';
import { PayerAccessWizard } from '@/components/payer/PayerAccessWizard';

export const dynamic = 'force-dynamic';

interface SearchParams {
  npi?: string;
}

export default async function PayerAccessPage({ searchParams }: { searchParams: SearchParams }) {
  const [providers, grants] = await Promise.all([
    repos.providers.list(),
    repos.payerAccess.list()
  ]);

  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Payer Access API onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">
          No providers yet. Run Seed from the{' '}
          <Link href="/" className="text-accent hover:underline">plan dashboard</Link>.
        </p>
      </div>
    );
  }

  const selectedNpi = searchParams.npi ?? grants[0]?.providerNpi ?? providers[0].npi;
  const existing = grants.find((g) => g.providerNpi === selectedNpi) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Payer Access API onboarding</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Connect this practice to the health plan&apos;s <strong>Provider Access API</strong>{' '}
          (CMS-0057-F) to pull payer-held claims, encounters, and USCDI clinical data for your
          attributed patients. Attestation of a treatment relationship is required before
          credentials are issued. Endpoints and tokens here are illustrative.
        </p>
      </div>

      <PayerAccessWizard
        providers={providers.map((p) => ({ npi: p.npi, organizationName: p.organizationName }))}
        config={payerAccessConfig()}
        existing={existing}
      />
    </div>
  );
}
