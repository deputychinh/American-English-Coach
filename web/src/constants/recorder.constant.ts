import type { VadOptions } from '@/interfaces/vad.interface';

export const TARGET_SAMPLE_RATE = 16_000;
export const MAX_RECORD_SECONDS = 15;
export const WORKLET_URL = '/worklets/pcm-recorder.worklet.js';
export const WORKLET_NAME = 'pcm-recorder';

/** Defaults tuned for one word or a short sentence spoken close to a phone microphone. */
export const VAD_DEFAULTS: VadOptions = {
  minThreshold: 0.015,
  maxThreshold: 0.06,
  noiseFactor: 3,
  speechMs: 120,
  hangoverMs: 150,
  silenceMs: 750,
  // The scorer rejects less than 0.25 s of speech (backend MIN_SPEECH_SECONDS).
  minSpeechMs: 250,
  noSpeechMs: 5000,
  calibrationMs: 250,
};

/** End-of-speech silence for one word: a final stop's closure is ~100 ms, so 450 ms is safe. */
export const SILENCE_MS_WORD = 450;

/** Sentences keep the longer default so a pause between thought groups does not end the take. */
export const SILENCE_MS_SENTENCE = VAD_DEFAULTS.silenceMs;

/** A press on the record button held this long is push-to-talk: letting go ends the take. */
export const HOLD_TO_TALK_MS = 350;

/** Reference clips kept as object URLs per session (a unit uses a few dozen words). */
export const REFERENCE_CACHE_LIMIT = 48;

/** A 1 ms silent WAV that unlocks an audio element inside the tap, before the clip arrives. */
export const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';
