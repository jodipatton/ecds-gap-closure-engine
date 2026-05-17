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

export type OutreachChannel = 'call' | 'sms' | 'letter';

export interface OutreachMessage {
  channel: OutreachChannel;
  memberId: string;
  memberName: string;
  measureId: string;
  measureName: string;
  subject: string;
  body: string;
}

// Channel-specific outreach content. Letter reuses the formal letter; SMS is
// short and consent-aware; call is a structured talking-points script.
export async function buildOutreachMessage(
  memberId: string,
  measureId: string,
  channel: OutreachChannel
): Promise<OutreachMessage | { error: string }> {
  const [members, engagement] = await Promise.all([
    repos.members.list(),
    repos.engagement.list()
  ]);
  const member = members.find((m) => m.id === memberId);
  if (!member) return { error: `Member ${memberId} not found` };
  const spec = getMeasure(measureId.toUpperCase());
  if (!spec) return { error: `Unknown measure ${measureId}` };

  const firstName = member.name.split(' ')[0];
  const queueEntry = engagement.find((e) => e.memberId === memberId);
  const provider = queueEntry?.suggestedProviders?.[0] ?? null;
  const incentive = queueEntry?.incentiveEligible ? queueEntry.incentiveDescription : null;
  const ask = MEASURE_ASK[spec.id] ?? `complete your ${spec.name} care`;
  const base = {
    memberId: member.id,
    memberName: member.name,
    measureId: spec.id,
    measureName: spec.name
  };

  if (channel === 'letter') {
    const letter = await buildCareGapLetter(memberId, measureId);
    if ('error' in letter) return letter;
    return { channel, ...base, subject: letter.subject, body: letter.body };
  }

  if (channel === 'sms') {
    const body =
      `Hi ${firstName}, this is your care team at Reliant Medical Group. ` +
      `Our records show you're due to ${ask}. ` +
      (incentive ? `${incentive}. ` : '') +
      `Reply SCHEDULE or call 1-800-555-0142. Reply STOP to opt out.`;
    return { channel, ...base, subject: `SMS · ${spec.shortName}`, body };
  }

  // call script
  const lines = [
    `CALL SCRIPT — ${spec.name} (${spec.shortName})`,
    `Member: ${member.name} (${member.id})`,
    '',
    `1. Verify identity: confirm name and date of birth.`,
    `2. Introduce: "Hi ${firstName}, I'm calling from your Reliant Medical Group care team on behalf of Fallon Health."`,
    `3. Reason: "Our records show you may be due to ${ask}."`,
    `4. Value: explain it's a covered preventive service${incentive ? ` — ${incentive}` : ''}.`,
    provider
      ? `5. Offer: schedule with ${provider.name} (${provider.specialty}, ~${provider.distance} mi).`
      : `5. Offer: help schedule with their primary care provider.`,
    `6. Close: confirm appointment or set a callback; document the contact.`,
    `7. If not interested: note reason, offer to follow up later, respect preferences.`
  ];
  return { channel, ...base, subject: `Call script · ${spec.shortName}`, body: lines.join('\n') };
}
