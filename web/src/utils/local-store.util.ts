import type { ReviewStore, RunsStore, StoredRun } from '@/interfaces/local-store.interface';
import type { ReviewCard, ReviewEvent } from '@/interfaces/srs.interface';

/**
 * Scored runs and review cards on the device. IndexedDB holds thousands of results (each
 * ~5 KB) where localStorage would hit its ~5 MB quota; memory stores stand in where IndexedDB
 * is missing.
 */

const DB_NAME = 'coach';
/** 1: runs. 2: review cards and answers (plan v2, V2a). */
const DB_VERSION = 2;
const RUNS = 'runs';
const CARDS = 'cards';
const REVIEWS = 'reviews';
const BY_PROFILE = 'profileId';

const request = <T>(operation: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('IndexedDB request failed'));
  });

const done = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write aborted'));
  });

// Card and answer ids are unique within a profile only, so their key includes the profile.
const createStore = (database: IDBDatabase, name: string, keyPath: string | string[]): void => {
  database.createObjectStore(name, { keyPath }).createIndex(BY_PROFILE, BY_PROFILE);
};
const PROFILE_KEY = [BY_PROFILE, 'id'];

/** Each version only adds stores, so data written by an older app is kept. */
const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> => {
  const opening = factory.open(DB_NAME, DB_VERSION);
  opening.onupgradeneeded = (event) => {
    const database = opening.result;
    if (event.oldVersion < 1) createStore(database, RUNS, 'id');
    if (event.oldVersion < 2) {
      createStore(database, CARDS, PROFILE_KEY);
      createStore(database, REVIEWS, PROFILE_KEY);
    }
  };
  return request(opening);
};

const databases = new WeakMap<IDBFactory, Promise<IDBDatabase>>();

const databaseFor = (factory: IDBFactory): Promise<IDBDatabase> => {
  const known = databases.get(factory);
  if (known) return known;
  const opened = openDatabase(factory);
  databases.set(factory, opened);
  return opened;
};

