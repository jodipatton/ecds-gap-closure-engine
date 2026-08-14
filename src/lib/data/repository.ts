// Repository layer. One narrow RawStore seam (read/write a whole value by
// key) with three interchangeable backends, picked at module init:
//
//   - **Firestore** (when FIREBASE_SERVICE_ACCOUNT is set): each collection is
//     one document whose `data` field holds the whole array.
//   - **Vercel KV** (when KV_REST_API_URL is set): each collection is one
//     JSON-array value under a single key.
//   - **JSON file** fallback (default for local dev): one file per collection
//     under data/store/.
//
// Every repo operation is written once against RawStore, so the engine, seed,
// UI, and agent tools never need to know which backend is active.

import { promises as fs } from 'fs';
import path from 'path';
import type {
  AuditEvent,
  Campaign,
  Claim,
  FeedbackEntry,
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

/** The single backend seam: read/write one whole value per key. */
interface RawStore {
  read<T>(key: string, fallback: T): Promise<T>;
  write(key: string, data: unknown): Promise<void>;
}

// ---- JSON file backend ----------------------------------------------------

const STORE_DIR = path.join(process.cwd(), 'data', 'store');

const jsonStore: RawStore = {
  async read<T>(key: string, fallback: T): Promise<T> {
    const p = path.join(STORE_DIR, `${key}.json`);
    try {
      const buf = await fs.readFile(p, 'utf-8');
      return JSON.parse(buf) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return fallback;
      throw err;
    }
  },
  async write(key: string, data: unknown): Promise<void> {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const p = path.join(STORE_DIR, `${key}.json`);
    const tmp = `${p}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmp, p);
  }
};

// ---- Vercel KV backend ----------------------------------------------------

// Lazy-import so the JSON path works in environments where @vercel/kv isn't
// installed (e.g. ad-hoc node scripts without npm install).
let _kv: (typeof import('@vercel/kv'))['kv'] | null = null;
async function kvClient() {
  if (!_kv) _kv = (await import('@vercel/kv')).kv;
  return _kv;
}

const kvStore: RawStore = {
  async read<T>(key: string, fallback: T): Promise<T> {
    const kv = await kvClient();
    const val = (await kv.get(`ecds:${key}`)) as T | null;
    return val ?? fallback;
  },
  async write(key: string, data: unknown): Promise<void> {
    const kv = await kvClient();
    await kv.set(`ecds:${key}`, data);
  }
};

// ---- Firestore backend ----------------------------------------------------

// Mirrors the KV layout: each collection is one Firestore document whose
// `data` field holds the whole array. (Firestore caps a document at 1 MiB;
// the demo's largest collection — claims for ~120 members — is well under
// that. Move to per-document storage if seeds grow much larger.)

const FS_COLLECTION = 'ecds_store';

// Cache the *initialization promise* (not just the client). Server components
// fan out repo reads via Promise.all, so fsDb() is called concurrently; a
// single shared promise guarantees settings() runs exactly once and strictly
// before any read/write (calling it after the client is used throws).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _fsInit: Promise<any> | null = null;
function fsDb() {
  if (_fsInit) return _fsInit;
  _fsInit = (async () => {
    // firebase-admin is CJS; normalize the dynamic-import interop shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('firebase-admin');
    const admin = mod.default ?? mod;
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

const firestoreStore: RawStore = {
  async read<T>(key: string, fallback: T): Promise<T> {
    const db = await fsDb();
    const snap = await db.collection(FS_COLLECTION).doc(key).get();
    if (!snap.exists) return fallback;
    const val = snap.data()?.data;
    return (val ?? fallback) as T;
  },
  async write(key: string, data: unknown): Promise<void> {
    const db = await fsDb();
    await db.collection(FS_COLLECTION).doc(key).set({ data, updatedAt: Date.now() });
  }
};

// ---- Repo factory (written once, against RawStore) ------------------------

const store: RawStore =
  BACKEND === 'firestore' ? firestoreStore : BACKEND === 'kv' ? kvStore : jsonStore;

function makeRepo<T>(collection: string): CollectionRepo<T> {
  return {
    list: () => store.read<T[]>(collection, []),
    put: (items) => store.write(collection, items),
    async upsertOne(item, key) {
      const items = await store.read<T[]>(collection, []);
      const idx = items.findIndex((x) => x[key] === item[key]);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await store.write(collection, items);
    },
    clear: () => store.write(collection, [])
  };
}

// ---- Public registry ------------------------------------------------------

export const repos = {
  members: makeRepo<Member>('members'),
  claims: makeRepo<Claim>('claims'),
  attribution: makeRepo<MemberAttribution>('memberAttribution'),
  providers: makeRepo<ProviderOrg>('providerDirectory'),
  observations: makeRepo<Observation>('observations'),
  conditions: makeRepo<Condition>('conditions'),
  medications: makeRepo<MedicationRequest>('medications'),
  documents: makeRepo<DocumentReference>('documents'),
  hedisResults: makeRepo<HedisResult>('hedisResults'),
  gaps: makeRepo<MeasureGap>('gaps'),
  engagement: makeRepo<EngagementQueueEntry>('engagementQueue'),
  ehrConnections: makeRepo<EhrConnection>('ehrConnections'),
  campaigns: makeRepo<Campaign>('campaigns'),
  payerAccess: makeRepo<PayerAccessGrant>('payerAccess'),
  auditEvents: makeRepo<AuditEvent>('auditEvents'),
  contracts: makeRepo<ValueContract>('valueContracts'),
  feedback: makeRepo<FeedbackEntry>('feedback')
};

// ---- Seed summary (single object, not a collection) -----------------------

export function readSeedSummary(): Promise<SeedSummary | null> {
  return store.read<SeedSummary | null>('seedSummary', null);
}

export function writeSeedSummary(s: SeedSummary): Promise<void> {
  return store.write('seedSummary', s);
}

export function activeBackend(): Backend {
  return BACKEND;
}
