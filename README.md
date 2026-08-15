# 1upHealth Console — HEDIS ECDS Gap Closure

A working demo of a health-data interoperability console: a payer command
center and a standalone provider portal built on the same rails. It ingests
FHIR-normalized claims and clinical data, runs 10 HEDIS ECDS measures across
the full eligible population, prices the open gaps, and closes them by pulling
clinical data through a simulated EHR connection.

Next.js 14 App Router · TypeScript (strict) · Tailwind · no chart library
(hand-rolled server-rendered SVG/HTML charts) · storage swappable between
local JSON, Vercel KV, and Firestore behind one `RawStore` seam.

**Everything here is synthetic and illustrative — no licensed NCQA value sets,
no real EHR connectivity, demo purposes only.**

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000 → "Seed synthetic data" → "Run Analytics"
```

CLI equivalents: `SEED_LIMIT=120 npm run seed` and `npm run engine`.

The assistant works with no configuration (a deterministic tool router covers
every tool); set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) to switch it
to real tool-calling.

## The demo arc (works fully offline / keyless)

1. **Ask the front door** (`/`): "Where's our biggest quality dollar opportunity?"
2. **See the gap** (`/measures/HBD`): most of the denominator is *open — needs
   clinical data*; claims alone can't close it.
3. **Price the lever** (`/analytics`): the emphasis bar shows which EHR platform
   sits on the gaps; the simulator flips contract thresholds live.
4. **Become the provider** (sidebar → *View as Reliant Medical Group*): the
   shell visibly changes to the provider portal.
5. **Connect the rails** (`/provider/connect`): brand-tailored wizard —
   register → validate CapabilityStatement → test query.
6. **Sync closes gaps** (same page, connected state): one clinical-data pull;
   the sync panel shows per-measure rate movement and dollars unlocked.
7. **Bidirectional** (`/provider/payer-access`): CMS-0057-F Provider Access API
   attestation — the same rails, the other direction.
8. **The money moved** (back to `/` and `/contracts`): "+N gaps closed via
   clinical data", earned column up, residual tail routed to `/outreach`.

## What's in here

- **10 HEDIS measures** in three ECDS data tiers — Tier 1 claims-only (BCS,
  COL, CIS, WCV), Tier 2 USCDI v3 (HBD, CBP, DSF-E, AMM), Tier 3 CCDA (FUM,
  PND-E) — value sets shared between the seed and the measure logic
  (`src/lib/hedis/valuesets.ts`).
- **Pure three-pass engine** (`src/lib/hedis/engine.ts` → `computeResults`):
  claims pass, clinical pass (typed missing-data discriminator), roster/queue
  routing — fully unit-tested.
- **Request snapshot** (`src/lib/data/snapshot.ts`): every read surface loads
  the store once per request via `React.cache()` with prebuilt indexes.
- **Payer console**: command center with an embedded assistant, measures with
  bullet bars vs target, analytics/simulator with live contract-threshold
  callouts, RAF/HCC recapture, value-based contract economics, actionable
  rosters (CSV), outreach queue + campaigns, PSV audit trail, ECDS report.
- **Provider portal** (separate shell, Reliant-branded): practice dashboard,
  per-clinician panel worklist, stateful EHR connection (wizard → status +
  clinical sync with rate-shift dumbbells), Provider Access API onboarding,
  the provider's own contract view.
- **Agent** (`src/lib/agent/`): 15 typed tools with hand-rolled JSON-Schema
  arg validation; OpenAI tool-calling loop *or* a deterministic fallback
  router covering every tool, rendered as structured cards either way.

## Architecture

```
src/
  app/
    (payer)/        console shell + pages (/, measures, analytics, risk,
                    rosters, contracts, audit, providers, ecds-report,
                    outreach, chat)
    (provider)/     standalone portal shell + pages (/provider/...)
    api/            seed, engine, chat, rosters, campaigns, outreach,
                    ecds-report, ehr-connect/*, payer-access, ehr-push, health
  components/
    ui/             design system (Button, Card, DataTable, Badge, Field,
                    PageHeader, EmptyState, Stepper, Skeleton, …)
    charts/         BulletBar, StackedBar, BarList, TrendLine, Dumbbell,
                    Sparkline (validated palette, server-rendered)
    assistant/      AssistantPanel (dashboard front door) + ToolResultCards
    shell/          PayerSidebar, PayerTopBar, ProviderHeader, ProviderRibbon
    ehr/            ConnectionWizard, ConnectionStatusView, SyncResultPanel
  lib/
    data/           types, RawStore repository (json/kv/firestore), snapshot,
                    seed (deterministic synthetic data)
    hedis/          valuesets, measure specs, pure engine, CLI
    agent/          tools, validate, chat orchestrator, recommendations
    analytics/      gap values, simulator math, trends, measure targets
    risk/ contracts/ rosters/ outreach/ audit/ ehr/ payer/ provider/
    shared/         hash, collections, dates, format
    nav.ts          single source of truth for both shells' navigation
```

### Storage

All persistence goes through `RawStore` (`src/lib/data/repository.ts`):
Firestore when `FIREBASE_SERVICE_ACCOUNT` is set, Vercel KV when
`KV_REST_API_URL` is set, local JSON files under `data/store/` otherwise.

## Development

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint flat config
npm run test        # vitest — measures, engine, projection, agent, shared
npm run build
```

CI runs all four on every push (`.github/workflows/ci.yml`).

## Deliberately out of scope

Licensed HEDIS technical specifications / NCQA value sets, live CHPL/Lantern/
NPPES integration, real EHR or HIE connectivity, actual IDSS submission
formatting, CQL execution, licensed CMS-HCC software.
