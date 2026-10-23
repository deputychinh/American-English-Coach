import { REGISTER_ORDER, TALK_NEW_PER_DAY } from '@/constants/talk.constant';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import { type Register, TalkKind } from '@/enums/talk.enum';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type { ReviewPlan } from '@/interfaces/srs.interface';
import type {
  PatternDrillItem,
  PhraseSplit,
  SituationItem,
  TalkDeck,
  TalkItem,
  TalkOverview,
  TalkPlanInput,
  TalkTurn,
  TransformGrade,
  UnitTalk,
} from '@/interfaces/talk.interface';
import { tokenizeWords } from '@/utils/lexicon.util';
import { planReviews } from '@/utils/review-plan.util';
import { seedFrom, shuffleSeeded } from '@/utils/shuffle.util';
import { gradeFromVerdicts, newCard } from '@/utils/srs.util';
import { targetVerdicts } from '@/utils/vocab.util';

/** Functional phrases and spoken patterns on top of the FSRS core (plan v2 §5). */

/**
 * Every situation and drill, in course order: by the first unit that meets it, a unit's
 * situations before its drills.
 */
export const talkItems = (deck: TalkDeck): TalkItem[] => {
  const situations: SituationItem[] = deck.functions.flatMap((fn) =>
    REGISTER_ORDER.map((register) => ({
      kind: TalkKind.Situation as const,
      id: `${fn.id}.${register}`,
      unit: [...fn.units].sort()[0] ?? '',
      fn,
      register,
    })),
  );
  const drills: PatternDrillItem[] = deck.patterns.flatMap((pattern) =>
    pattern.drills.map((drill) => ({
      kind: TalkKind.Drill as const,
      id: drill.id,
      unit: pattern.unit,
      pattern,
      drill,
    })),
  );
  const items: TalkItem[] = [...situations, ...drills];
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        a.item.unit.localeCompare(b.item.unit) ||
        Number(a.item.kind === TalkKind.Drill) - Number(b.item.kind === TalkKind.Drill) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
};

/** A situation is asked by register, a drill by transformation; each has one card. */
export const talkModesOf = (item: TalkItem): ReviewMode[] => [
  item.kind === TalkKind.Situation ? ReviewMode.Register : ReviewMode.Transform,
];

/** Due cards first, then up to the day's new cards in course order. */
export const planTalk = ({ items, cards, profileId, now }: TalkPlanInput): ReviewPlan<TalkItem> =>
  planReviews({ items, cards, profileId, now, modesOf: talkModesOf, newPerDay: TALK_NEW_PER_DAY });

export const talkOverview = (input: TalkPlanInput): TalkOverview => {
  const known = new Set(input.items.map((item) => item.id));
  const started = new Set(input.cards.map((card) => card.itemId).filter((id) => known.has(id)));
  return { ...planTalk(input), started: started.size, total: input.items.length };
};

/** Does this item belong to the unit (a function counts for every unit it is taught in)? */
const inUnit = (item: TalkItem, unitId: string): boolean =>
  item.kind === TalkKind.Situation ? item.fn.units.includes(unitId) : item.unit === unitId;

/**
 * Practise one unit now, whatever the schedule says: every item of the unit, with its card
 * when it has one (an early answer is still a valid FSRS review) or a new card.
 */
export const planTalkUnit = (input: TalkPlanInput, unitId: string): TalkTurn[] => {
  const byItem = new Map(input.cards.map((card) => [card.itemId, card]));
  return input.items
    .filter((item) => inUnit(item, unitId))
    .map((item) => {
      const card = byItem.get(item.id);
      if (card) return { item, card, isNew: false };
      const [mode = ReviewMode.Transform] = talkModesOf(item);
      return {
        item,
        card: newCard({ profileId: input.profileId, itemId: item.id, mode }, input.now),
        isNew: true,
      };
    });
};

/** The unit's functions and pattern, for the unit page. */
export const unitTalk = (deck: TalkDeck, unitId: string): UnitTalk => ({
  functions: deck.functions.filter((fn) => fn.units.includes(unitId)),
  pattern: deck.patterns.find((pattern) => pattern.unit === unitId) ?? null,
});

/** The function's three registers in a stable shuffled order for this situation. */
export const registerChoices = (item: SituationItem): Register[] =>
  shuffleSeeded([...REGISTER_ORDER], seedFrom(item.id));

/**
 * The right register is what is being learnt: a wrong pick is a lapse. Saying it with a
 * pronunciation error makes it hard, never a lapse; an unscored take keeps the pick's grade.
 */
export const gradeSituation = (
  isRight: boolean,
  verdicts: readonly ScoreVerdict[] | null,
): ReviewGrade => {
  if (!isRight) return ReviewGrade.Again;
  if (verdicts === null) return ReviewGrade.Good;
  return gradeFromVerdicts(verdicts) === ReviewGrade.Good ? ReviewGrade.Good : ReviewGrade.Hard;
};

/** All phones of a scored take, in order. */
export const allVerdicts = (result: AssessmentResponse): ScoreVerdict[] =>
  result.words.flatMap((word) => word.phones.map((phone) => phone.verdict));

/**
 * Grade a spoken transformation on the target's phones. With a checked ending, the target's
 * last phone is the ending's sound (worked /t/, cups /s/); a dropped ending is a lapse.
 */
export const gradeTransform = (
  result: AssessmentResponse,
  item: PatternDrillItem,
): TransformGrade => {
  const verdicts = targetVerdicts(result, item.drill.target);
  const ending = item.pattern.ending === null ? null : (verdicts.at(-1) ?? 'error');
  return { grade: gradeFromVerdicts(verdicts), ending };
};

/** The answer split around the first whole-word match of `part` (any case), for highlighting. */
export const splitAround = (text: string, part: string): PhraseSplit | null => {
  const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?<![A-Za-z'])${escaped}(?![A-Za-z'])`, 'i').exec(text);
  if (!match) return null;
  return {
    before: text.slice(0, match.index),
    match: match[0],
    after: text.slice(match.index + match[0].length),
  };
};

/** The word whose last sound carries the ending ("cooked" in "I cooked"). */
export const endingWord = (target: string): string => tokenizeWords(target).at(-1) ?? target;
