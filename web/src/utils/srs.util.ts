import {
  type Card,
  createEmptyCard,
  type FSRS,
  fsrs,
  generatorParameters,
  type Grade,
  Rating,
  State,
} from 'ts-fsrs';

import {
  SRS_DEFAULT_RETENTION,
  SRS_MAX_RETENTION,
  SRS_MIN_RETENTION,
  SRS_MODE_ORDER,
  SRS_REMEMBERED_RECALL,
  SRS_UNLOCK_STABILITY_DAYS,
} from '@/constants/srs.constant';
import { CardPhase, ReviewGrade, type ReviewMode } from '@/enums/review.enum';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type {
  ReviewAnswer,
  ReviewCard,
  ReviewOutcome,
  ReviewSession,
  SessionLimits,
} from '@/interfaces/srs.interface';

/**
 * Spaced review on the device with FSRS (ts-fsrs). The rest of the app sees only plain
 * `ReviewCard` JSON, so the library can change without touching stored cards.
 */

const PHASE_OF: Record<State, CardPhase> = {
  [State.New]: CardPhase.New,
  [State.Learning]: CardPhase.Learning,
  [State.Review]: CardPhase.Review,
  [State.Relearning]: CardPhase.Relearning,
};

const STATE_OF: Record<CardPhase, State> = {
  [CardPhase.New]: State.New,
  [CardPhase.Learning]: State.Learning,
  [CardPhase.Review]: State.Review,
  [CardPhase.Relearning]: State.Relearning,
};

const RATING_OF: Record<ReviewGrade, Grade> = {
  [ReviewGrade.Again]: Rating.Again,
  [ReviewGrade.Hard]: Rating.Hard,
  [ReviewGrade.Good]: Rating.Good,
  [ReviewGrade.Easy]: Rating.Easy,
};

export const clampRetention = (retention: number): number =>
  Math.min(SRS_MAX_RETENTION, Math.max(SRS_MIN_RETENTION, retention));

const schedulers = new Map<number, FSRS>();

// No fuzz: the same answers give the same schedule, which keeps tests and backups exact.
const schedulerFor = (retention: number): FSRS => {
  const target = clampRetention(retention);
  const known = schedulers.get(target);
  if (known) return known;
  const created = fsrs(generatorParameters({ request_retention: target, enable_fuzz: false }));
  schedulers.set(target, created);
  return created;
};

export const cardId = (itemId: string, mode: ReviewMode): string => `${itemId}#${mode}`;

const toFsrs = (card: ReviewCard): Card => ({
  due: new Date(card.due),
  stability: card.stability,
  difficulty: card.difficulty,
  // Deprecated in ts-fsrs 5; the scheduler recomputes it from last_review.
  elapsed_days: 0,
  scheduled_days: card.scheduledDays,
  learning_steps: card.learningSteps,
  reps: card.reps,
  lapses: card.lapses,
  state: STATE_OF[card.phase],
  ...(card.lastReview === null ? {} : { last_review: new Date(card.lastReview) }),
});

type CardIdentity = Pick<ReviewCard, 'id' | 'profileId' | 'itemId' | 'mode' | 'createdAt'>;

const fromFsrs = (identity: CardIdentity, card: Card): ReviewCard => ({
  ...identity,
  phase: PHASE_OF[card.state],
  due: card.due.toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  scheduledDays: card.scheduled_days,
  learningSteps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  lastReview: card.last_review ? card.last_review.toISOString() : null,
});

const identityOf = ({ id, profileId, itemId, mode, createdAt }: ReviewCard): CardIdentity => ({
  id,
  profileId,
  itemId,
  mode,
  createdAt,
});

/** A card never reviewed, due at once. */
export const newCard = (
  { profileId, itemId, mode }: Pick<ReviewCard, 'profileId' | 'itemId' | 'mode'>,
  now: Date,
): ReviewCard =>
  fromFsrs(
    { id: cardId(itemId, mode), profileId, itemId, mode, createdAt: now.toISOString() },
    createEmptyCard(now),
  );

