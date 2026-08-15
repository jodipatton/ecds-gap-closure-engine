// Simulated EHR clinical-data pull.
//
// In production this would exchange a backend-services JWT / client-credentials
// token and page through FHIR Bulk Data or per-resource queries. Here we
// synthesize the *exact* FHIR-shaped resources each Tier-2/3 (and COL
// document) measure's `satisfiedByClinical` looks for, but only for members
// whose attributed PCP is this provider — i.e. exactly the data a real EHR
// connection for this practice would surface. The engine is then re-run so
// the gap impact is real and visible end-to-end.

import { repos, readSeedSummary } from '@/lib/data/repository';
import { runEngine } from '@/lib/hedis/engine';
import { recordAudit, psvFor } from '@/lib/audit/audit';
import { gapValue } from '@/lib/analytics/projection';
import type {
  Condition,
  DocumentReference,
  MeasureGap,
  MedicationRequest,
  Observation
} from '@/lib/data/types';

interface Synthesized {
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  documents: DocumentReference[];
}

// Build the clinical resource(s) that close a single open gap for a member,
// keyed by the measure. Returns null for measures with no clinical path
// (pure Tier-1 claims measures).
function resourcesForGap(
  measureId: string,
  memberId: string,
  my: number,
  n: number
): Synthesized | null {
  const eff = `${my}-06-15`;
  const id = (kind: string) => `SYNC-${measureId}-${memberId}-${kind}-${n}`;
  const empty: Synthesized = { observations: [], conditions: [], medications: [], documents: [] };

  switch (measureId) {
    case 'HBD':
      return {
        ...empty,
        observations: [{
          id: id('a1c'),
          memberId,
          loinc: '4548-4',
          display: 'Hemoglobin A1c',
          valueQuantity: { value: 6.8, unit: '%' },
          effectiveDate: eff
        }]
      };
    case 'CBP':
      return {
        ...empty,
        observations: [
          { id: id('sys'), memberId, loinc: '8480-6', display: 'Systolic BP', valueQuantity: { value: 124, unit: 'mmHg' }, effectiveDate: eff },
          { id: id('dia'), memberId, loinc: '8462-4', display: 'Diastolic BP', valueQuantity: { value: 78, unit: 'mmHg' }, effectiveDate: eff }
        ]
      };
    case 'DSF-E':
      return {
        ...empty,
        observations: [{
          id: id('phq'),
          memberId,
          loinc: '44249-1',
          display: 'PHQ-9 total score',
          valueQuantity: { value: 4, unit: 'score' },
          effectiveDate: eff
        }]
      };
    case 'AMM':
      return {
        ...empty,
        medications: [{
          id: id('rx'),
          memberId,
          rxnormOrName: 'sertraline',
          authoredOn: `${my}-02-01`,
          status: 'active',
          daysSupply: 90
        }]
      };
    case 'FUM':
      return {
        ...empty,
        documents: [{
          id: id('dc'),
          memberId,
          loincType: '18842-5', // Discharge summary
          date: eff,
          presentInIndex: true
        }]
      };
    case 'PND-E':
      return {
        ...empty,
        documents: [{
          id: id('pp'),
          memberId,
          loincType: '57133-1', // Postpartum care note
          date: eff,
          presentInIndex: true
        }]
      };
    case 'COL':
      return {
        ...empty,
        documents: [{
          id: id('col'),
          memberId,
          loincType: '34117-2', // Colonoscopy report
          date: eff,
          presentInIndex: true
        }]
      };
    default:
      return null; // BCS / CIS / WCV have no clinical confirmation path
  }
}

const ECDS_RESOURCES = ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'DocumentReference', 'Encounter'];

export interface SyncResult {
  ok: true;
  provider: { npi: string; organizationName: string; ehrPlatform: string | null };
  attributedMembers: number;
  recordsSynced: number;
  openGapsBefore: number;
  openGapsAfter: number;
  gapsClosed: number;
  dollarsUnlocked: number;
  byMeasure: Array<{ measureId: string; closed: number }>;
  /** Plan-wide rate movement per touched measure (drives the dumbbells). */
  rateShift: Array<{ measureId: string; before: number; after: number }>;
}

function countOpen(gaps: MeasureGap[], memberIds: Set<string>): number {
  return gaps.filter((g) => memberIds.has(g.memberId) && g.status.startsWith('open-')).length;
}

