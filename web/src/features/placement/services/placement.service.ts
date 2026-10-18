import { PLACEMENT_PASS, PLACEMENT_PER_LEVEL } from '@/constants/plan.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { buildQuestions } from '@/features/listen/services/listen.service';
import type { PlacementQuestion, PlacementResult } from '@/interfaces/listening.interface';
import type {
  CurriculumLevel,
  CurriculumUnit,
  MinimalPair,
  Sentence,
} from '@/interfaces/practice.interface';
import { seedFrom, shuffleSeeded } from '@/utils/shuffle.util';
import { readStorage, writeStorage } from '@/utils/storage.util';

/** A few listening questions from every level, easiest level first. */
export const buildPlacement = ({
  levels,
  pairs,
  sentences,
}: {
  levels: CurriculumLevel[];
  pairs: MinimalPair[];
  sentences: Sentence[];
}): PlacementQuestion[] =>
  levels.flatMap((level) => {
    const pool = level.units.flatMap((unit) =>
      buildQuestions({ unit, pairs, sentences }).map((question) => ({
        ...question,
        level: level.id,
      })),
    );
    return shuffleSeeded(pool, seedFrom(`placement:${level.id}`)).slice(0, PLACEMENT_PER_LEVEL);
  });

/** Start at the first level whose questions were not mostly right; the last level when all were. */
export const placeLearner = ({
  levels,
  questions,
  answers,
}: {
  levels: CurriculumLevel[];
  questions: PlacementQuestion[];
  answers: Record<string, number>;
}): PlacementResult => {
  const scores: Record<string, number> = {};
  for (const level of levels) {
    const own = questions.filter((question) => question.level === level.id);
    const right = own.filter((question) => answers[question.id] === question.answer).length;
    scores[level.id] = own.length ? right / own.length : 1;
  }
  const start =
    levels.find((level) => (scores[level.id] ?? 0) < PLACEMENT_PASS) ?? levels[levels.length - 1];
  return {
    level: start?.id ?? 'L1',
    unitId: start?.units[0]?.id ?? 'u01',
    scores,
    finishedAt: new Date().toISOString(),
  };
};

export const readPlacement = (): PlacementResult | null =>
  readStorage<PlacementResult | null>(StorageKey.Placement, null);

export const savePlacement = (result: PlacementResult): void =>
  writeStorage(StorageKey.Placement, result);

/** The unit to continue with: the server's next unit, or the placement start when that is later. */
export const continueUnit = ({
  units,
  currentId,
  placement,
}: {
  units: CurriculumUnit[];
  currentId: string;
  placement: PlacementResult | null;
}): CurriculumUnit | null => {
  const current = units.find((unit) => unit.id === currentId) ?? units[0] ?? null;
  const placed = placement ? units.find((unit) => unit.id === placement.unitId) : undefined;
  if (current && placed && placed.index > current.index) return placed;
  return current;
};
