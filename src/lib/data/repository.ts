// Repository layer. JSON-file backed by default, swappable for Firestore.
// All reads/writes funnel through these collections so a Firestore adapter
// implementing the same interfaces can drop in without touching engine code.

import { promises as fs } from 'fs';
import path from 'path';
import type {
  Claim,
  Condition,
  DocumentReference,
  EngagementQueueEntry,
  HedisResult,
  MeasureGap,
  Member,
  MemberAttribution,
  MedicationRequest,
  Observation,
  ProviderOrg,
  SeedSummary
} from './types';

const STORE_DIR = path.join(process.cwd(), 'data', 'store');

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureStore();
  const p = path.join(STORE_DIR, file);
  try {
    const buf = await fs.readFile(p, 'utf-8');
    return JSON.parse(buf) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureStore();
  const p = path.join(STORE_DIR, file);
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, p);
}

export interface CollectionRepo<T> {
  list(): Promise<T[]>;
  put(items: T[]): Promise<void>;
  upsertOne(item: T, key: keyof T): Promise<void>;
  clear(): Promise<void>;
}

function makeRepo<T>(file: string): CollectionRepo<T> {
  return {
    list: () => readJson<T[]>(file, []),
    put: (items) => writeJson(file, items),
    async upsertOne(item, key) {
      const items = await readJson<T[]>(file, []);
      const idx = items.findIndex((x) => (x as any)[key] === (item as any)[key]);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await writeJson(file, items);
    },
    clear: () => writeJson(file, [])
  };
}

export const repos = {
  members: makeRepo<Member>('members.json'),
  claims: makeRepo<Claim>('claims.json'),
  attribution: makeRepo<MemberAttribution>('memberAttribution.json'),
  providers: makeRepo<ProviderOrg>('providerDirectory.json'),
  observations: makeRepo<Observation>('observations.json'),
  conditions: makeRepo<Condition>('conditions.json'),
  medications: makeRepo<MedicationRequest>('medications.json'),
  documents: makeRepo<DocumentReference>('documents.json'),
  hedisResults: makeRepo<HedisResult>('hedisResults.json'),
  gaps: makeRepo<MeasureGap>('gaps.json'),
  engagement: makeRepo<EngagementQueueEntry>('engagementQueue.json')
};

export async function readSeedSummary(): Promise<SeedSummary | null> {
  return readJson<SeedSummary | null>('seedSummary.json', null);
}

export async function writeSeedSummary(s: SeedSummary): Promise<void> {
  await writeJson('seedSummary.json', s);
}

export async function isSeeded(): Promise<boolean> {
  return (await readSeedSummary()) !== null;
}
