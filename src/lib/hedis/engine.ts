// Three-pass ECDS engine.
//   Pass 1 — Claims Analysis: identify eligible population, mark members
//            satisfied by claims-only logic.
//   Pass 2 — Clinical Data Analysis: for remaining open gaps, check
//            FHIR-shaped clinical data (Observations, Conditions,
//            MedicationRequests, DocumentReferences) and either close the
//            gap or record the missing data element.
//   Pass 3 — Roster Generation: for every still-open gap, route the member
//            to the engagement queue with a provider recommendation, OR
//            tag them for clinical-data acquisition based on their attributed
//            provider's EHR platform.
//
// `computeResults` is pure (fully unit-testable); `runEngine` is the thin
// load-compute-persist wrapper the API routes and CLI call.

import type {
  Claim,
  Condition,
  DocumentReference,
  EngagementQueueEntry,
  HedisResult,
  MeasureContext,
  MeasureGap,
  MeasureSpec,
  MedicationRequest,
  Member,
  MemberAttribution,
  Observation,
  ProviderOrg
} from '@/lib/data/types';
import { repos, readSeedSummary } from '@/lib/data/repository';
import { groupBy, keyBy } from '@/lib/shared/collections';
import { MEASURES } from './measures';

export interface EngineInput {
  measurementYear: number;
  ranAt: string;
  members: Member[];
  claims: Claim[];
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  documents: DocumentReference[];
  providers: ProviderOrg[];
  attribution: MemberAttribution[];
}

export interface EngineOutput {
  results: HedisResult[];
  gaps: MeasureGap[];
  engagement: EngagementQueueEntry[];
}

interface EngineRunSummary {
  measurementYear: number;
  ranAt: string;
  results: HedisResult[];
  totalGaps: number;
  totalEngagementEntries: number;
}

function buildContext(
  member: Member,
  measurementYear: number,
  byMember: {
    claims: Map<string, Claim[]>;
    obs: Map<string, Observation[]>;
    cond: Map<string, Condition[]>;
    rx: Map<string, MedicationRequest[]>;
    docs: Map<string, DocumentReference[]>;
  }
): MeasureContext {
  return {
    member,
    measurementYear,
    claims: byMember.claims.get(member.id) ?? [],
    observations: byMember.obs.get(member.id) ?? [],
    conditions: byMember.cond.get(member.id) ?? [],
    medications: byMember.rx.get(member.id) ?? [],
    documents: byMember.docs.get(member.id) ?? []
  };
}

