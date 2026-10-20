import type { RunsStore, StoredRun } from '@/interfaces/local-store.interface';

/**
 * Scored runs on the device. IndexedDB holds thousands of results (each ~5 KB) where
 * localStorage would hit its ~5 MB quota; a memory store stands in where IndexedDB is missing.
 */

const DB_NAME = 'coach';
const DB_VERSION = 1;
const RUNS = 'runs';

const request = <T>(operation: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('IndexedDB request failed'));
  });

const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> => {
  const opening = factory.open(DB_NAME, DB_VERSION);
  opening.onupgradeneeded = () => {
    const store = opening.result.createObjectStore(RUNS, { keyPath: 'id' });
    store.createIndex('profileId', 'profileId');
  };
  return request(opening);
};

const indexedDbStore = (factory: IDBFactory): RunsStore => {
  let database: Promise<IDBDatabase> | null = null;
  const store = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => {
    database ??= openDatabase(factory);
    return (await database).transaction(RUNS, mode).objectStore(RUNS);
  };
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
      (await request(
        (await store('readonly')).index('profileId').getAll(profileId),
      )) as StoredRun[],
    removeProfile: async (profileId) => {
      const runs = await store('readwrite');
      const keys = await request(runs.index('profileId').getAllKeys(profileId));
      await Promise.all(keys.map((key) => request(runs.delete(key))));
    },
    clear: async () => {
      await request((await store('readwrite')).clear());
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

let shared: RunsStore | null = null;

/** The device's run store (one per app run). */
export const runsStore = (): RunsStore => {
  shared ??= typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore(indexedDB);
  return shared;
};

/** Tests: start from an empty store backed by the given factory (or memory). */
export const resetRunsStore = (factory?: IDBFactory): void => {
  shared = factory ? indexedDbStore(factory) : memoryStore();
};
