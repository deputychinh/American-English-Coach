import { SRS_MODE_ORDER, SRS_NEW_PER_DAY } from '@/constants/srs.constant';
import { ReviewMode } from '@/enums/review.enum';
import type { PhoneResult, AssessmentResponse } from '@/interfaces/practice.interface';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type {
  Cloze,
  VocabItem,
  VocabOverview,
  VocabPlan,
  VocabPlanInput,
} from '@/interfaces/vocab.interface';
import { tokenizeWords } from '@/utils/lexicon.util';
import { planReviews } from '@/utils/review-plan.util';
import { seedFrom, shuffleSeeded } from '@/utils/shuffle.util';
import { rememberedItems } from '@/utils/srs.util';

/** Vocabulary review on top of the FSRS core (docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md §4). */

const MEANING_CHOICES = 4;

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The example with the item cut out; null when the example is the item or lacks it. */
export const clozeOf = (item: VocabItem): Cloze | null => {
  const sentence = item.example.en;
  if (sentence.trim().toLowerCase() === item.text.trim().toLowerCase()) return null;
  const match = new RegExp(`(?<![A-Za-z'])${escape(item.text)}(?![A-Za-z'])`, 'i').exec(sentence);
  if (!match) return null;
  return {
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
  };
};

/** Modes this item can be asked in, in opening order. */
export const modesOf = (item: VocabItem): ReviewMode[] =>
  SRS_MODE_ORDER.filter((mode) => mode !== ReviewMode.Cloze || clozeOf(item) !== null);

export { startOfLocalDay } from '@/utils/review-plan.util';

/** What to study now (see `planReviews`); words open Listen → Speak → Cloze. */
export const planVocab = ({ items, cards, profileId, now }: VocabPlanInput): VocabPlan =>
  planReviews({ items, cards, profileId, now, modesOf, newPerDay: SRS_NEW_PER_DAY });

/** The plan plus how much of the deck the learner has met and remembers. */
export const vocabOverview = (input: VocabPlanInput): VocabOverview => {
  const known = new Set(input.items.map((item) => item.id));
  const started = new Set(input.cards.map((card) => card.itemId).filter((id) => known.has(id)));
  return {
    ...planVocab(input),
    started: started.size,
    remembered: rememberedItems(input.cards, input.now).filter((id) => known.has(id)).length,
    total: input.items.length,
  };
};

/** The right meaning and up to three others of the same kind, in a stable shuffled order. */
export const meaningChoices = (item: VocabItem, items: readonly VocabItem[]): string[] => {
  const others = [
    ...new Set(
      items
        .filter((other) => other.kind === item.kind && other.meaning_vi !== item.meaning_vi)
        .map((other) => other.meaning_vi),
    ),
  ];
  const distractors = shuffleSeeded(others, seedFrom(item.id)).slice(0, MEANING_CHOICES - 1);
  return shuffleSeeded([item.meaning_vi, ...distractors], seedFrom(`${item.id}:choices`));
};

/**
 * Verdicts of the phones of `target` inside a scored take (the first place its words appear
 * in order). Empty when the scorer did not find the words, which grades as "again".
 */
export const targetVerdicts = (result: AssessmentResponse, target: string): ScoreVerdict[] => {
  const wanted = tokenizeWords(target);
  const words = result.words.map((word) => word.word.toLowerCase());
  for (let start = 0; start + wanted.length <= words.length; start += 1) {
    if (wanted.every((word, offset) => words[start + offset] === word)) {
      return result.words
        .slice(start, start + wanted.length)
        .flatMap((word) => word.phones.map((phone: PhoneResult) => phone.verdict));
    }
  }
  return [];
};