function suggestProvidersFor(
  member: Member,
  measure: MeasureSpec,
  providers: ProviderOrg[]
) {
  // Prefer a specialty match, then in-state proximity (illustrative — distance
  // is a deterministic synthetic value), then EHR platform availability.
  const specialty =
    measure.domain === 'Pediatric Preventive' ? 'Pediatrics' :
    measure.domain === 'Maternal Health' ? 'Obstetrics & Gynecology' :
    measure.domain === 'Behavioral Health' ? 'Behavioral Health' :
    measure.domain === 'Cardiometabolic' ? 'Family Medicine' :
    'Family Medicine';
  const pool = providers.filter((p) => p.specialty === specialty);
  const ranked = (pool.length ? pool : providers)
    .map((p) => ({
      npi: p.npi,
      name: p.organizationName,
      specialty: p.specialty,
      distance: Number((1 + (parseInt(p.npi.slice(-3), 10) % 25) + (parseInt(member.zip, 10) % 5)).toFixed(0)),
      ehrPlatform: p.ehrPlatform
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  return ranked;
}

/** Pure measures × members computation. No I/O. */
export function computeResults(input: EngineInput): EngineOutput {
  const { measurementYear: my, ranAt, members, providers, attribution } = input;

  const byMember = {
    claims: groupBy(input.claims, (c) => c.memberId),
    obs: groupBy(input.observations, (o) => o.memberId),
    cond: groupBy(input.conditions, (c) => c.memberId),
    rx: groupBy(input.medications, (r) => r.memberId),
    docs: groupBy(input.documents, (d) => d.memberId)
  };
  const attributionByMember = keyBy(attribution, (a) => a.memberId);

  const allGaps: MeasureGap[] = [];
  const engagement: EngagementQueueEntry[] = [];
  const engagementByMember = new Map<string, EngagementQueueEntry>();
  const results: HedisResult[] = [];

  for (const measure of MEASURES) {
    let eligible = 0;
    let excluded = 0;
    let numClaims = 0;
    let numClinical = 0;
    let openWithEvidence = 0;

    for (const member of members) {
      const ctx = buildContext(member, my, byMember);
      const gapId = `${measure.id}:${member.id}`;

      if (!measure.isEligible(ctx)) {
        continue;
      }
      eligible++;

      if (measure.isExcluded(ctx)) {
        excluded++;
        allGaps.push({
          id: gapId,
          measureId: measure.id,
          memberId: member.id,
          status: 'excluded',
          computedAt: ranAt
        });
        continue;
      }

      // Pass 1 — Claims
      const claimsResult = measure.satisfiedByClaims(ctx);
      if (claimsResult.ok) {
        numClaims++;
        allGaps.push({
          id: gapId,
          measureId: measure.id,
          memberId: member.id,
          status: 'closed-claims',
          evidence: claimsResult.evidence,
          computedAt: ranAt
        });
        continue;
      }

      // Pass 2 — Clinical
      const clinicalResult = measure.satisfiedByClinical(ctx);
      if (clinicalResult.ok) {
        numClinical++;
        allGaps.push({
          id: gapId,
          measureId: measure.id,
          memberId: member.id,
          status: 'closed-clinical',
          evidence: clinicalResult.evidence,
          computedAt: ranAt
        });
        continue;
      }

      // Pass 3 — Roster (still open)
      const status = clinicalResult.missing?.kind === 'document'
        ? 'open-needs-document'
        : 'open-needs-clinical';
      if (claimsResult.evidence.length > 0 || clinicalResult.evidence.length > 0) {
        openWithEvidence++;
      }
      allGaps.push({
        id: gapId,
        measureId: measure.id,
        memberId: member.id,
        status,
        missingDataElement: clinicalResult.missing?.description,
        evidence: clinicalResult.evidence,
        computedAt: ranAt
      });

      // Engagement queue routing
      const attr = attributionByMember.get(member.id);
      const noVisit = !attr?.hasHadVisitInMeasurementYear;
      const noPcp = !attr?.pcp;
      if (engagementByMember.has(member.id)) {
        // Already queued for another measure — append
        const existing = engagementByMember.get(member.id)!;
        if (!existing.relatedMeasures.includes(measure.id)) existing.relatedMeasures.push(measure.id);
      } else {
        const queueReason: EngagementQueueEntry['queueReason'] =
          noVisit ? 'no-visit' : noPcp ? 'no-pcp' : 'gap-closeable';
        const outreachType: EngagementQueueEntry['outreachType'] =
          noPcp ? 'pcp-assignment' : noVisit ? 'appointment-scheduling' : 'gap-closure';
        const incentiveEligible = measure.dataTier !== 'ccda';
        const incentiveDescription = incentiveEligible
          ? measure.domain === 'Cancer Screening'
            ? '$25 gift card after completing screening'
            : measure.domain === 'Pediatric Preventive'
              ? 'No copay for the well-child visit'
              : 'No copay for this preventive visit'
          : null;
        const entry: EngagementQueueEntry = {
          memberId: member.id,
          memberName: member.name,
          queueReason,
          relatedMeasures: [measure.id],
          suggestedProviders: suggestProvidersFor(member, measure, providers),
          outreachType,
          incentiveEligible,
          incentiveDescription,
          outreachStatus: 'pending',
          createdAt: ranAt
        };
        engagement.push(entry);
        engagementByMember.set(member.id, entry);
      }
    }

    const combined = numClaims + numClinical;
    const denom = Math.max(eligible - excluded, 0);
    const gapCount = denom - combined;
    // Invariant (locked by tests): combinedNumerator + gapCount === eligible − excluded,
    // i.e. `denominator()` in analytics/projection reconstructs this same denominator.
    const rate = denom === 0 ? 0 : (combined / denom) * 100;
    // Share of the denominator with ANY structured evidence (claims or
    // clinical) — members whose gap needs outreach rather than data. A low
    // value means the plan can't even see these members' care yet.
    const withData = combined + openWithEvidence;
    const dataCompleteness = denom === 0 ? 0 : (withData / denom) * 100;
    results.push({
      measureId: measure.id,
      measureName: measure.name,
      dataTier: measure.dataTier,
      domain: measure.domain,
      eligiblePopulation: eligible,
      numeratorFromClaims: numClaims,
      numeratorFromClinical: numClinical,
      combinedNumerator: combined,
      exclusions: excluded,
      gapCount,
      rate: Number(rate.toFixed(1)),
      dataCompleteness: Number(dataCompleteness.toFixed(1)),
      lastComputed: ranAt
    });
  }

  // Members with no visit in MY but no open gap (e.g., excluded only) should
  // still surface for outreach.
  for (const member of members) {
    if (engagementByMember.has(member.id)) continue;
    const attr = attributionByMember.get(member.id);
    if (!attr?.hasHadVisitInMeasurementYear) {
      const entry: EngagementQueueEntry = {
        memberId: member.id,
        memberName: member.name,
        queueReason: !attr?.pcp ? 'no-pcp' : 'no-visit',
        relatedMeasures: [],
        suggestedProviders: suggestProvidersFor(member, MEASURES[0], providers),
        outreachType: !attr?.pcp ? 'pcp-assignment' : 'appointment-scheduling',
        incentiveEligible: true,
        incentiveDescription: 'No copay for an annual wellness visit',
        outreachStatus: 'pending',
        createdAt: ranAt
      };
      engagement.push(entry);
      engagementByMember.set(member.id, entry);
    }
  }

  return { results, gaps: allGaps, engagement };
}

/** Load → compute → persist. Called by /api/engine, EHR sync, and the CLI. */
export async function runEngine({ measurementYear }: { measurementYear?: number } = {}): Promise<EngineRunSummary> {
  const summary = await readSeedSummary();
  const my = measurementYear ?? summary?.measurementYear ?? new Date().getFullYear();

  const [members, claims, observations, conditions, medications, documents, providers, attribution] = await Promise.all([
    repos.members.list(),
    repos.claims.list(),
    repos.observations.list(),
    repos.conditions.list(),
    repos.medications.list(),
    repos.documents.list(),
    repos.providers.list(),
    repos.attribution.list()
  ]);

  const ranAt = new Date().toISOString();
  const { results, gaps, engagement } = computeResults({
    measurementYear: my,
    ranAt,
    members,
    claims,
    observations,
    conditions,
    medications,
    documents,
    providers,
    attribution
  });

  await Promise.all([
    repos.hedisResults.put(results),
    repos.gaps.put(gaps),
    repos.engagement.put(engagement)
  ]);

  return {
    measurementYear: my,
    ranAt,
    results,
    totalGaps: gaps.filter((g) => g.status.startsWith('open-')).length,
    totalEngagementEntries: engagement.length
  };
}

// Aggregation consumed by the dashboard, providers page, and agent tools.
// Pass preloaded collections (e.g. from the request snapshot) to avoid
// re-reading; with no argument it loads what it needs itself.
export interface EhrImpactInput {
  providers: ProviderOrg[];
  attribution: MemberAttribution[];
  gaps: MeasureGap[];
}

export async function ehrPlatformGapImpact(input?: EhrImpactInput) {
  const { providers, attribution, gaps } = input ?? {
    providers: await repos.providers.list(),
    attribution: await repos.attribution.list(),
    gaps: await repos.gaps.list()
  };
  const providerByNpi = keyBy(providers, (p) => p.npi);
  const memberToPlatform = new Map<string, { platform: string | null; npi: string | null; orgName: string | null }>();
  for (const a of attribution) {
    if (a.pcp) {
      const provider = providerByNpi.get(a.pcp.npi);
      memberToPlatform.set(a.memberId, {
        platform: provider?.ehrPlatform ?? 'Unconnected',
        npi: a.pcp.npi,
        orgName: provider?.organizationName ?? a.pcp.name
      });
    } else {
      memberToPlatform.set(a.memberId, { platform: 'No PCP', npi: null, orgName: null });
    }
  }
  const buckets: Record<string, { gaps: number; members: Set<string>; orgs: Set<string> }> = {};
  for (const g of gaps) {
    if (!g.status.startsWith('open-')) continue;
    const meta = memberToPlatform.get(g.memberId);
    const key = meta?.platform ?? 'Unknown';
    if (!buckets[key]) buckets[key] = { gaps: 0, members: new Set(), orgs: new Set() };
    buckets[key].gaps++;
    buckets[key].members.add(g.memberId);
    if (meta?.orgName) buckets[key].orgs.add(meta.orgName);
  }
  const total = Object.values(buckets).reduce((s, b) => s + b.gaps, 0);
  return Object.entries(buckets)
    .map(([platform, b]) => ({
      platform,
      openGaps: b.gaps,
      sharePct: total === 0 ? 0 : Number(((b.gaps / total) * 100).toFixed(1)),
      memberCount: b.members.size,
      orgCount: b.orgs.size
    }))
    .sort((a, b) => b.openGaps - a.openGaps);
}