/** Applies one answer: the next state of the card and the event to keep. */
export const reviewCard = ({
  card,
  grade,
  now,
  retention = SRS_DEFAULT_RETENTION,
}: ReviewAnswer): ReviewOutcome => {
  const next = schedulerFor(retention).next(toFsrs(card), now, RATING_OF[grade]);
  const reviewedAt = now.toISOString();
  return {
    card: fromFsrs(identityOf(card), next.card),
    event: {
      id: `${card.id}@${reviewedAt}`,
      cardId: card.id,
      profileId: card.profileId,
      grade,
      reviewedAt,
      dueBefore: card.due,
      scheduledDays: next.card.scheduled_days,
    },
  };
};

/** Probability (0–1) that the learner recalls the card now; 0 before the first review. */
export const recall = (card: ReviewCard, now: Date): number =>
  card.phase === CardPhase.New
    ? 0
    : schedulerFor(SRS_DEFAULT_RETENTION).get_retrievability(toFsrs(card), now, false);

export const isDue = (card: ReviewCard, now: Date): boolean =>
  card.phase !== CardPhase.New && Date.parse(card.due) <= now.getTime();

const byDueThenId = (a: ReviewCard, b: ReviewCard): number =>
  Date.parse(a.due) - Date.parse(b.due) || a.id.localeCompare(b.id);

const byCreatedThenId = (a: ReviewCard, b: ReviewCard): number =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);

/** Due reviews, most overdue first, then as many new cards as today still allows. */
export const buildSession = (
  cards: readonly ReviewCard[],
  now: Date,
  limits: SessionLimits,
): ReviewSession => {
  const due = cards.filter((card) => isDue(card, now)).sort(byDueThenId);
  const newPaused = due.length > limits.backlogPause;
  const allowance = newPaused ? 0 : Math.max(0, limits.newPerDay - limits.newIntroducedToday);
  const fresh = cards
    .filter((card) => card.phase === CardPhase.New)
    .sort(byCreatedThenId)
    .slice(0, allowance);
  return { due, fresh, newPaused };
};

/**
 * Modes of one item that should get a card now. The first mode always opens; each later
 * mode opens once the previous mode's card is in review and stable enough. `modes` is the
 * item's own order when it cannot be asked every way (a chunk without a separate example).
 */
export const modesToOpen = (
  itemCards: readonly ReviewCard[],
  modes: readonly ReviewMode[] = SRS_MODE_ORDER,
): ReviewMode[] => {
  const byMode = new Map(itemCards.map((card) => [card.mode, card]));
  return modes.filter((mode, index) => {
    if (byMode.has(mode)) return false;
    if (index === 0) return true;
    const previousMode = modes[index - 1];
    const previous = previousMode === undefined ? undefined : byMode.get(previousMode);
    return (
      previous !== undefined &&
      previous.phase === CardPhase.Review &&
      previous.stability >= SRS_UNLOCK_STABILITY_DAYS
    );
  });
};

/**
 * Grade of a spoken answer from the scorer's verdicts on the target phones. Silence or any
 * `error` is Again; a `check` (the scorer is unsure) is Hard, never a lapse; all `ok` is Good.
 */
export const gradeFromVerdicts = (verdicts: readonly ScoreVerdict[]): ReviewGrade => {
  if (verdicts.length === 0 || verdicts.includes('error')) return ReviewGrade.Again;
  if (verdicts.includes('check')) return ReviewGrade.Hard;
  return ReviewGrade.Good;
};

/** Items whose every reviewed card is recalled at or above the remembered threshold. */
export const rememberedItems = (cards: readonly ReviewCard[], now: Date): string[] => {
  const recallsByItem = new Map<string, number[]>();
  for (const card of cards) {
    if (card.phase === CardPhase.New) continue;
    const recalls = recallsByItem.get(card.itemId) ?? [];
    recalls.push(recall(card, now));
    recallsByItem.set(card.itemId, recalls);
  }
  return [...recallsByItem]
    .filter(([, recalls]) => recalls.every((value) => value >= SRS_REMEMBERED_RECALL))
    .map(([itemId]) => itemId)
    .sort();
};
