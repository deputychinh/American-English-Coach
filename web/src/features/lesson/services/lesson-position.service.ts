import { StorageKey } from '@/enums/storage-key.enum';
import type { LessonPosition, LessonPositions } from '@/interfaces/lesson.interface';
import { readStorage, writeStorage } from '@/utils/storage.util';

const readAll = (): LessonPositions => readStorage<LessonPositions>(StorageKey.Lesson, {});

/** Saved place in a unit's lesson, or null when the learner has not started it. */
export const readLessonPosition = (unitId: string): LessonPosition | null =>
  readAll()[unitId] ?? null;

export const saveLessonPosition = (unitId: string, position: LessonPosition): void => {
  writeStorage(StorageKey.Lesson, {
    ...readAll(),
    [unitId]: { ...position, updatedAt: new Date().toISOString() },
  });
};

export const clearLessonPosition = (unitId: string): void => {
  writeStorage(
    StorageKey.Lesson,
    Object.fromEntries(Object.entries(readAll()).filter(([id]) => id !== unitId)),
  );
};
