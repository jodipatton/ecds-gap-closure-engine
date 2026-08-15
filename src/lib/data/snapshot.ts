// Request-scoped snapshot of the whole store, memoized with React.cache().
//
// Every read surface (pages, agent tools, roster/contract/risk math) fans out
// over the same collections; before this existed a single dashboard render
// issued ~56 full collection reads. `getSnapshot()` loads everything exactly
// once per request and pre-builds the by-member/by-npi indexes everyone needs.
//
// Write paths (seed, engine run, EHR sync) do NOT read through the snapshot —
// they load via `repos` directly so they always see current state.

import * as React from 'react';
import { repos, readSeedSummary } from './repository';

// React.cache exists only in the react-server build (what Next uses for
// server components). Under vitest/tsx there is no request scope to memoize
// against, so fall back to calling through uncached.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: <T extends (...args: any[]) => any>(fn: T) => T =
  (React as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn);
import { groupBy, keyBy } from '@/lib/shared/collections';
import { planRiskSummary } from '@/lib/risk/raf';
import type {
  AuditEvent,
  Campaign,
  Claim,
  Condition,
  DocumentReference,
  EhrConnection,
  EngagementQueueEntry,
  HedisResult,
  MeasureGap,
  Member,
  MemberAttribution,
  MedicationRequest,
  Observation,
  PayerAccessGrant,
  ProviderOrg,
  SeedSummary,
  ValueContract
} from './types';

export interface Snapshot {
  summary: SeedSummary | null;
  measurementYear: number;
  members: Member[];
  claims: Claim[];
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  documents: DocumentReference[];
  providers: ProviderOrg[];
  attribution: MemberAttribution[];
  results: HedisResult[];
  gaps: MeasureGap[];
  engagement: EngagementQueueEntry[];
  campaigns: Campaign[];
  contracts: ValueContract[];
  auditEvents: AuditEvent[];
  payerAccess: PayerAccessGrant[];
  ehrConnections: EhrConnection[];
  // Pre-built indexes
  memberById: Map<string, Member>;
  providerByNpi: Map<string, ProviderOrg>;
  attributionByMember: Map<string, MemberAttribution>;
  claimsByMember: Map<string, Claim[]>;
  conditionsByMember: Map<string, Condition[]>;
  openGapsByMember: Map<string, MeasureGap[]>;
}

export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const [
    summary,
    members,
    claims,
    observations,
    conditions,
    medications,
    documents,
    providers,
    attribution,
    results,
    gaps,
    engagement,
    campaigns,
    contracts,
    auditEvents,
    payerAccess,
    ehrConnections
  ] = await Promise.all([
    readSeedSummary(),
    repos.members.list(),
    repos.claims.list(),
    repos.observations.list(),
    repos.conditions.list(),
    repos.medications.list(),
    repos.documents.list(),
    repos.providers.list(),
    repos.attribution.list(),
    repos.hedisResults.list(),
    repos.gaps.list(),
    repos.engagement.list(),
    repos.campaigns.list(),
    repos.contracts.list(),
    repos.auditEvents.list(),
    repos.payerAccess.list(),
    repos.ehrConnections.list()
  ]);

  return {
    summary,
    measurementYear: summary?.measurementYear ?? new Date().getFullYear(),
    members,
    claims,
    observations,
    conditions,
    medications,
    documents,
    providers,
    attribution,
    results,
    gaps,
    engagement,
    campaigns,
    contracts,
    auditEvents,
    payerAccess,
    ehrConnections,
    memberById: keyBy(members, (m) => m.id),
    providerByNpi: keyBy(providers, (p) => p.npi),
    attributionByMember: keyBy(attribution, (a) => a.memberId),
    claimsByMember: groupBy(claims, (c) => c.memberId),
    conditionsByMember: groupBy(conditions, (c) => c.memberId),
    openGapsByMember: groupBy(
      gaps.filter((g) => g.status.startsWith('open-')),
      (g) => g.memberId
    )
  };
});

/** Plan-wide RAF/risk summary, computed at most once per request. */
export const getRisk = cache(async () => {
  const snap = await getSnapshot();
  return planRiskSummary(snap.members, snap.conditions, snap.claims, snap.measurementYear);
});
