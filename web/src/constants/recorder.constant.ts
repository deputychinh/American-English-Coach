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
  noSpeechMs: 5000,
  calibrationMs: 250,
};

/** End-of-speech silence for one word: a final stop's closure is ~100 ms, so 450 ms is safe. */
export const SILENCE_MS_WORD = 450;

/** Sentences keep the longer default so a pause between thought groups does not end the take. */
export const SILENCE_MS_SENTENCE = VAD_DEFAULTS.silenceMs;
