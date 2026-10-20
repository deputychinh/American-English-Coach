import {
  PLAN_FOCUS_LIMIT,
  PLAN_MIN_SAMPLES,
  PLAN_REVIEW_AFTER_DAYS,
  PLAN_WEAK_LIMIT,
  PLAN_WEAK_OK_RATE,
  PLAN_WEEK_DAYS,
  STREAK_REST_EVERY_DAYS,
} from '@/constants/scoring.constant';
import type { DaySummary, FocusPick, RunDay, SoundHistory } from '@/interfaces/scoring.interface';
import { round3 } from '@/utils/gop.util';

/** Weekly plan rules on the device (port of backend/app/domain/planner.py). */

const DAY_MS = 86_400_000;

/** Calendar day (`YYYY-MM-DD`) of a UTC instant in the learner's zone (minutes east of UTC). */
export const localDate = (moment: Date, tzOffsetMinutes: number): string =>
  new Date(moment.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);

/** UTC instant at which a local day begins. */
export const dayStartUtc = (day: string, tzOffsetMinutes: number): Date =>
  new Date(Date.parse(`${day}T00:00:00Z`) - tzOffsetMinutes * 60_000);

export const addDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Whole days from `earlier` to `later` (both local `YYYY-MM-DD`). */
export const daysBetween = (earlier: string, later: string): number =>
  Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY_MS);

/** The last seven local days ending today, oldest first, zero-filled. */
export const weekSummary = (runs: RunDay[], today: string): DaySummary[] => {
  const days = Array.from({ length: PLAN_WEEK_DAYS }, (_, index) =>
    addDays(today, index - PLAN_WEEK_DAYS + 1),
  );
  return days.map((day) => {
    const own = runs.filter((run) => run.day === day);
    return {
      day,
      runs: own.length,
      ok: own.reduce((sum, run) => sum + run.ok, 0),
      check: own.reduce((sum, run) => sum + run.check, 0),
      error: own.reduce((sum, run) => sum + run.error, 0),
    };
  });
};

/**
 * Practised days in the run ending today (or yesterday while today is still open). One missed
 * day per week is a rest day: it keeps the run and does not count (backend planner.streak_days).
 */
export const streakDays = (practised: Set<string>, today: string): number => {
  let cursor = practised.has(today) ? today : addDays(today, -1);
  let streak = 0;
  let lastRest: string | null = null;
  for (;;) {
    if (practised.has(cursor)) streak += 1;
    else if (
      practised.has(addDays(cursor, -1)) &&
      (lastRest === null || daysBetween(cursor, lastRest) >= STREAK_REST_EVERY_DAYS)
    )
      lastRest = cursor;
    else return streak;
    cursor = addDays(cursor, -1);
  }
};

const okRate = (history: SoundHistory): number => (history.total ? history.ok / history.total : 0);

const pick = (history: SoundHistory, reason: FocusPick['reason'], today: string): FocusPick => ({
  phoneme: history.phoneme,
  reason,
  total: history.total,
  okRate: round3(okRate(history)),
  daysSince: daysBetween(history.lastDay, today),
});

/** Up to three sounds: weak ones first, then one due for review, then untried sounds. */
export const pickFocus = (
  histories: SoundHistory[],
  chartOrder: string[],
  today: string,
): FocusPick[] => {
  const measured = histories.filter((h) => h.total >= PLAN_MIN_SAMPLES);
  const weak = measured
    .filter((h) => okRate(h) < PLAN_WEAK_OK_RATE)
    .sort((a, b) => okRate(a) - okRate(b) || b.total - a.total);
  const review = measured
    .filter(
      (h) =>
        okRate(h) >= PLAN_WEAK_OK_RATE && daysBetween(h.lastDay, today) >= PLAN_REVIEW_AFTER_DAYS,
    )
    .sort((a, b) => daysBetween(b.lastDay, today) - daysBetween(a.lastDay, today));
  const practised = new Set(histories.map((h) => h.phoneme));
  const picks: FocusPick[] = [
    ...weak.slice(0, PLAN_WEAK_LIMIT).map((h) => pick(h, 'weak', today)),
    ...review.slice(0, 1).map((h) => pick(h, 'review', today)),
    ...chartOrder
      .filter((phoneme) => !practised.has(phoneme))
      .map((phoneme) => ({
        phoneme,
        reason: 'new' as const,
        total: 0,
        okRate: null,
        daysSince: null,
      })),
    ...weak.slice(PLAN_WEAK_LIMIT).map((h) => pick(h, 'weak', today)),
    ...review.slice(1).map((h) => pick(h, 'review', today)),
  ];
  const seen = new Set<string>();
  return picks
    .filter((item) => {
      if (seen.has(item.phoneme)) return false;
      seen.add(item.phoneme);
      return true;
    })
    .slice(0, PLAN_FOCUS_LIMIT);
};
