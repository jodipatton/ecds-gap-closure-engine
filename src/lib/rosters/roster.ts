// Roster autogeneration. Two audiences off the same computed state:
//
//  - payer  : whole-population actionability — every member with an open
//             care gap or a suspected HCC, with attribution + revenue lens.
//  - provider: scoped to one NPI's attributed panel, framed as a worklist
//              (what to do for this patient) without plan economics.

import { getSnapshot } from '@/lib/data/snapshot';
import { computeMemberRisk } from '@/lib/risk/raf';

export type RosterAudience = 'payer' | 'provider';

export interface RosterRow {
  memberId: string;
  memberName: string;
  pcpName: string;
  pcpNpi: string;
  openGapMeasures: string;
  openGapCount: number;
  suspectedHccs: string;
  suspectedHccCount: number;
  currentRaf: number;
  revenueOpportunity: number;
  recommendedAction: string;
}

export interface RosterResult {
  audience: RosterAudience;
  generatedAt: string;
  measurementYear: number;
  scope: string; // "All attributed members" or provider org name
  rowCount: number;
  rows: RosterRow[];
}

export async function buildRoster(
  audience: RosterAudience,
  providerNpi?: string
): Promise<RosterResult> {
  const snap = await getSnapshot();
  const { members, measurementYear: my, attributionByMember: attrByMember, providerByNpi } = snap;

  const openByMember = new Map<string, string[]>();
  for (const g of snap.gaps) {
    if (!g.status.startsWith('open-')) continue;
    const l = openByMember.get(g.memberId) ?? [];
    l.push(g.measureId);
    openByMember.set(g.memberId, l);
  }

  const targetMembers =
    audience === 'provider' && providerNpi
      ? members.filter((m) => attrByMember.get(m.id)?.pcp?.npi === providerNpi)
      : members;

  const rows: RosterRow[] = [];
  for (const m of targetMembers) {
    const attr = attrByMember.get(m.id);
    const openMeasures = openByMember.get(m.id) ?? [];
    const risk = computeMemberRisk(
      m,
      snap.conditionsByMember.get(m.id) ?? [],
      snap.claimsByMember.get(m.id) ?? [],
      my
    );
    // Only include members that are actionable.
    if (openMeasures.length === 0 && risk.suspectedHccs.length === 0) continue;

    const actions: string[] = [];
    if (openMeasures.length) actions.push(`Close ${openMeasures.length} care gap(s): ${openMeasures.join(', ')}`);
    if (risk.suspectedHccs.length)
      actions.push(`Document ${risk.suspectedHccs.length} suspected condition(s)`);
    if (!attr?.pcp) actions.push('Assign a PCP');
    else if (!attr.hasHadVisitInMeasurementYear) actions.push('Schedule annual visit');

    rows.push({
      memberId: m.id,
      memberName: m.name,
      pcpName: attr?.pcp?.name ?? '—',
      pcpNpi: attr?.pcp?.npi ?? '—',
      openGapMeasures: openMeasures.join('; ') || '—',
      openGapCount: openMeasures.length,
      suspectedHccs: risk.suspectedHccs.map((h) => `${h.hcc} ${h.label}`).join('; ') || '—',
      suspectedHccCount: risk.suspectedHccs.length,
      currentRaf: risk.currentRaf,
      revenueOpportunity: risk.annualRevenueOpportunity,
      recommendedAction: actions.join(' · ')
    });
  }

  rows.sort(
    (a, b) =>
      b.suspectedHccCount + b.openGapCount - (a.suspectedHccCount + a.openGapCount) ||
      b.revenueOpportunity - a.revenueOpportunity
  );

  const scope =
    audience === 'provider' && providerNpi
      ? providerByNpi.get(providerNpi)?.organizationName ?? `NPI ${providerNpi}`
      : 'All attributed members';

  return {
    audience,
    generatedAt: new Date().toISOString(),
    measurementYear: my,
    scope,
    rowCount: rows.length,
    rows
  };
}

// Audience-tailored CSV. The provider view omits plan economics.
export function rosterToCsv(result: RosterResult): string {
  const payerCols: Array<[string, (r: RosterRow) => string | number]> = [
    ['memberId', (r) => r.memberId],
    ['memberName', (r) => r.memberName],
    ['pcpName', (r) => r.pcpName],
    ['pcpNpi', (r) => r.pcpNpi],
    ['openGapCount', (r) => r.openGapCount],
    ['openGapMeasures', (r) => r.openGapMeasures],
    ['suspectedHccCount', (r) => r.suspectedHccCount],
    ['suspectedHccs', (r) => r.suspectedHccs],
    ['currentRaf', (r) => r.currentRaf],
    ['revenueOpportunityUSD', (r) => r.revenueOpportunity],
    ['recommendedAction', (r) => r.recommendedAction]
  ];
  const providerCols: Array<[string, (r: RosterRow) => string | number]> = [
    ['memberId', (r) => r.memberId],
    ['memberName', (r) => r.memberName],
    ['openGapCount', (r) => r.openGapCount],
    ['openCareGaps', (r) => r.openGapMeasures],
    ['suspectedConditionsToDocument', (r) => r.suspectedHccs],
    ['recommendedAction', (r) => r.recommendedAction]
  ];
  const cols = result.audience === 'provider' ? providerCols : payerCols;
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map(([h]) => h).join(',')];
  for (const r of result.rows) lines.push(cols.map(([, f]) => esc(f(r))).join(','));
  return lines.join('\n');
}
