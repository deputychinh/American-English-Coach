import { ReviewMode } from '@/enums/review.enum';
import type { StoredRun } from '@/interfaces/local-store.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import { resetRunsStore, reviewStore } from '@/utils/local-store.util';
import { newCard } from '@/utils/srs.util';

import { handleLocally, saveLocalRun } from './local-api.service';

const call = async (
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> => {
  const response = await handleLocally(new Request(`http://app.local/api/v1/${path}`, init));
  if (!response) throw new Error('not handled');
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
};

const phones = (verdicts: [string, string][]) =>
  verdicts.map(([symbol, verdict]) => ({
    symbol,
    verdict,
    gop: 0,
    visual: 'unavailable',
    error_id: null,
  }));

const take = (
  [id, itemId, createdAt]: [string, string, string],
  verdicts: [string, string][],
): StoredRun => {
  const result = {
    id,
    item_id: itemId,
    text: 'think',
    model_version: 'w2v.mm8@ios',
    words: [{ word: 'think', ipa: 'θɪŋk', phones: phones(verdicts) }],
    prosody: [],
    summary: { ok: 0, check: 0, error: 0, focus: [], camera_used: false },
  } as unknown as AssessmentResponse;
  return {
    id,
    profileId: 'default',
    itemId,
    text: 'think',
    modelVersion: 'w2v.mm8@ios',
    createdAt,
    disputed: false,
    result,
  };
};

describe('local API', () => {
  beforeEach(() => {
    resetRunsStore();
    localStorage.clear();
  });

  it('ignores paths outside the API', async () => {
    expect(await handleLocally(new Request('http://app.local/sounds/'))).toBeNull();
  });

  it('serves bundled content and a 404 for unknown sounds', async () => {
    const phonemes = await call('content/phonemes');
    expect(phonemes.status).toBe(200);
    expect(phonemes.body).toHaveLength(44);
    expect(((await call('content/sounds/c09')).body as { symbol: string }).symbol).toBe('θ');
    expect((await call('content/sounds/zz')).status).toBe(404);
    expect(((await call('health')).body as { model_ready: boolean }).model_ready).toBe(true);
  });

  it('counts stored runs into curriculum and course progress', async () => {
    const before = (await call('curriculum')).body as {
      completed_units: number;
      current_unit: string;
    };
    expect(before.completed_units).toBe(0);
    await saveLocalRun(
      take(['r1', 'sound:v12:word:about', '2026-10-20T01:00:00.000Z'], [['AH', 'ok']]),
    );
    await saveLocalRun(take(['r2', 'sentence:s4', '2026-10-20T01:01:00.000Z'], [['AH', 'ok']]));
    const after = (await call('curriculum')).body as {
      completed_units: number;
      levels: { units: { id: string; progress: { is_done: boolean; done_ids: string[] } }[] }[];
    };
    expect(after.levels[0]?.units[0]?.progress).toMatchObject({
      is_done: true,
      done_ids: ['sound:v12', 'sentence:s4'],
    });
    expect(after.completed_units).toBeGreaterThanOrEqual(1);
    const course = (await call('course')).body as { days: { items: { runs: number }[] }[] };
    expect(course.days.flatMap((d) => d.items).some((item) => item.runs > 0)).toBe(true);
  });

  it('reports progress per sound and the newest runs first', async () => {
    await saveLocalRun(
      take(
        ['r1', 'pair:think-sink:0', '2026-10-19T01:00:00.000Z'],
        [
          ['TH', 'check'],
          ['IH', 'ok'],
        ],
      ),
    );
    await saveLocalRun(
      take(
        ['r2', 'pair:think-sink:0', '2026-10-20T01:00:00.000Z'],
        [
          ['TH', 'ok'],
          ['IH', 'ok'],
        ],
      ),
    );
    const progress = (await call('progress?limit=1')).body as {
      runs: number;
      phonemes: { phoneme: string; total: number; ok: number; check: number }[];
      recent: { id: string; ok: number }[];
    };
    expect(progress.runs).toBe(2);
    expect(progress.phonemes.map((p) => [p.phoneme, p.total, p.ok, p.check])).toEqual([
      ['IH', 2, 2, 0],
      ['TH', 2, 1, 1],
    ]);
    expect(progress.recent).toEqual([expect.objectContaining({ id: 'r2', ok: 2 })]);
    expect((await call('runs/r2')).body).toMatchObject({ id: 'r2' });
    expect((await call('runs/r2/dispute', { method: 'POST' })).status).toBe(204);
    const disputed = (await call('progress')).body as {
      recent: { id: string; disputed: boolean }[];
    };
    expect(disputed.recent.find((r) => r.id === 'r2')?.disputed).toBe(true);
    expect((await call('runs/nope')).status).toBe(404);
  });

  it('builds the weekly plan from the stored runs', async () => {
    await saveLocalRun(
      take(['r1', 'pair:think-sink:0', new Date().toISOString()], [['TH', 'check']]),
    );
    const plan = (await call('plan?tz_offset=420&goal=1')).body as {
      runs_today: number;
      streak_days: number;
      week: { goal_met: boolean }[];
      focus: { phoneme: string; reason: string; sound_id: string | null }[];
      total_sounds: number;
    };
    expect(plan.runs_today).toBe(1);
    expect(plan.streak_days).toBe(1);
    expect(plan.week.at(-1)?.goal_met).toBe(true);
    expect(plan.focus).toHaveLength(3);
    expect(plan.focus[0]).toMatchObject({ reason: 'new', sound_id: expect.any(String) as string });
    expect(plan.total_sounds).toBeGreaterThan(30);
  });

  it('manages profiles, keeps the default one and moves runs with export/import', async () => {
    const created = (
      await call('profiles', { method: 'POST', body: JSON.stringify({ name: 'Lan' }) })
    ).body as {
      id: string;
    };
    expect(
      (
        await call(`profiles/${created.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Lan Anh' }),
        })
      ).body,
    ).toMatchObject({
      name: 'Lan Anh',
    });
    expect((await call('profiles/default', { method: 'DELETE' })).status).toBe(400);
    await saveLocalRun(take(['r9', 'sentence:s1', '2026-10-20T01:00:00.000Z'], [['IY', 'ok']]));
    const word = { itemId: 'w.u02.cup', mode: ReviewMode.Listen };
    await reviewStore().putCards([newCard({ ...word, profileId: 'default' }, new Date())]);
    await reviewStore().putCards([newCard({ ...word, profileId: created.id }, new Date())]);
    const exported = (await call('profiles/default/export')).body as {
      format: string;
      runs: unknown[];
      review_cards: unknown[];
    };
    expect(exported.format).toBe('aec-profile/1');
    expect(exported.runs).toHaveLength(1);
    expect(exported.review_cards).toHaveLength(1);
    const imported = await call('profiles/import?name=Copy', {
      method: 'POST',
      body: JSON.stringify(exported),
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ imported_runs: 0, skipped_runs: 1 });
    const copyId = (imported.body as { profile: { id: string } }).profile.id;
    expect((await reviewStore().listCards(copyId))[0]?.itemId).toBe('w.u02.cup');
    expect((await call(`profiles/${created.id}`, { method: 'DELETE' })).status).toBe(204);
    expect(await reviewStore().listCards(created.id)).toEqual([]);
    const names = ((await call('profiles')).body as { name: string }[]).map((p) => p.name);
    expect(names).toEqual(['Người học', 'Copy']);
  });

  it('says the AI tutor is not part of the offline app', async () => {
    expect((await call('tutor/explain', { method: 'POST', body: '{}' })).status).toBe(503);
  });
});
