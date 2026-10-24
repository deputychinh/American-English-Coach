/** Seconds of each "Nói 3 lần" round when the content file gives none (Nation's 4/3/2, shortened). */
export const FLUENCY_ROUNDS_SECONDS = [60, 45, 30];

/** Frames below the loudest speech by more than this are silence (de Jong & Wempe 2009: 25 dB). */
export const FLUENCY_SILENCE_DB = 25;

/** Two intensity peaks are two syllables only with a dip of at least this much between them. */
export const FLUENCY_MIN_DIP_DB = 2;

/** A silence at least this long between sounds is a pause (plan v2 §6). */
export const FLUENCY_MIN_PAUSE_SECONDS = 0.25;

/** Samples in the intensity window (25 ms at 16 kHz): 64 ms merged neighbouring syllables. */
export const FLUENCY_WINDOW = 400;

/** Frames on each side averaged before peak picking (10 ms frames). */
export const FLUENCY_SMOOTH_FRAMES = 1;

/** Normalised autocorrelation a syllable peak needs to count as voiced (rejects /s/, clicks). */
export const FLUENCY_VOICING_CORRELATION = 0.45;

/** Speech this quiet (dBFS at the 99th percentile) is no speech at all. */
export const FLUENCY_MIN_SPEECH_DB = -50;

/** Sessions kept per learner profile for the trend. */
export const FLUENCY_HISTORY_LIMIT = 60;

/** Sessions shown in the trend. */
export const FLUENCY_TREND_SESSIONS = 6;
