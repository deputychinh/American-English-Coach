import type { AssessmentResponse } from '@/interfaces/practice.interface';
import type { ReviewCard, ReviewEvent } from '@/interfaces/srs.interface';

/** One scored take kept on the device (the same fields the server stores). */
export interface StoredRun {
  id: string;
  profileId: string;
  itemId: string;
  text: string;
  modelVersion: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  disputed: boolean;
  result: AssessmentResponse;
}

export interface LocalProfile {
  id: string;
  name: string;
  createdAt: string;
}

/** Runs of every profile on this device (IndexedDB in the app, memory where it is missing). */
export interface RunsStore {
  add: (run: StoredRun) => Promise<void>;
  list: (profileId: string) => Promise<StoredRun[]>;
  get: (id: string) => Promise<StoredRun | null>;
  put: (run: StoredRun) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  /** Every run of every profile (Settings → clear the data on this device). */
  clear: () => Promise<void>;
}

/** Review cards and answers of every profile on this device (same backing as the runs). */
export interface ReviewStore {
  listCards: (profileId: string) => Promise<ReviewCard[]>;
  /** Adds or replaces cards (new cards of an item, or a whole backup). */
  putCards: (cards: readonly ReviewCard[]) => Promise<void>;
  /** The card after an answer and the answer itself, kept together or not at all. */
  saveAnswer: (card: ReviewCard, event: ReviewEvent) => Promise<void>;
  listReviews: (profileId: string) => Promise<ReviewEvent[]>;
  /** Restores answers from a backup; ids already present are kept as they are. */
  putReviews: (events: readonly ReviewEvent[]) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  clear: () => Promise<void>;
}

/** Verdict counts of one sound and the time (ISO) of the last run containing it. */
export interface SoundTally {
  total: number;
  ok: number;
  check: number;
  error: number;
  last: string;
}
