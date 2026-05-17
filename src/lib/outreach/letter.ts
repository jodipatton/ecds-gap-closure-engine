// Deterministic care-gap letter generator. Shared by the /api/outreach/letter
// route, the campaigns UI, and the agent's care_gap_letter tool so every
// surface produces the same copy.

import { repos } from '@/lib/data/repository';
import { getMeasure } from '@/lib/hedis/measures';

const MEASURE_ASK: Record<string, string> = {
  BCS: 'schedule your mammogram (breast cancer screening)',
  COL: 'complete a colorectal cancer screening',
  CIS: "bring your child in for their remaining childhood immunizations",
  WCV: 'schedule a well-child / wellness visit',
  HBD: 'have your Hemoglobin A1c blood test done',
  CBP: 'come in for a blood pressure check',
  'DSF-E': 'complete a brief depression screening at your next visit',
  AMM: 'review your antidepressant medication plan with your provider',
  FUM: 'attend a follow-up visit after your recent emergency department visit',
  'PND-E': 'schedule your postpartum check-up'
};

export interface CareGapLetter {
  memberId: string;
  memberName: string;
  measureId: string;
  measureName: string;
  suggestedProvider: string | null;
  subject: string;
  body: string;
}

export async function buildCareGapLetter(
  memberId: string,
  measureId: string
): Promise<CareGapLetter | { error: string }> {
  const [members, engagement] = await Promise.all([
    repos.members.list(),
    repos.engagement.list()
  ]);
  const member = members.find((m) => m.id === memberId);
  if (!member) return { error: `Member ${memberId} not found` };
  const spec = getMeasure(measureId.toUpperCase());
  if (!spec) return { error: `Unknown measure ${measureId}` };

  const queueEntry = engagement.find((e) => e.memberId === memberId);
  const provider = queueEntry?.suggestedProviders?.[0] ?? null;
  const incentive = queueEntry?.incentiveEligible ? queueEntry.incentiveDescription : null;
  const ask = MEASURE_ASK[spec.id] ?? `complete your ${spec.name} care`;
  const firstName = member.name.split(' ')[0];

  const lines = [
    `Dear ${firstName},`,
    '',
    `Our records show you may be due to ${ask}. Staying current on this preventive ` +
      `care is one of the best things you can do for your health, and your plan covers it.`,
    provider
      ? `We recommend ${provider.name} (${provider.specialty}), about ${provider.distance} miles ` +
        `from you${provider.ehrPlatform ? ` and connected to your care team electronically` : ''}.`
      : `Please reach out to your primary care provider to arrange this.`,
    incentive ? `As a thank-you for completing this care: ${incentive}.` : '',
    '',
    `To schedule, call Member Services at 1-800-555-0142 or use the member portal.`,
    '',
    `In good health,`,
    `Your Care Team`
  ].filter((l) => l !== undefined);

  return {
    memberId: member.id,
    memberName: member.name,
    measureId: spec.id,
    measureName: spec.name,
    suggestedProvider: provider?.name ?? null,
    subject: `Important: a recommended ${spec.shortName} health screening for you`,
    body: lines.join('\n')
  };
}
