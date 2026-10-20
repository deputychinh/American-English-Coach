import { PLAN_WEEK_DAYS } from '@/constants/scoring.constant';
import scoringInventory from '@/data/scoring/inventory.json';
import { chartPhones } from '@/features/offline/services/local-content.service';
import type { SoundTally, StoredRun } from '@/interfaces/local-store.interface';
import type { PlanResponse, ProgressResponse } from '@/interfaces/practice.interface';
import { localDate, pickFocus, streakDays, weekSummary } from '@/utils/planner.util';

/** Progress and weekly plan computed from the runs stored on the device. */

const ipaOf = (phoneme: string): string =>
  (scoringInventory.ipa as Record<string, string>)[phoneme] ?? '?';

/** Per-sound verdict counts and the time of the last run containing the sound. */
const tallies = (runs: StoredRun[]): Map<string, SoundTally> => {
  const byPhoneme = new Map<string, SoundTally>();
  for (const run of runs) {
    for (const word of run.result.words) {
      for (const phone of word.phones) {
        const tally = byPhoneme.get(phone.symbol) ?? {
          total: 0,
          ok: 0,
          check: 0,
          error: 0,
          last: '',
        };
        tally.total += 1;
        const verdict = String(phone.verdict);
        if (verdict === 'ok') tally.ok += 1;
        else if (verdict === 'check') tally.check += 1;
        else if (verdict === 'error') tally.error += 1;
        if (run.createdAt > tally.last) tally.last = run.createdAt;
        byPhoneme.set(phone.symbol, tally);
      }
    }
  }
  // Python iterates `sorted(counts.items())`: phonemes in code-point order.
  return new Map([...byPhoneme.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};

const countOf = (run: StoredRun, verdict: string): number =>
  run.result.words.reduce(
    (sum, word) => sum + word.phones.filter((p) => String(p.verdict) === verdict).length,
    0,
  );

export const progressOf = (runs: StoredRun[], limit: number): ProgressResponse => ({
  runs: runs.length,
  phonemes: [...tallies(runs)].map(([phoneme, t]) => ({
    phoneme,
    ipa: ipaOf(phoneme),
    total: t.total,
    ok: t.ok,
    check: t.check,
    error: t.error,
  })),
  recent: [...runs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit)
    .map((run) => ({
      id: run.id,
      item_id: run.itemId,
      text: run.text,
      created_at: run.createdAt,
      ok: countOf(run, 'ok'),
      check: countOf(run, 'check'),
      error: countOf(run, 'error'),
      model_version: run.modelVersion,
      disputed: run.disputed,
    })),
});

export const planOf = async (
  runs: StoredRun[],
  { tzOffset, goal, now }: { tzOffset: number; goal: number; now: Date },
): Promise<PlanResponse> => {
  const today = localDate(now, tzOffset);
  const days = runs.map((run) => ({
    day: localDate(new Date(run.createdAt), tzOffset),
    ok: countOf(run, 'ok'),
    check: countOf(run, 'check'),
    error: countOf(run, 'error'),
  }));
  const week = weekSummary(days, today);
  const histories = [...tallies(runs)].map(([phoneme, t]) => ({
    phoneme,
    total: t.total,
    ok: t.ok,
    lastDay: localDate(new Date(t.last), tzOffset),
  }));
  const chart = await chartPhones();
  return {
    today,
    goal_runs: goal,
    runs_today: week.at(-1)?.runs ?? 0,
    streak_days: streakDays(new Set(days.map((d) => d.day)), today),
    week: week.slice(-PLAN_WEEK_DAYS).map((d) => ({
      date: d.day,
      runs: d.runs,
      ok: d.ok,
      check: d.check,
      error: d.error,
      goal_met: d.runs >= goal,
    })),
    focus: pickFocus(histories, chart.order, today).map((pick) => ({
      phoneme: pick.phoneme,
      ipa: ipaOf(pick.phoneme),
      reason: pick.reason as PlanResponse['focus'][number]['reason'],
      sound_id: chart.drillOf.get(pick.phoneme) ?? null,
      total: pick.total,
      ok_rate: pick.okRate,
      days_since: pick.daysSince,
    })),
    practised_sounds: histories.length,
    total_sounds: chart.order.length,
  };
};
