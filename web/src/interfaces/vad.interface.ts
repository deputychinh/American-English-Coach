export interface VadOptions {
  /** Lowest RMS level that can count as voice. */
  minThreshold: number;
  /** Voice must be this many times louder than the background noise. */
  noiseFactor: number;
  /** Continuous voice needed before the utterance counts as started. */
  speechMs: number;
  /** Silence after speech that ends the utterance. */
  silenceMs: number;
  /** Give up when nothing was said for this long. */
  noSpeechMs: number;
  /** Opening window that only measures the background noise. */
  calibrationMs: number;
}

export interface VadState {
  startedAt: number;
  noiseFloor: number;
  speechSince: number | null;
  lastVoiceAt: number | null;
  hasSpeech: boolean;
}

export type VadEvent = 'none' | 'speech' | 'end' | 'no-speech';

/** Automatic end of a recording: the learner finished speaking, or never started. */
export type AutoStopReason = 'end' | 'no-speech';

export interface RecorderOptions {
  /** Stop by itself on end of speech or no speech; the callback runs the caller's stop flow. */
  onAutoStop?: (reason: AutoStopReason) => void;
}
