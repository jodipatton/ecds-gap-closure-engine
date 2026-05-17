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
  AuditEvent,
  Campaign,
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
  PayerAccessGrant,
  ProviderOrg,
  SeedSummary,
  ValueContract
} from './types';

export type Backend = 'firestore' | 'kv' | 'json';

// Backend precedence: Firestore (a service-account credential is present) →
// Vercel KV → local JSON file. Local dev with no creds stays on JSON.
const BACKEND: Backend = process.env.FIREBASE_SERVICE_ACCOUNT
  ? 'firestore'
  : process.env.KV_REST_API_URL
    ? 'kv'
    : 'json';

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

// ---- Firestore backend ----------------------------------------------------

// Mirrors the KV layout: each collection is one Firestore document whose
// `data` field holds the whole array. This keeps list/put/upsertOne/clear
// semantics identical to the other backends. (Firestore caps a document at
// 1 MiB; the demo's largest collection — claims for ~120 members — is well
// under that. Move to per-document storage if seeds grow much larger.)

const FS_COLLECTION = 'ecds_store';

// Cache the *initialization promise* (not just the client). Server components
// fan out repo reads via Promise.all, so fsDb() is called concurrently; a
// single shared promise guarantees settings() runs exactly once and strictly
// before any read/write (calling it after the client is used throws).
let _fsInit: Promise<any> | null = null;
function fsDb(): Promise<any> {
  if (_fsInit) return _fsInit;
  _fsInit = (async () => {
    // firebase-admin is CJS; normalize the dynamic-import interop shape.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = await import('firebase-admin');
    const admin: any = mod.default ?? mod;
    if (admin.apps.length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? '';
      const json = raw.trim().startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(json);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const db = admin.firestore();
    // The engine emits optional fields (e.g. MeasureGap.missingDataElement)
    // as `undefined` on closed gaps; Firestore rejects undefined unless told
    // to skip it. settings() must run once, before any operation — guarded in
    // case a warm lambda already configured the singleton.
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* already initialized on a warm instance — safe to ignore */
    }
    return db;
  })();
  return _fsInit;
}

async function fsRead<T>(docId: string, fallback: T): Promise<T> {
  const db = await fsDb();
  const snap = await db.collection(FS_COLLECTION).doc(docId).get();
  if (!snap.exists) return fallback;
  const val = snap.data()?.data;
  return (val ?? fallback) as T;
}

async function fsWrite(docId: string, data: unknown): Promise<void> {
  const db = await fsDb();
  await db.collection(FS_COLLECTION).doc(docId).set({ data, updatedAt: Date.now() });
}

function makeFirestoreRepo<T>(collection: string): CollectionRepo<T> {
  return {
    list: () => fsRead<T[]>(collection, []),
    put: (items) => fsWrite(collection, items),
    async upsertOne(item, key) {
      const items = await fsRead<T[]>(collection, []);
      const idx = items.findIndex((x) => (x as any)[key] === (item as any)[key]);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await fsWrite(collection, items);
    },
    clear: () => fsWrite(collection, [])
  };
}

// ---- Public registry ------------------------------------------------------

const make =
  BACKEND === 'firestore'
    ? makeFirestoreRepo
    : BACKEND === 'kv'
      ? makeKvRepo
      : makeJsonRepo;

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
  ehrConnections: make<EhrConnection>('ehrConnections'),
  campaigns: make<Campaign>('campaigns'),
  payerAccess: make<PayerAccessGrant>('payerAccess'),
  auditEvents: make<AuditEvent>('auditEvents'),
  contracts: make<ValueContract>('valueContracts')
};

// ---- Seed summary (single object, not a collection) -----------------------

const SEED_SUMMARY_FILE = 'seedSummary.json';
const SEED_SUMMARY_KV_KEY = 'ecds:seedSummary';

const SEED_SUMMARY_FS_DOC = 'seedSummary';

export async function readSeedSummary(): Promise<SeedSummary | null> {
  if (BACKEND === 'firestore') {
    return fsRead<SeedSummary | null>(SEED_SUMMARY_FS_DOC, null);
  }
  if (BACKEND === 'kv') {
    const kv = await kvClient();
    const val = (await kv.get(SEED_SUMMARY_KV_KEY)) as SeedSummary | null;
    return val ?? null;
  }
  return readJsonFile<SeedSummary | null>(SEED_SUMMARY_FILE, null);
}

export async function writeSeedSummary(s: SeedSummary): Promise<void> {
  if (BACKEND === 'firestore') {
    await fsWrite(SEED_SUMMARY_FS_DOC, s);
    return;
  }
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
