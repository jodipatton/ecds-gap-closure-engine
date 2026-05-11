// Repository layer. Picks one of two backends at module init:
//
//   - **Vercel KV** (when KV_REST_API_URL is in the environment, set
//     automatically when you provision Vercel KV / Upstash Redis in the
//     Vercel dashboard). Each collection is stored as one JSON-array value
//     under a single key. Works inside Vercel's read-only serverless runtime.
//
//   - **JSON file** fallback (default for local dev). Same on-disk layout
//     as before: one file per collection under data/store/.
//
// The same `CollectionRepo<T>` interface is exposed either way so the engine,
// seed, UI, and agent tools never need to know which backend is active.

import { promises as fs } from 'fs';
import path from 'path';
import type {
  Claim,
  Condition,
  DocumentReference,
  EhrConnection,
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

export type Backend = 'kv' | 'json';

const BACKEND: Backend = process.env.KV_REST_API_URL ? 'kv' : 'json';

export interface CollectionRepo<T> {
  list(): Promise<T[]>;
  put(items: T[]): Promise<void>;
  upsertOne(item: T, key: keyof T): Promise<void>;
  clear(): Promise<void>;
}

// ---- JSON file backend ----------------------------------------------------

const STORE_DIR = path.join(process.cwd(), 'data', 'store');

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
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

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await ensureStore();
  const p = path.join(STORE_DIR, file);
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, p);
}

function makeJsonRepo<T>(collection: string): CollectionRepo<T> {
  const file = `${collection}.json`;
  return {
    list: () => readJsonFile<T[]>(file, []),
    put: (items) => writeJsonFile(file, items),
    async upsertOne(item, key) {
      const items = await readJsonFile<T[]>(file, []);
      const idx = items.findIndex((x) => (x as any)[key] === (item as any)[key]);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await writeJsonFile(file, items);
    },
    clear: () => writeJsonFile(file, [])
  };
}

// ---- Vercel KV backend ----------------------------------------------------

// Lazy-import so the JSON path works in environments where @vercel/kv isn't
// installed (e.g. ad-hoc node scripts without npm install).
let _kv: any = null;
async function kvClient() {
  if (_kv) return _kv;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import('@vercel/kv');
  _kv = mod.kv;
  return _kv;
}

function kvKey(collection: string) {
  return `ecds:${collection}`;
}

function makeKvRepo<T>(collection: string): CollectionRepo<T> {
  const key = kvKey(collection);
  return {
    async list() {
      const kv = await kvClient();
      const val = (await kv.get(key)) as T[] | null;
      return val ?? [];
    },
    async put(items) {
      const kv = await kvClient();
      await kv.set(key, items);
    },
    async upsertOne(item, k) {
      const kv = await kvClient();
      const items = ((await kv.get(key)) as T[] | null) ?? [];
      const idx = items.findIndex((x: any) => x[k] === (item as any)[k]);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await kv.set(key, items);
    },
    async clear() {
      const kv = await kvClient();
      await kv.set(key, []);
    }
  };
}

// ---- Public registry ------------------------------------------------------

const make = BACKEND === 'kv' ? makeKvRepo : makeJsonRepo;

export const repos = {
  members: make<Member>('members'),
  claims: make<Claim>('claims'),
  attribution: make<MemberAttribution>('memberAttribution'),
  providers: make<ProviderOrg>('providerDirectory'),
  observations: make<Observation>('observations'),
  conditions: make<Condition>('conditions'),
  medications: make<MedicationRequest>('medications'),
  documents: make<DocumentReference>('documents'),
  hedisResults: make<HedisResult>('hedisResults'),
  gaps: make<MeasureGap>('gaps'),
  engagement: make<EngagementQueueEntry>('engagementQueue'),
  ehrConnections: make<EhrConnection>('ehrConnections')
};

// ---- Seed summary (single object, not a collection) -----------------------

const SEED_SUMMARY_FILE = 'seedSummary.json';
const SEED_SUMMARY_KV_KEY = 'ecds:seedSummary';

export async function readSeedSummary(): Promise<SeedSummary | null> {
  if (BACKEND === 'kv') {
    const kv = await kvClient();
    const val = (await kv.get(SEED_SUMMARY_KV_KEY)) as SeedSummary | null;
    return val ?? null;
  }
  return readJsonFile<SeedSummary | null>(SEED_SUMMARY_FILE, null);
}

export async function writeSeedSummary(s: SeedSummary): Promise<void> {
  if (BACKEND === 'kv') {
    const kv = await kvClient();
    await kv.set(SEED_SUMMARY_KV_KEY, s);
    return;
  }
  await writeJsonFile(SEED_SUMMARY_FILE, s);
}

export async function isSeeded(): Promise<boolean> {
  return (await readSeedSummary()) !== null;
}

export function activeBackend(): Backend {
  return BACKEND;
}
