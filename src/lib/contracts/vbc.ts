// Synthetic payer↔provider value-based contracts and the gap-value math both
// sides use to gauge what closing a member's gaps is worth.
//
// Contracts are generated deterministically from the provider directory the
// first time they're needed (so they persist alongside seeded data). The
// payer ("Fallon Health") and provider see the same numbers from different
// framings.

import { repos, readSeedSummary } from '@/lib/data/repository';
import { computeMemberRisk } from '@/lib/risk/raf';
import type { Claim, Condition, ValueContract, VbcModel } from '@/lib/data/types';

const PAYER_NAME = 'Fallon Health';
const MEASURE_POOL = ['BCS', 'COL', 'WCV', 'CIS', 'HBD', 'CBP', 'DSF-E'];
const MODELS: VbcModel[] = ['P4P', 'Shared Savings', 'Full Risk'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export async function ensureContracts(): Promise<ValueContract[]> {
  const existing = await repos.contracts.list();
  if (existing.length > 0) return existing;

  const [providers, summary] = await Promise.all([
    repos.providers.list(),
    readSeedSummary()
  ]);
  const year = summary?.measurementYear ?? new Date().getFullYear();

  const eligible = providers
    .filter((p) => p.memberCount > 0)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 8);

  const contracts: ValueContract[] = eligible.map((p) => {
    const r = hash(p.npi);
    const model = MODELS[Math.floor(r * MODELS.length) % MODELS.length];
    const mCount = 3 + Math.floor(hash(p.npi + 'm') * 3); // 3–5 measures
    const measureIds = MEASURE_POOL.filter(
      (_, i) => hash(`${p.npi}:${i}`) < mCount / MEASURE_POOL.length
    ).slice(0, mCount);
    const perGapIncentive = 75 + Math.round(hash(p.npi + 'g') * 18) * 10; // 75–255
    const qualityWithholdPct = 3 + Math.round(hash(p.npi + 'w') * 5); // 3–8%
    const targetRatePct = 70 + Math.round(hash(p.npi + 't') * 15); // 70–85
    const pmpm = model === 'Full Risk' ? 980 : model === 'Shared Savings' ? 60 : 0;
    const estimatedCapitation = Math.round(p.memberCount * pmpm * 12);
    return {
      id: `VBC-${p.npi}`,
      providerNpi: p.npi,
      organizationName: p.organizationName,
      payerName: PAYER_NAME,
      model,
      measureIds: measureIds.length ? measureIds : ['BCS', 'COL', 'WCV'],
      panelSize: p.memberCount,
      targetRatePct,
      perGapIncentive,
      qualityWithholdPct,
      estimatedCapitation,
      effectiveYear: year
    };
  });

  await repos.contracts.put(contracts);
  return contracts;
}

export interface ContractValue {
  contract: ValueContract;
  panelSize: number;
  closedGapsInScope: number;
  openGapsInScope: number;
  earnedToDate: number;
  openOpportunity: number;
  withholdAtRisk: number;
  qualityEarnback: number;
  qualityAtRisk: number;
  avgRatePct: number;
  riskRecapture: number;
  totalValueAtStake: number;
}

function indexList<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of arr) {
    const k = key(x);
    const l = m.get(k) ?? [];
    l.push(x);
    m.set(k, l);
  }
  return m;
}

export async function valueForContract(contract: ValueContract): Promise<ContractValue> {
  const [attribution, gaps, results, members, conditions, claims, summary] = await Promise.all([
    repos.attribution.list(),
    repos.gaps.list(),
    repos.hedisResults.list(),
    repos.members.list(),
    repos.conditions.list(),
    repos.claims.list(),
    readSeedSummary()
  ]);
  const my = summary?.measurementYear ?? new Date().getFullYear();
  const inScope = new Set(contract.measureIds);

  const panelMemberIds = new Set(
    attribution.filter((a) => a.pcp?.npi === contract.providerNpi).map((a) => a.memberId)
  );

  let closed = 0;
  let open = 0;
  for (const g of gaps) {
    if (!panelMemberIds.has(g.memberId) || !inScope.has(g.measureId)) continue;
    if (g.status.startsWith('closed-')) closed++;
    else if (g.status.startsWith('open-')) open++;
  }

  const scopedResults = results.filter((r) => inScope.has(r.measureId));
  const denom = scopedResults.reduce((s, r) => s + r.combinedNumerator + r.gapCount, 0);
  const num = scopedResults.reduce((s, r) => s + r.combinedNumerator, 0);
  const avgRatePct = denom === 0 ? 0 : Number(((num / denom) * 100).toFixed(1));

  const memberById = new Map(members.map((m) => [m.id, m]));
  const condByMember = indexList<Condition>(conditions, (c) => c.memberId);
  const claimByMember = indexList<Claim>(claims, (c) => c.memberId);
  let riskRecapture = 0;
  for (const id of panelMemberIds) {
    const m = memberById.get(id);
    if (!m) continue;
    riskRecapture += computeMemberRisk(
      m,
      condByMember.get(id) ?? [],
      claimByMember.get(id) ?? [],
      my
    ).annualRevenueOpportunity;
  }

  const earnedToDate = closed * contract.perGapIncentive;
  const openOpportunity = open * contract.perGapIncentive;
  const withholdAtRisk = Math.round(
    (contract.estimatedCapitation * contract.qualityWithholdPct) / 100
  );
  const attainment = contract.targetRatePct === 0 ? 1 : Math.min(1, avgRatePct / contract.targetRatePct);
  const qualityEarnback = Math.round(withholdAtRisk * attainment);
  const qualityAtRisk = withholdAtRisk - qualityEarnback;

  return {
    contract,
    panelSize: panelMemberIds.size,
    closedGapsInScope: closed,
    openGapsInScope: open,
    earnedToDate,
    openOpportunity,
    withholdAtRisk,
    qualityEarnback,
    qualityAtRisk,
    avgRatePct,
    riskRecapture,
    totalValueAtStake: openOpportunity + qualityAtRisk + riskRecapture
  };
}

export async function allContractValues(): Promise<ContractValue[]> {
  const contracts = await ensureContracts();
  return Promise.all(contracts.map(valueForContract));
}

export async function contractForProvider(npi: string): Promise<ContractValue | null> {
  const contracts = await ensureContracts();
  const c = contracts.find((x) => x.providerNpi === npi);
  return c ? valueForContract(c) : null;
}
