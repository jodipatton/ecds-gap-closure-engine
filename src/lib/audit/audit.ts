// Clinical-data provenance + Primary Source Verification (PSV) audit trail.
//
// Every acquisition of clinical data (EHR sync, Provider Access API pull) is
// logged with its source, the attributed provider, resource counts, and a PSV
// determination: was the data pulled from a validated, attributed primary
// source, or an unverified one. The payer dashboard surfaces this for audit.

import { repos } from '@/lib/data/repository';
import type { AuditEvent, AuditSource } from '@/lib/data/types';

export interface RecordAuditInput {
  source: AuditSource;
  sourceSystem: string;
  providerNpi: string | null;
  organizationName: string | null;
  resourceCounts: Record<string, number>;
  recordsAccepted: number;
  recordsRejected?: number;
  psvStatus: 'verified' | 'unverified';
  psvBasis: string;
  initiatedBy?: string;
}

export async function recordAudit(input: RecordAuditInput): Promise<AuditEvent> {
  const ev: AuditEvent = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    ts: new Date().toISOString(),
    source: input.source,
    sourceSystem: input.sourceSystem,
    providerNpi: input.providerNpi,
    organizationName: input.organizationName,
    resourceCounts: input.resourceCounts,
    recordsAccepted: input.recordsAccepted,
    recordsRejected: input.recordsRejected ?? 0,
    psvStatus: input.psvStatus,
    psvBasis: input.psvBasis,
    initiatedBy: input.initiatedBy ?? 'system'
  };
  const all = await repos.auditEvents.list();
  await repos.auditEvents.put([ev, ...all].slice(0, 500));
  return ev;
}

// PSV determination: a source is "verified" when the provider has a validated
// FHIR endpoint in the directory (CHPL/Lantern attested) — i.e. a known
// primary source for an attributed panel.
export function psvFor(provider: { fhirEndpointUrl: string | null; ehrSource?: string } | undefined) {
  if (provider?.fhirEndpointUrl) {
    return {
      psvStatus: 'verified' as const,
      psvBasis: `Validated FHIR endpoint (${provider.ehrSource ?? 'directory'})`
    };
  }
  return {
    psvStatus: 'unverified' as const,
    psvBasis: 'No validated endpoint on file for source organization'
  };
}

// Seed a short illustrative history so the trail isn't empty before any live
// sync. Derived deterministically from providers that have endpoints.
export async function ensureSeedAudit(): Promise<void> {
  const existing = await repos.auditEvents.list();
  if (existing.length > 0) return;
  const providers = await repos.providers.list();
  if (providers.length === 0) return;

  const withEndpoint = providers.filter((p) => p.fhirEndpointUrl).slice(0, 4);
  const events: AuditEvent[] = [];
  let t = Date.now() - 1000 * 60 * 60 * 24 * 6;
  for (const p of withEndpoint) {
    const psv = psvFor(p);
    const obs = 3 + (parseInt(p.npi.slice(-2), 10) % 7);
    const cond = 1 + (parseInt(p.npi.slice(-1), 10) % 4);
    events.push({
      id: `AUD-SEED-${p.npi}`,
      ts: new Date(t).toISOString(),
      source: 'ehr-sync',
      sourceSystem: `${p.ehrPlatform ?? 'SMART'} FHIR R4`,
      providerNpi: p.npi,
      organizationName: p.organizationName,
      resourceCounts: { Observation: obs, Condition: cond, MedicationRequest: 2 },
      recordsAccepted: obs + cond + 2,
      recordsRejected: parseInt(p.npi.slice(-1), 10) % 2,
      psvStatus: psv.psvStatus,
      psvBasis: psv.psvBasis,
      initiatedBy: 'scheduled job'
    });
    t += 1000 * 60 * 60 * 20;
  }
  if (events.length) await repos.auditEvents.put(events);
}

export async function listAudit(): Promise<AuditEvent[]> {
  const all = await repos.auditEvents.list();
  return [...all].sort((a, b) => b.ts.localeCompare(a.ts));
}
