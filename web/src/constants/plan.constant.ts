/** Daily goal choices (scored recordings per day) and the default. */
export const DAILY_GOAL_OPTIONS = [1, 3, 5, 10] as const;
export const DEFAULT_DAILY_GOAL = 3;
/** Id of the single repeating local notification used for the practice reminder. */
export const REMINDER_NOTIFICATION_ID = 1;
/** Placement: questions taken from each level, and the share needed to skip that level. */
export const PLACEMENT_PER_LEVEL = 3;
export const PLACEMENT_PASS = 0.8;
export const DEFAULT_REMINDER_TIME = '19:30';

/**
 * Placement speaking part (plan B8): two short sentences per level, each aimed at a Vietnamese
 * trouble spot (final stops, TH, clusters, V/W, schwa, diphthongs, contrast, reductions).
 */
export const PLACEMENT_SPEAKING: Record<string, string[]> = {
  L1: ['s4', 's1'],
  L2: ['s13', 's18'],
  L3: ['s21', 's25'],
  L4: ['s30', 's33'],
};

/** Priorities shown after placement. */
export const PLACEMENT_PRIORITIES = 3;
