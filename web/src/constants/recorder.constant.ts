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
