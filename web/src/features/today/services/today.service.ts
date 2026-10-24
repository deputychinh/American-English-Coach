import { StorageKey } from '@/enums/storage-key.enum';
import { flattenUnits, getCurriculum } from '@/features/curriculum/services/curriculum.service';
import {
  loadFluencyDeck,
  promptFor,
  readSessions,
} from '@/features/fluency/services/fluency.service';
import { readLessonPosition } from '@/features/lesson/services/lesson-position.service';
import { continueUnit, readPlacement } from '@/features/placement/services/placement.service';
import { loadTalkState } from '@/features/talk/services/talk.service';
import { loadVocabState } from '@/features/vocab/services/vocab.service';
import type { TodayInput, TodayRecord, TodayState } from '@/interfaces/today.interface';
import { activeProfileId } from '@/utils/api-base.util';
import { readStorage, writeStorage } from '@/utils/storage.util';
import { dayKey, planToday } from '@/utils/today.util';

/**
 * Today's session on the device: due cards, the unit's next lesson step and one "Nói 3 lần",
 * read from the same stores the screens write. Only where the unit's lesson stood when the
 * session sent the learner there is kept for it (`coach.today`).
 */

/** The record of today for the active profile, or null on a new day or another profile. */
export const readTodayRecord = (now: Date): TodayRecord | null => {
  const record = readStorage<TodayRecord | null>(StorageKey.Today, null);
  return record?.date === dayKey(now) && record.profileId === activeProfileId() ? record : null;
};

/** Remembers where the unit's lesson stands, once per day, before the learner opens it. */
export const startUnitStep = (unitId: string, now = new Date()): void => {
  if (readTodayRecord(now)?.unitId === unitId) return;
  writeStorage(StorageKey.Today, {
    date: dayKey(now),
    profileId: activeProfileId(),
    unitId,
    unitStartStep: readLessonPosition(unitId)?.step ?? 0,
  } satisfies TodayRecord);
};

export const loadToday = async (now = new Date()): Promise<TodayState> => {
  const [vocab, talk, curriculum, fluency] = await Promise.all([
    loadVocabState(now),
    loadTalkState(null, now),
    getCurriculum(),
    loadFluencyDeck(),
  ]);
  const unit = continueUnit({
    units: flattenUnits(curriculum),
    currentId: curriculum.current_unit,
    placement: readPlacement(),
  });
  const today = dayKey(now);
  const input: TodayInput = {
    vocabLeft: vocab.overview.turns.length,
    talkLeft: talk.overview.turns.length,
    unit: unit ? { id: unit.id, title: unit.title_vi, steps: unit.steps.length } : null,
    unitStep: unit ? (readLessonPosition(unit.id)?.step ?? 0) : 0,
    record: readTodayRecord(now),
    spokeToday: readSessions(activeProfileId()).some(
      (session) => dayKey(new Date(session.createdAt)) === today,
    ),
    topic: promptFor(fluency.prompts, unit?.id ?? null)?.title_vi ?? null,
  };
  return { ...planToday(input), input };
};
