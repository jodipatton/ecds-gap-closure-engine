/* Typed cards for agent tool results — the grounded half of every assistant
   answer. One renderer keyed by tool name, shared by the dashboard panel and
   the full /chat surface. Unknown tools fall back to a collapsed JSON block. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { Badge, TierBadge } from '@/components/ui';
import { BarList, BulletBar, Dumbbell, StackedBar, CHART } from '@/components/charts';
import { measureTarget } from '@/lib/analytics/projection';
import { money } from '@/lib/shared/format';

export interface ToolInvocation {
  name: string;
  args: any;
  result: any;
}

export function ToolResultCard({ invocation }: { invocation: ToolInvocation }) {
  const { name, result } = invocation;
  if (result?.error) {
    return <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{result.error}</div>;
  }
  switch (name) {
    case 'measure_summary':
      return <MeasureSummaryCard r={result} />;
    case 'measures_with_most_gaps':
      return (
        <CardShell title="Measures by open gaps">
          <BarList rows={(result as any[]).map((x, i) => ({ label: `${x.measureId} · ${x.measureName}`, value: x.gapCount, emphasized: i === 0, hint: `rate ${x.ratePct}%` }))} />
        </CardShell>
      );
    case 'ehr_platform_impact':
      return (
        <CardShell title="Open gaps by EHR platform" footer={<FooterLink href="/providers" label="Provider directory" />}>
          <BarList
            rows={(result as any[]).map((x) => ({
              label: x.platform,
              value: x.openGaps,
              emphasized: x.platform !== 'No PCP' && x.platform !== 'Unconnected' && x === (result as any[]).find((y) => y.platform !== 'No PCP' && y.platform !== 'Unconnected'),
              hint: `${x.orgCount} orgs · ${x.memberCount} members`
            }))}
          />
        </CardShell>
      );
    case 'simulate_gap_closure':
      return (
        <CardShell title={`Simulation — close ${result.closed} ${result.measureId} gaps`}>
          <Dumbbell
            rows={[{ label: result.measureId, before: result.currentRate, after: result.projectedRate }]}
            beforeLabel="Current"
            afterLabel="Projected"
          />
          <p className="mt-2 text-xs text-slate-600">
            +{result.rateDelta} pts · <span className="font-semibold text-ink">{money(result.dollarsCaptured)}</span> captured
          </p>
        </CardShell>
      );
    case 'contract_value':
      return <ContractValueCard r={result} />;
    case 'generate_roster':
      return <RosterPreview r={result} />;
    case 'member_360':
      return <Member360Card r={result} />;
    case 'member_risk':
      return (
        <CardShell title={`RAF detail — ${result.memberId}`}>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Stat label="Current RAF" value={result.currentRaf?.toFixed?.(3) ?? result.currentRaf} />
            <Stat label="Potential RAF" value={result.potentialRaf?.toFixed?.(3) ?? result.potentialRaf} />
            <Stat label="$ opportunity" value={money(result.annualRevenueOpportunity ?? 0)} />
          </div>
          {result.suspectedHccs?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {result.suspectedHccs.map((h: any) => (
                <li key={h.hcc}>
                  <Badge color="amber">{h.hcc}</Badge> {h.label} <span className="text-slate-400">({h.evidenceIcd10})</span>
                </li>
              ))}
            </ul>
          )}
        </CardShell>
      );
    case 'risk_summary':
      return (
        <CardShell title="Plan risk summary" footer={<FooterLink href="/risk" label="Risk (RAF)" />}>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Stat label="Avg RAF" value={result.avgCurrentRaf?.toFixed?.(3) ?? result.avgCurrentRaf} />
            <Stat label="Suspected gaps" value={result.membersWithSuspectedGap} />
            <Stat label="Recapture" value={money(result.totalRevenueOpportunity ?? 0)} />
          </div>
        </CardShell>
      );
    case 'recommended_actions':
      return (
        <CardShell title="Recommended next actions">
          <ol className="space-y-1.5">
            {(result as any[]).map((a, i) => (
              <li key={i}>
                <Link href={a.href} className="group flex items-start justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium text-ink group-hover:text-accent">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.detail}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{money(a.estimatedValue)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </CardShell>
      );
    case 'engagement_queue_summary':
      return (
        <CardShell title={`Engagement queue — ${result.total} members`} footer={<FooterLink href="/outreach/queue" label="Outreach queue" />}>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(result.byReason as Record<string, number>).map(([k, v]) => (
              <Badge key={k} color={k === 'no-pcp' ? 'rose' : k === 'no-visit' ? 'amber' : 'sky'}>
                {k}: {v}
              </Badge>
            ))}
          </div>
        </CardShell>
      );
    case 'members_missing_clinical_data':
      return (
        <CardShell title="Members missing clinical data">
          <ul className="space-y-1 text-xs text-slate-600">
            {(result as any[]).map((m) => (
              <li key={m.memberId}>
                <span className="font-medium text-ink">{m.memberName}</span> — {m.missingDataElement}{' '}
                <span className="text-slate-400">(PCP: {m.attributedPcp ?? 'none'} · EHR: {m.ehrPlatform ?? '—'})</span>
              </li>
            ))}
          </ul>
        </CardShell>
      );
    case 'care_gap_letter':
      return (
        <CardShell title={`Letter — ${result.memberName} · ${result.measureId}`}>
          <div className="text-xs font-medium text-slate-600">{result.subject}</div>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-sans text-xs text-slate-700">
            {result.body}
          </pre>
        </CardShell>
      );
    case 'measure_spec':
      return (
        <CardShell title={`${result.id} — ${result.name}`}>
          <div className="mb-1"><TierBadge tier={result.dataTier} /></div>
          <p className="text-xs text-slate-600">{result.description}</p>
        </CardShell>
      );
    case 'list_measures':
      return (
        <CardShell title="Supported measures" footer={<FooterLink href="/measures" label="All measures" />}>
          <ul className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
            {(result as any[]).map((m) => (
              <li key={m.id}>
                <Link href={`/measures/${m.id}`} className="font-medium text-ink hover:text-accent">{m.id}</Link> — {m.name}
              </li>
            ))}
          </ul>
        </CardShell>
      );
    default:
      return (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">{name} result</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-50 p-2">{JSON.stringify(result, null, 2)}</pre>
        </details>
      );
  }
}

function MeasureSummaryCard({ r }: { r: any }) {
  const target = measureTarget(r.measureId);
  return (
    <CardShell title={`${r.measureId} — ${r.measureName}`} footer={<FooterLink href={`/measures/${r.measureId}`} label="Measure detail" />}>
      <div className="flex items-baseline justify-between">
        <TierBadge tier={r.dataTier} />
        <span className="text-2xl font-semibold text-ink">{r.rate}%</span>
      </div>
      <div className="mt-2">
        <BulletBar value={r.rate} target={target} />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>{r.combinedNumerator}/{r.combinedNumerator + r.gapCount} closed</span>
          <span>target {target}%</span>
        </div>
      </div>
      <div className="mt-2">
        <StackedBar
          height={10}
          segments={[
            { label: 'Claims', value: r.numeratorFromClaims, color: CHART.good },
            { label: 'Clinical', value: r.numeratorFromClinical, color: CHART.accent },
            { label: 'Open', value: r.gapCount, color: CHART.attention }
          ]}
        />
      </div>
    </CardShell>
  );
}

function ContractValueCard({ r }: { r: any }) {
  return (
    <CardShell title={`${r.contractCount} value-based contracts — ${money(r.totalValueAtStake)} at stake`} footer={<FooterLink href="/contracts" label="Contracts" />}>
      <StackedBar
        height={12}
        format={money}
        segments={[
          { label: 'Earned', value: r.totalEarnedToDate, color: CHART.good },
          { label: 'Open opportunity', value: r.totalOpenOpportunity, color: CHART.accent },
          { label: 'Withhold at risk', value: r.totalWithholdAtRisk, color: CHART.attention },
          { label: 'Risk recapture', value: r.totalRiskRecapture, color: CHART.recapture }
        ]}
      />
      {r.contracts?.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {r.contracts.slice(0, 3).map((c: any) => (
            <li key={c.organizationName} className="flex justify-between gap-3">
              <span>
                <span className="font-medium text-ink">{c.organizationName}</span> · {c.model} · {c.avgRatePct}% vs {c.targetRatePct}%
              </span>
              <span className="font-semibold tabular-nums">{money(c.totalValueAtStake)}</span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function RosterPreview({ r }: { r: any }) {
  const csv = r.audience === 'provider' ? `/api/rosters?audience=provider&format=csv` : '/api/rosters?audience=payer&format=csv';
  return (
    <CardShell
      title={`${r.scope} — ${r.rowCount} actionable members`}
      footer={
        <span className="flex gap-3">
          <FooterLink href="/rosters" label="Full roster" />
          <a href={csv} className="text-accent hover:underline">Download CSV ↓</a>
        </span>
      }
    >
      <ul className="space-y-1 text-xs text-slate-600">
        {r.rows.slice(0, 6).map((x: any) => (
          <li key={x.memberId} className="flex justify-between gap-3">
            <span>
              <span className="font-medium text-ink">{x.memberName}</span>{' '}
              <span className="text-slate-400">{x.memberId}</span>
            </span>
            <span>
              {x.openGapCount} gaps{x.suspectedHccCount ? ` · ${x.suspectedHccCount} HCC` : ''}
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function Member360Card({ r }: { r: any }) {
  return (
    <CardShell title={`${r.member.name} — ${r.member.id}`}>
      <div className="text-xs text-slate-600">
        {r.member.sex} · born {r.member.birthDate} · PCP: {r.attribution?.pcp?.name ?? 'none'}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {r.openGaps.map((g: any) => (
          <Badge key={g.measureId} color={g.status === 'open-needs-document' ? 'rose' : 'amber'}>
            {g.measureId} open
          </Badge>
        ))}
        {r.closedGaps.map((id: string) => (
          <Badge key={id} color="green">{id} closed</Badge>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        Footprint: {r.clinicalFootprint.claims} claims · {r.clinicalFootprint.observations} obs ·{' '}
        {r.clinicalFootprint.conditions} conditions · {r.clinicalFootprint.medications} meds ·{' '}
        {r.clinicalFootprint.documents} docs
      </div>
    </CardShell>
  );
}

function CardShell({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-ink">{title}</div>
      {children}
      {footer && <div className="mt-3 border-t border-slate-100 pt-2 text-xs">{footer}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 py-2">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-accent hover:underline">
      {label} →
    </Link>
  );
}
