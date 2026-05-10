# ECDS Gap Closure Engine

A working HEDIS ECDS gap closure platform built per the Reimburse / OneUp
Health PRD. Extends the spirit of the `jodipatton/ccda` prototype: ingest
FHIR-normalized claims and clinical data, run measure logic across the full
eligible population, and produce actionable rosters by data tier and EHR
platform.

This project is self-contained — Next.js 14 App Router + TypeScript + Tailwind
on top of a JSON-file repository that is architecturally swappable for
Firestore.

## What's in here

- **10 HEDIS measures** across the three ECDS clinical-data tiers:
  - **Tier 1 — Claims only:** BCS, COL, CIS (combo 10), WCV
  - **Tier 2 — USCDI V3 discrete data:** HBD, CBP, DSF-E, AMM
  - **Tier 3 — Full CCDA:** FUM (30-day follow-up), PND-E (postpartum)
- **Three-pass engine** (`src/lib/hedis/engine.ts`):
  1. Claims analysis — eligible population + claims-only numerator
  2. Clinical data analysis — Observation / Condition / MedicationRequest /
     DocumentReference checks for remaining gaps; records the specific
     missing data element
  3. Roster generation — routes open gaps to the engagement queue with
     provider recommendations and incentive messaging
- **Provider directory + EHR mapping** with realistic platform distribution
  (~35% Epic, 20% Oracle Health, 15% Athena, 10% eCW, 10% Veradigm, 10%
  small/unknown). Architected for CHPL / Lantern / NPPES integration; this
  prototype uses synthetic data per scope-out.
- **Member attribution** — claims-derived PCP, last-visit date in MY,
  ~15% of members intentionally have no PCP to drive the engagement queue.
- **Engagement queue** — separate buckets for `no-visit`, `no-pcp`, and
  `gap-closeable`, each with two-sided incentive eligibility.
- **ECDS summary report** with measure rates, claims-vs-clinical numerator
  breakdown, exclusions, gap counts. CSV / JSON export.
- **Agent chat** with seven typed tools (list_measures, measures_with_most_gaps,
  measure_summary, ehr_platform_impact, engagement_queue_summary,
  members_missing_clinical_data, measure_spec). Uses OpenAI tool calling
  when `OPENAI_API_KEY` is set; falls back to a deterministic tool router
  so the demo always works.

## Quick start

```bash
cd ecds
npm install
cp .env.local.example .env.local   # optional — only OPENAI_API_KEY matters
npm run dev
# open http://localhost:3000

# In the dashboard, click "Seed synthetic data", then "Run ECDS engine".
```

You can also run the pipeline from the CLI:

```bash
SEED_LIMIT=120 npm run seed
npm run engine
```

## Architecture

```
src/
  app/                       Next.js App Router pages
    page.tsx                 dashboard
    measures/                measure index + drilldown
    providers/               provider roster + EHR impact
    engagement/              engagement queue
    ecds-report/             ECDS summary view
    chat/                    agent chat
    api/
      seed/                  POST /api/seed
      engine/                POST /api/engine
      ecds-report/           GET  /api/ecds-report?format=csv|json
      chat/                  POST /api/chat
  lib/
    data/
      types.ts               shared domain model
      repository.ts          JSON-file CollectionRepo<T> (Firestore-swappable)
      seed.ts                deterministic synthetic data generator
    hedis/
      util.ts                ageOn, continuousEnrollment, claim filters
      engine.ts              three-pass engine + EHR-impact aggregation
      run.ts                 CLI entry point
      measures/
        index.ts             measure registry
        bcs.ts col.ts cis.ts wcv.ts
        hbd.ts cbp.ts dsfe.ts amm.ts
        fum.ts pnde.ts
    agent/
      tools.ts               typed tool definitions (OpenAI tool schema)
      chat.ts                tool-call loop + deterministic fallback
  components/
    ui.tsx                   Card, StatTile, TierBadge, Pill, ProgressBar
    SeedAndRun.tsx           seed/run-engine controls
data/
  store/                     JSON files written by the repository layer
```

### Swapping in Firestore

Every read/write goes through `repos.<collection>` in
`src/lib/data/repository.ts`. To switch to Firestore, write a
`FirestoreCollectionRepo<T>` that implements the same `CollectionRepo<T>`
interface and have the `repos` factory pick the implementation off
`process.env.ECDS_DATA_BACKEND`. The engine, UI, and agent code are
oblivious to the backend.

## Scope notes (per PRD)

In:

- 10 HEDIS measures across three tiers and five clinical domains
- Claims engine + clinical-data engine + roster routing
- EHR-platform-aware gap routing
- Member attribution + engagement queue with incentive support
- ECDS report with claims/clinical numerator breakdown and CSV/JSON export
- Agent chat with typed tools

Out (deliberately):

- Licensed HEDIS technical specifications / official NCQA value sets — measure
  logic is illustrative, derived from publicly available guidance.
- Live CHPL / Lantern / NPPES integration — synthetic provider data only.
- Real EHR or HIE connectivity.
- Actual NCQA IDSS submission formatting.
- CQL execution engine.

The PRD references for measures 6–10 were not specified in the brief; those
five are illustrative, derived from publicly known ECDS measure shapes.

## End-to-end demo flow

1. Seed: 120 members, 40 providers, ~600 claims, ~80 observations, 10 conditions,
   ~10 medications, ~7 documents.
2. Engine: computes eligible/numerator/gaps for all 10 measures and writes
   `hedisResults`, per-member `gaps`, and the `engagementQueue`.
3. Dashboard: plan-wide rate, top-5 dollar-ranked measures, EHR-platform impact
   tile, engagement queue size.
4. Drill into HBD: see members closed by claims (none — Tier 2), closed by
   clinical (A1c <8.0% Observations), and open with the specific missing data
   element ("FHIR Observation LOINC 4548-4 with valueQuantity in measurement
   year").
5. Provider roster: see Epic / Oracle Health / Athena gap impact, prioritize
   FHIR-ready endpoints over unvalidated providers.
6. Engagement queue: members with no visit, no PCP, or gap-closeable —
   each with three suggested in-network providers and an incentive description.
7. ECDS report: export CSV/JSON for the customer.
8. Chat: "What is the gap-closure impact if we connect to Epic?" → grounded
   answer from `ehr_platform_impact` tool.
