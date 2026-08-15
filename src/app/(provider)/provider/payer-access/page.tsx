import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { repos } from '@/lib/data/repository';
import { payerAccessConfig } from '@/lib/payer/access';
import { PayerAccessWizard } from '@/components/payer/PayerAccessWizard';
import { getPractice } from '@/lib/provider/practice';

export const dynamic = 'force-dynamic';

export default async function PayerAccessPage() {
  const [practice, grants] = await Promise.all([
    getPractice(),
    repos.payerAccess.list()
  ]);

  if (!practice) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Payer Access API onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">
          No providers yet. Run Seed from the{' '}
          <Link href="/" className="text-accent hover:underline">plan console</Link>.
        </p>
      </div>
    );
  }

  const existing = grants.find((g) => g.providerNpi === practice.npi) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-[#1F6FEB]/25 bg-[#1F6FEB]/5 px-4 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#1F6FEB]" aria-hidden />
        <p className="text-xs text-slate-700">
          <strong>Provider Access API · CMS-0057-F.</strong> The Interoperability and Prior
          Authorization final rule requires impacted payers to share claims, encounter, and USCDI
          clinical data with in-network providers via a FHIR API. This flow is the provider side of
          that exchange — the same rails your EHR connection uses, running the other direction.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Payer Access API onboarding</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Connect this practice to Fallon Health&apos;s <strong>Provider Access API</strong> to pull
          payer-held claims, encounters, and USCDI clinical data for your attributed patients.
          Attestation of a treatment relationship is required before credentials are issued.
          Endpoints and tokens here are illustrative.
        </p>
      </div>

      <PayerAccessWizard
        providers={[{ npi: practice.npi, organizationName: practice.organizationName }]}
        config={payerAccessConfig()}
        existing={existing}
      />

      {existing?.status === 'connected' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-ink">What Fallon Health shares with you</h2>
          <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
            <li>• Adjudicated claims & encounter history for attributed members</li>
            <li>• USCDI v3 clinical data the plan has aggregated from other sources</li>
            <li>• Open quality-gap flags with the specific missing data element</li>
            <li>• Attribution roster ({existing.attributedMemberCount} members) with last-visit dates</li>
          </ul>
        </div>
      )}
    </div>
  );
}
