import { repos } from '@/lib/data/repository';
import { Card, Pill, StatTile } from '@/components/ui';
import type { FeedbackEntry } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

const VALUABLE_LABEL: Record<FeedbackEntry['valuable'], string> = {
  yes: 'Yes',
  somewhat: 'Somewhat',
  'not-yet': 'Not yet',
  unsure: 'Unsure'
};
const VALUABLE_COLOR: Record<FeedbackEntry['valuable'], 'green' | 'amber' | 'rose' | 'slate'> = {
  yes: 'green',
  somewhat: 'amber',
  'not-yet': 'rose',
  unsure: 'slate'
};

export default async function InternalFeedbackPage() {
  const all = await repos.feedback.list();

  const byPage = new Map<string, FeedbackEntry[]>();
  for (const f of all) {
    const l = byPage.get(f.pageTitle) ?? [];
    l.push(f);
    byPage.set(f.pageTitle, l);
  }

  const avg = (xs: number[]) =>
    xs.length ? Number((xs.reduce((s, n) => s + n, 0) / xs.length).toFixed(2)) : 0;
  const overallRating = avg(all.map((f) => f.rating));
  const pctValuable = all.length
    ? Math.round((all.filter((f) => f.valuable === 'yes').length / all.length) * 100)
    : 0;
  const champions = all.filter((f) => f.wouldChampion).length;

  const groups = [...byPage.entries()]
    .map(([title, items]) => ({
      title,
      items,
      count: items.length,
      avgRating: avg(items.map((i) => i.rating)),
      yes: items.filter((i) => i.valuable === 'yes').length
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Feedback — internal (1upHealth)</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Pre-launch feedback collected from viewers across every page. Use it to prioritize the
          roadmap. Visible to 1upHealth internal users only (demo: not access-controlled).
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Responses" value={all.length} />
        <StatTile label="Avg rating" value={all.length ? `${overallRating}/5` : '—'} />
        <StatTile label="“Valuable: yes”" value={`${pctValuable}%`} />
        <StatTile label="Would champion" value={champions} hint="willing to pilot" />
      </section>

      {all.length === 0 && (
        <Card><p className="text-sm text-slate-500">No feedback submitted yet.</p></Card>
      )}

      {groups.map((g) => (
        <Card key={g.title}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-ink">{g.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Pill color="sky">{g.count} responses</Pill>
              <Pill color="slate">avg {g.avgRating}/5</Pill>
              <Pill color="green">{g.yes} say valuable</Pill>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Valuable</th>
                  <th className="py-2 pr-4">Rating</th>
                  <th className="py-2 pr-4">Who would use</th>
                  <th className="py-2 pr-4">Improvements</th>
                  <th className="py-2">Champion</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((f) => (
                  <tr key={f.id} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4 text-xs text-slate-500">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-xs">{f.role}</td>
                    <td className="py-2 pr-4">
                      <Pill color={VALUABLE_COLOR[f.valuable]}>{VALUABLE_LABEL[f.valuable]}</Pill>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{f.rating}/5</td>
                    <td className="py-2 pr-4 max-w-[16rem] text-xs text-slate-600">{f.whoWouldUse || '—'}</td>
                    <td className="py-2 pr-4 max-w-[22rem] text-xs text-slate-600">{f.improvements || '—'}</td>
                    <td className="py-2 text-xs">
                      {f.wouldChampion ? <span className="text-good">Yes</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