const objectStore = async (
  factory: IDBFactory,
  name: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> =>
  (await databaseFor(factory)).transaction(name, mode).objectStore(name);

const removeByProfile = async (store: IDBObjectStore, profileId: string): Promise<void> => {
  const keys = await request(store.index(BY_PROFILE).getAllKeys(profileId));
  await Promise.all(keys.map((key) => request(store.delete(key))));
};

const indexedDbStore = (factory: IDBFactory): RunsStore => {
  const store = (mode: IDBTransactionMode): Promise<IDBObjectStore> =>
    objectStore(factory, RUNS, mode);
  return {
    add: async (run) => {
      await request((await store('readwrite')).add(run));
    },
    put: async (run) => {
      await request((await store('readwrite')).put(run));
    },
    get: async (id) =>
      ((await request((await store('readonly')).get(id))) as StoredRun | undefined) ?? null,
    list: async (profileId) =>
      (await request((await store('readonly')).index(BY_PROFILE).getAll(profileId))) as StoredRun[],
    removeProfile: async (profileId) => {
      await removeByProfile(await store('readwrite'), profileId);
    },
    clear: async () => {
      await request((await store('readwrite')).clear());
    },
  };
};

const indexedDbReviewStore = (factory: IDBFactory): ReviewStore => {
  const write = async (names: string[]): Promise<IDBTransaction> =>
    (await databaseFor(factory)).transaction(names, 'readwrite');
  const listOf = async <T>(name: string, profileId: string): Promise<T[]> =>
    (await request(
      (await objectStore(factory, name, 'readonly')).index(BY_PROFILE).getAll(profileId),
    )) as T[];
  return {
    listCards: (profileId) => listOf<ReviewCard>(CARDS, profileId),
    putCards: async (cards) => {
      const transaction = await write([CARDS]);
      cards.forEach((card) => transaction.objectStore(CARDS).put(card));
      await done(transaction);
    },
    saveAnswer: async (card, event) => {
      const transaction = await write([CARDS, REVIEWS]);
      transaction.objectStore(CARDS).put(card);
      transaction.objectStore(REVIEWS).put(event);
      await done(transaction);
    },
    listReviews: (profileId) => listOf<ReviewEvent>(REVIEWS, profileId),
    putReviews: async (events) => {
      const transaction = await write([REVIEWS]);
      const reviews = transaction.objectStore(REVIEWS);
      for (const event of events) {
        const kept = await request(reviews.count([event.profileId, event.id]));
        if (kept === 0) reviews.put(event);
      }
      await done(transaction);
    },
    removeProfile: async (profileId) => {
      const transaction = await write([CARDS, REVIEWS]);
      await Promise.all([
        removeByProfile(transaction.objectStore(CARDS), profileId),
        removeByProfile(transaction.objectStore(REVIEWS), profileId),
      ]);
      await done(transaction);
    },
    clear: async () => {
      const transaction = await write([CARDS, REVIEWS]);
      transaction.objectStore(CARDS).clear();
      transaction.objectStore(REVIEWS).clear();
      await done(transaction);
    },
  };
};

export const memoryStore = (): RunsStore => {
  const runs = new Map<string, StoredRun>();
  return {
    add: (run) => {
      if (runs.has(run.id)) return Promise.reject(new Error(`run ${run.id} exists`));
      runs.set(run.id, run);
      return Promise.resolve();
    },
    put: (run) => {
      runs.set(run.id, run);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(runs.get(id) ?? null),
    list: (profileId) =>
      Promise.resolve([...runs.values()].filter((r) => r.profileId === profileId)),
    removeProfile: (profileId) => {
      for (const [id, run] of runs) if (run.profileId === profileId) runs.delete(id);
      return Promise.resolve();
    },
    clear: () => {
      runs.clear();
      return Promise.resolve();
    },
  };
};

type ProfileRow = Pick<ReviewCard, 'id' | 'profileId'>;

const rowKey = ({ profileId, id }: ProfileRow): string => `${profileId}\u0000${id}`;

const ofProfile = <T extends ProfileRow>(rows: Map<string, T>, profileId: string): T[] =>
  [...rows.values()].filter((row) => row.profileId === profileId);

const dropProfile = <T extends ProfileRow>(rows: Map<string, T>, profileId: string): void => {
  for (const [key, row] of rows) if (row.profileId === profileId) rows.delete(key);
};

export const memoryReviewStore = (): ReviewStore => {
  const cards = new Map<string, ReviewCard>();
  const reviews = new Map<string, ReviewEvent>();
  return {
    listCards: (profileId) => Promise.resolve(ofProfile(cards, profileId)),
    putCards: (added) => {
      added.forEach((card) => cards.set(rowKey(card), card));
      return Promise.resolve();
    },
    saveAnswer: (card, event) => {
      cards.set(rowKey(card), card);
      reviews.set(rowKey(event), event);
      return Promise.resolve();
    },
    listReviews: (profileId) => Promise.resolve(ofProfile(reviews, profileId)),
    putReviews: (events) => {
      events.filter((e) => !reviews.has(rowKey(e))).forEach((e) => reviews.set(rowKey(e), e));
      return Promise.resolve();
    },
    removeProfile: (profileId) => {
      dropProfile(cards, profileId);
      dropProfile(reviews, profileId);
      return Promise.resolve();
    },
    clear: () => {
      cards.clear();
      reviews.clear();
      return Promise.resolve();
    },
  };
};

let shared: RunsStore | null = null;
let sharedReviews: ReviewStore | null = null;

/** The device's run store (one per app run). */
export const runsStore = (): RunsStore => {
  shared ??= typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore(indexedDB);
  return shared;
};

/** The device's review card store (same database as the runs). */
export const reviewStore = (): ReviewStore => {
  sharedReviews ??=
    typeof indexedDB === 'undefined' ? memoryReviewStore() : indexedDbReviewStore(indexedDB);
  return sharedReviews;
};

/** Tests: start from empty stores backed by the given factory (or memory). */
export const resetRunsStore = (factory?: IDBFactory): void => {
  shared = factory ? indexedDbStore(factory) : memoryStore();
  sharedReviews = factory ? indexedDbReviewStore(factory) : memoryReviewStore();
};
