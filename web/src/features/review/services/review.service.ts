import type { ReviewGrade } from '@/enums/review.enum';
import type { ReviewCard, ReviewOutcome } from '@/interfaces/srs.interface';
import { reviewStore } from '@/utils/local-store.util';
import { reviewCard } from '@/utils/srs.util';

/** Applies one answer to any deck's card and keeps the card and the answer together. */
export const answerCard = async (
  card: ReviewCard,
  grade: ReviewGrade,
  now = new Date(),
): Promise<ReviewOutcome> => {
  const outcome = reviewCard({ card, grade, now });
  await reviewStore().saveAnswer(outcome.card, outcome.event);
  return outcome;
};
