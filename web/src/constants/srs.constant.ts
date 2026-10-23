import { ReviewMode } from '@/enums/review.enum';

/** Spaced review on the device (docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md §4.3). */

/** Probability of recall the scheduler aims for when a card comes due. */
export const SRS_DEFAULT_RETENTION = 0.9;
export const SRS_MIN_RETENTION = 0.85;
export const SRS_MAX_RETENTION = 0.95;

/** New cards introduced per local day. */
export const SRS_NEW_PER_DAY = 20;

/** No new cards while more than this many reviews are due. */
export const SRS_BACKLOG_PAUSE = 100;

/** A mode opens once the previous mode's card is this stable (days). */
export const SRS_UNLOCK_STABILITY_DAYS = 3;

/** Order in which an item's modes open: hear it before saying it, say it before using it. */
export const SRS_MODE_ORDER: readonly ReviewMode[] = [
  ReviewMode.Listen,
  ReviewMode.Speak,
  ReviewMode.Cloze,
];

/** Recall at or above this counts the item as remembered on the progress screen. */
export const SRS_REMEMBERED_RECALL = 0.9;