export async function syncProviderClinicalData(npi: string): Promise<SyncResult> {
  const [providers, attribution, gaps, connections, summary, resultsBefore] = await Promise.all([
    repos.providers.list(),
    repos.attribution.list(),
    repos.gaps.list(),
    repos.ehrConnections.list(),
    readSeedSummary(),
    repos.hedisResults.list()
  ]);

  const provider = providers.find((p) => p.npi === npi);
  if (!provider) throw new Error('Provider not found');

  const my = summary?.measurementYear ?? new Date().getFullYear();
  const attributedMemberIds = new Set(
    attribution.filter((a) => a.pcp?.npi === npi).map((a) => a.memberId)
  );

  const openForProvider = gaps.filter(
    (g) => attributedMemberIds.has(g.memberId) && g.status.startsWith('open-')
  );
  const openGapsBefore = openForProvider.length;

  // Synthesize the clinical resources that close each addressable gap.
  const add: Synthesized = { observations: [], conditions: [], medications: [], documents: [] };
  let n = 0;
  const byMeasureMap = new Map<string, number>();
  for (const g of openForProvider) {
    const r = resourcesForGap(g.measureId, g.memberId, my, n++);
    if (!r) continue;
    add.observations.push(...r.observations);
    add.conditions.push(...r.conditions);
    add.medications.push(...r.medications);
    add.documents.push(...r.documents);
    byMeasureMap.set(g.measureId, (byMeasureMap.get(g.measureId) ?? 0) + 1);
  }

  const recordsSynced =
    add.observations.length + add.conditions.length + add.medications.length + add.documents.length;

  // Persist appended clinical data.
  if (recordsSynced > 0) {
    const [obs, cond, rx, docs] = await Promise.all([
      repos.observations.list(),
      repos.conditions.list(),
      repos.medications.list(),
      repos.documents.list()
    ]);
    await Promise.all([
      add.observations.length ? repos.observations.put([...obs, ...add.observations]) : Promise.resolve(),
      add.conditions.length ? repos.conditions.put([...cond, ...add.conditions]) : Promise.resolve(),
      add.medications.length ? repos.medications.put([...rx, ...add.medications]) : Promise.resolve(),
      add.documents.length ? repos.documents.put([...docs, ...add.documents]) : Promise.resolve()
    ]);
  }

  const now = new Date().toISOString();
  const existing = connections.find((c) => c.providerNpi === npi);

  // Provenance / PSV audit entry for the acquisition.
  const psv = psvFor(provider);
  await recordAudit({
    source: 'ehr-sync',
    sourceSystem: `${provider.ehrPlatform ?? 'SMART'} FHIR R4`,
    providerNpi: provider.npi,
    organizationName: provider.organizationName,
    resourceCounts: {
      Observation: add.observations.length,
      Condition: add.conditions.length,
      MedicationRequest: add.medications.length,
      DocumentReference: add.documents.length
    },
    recordsAccepted: recordsSynced,
    recordsRejected: 0,
    psvStatus: psv.psvStatus,
    psvBasis: psv.psvBasis,
    initiatedBy: 'provider portal · EHR sync'
  });

  // Re-run the engine so gap/rate impact is real.
  const engineRun = await runEngine({ measurementYear: my });

  const gapsAfter = await repos.gaps.list();
  const openGapsAfter = countOpen(gapsAfter, attributedMemberIds);
  const gapsClosed = Math.max(0, openGapsBefore - openGapsAfter);

  const byMeasure = [...byMeasureMap.entries()]
    .map(([measureId, closed]) => ({ measureId, closed }))
    .sort((a, b) => b.closed - a.closed);

  const beforeById = new Map(resultsBefore.map((r) => [r.measureId, r]));
  const rateShift = engineRun.results
    .filter((r) => byMeasureMap.has(r.measureId))
    .map((r) => ({
      measureId: r.measureId,
      before: beforeById.get(r.measureId)?.rate ?? r.rate,
      after: r.rate
    }));

  const dollarsUnlocked = byMeasure.reduce((s, m) => {
    const tier = beforeById.get(m.measureId)?.dataTier ?? 'uscdi-v3';
    return s + m.closed * gapValue(tier);
  }, 0);

  // Mark the connection active and persist the sync summary (drives the
  // provider sync panel and the payer dashboard's "since last sync" chips).
  if (existing) {
    await repos.ehrConnections.upsertOne(
      {
        ...existing,
        lastTokenRefresh: now,
        lastSuccessfulSync: now,
        totalRecordsSynced: existing.totalRecordsSynced + recordsSynced,
        connectionStatus: 'active',
        supportedResources: existing.supportedResources.length
          ? existing.supportedResources
          : ECDS_RESOURCES,
        lastErrorMessage: null,
        lastSyncSummary: { at: now, recordsSynced, gapsClosed, dollarsUnlocked, byMeasure, rateShift }
      },
      'providerNpi'
    );
  }

  return {
    ok: true,
    provider: { npi: provider.npi, organizationName: provider.organizationName, ehrPlatform: provider.ehrPlatform },
    attributedMembers: attributedMemberIds.size,
    recordsSynced,
    openGapsBefore,
    openGapsAfter,
    gapsClosed,
    dollarsUnlocked,
    byMeasure,
    rateShift
  };
}
