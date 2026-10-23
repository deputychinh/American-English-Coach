import { IDBFactory } from 'fake-indexeddb';

import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import type { StoredRun } from '@/interfaces/local-store.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import type { ReviewCard } from '@/interfaces/srs.interface';
import { newCard, reviewCard } from '@/utils/srs.util';

import { memoryStore, resetRunsStore, reviewStore, runsStore } from './local-store.util';

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

const NOW = new Date('2026-10-20T03:00:00.000Z');

const card = (itemId: string, profileId: string): ReviewCard =>
  newCard({ profileId, itemId, mode: ReviewMode.Listen }, NOW);

describe.each([
  ['IndexedDB', () => resetRunsStore(new IDBFactory())],
  ['memory', () => resetRunsStore()],
])('review store (%s)', (_name, reset) => {
  beforeEach(reset);

  it('keeps cards per profile and saves an answer with its card', async () => {
    const store = reviewStore();
    await store.putCards([
      card('w.cup', 'default'),
      card('w.desk', 'default'),
      card('w.cup', 'p2'),
    ]);
    const [first] = await store.listCards('p2');
    expect(first?.itemId).toBe('w.cup');
    const outcome = reviewCard({
      card: card('w.cup', 'default'),
      grade: ReviewGrade.Good,
      now: NOW,
    });
    await store.saveAnswer(outcome.card, outcome.event);
    const cards = await store.listCards('default');
    expect(cards).toHaveLength(2);
    expect(cards.find((c) => c.itemId === 'w.cup')?.reps).toBe(1);
    expect(await store.listReviews('default')).toEqual([outcome.event]);
    expect(await store.listReviews('p2')).toEqual([]);
    expect((await store.listCards('p2'))[0]?.reps).toBe(0);
  });

  it('restores answers without overwriting ones it already has', async () => {
    const store = reviewStore();
    const { event } = reviewCard({
      card: card('w.cup', 'default'),
      grade: ReviewGrade.Good,
      now: NOW,
    });
    await store.putReviews([event]);
    await store.putReviews([{ ...event, grade: ReviewGrade.Again }]);
    expect((await store.listReviews('default'))[0]?.grade).toBe(ReviewGrade.Good);
  });

  it('removes one profile or everything', async () => {
    const store = reviewStore();
    const { card: answered, event } = reviewCard({
      card: card('w.cup', 'default'),
      grade: ReviewGrade.Hard,
      now: NOW,
    });
    await store.saveAnswer(answered, event);
    await store.putCards([card('w.cup', 'p2')]);
    await store.removeProfile('default');
    expect(await store.listCards('default')).toEqual([]);
    expect(await store.listReviews('default')).toEqual([]);
    expect(await store.listCards('p2')).toHaveLength(1);
    await store.clear();
    expect(await store.listCards('p2')).toEqual([]);
  });
});

it('upgrading a version 1 database keeps its runs and adds the review stores', async () => {
  const factory = new IDBFactory();
  const opening = factory.open('coach', 1);
  opening.onupgradeneeded = () => {
    opening.result
      .createObjectStore('runs', { keyPath: 'id' })
      .createIndex('profileId', 'profileId');
  };
  const old = await new Promise<IDBDatabase>((resolve) => {
    opening.onsuccess = () => resolve(opening.result);
  });
  await new Promise<void>((resolve) => {
    const transaction = old.transaction('runs', 'readwrite');
    transaction.objectStore('runs').put(run('kept', 'default'));
    transaction.oncomplete = () => resolve();
  });
  old.close();

  resetRunsStore(factory);
  expect((await runsStore().list('default')).map((r) => r.id)).toEqual(['kept']);
  await reviewStore().putCards([card('w.cup', 'default')]);
  expect(await reviewStore().listCards('default')).toHaveLength(1);
});
