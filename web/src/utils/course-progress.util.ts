import type { CourseResponse, CurriculumResponse } from '@/interfaces/practice.interface';

/** Course and curriculum progress from stored runs (backend course.py and the two services). */

const RUN_PREFIX: Record<string, (id: string) => string> = {
  sound: (id) => `sound:${id}:`,
  pair: (id) => `pair:${id}:`,
  sentence: (id) => `sentence:${id}`,
};

/** Runs whose stored item id belongs to this content (exact for sentences, prefix otherwise). */
export const runsForItem = (kind: string, id: string, counts: Map<string, number>): number => {
  const prefix = RUN_PREFIX[kind]?.(id) ?? '';
  if (kind === 'sentence') return counts.get(prefix) ?? 0;
  let total = 0;
  for (const [stored, count] of counts) if (stored.startsWith(prefix)) total += count;
  return total;
};

/** Index of the first unfinished entry; the last one when everything is done. */
export const nextIndex = (done: boolean[]): number => {
  const first = done.indexOf(false);
  return first >= 0 ? first : Math.max(done.length - 1, 0);
};

/** Number of runs per stored item id. */
export const itemCounts = (itemIds: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const id of itemIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
};

export const withCurriculumProgress = (
  snapshot: CurriculumResponse,
  counts: Map<string, number>,
): CurriculumResponse => {
  const levels = snapshot.levels.map((level) => {
    const units = level.units.map((unit) => {
      const controlled = unit.steps.find((step) => String(step.kind) === 'controlled');
      const refs = controlled && 'items' in controlled ? controlled.items : [];
      const doneIds = refs
        .filter((ref) => runsForItem(ref.kind, ref.id, counts) > 0)
        .map((ref) => `${ref.kind}:${ref.id}`);
      return {
        ...unit,
        progress: {
          done_items: doneIds.length,
          total_items: refs.length,
          is_done: doneIds.length === refs.length,
          done_ids: doneIds,
        },
      };
    });
    return { ...level, units, done_units: units.filter((u) => u.progress.is_done).length };
  });
  const units = levels.flatMap((level) => level.units);
  const current = units[nextIndex(units.map((u) => u.progress.is_done))];
  return {
    ...snapshot,
    levels,
    current_unit: current?.id ?? '',
    completed_units: units.filter((u) => u.progress.is_done).length,
    total_units: units.length,
  };
};

export const withCourseProgress = (
  snapshot: CourseResponse,
  counts: Map<string, number>,
): CourseResponse => {
  const days = snapshot.days.map((day) => {
    const items = day.items.map((item) => {
      const runs = runsForItem(item.kind, item.id, counts);
      return { ...item, runs, done: runs > 0 };
    });
    const doneItems = items.filter((item) => item.done).length;
    return { ...day, items, done_items: doneItems, is_done: doneItems === items.length };
  });
  return {
    ...snapshot,
    days,
    current_day: days[nextIndex(days.map((d) => d.is_done))]?.id ?? '',
    completed_days: days.filter((d) => d.is_done).length,
    total_days: days.length,
  };
};
