/** Scorer constants: the same values as backend/app/constants.py and assessment_service.py. */

export const CTC_FRAME_SECONDS = 0.02;
export const GOP_OK_THRESHOLD = -2.0;
export const GOP_CHECK_THRESHOLD = -3.0;
export const ALIGN_SAME_CLASS_COST = 0.5;
export const ALIGN_DIFFERENT_CLASS_COST = 1.0;
export const ALIGN_GAP_COST = 1.0;
export const VISUAL_WINDOW_PAD_SECONDS = 0.06;
export const MIN_FRAME_QUALITY = 0.5;
export const MIN_VISEME_WINDOW_FRAMES = 2;
export const FOCUS_LIMIT = 2;
export const SCORE_NEG_INF = -1e9;

/** Free variants (backend/app/domain/verdict.py). */
export const FREE_VARIANTS: Record<string, string[]> = { AO: ['AA'] };
export const FREE_VARIANTS_BEFORE_R: Record<string, string[]> = {
  IH: ['IY'],
  EH: ['EY', 'AE'],
  UH: ['UW', 'AO', 'OW', 'ER'],
};
export const FREE_VARIANTS_FINAL: Record<string, string[]> = { P: ['B'], T: ['D'], K: ['G'] };
export const FREE_VARIANTS_INITIAL: Record<string, string[]> = { T: ['HH'] };

/** Word pattern of the pronouncing dictionary (letters and apostrophes). */
export const WORD_PATTERN = /[a-z']+/g;
