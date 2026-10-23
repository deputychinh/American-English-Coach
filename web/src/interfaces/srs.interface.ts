import type { CardPhase, ReviewGrade, ReviewMode } from '@/enums/review.enum';

/** One item asked one way, kept on the device. Plain JSON so IndexedDB stores it as is. */
export interface ReviewCard {
  /** `${itemId}#${mode}`, unique within a profile. */
  id: string;
  profileId: string;
  itemId: string;
  mode: ReviewMode;
  phase: CardPhase;
  /** ISO 8601, UTC. */
  due: string;
  /** Days until recall falls to 90 %. */
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** ISO 8601, UTC; null before the first review. */
  lastReview: string | null;
  createdAt: string;
}

/** One answer, kept so the scheduler can later be fitted to this learner. */
export interface ReviewEvent {
  id: string;
  cardId: string;
  profileId: string;
  grade: ReviewGrade;
  /** ISO 8601, UTC. */
  reviewedAt: string;
  /** The card's due time before this answer. */
  dueBefore: string;
  /** Days to the next review chosen by this answer. */
  scheduledDays: number;
}

/** One answer to apply to a card. */
export interface ReviewAnswer {
  card: ReviewCard;
  grade: ReviewGrade;
  now: Date;
  /** Target recall, clamped to the supported range; the default when omitted. */
  retention?: number;
}

export interface ReviewOutcome {
  card: ReviewCard;
  event: ReviewEvent;
}

export interface SessionLimits {
  newPerDay: number;
  /** New cards already introduced today. */
  newIntroducedToday: number;
  backlogPause: number;
}

/** What to study now: due reviews first, then the new cards allowed today. */
export interface ReviewSession {
  due: ReviewCard[];
  fresh: ReviewCard[];
  /** True when new cards are held back because too many reviews are due. */
  newPaused: boolean;
}
