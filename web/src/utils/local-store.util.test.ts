import { IDBFactory } from 'fake-indexeddb';

import type { StoredRun } from '@/interfaces/local-store.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';

import { memoryStore, resetRunsStore, runsStore } from './local-store.util';

const run = (id: string, profileId: string): StoredRun => ({
  id,
  profileId,
  itemId: 'sound:v01:mirror:see',
  text: 'see',
  modelVersion: 'w2v.mm8@ios',
  createdAt: '2026-10-20T03:00:00.000Z',
  disputed: false,
  result: { id } as unknown as AssessmentResponse,
});

describe.each([
  ['IndexedDB', () => resetRunsStore(new IDBFactory())],
  ['memory', () => resetRunsStore()],
])('runs store (%s)', (_name, reset) => {
  beforeEach(reset);

  it('keeps runs per profile and updates them', async () => {
    const store = runsStore();
    await store.add(run('a', 'default'));
    await store.add(run('b', 'default'));
    await store.add(run('c', 'p2'));
    expect((await store.list('default')).map((r) => r.id).sort()).toEqual(['a', 'b']);
    await store.put({ ...run('a', 'default'), disputed: true });
    expect((await store.get('a'))?.disputed).toBe(true);
    expect(await store.get('missing')).toBeNull();
    await store.removeProfile('default');
    expect(await store.list('default')).toEqual([]);
    expect(await store.list('p2')).toHaveLength(1);
  });

  it('refuses a duplicate id on add', async () => {
    const store = runsStore();
    await store.add(run('a', 'default'));
    await expect(store.add(run('a', 'default'))).rejects.toBeTruthy();
  });
});

it('memory store is independent per instance', async () => {
  const one = memoryStore();
  await one.add(run('x', 'default'));
  expect(await memoryStore().list('default')).toEqual([]);
});
