// "Next best actions" — a small heuristic that ranks where the quality team
// should spend effort next. Reused by the dashboard card and the agent's
// recommended_actions tool so the narrative matches the numbers.

import { getSnapshot } from '@/lib/data/snapshot';
import { ehrPlatformGapImpact } from '@/lib/hedis/engine';
import { gapValue } from '@/lib/analytics/projection';

export interface RecommendedAction {
  kind: 'measure' | 'ehr-connect' | 'outreach';
  title: string;
  detail: string;
  estimatedValue: number; // illustrative $ opportunity
  href: string;
}

export async function recommendedActions(limit = 5): Promise<RecommendedAction[]> {
  const snap = await getSnapshot();
  const { results, engagement } = snap;
  const ehrImpact = await ehrPlatformGapImpact(snap);

  const actions: RecommendedAction[] = [];

  // 1. Highest dollar-value measures by open gaps.
  for (const r of [...results].sort((a, b) => b.gapCount * gapValue(b.dataTier) - a.gapCount * gapValue(a.dataTier)).slice(0, 3)) {
    if (r.gapCount === 0) continue;
    actions.push({
      kind: 'measure',
      title: `Close ${r.gapCount} ${r.measureId} gaps`,
      detail: `${r.measureName} sits at ${r.rate.toFixed(1)}%. Launch an outreach campaign for this measure.`,
      estimatedValue: r.gapCount * gapValue(r.dataTier),
      href: `/measures/${r.measureId}`
    });
  }

  // 2. Connect the EHR platform sitting on the most open gaps.
  const topPlatform = ehrImpact.find(
    (p) => p.platform !== 'No PCP' && p.platform !== 'Unconnected' && p.openGaps > 0
  );
  if (topPlatform) {
    actions.push({
      kind: 'ehr-connect',
      title: `Pull clinical data from ${topPlatform.platform} practices`,
      detail: `${topPlatform.platform} covers ${topPlatform.openGaps} open gaps across ${topPlatform.orgCount} orgs — much of it closeable with a clinical-data sync.`,
      estimatedValue: topPlatform.openGaps * gapValue('uscdi-v3'),
      href: '/provider/connect/status'
    });
  }

  // 3. Work the engagement queue.
  if (engagement.length > 0) {
    const noVisit = engagement.filter((e) => e.queueReason === 'no-visit').length;
    actions.push({
      kind: 'outreach',
      title: `Engage ${engagement.length} queued members`,
      detail: `${noVisit} have had no visit this measurement year. Create a campaign to drive scheduling.`,
      estimatedValue: engagement.length * 120,
      href: '/campaigns'
    });
  }

  return actions.sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, limit);
}
