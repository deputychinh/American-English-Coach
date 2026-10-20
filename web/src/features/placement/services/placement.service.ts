import {
  PLACEMENT_PASS,
  PLACEMENT_PER_LEVEL,
  PLACEMENT_PRIORITIES,
  PLACEMENT_SPEAKING,
} from '@/constants/plan.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { buildQuestions } from '@/features/listen/services/listen.service';
import type {
  PlacementPriority,
  PlacementQuestion,
  PlacementResult,
  PlacementSentence,
} from '@/interfaces/listening.interface';
import type {
  AssessmentResponse,
  CurriculumLevel,
  CurriculumUnit,
  MinimalPair,
  Sentence,
} from '@/interfaces/practice.interface';
import { resolvePracticeItem } from '@/utils/practice-item.util';
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

/** The speaking part: two sentences per level, in level order (plan B8). */
export const buildSpeaking = ({
  levels,
  sentences,
}: {
  levels: CurriculumLevel[];
  sentences: Sentence[];
}): PlacementSentence[] =>
  levels.flatMap((level) =>
    (PLACEMENT_SPEAKING[level.id] ?? []).flatMap((id) => {
      const item = resolvePracticeItem(`sentence:${id}`, { pairs: [], sentences });
      return item ? [{ level: level.id, item: { ...item, id: `placement:${id}` } }] : [];
    }),
  );

/** Share of sounds said right in a set of takes; a "check" counts half, like the score ring. */
const speakingShare = (takes: AssessmentResponse[]): number | null => {
  const total = takes.reduce((sum, t) => sum + t.summary.ok + t.summary.check + t.summary.error, 0);
  if (total === 0) return null;
  return takes.reduce((sum, t) => sum + t.summary.ok + t.summary.check / 2, 0) / total;
};

/** The errors that came up most often across the takes, with their plain-language hints. */
export const placementPriorities = (takes: AssessmentResponse[]): PlacementPriority[] => {
  const byError = new Map<string, PlacementPriority>();
  for (const phone of takes.flatMap((take) => take.words.flatMap((word) => word.phones))) {
    if (String(phone.verdict) === 'ok' || !phone.error_id || !phone.hint_vi) continue;
    const seen = byError.get(phone.error_id);
    if (seen) seen.count += 1;
    else
      byError.set(phone.error_id, {
        phoneme: phone.symbol,
        ipa: phone.ipa,
        hint: phone.hint_vi,
        count: 1,
      });
  }
  return [...byError.values()].sort((a, b) => b.count - a.count).slice(0, PLACEMENT_PRIORITIES);
};

/**
 * Start at the first level whose listening (and, when taken, speaking) was not mostly right;
 * the last level when all were. With speaking, a level's score is the mean of the two parts.
 */
export const placeLearner = ({
  levels,
  questions,
  answers,
  spoken = [],
}: {
  levels: CurriculumLevel[];
  questions: PlacementQuestion[];
  answers: Record<string, number>;
  /** Speaking takes with the level of each sentence. */
  spoken?: { level: string; result: AssessmentResponse }[];
}): PlacementResult => {
  const scores: Record<string, number> = {};
  const speaking: Record<string, number> = {};
  const combined: Record<string, number> = {};
  for (const level of levels) {
    const own = questions.filter((question) => question.level === level.id);
    const right = own.filter((question) => answers[question.id] === question.answer).length;
    scores[level.id] = own.length ? right / own.length : 1;
    const said = speakingShare(
      spoken.filter((take) => take.level === level.id).map((t) => t.result),
    );
    if (said !== null) speaking[level.id] = said;
    combined[level.id] =
      said === null ? (scores[level.id] ?? 1) : ((scores[level.id] ?? 1) + said) / 2;
  }
  const start =
    levels.find((level) => (combined[level.id] ?? 0) < PLACEMENT_PASS) ?? levels[levels.length - 1];
  const hasSpeaking = Object.keys(speaking).length > 0;
  return {
    level: start?.id ?? 'L1',
    unitId: start?.units[0]?.id ?? 'u01',
    scores,
    ...(hasSpeaking
      ? { speaking, priorities: placementPriorities(spoken.map((take) => take.result)) }
      : {}),
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
