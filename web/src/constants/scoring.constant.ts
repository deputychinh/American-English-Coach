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

/** A vowel heard after a word-final consonant ("bookə"); backend FINAL_EPENTHESIS_ID. */
export const FINAL_EPENTHESIS_ID = 'final_epenthesis';

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

/** Prosody (backend constants.py, prosody.py and features.py). */
export const PROSODY_STRESS_RATIO_MIN = 1.15;
export const PROSODY_FINAL_SEMITONES = 1.5;
export const MIN_SYLLABLES_FOR_STRESS = 2;
export const MIN_NUCLEI_FOR_RHYTHM = 2;
export const FINAL_WINDOW_SECONDS = 0.35;
export const MIN_VOICED_FRAMES = 4;
export const PITCH_SAMPLE_RATE = 16_000;
export const PITCH_HOP = 160;
export const PITCH_FRAME = 1024;
export const PITCH_FMIN = 65;
export const PITCH_FMAX = 400;
/** Rising, falling or no expected final contour per prompt kind. */
export const RISE_BY_KIND: Record<string, boolean | null> = {
  question: true,
  statement: false,
  wh_question: false,
  word: null,
};

/** Weekly plan rules (backend/app/domain/planner.py). */
export const PLAN_MIN_SAMPLES = 3;
export const PLAN_WEAK_OK_RATE = 0.7;
export const PLAN_REVIEW_AFTER_DAYS = 3;
export const PLAN_FOCUS_LIMIT = 3;
export const PLAN_WEAK_LIMIT = 2;
export const PLAN_WEEK_DAYS = 7;
/** One rest day allowed per this many days without breaking the streak (backend constants). */
export const STREAK_REST_EVERY_DAYS = 7;
export const PLAN_STREAK_LOOKBACK_DAYS = 400;
