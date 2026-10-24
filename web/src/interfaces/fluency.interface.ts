/** A useful phrase offered with a fluency prompt. */
export interface FluencyPhrase {
  en: string;
  vi: string;
}

/** One "Nói 3 lần" topic (content/fluency.json). */
export interface FluencyPrompt {
  id: string;
  unit: string;
  title_vi: string;
  title_en: string;
  ideas_vi: string[];
  phrases: FluencyPhrase[];
}

export interface FluencyDeck {
  schema: string;
  rounds: number[];
  prompts: FluencyPrompt[];
}

/**
 * Utterance fluency measured from the audio alone (syllable nuclei, de Jong & Wempe 2009).
 * Rates use the speaking time from the first to the last sound, so silence before or after
 * the learner speaks does not count.
 */
export interface FluencyMetrics {
  speakingSeconds: number;
  phonationSeconds: number;
  syllables: number;
  pauses: number;
  /** Syllables per minute over the speaking time. */
  speechRate: number;
  /** Syllables per second of sound (pauses left out). */
  articulationRate: number;
  /** Syllables between two pauses, on average. */
  meanLengthOfRun: number;
  pausesPerMinute: number;
  meanPauseSeconds: number;
}

export interface FluencyRound {
  targetSeconds: number;
  metrics: FluencyMetrics;
}

/** One finished "Nói 3 lần" on a topic. */
export interface FluencySession {
  id: string;
  profileId: string;
  promptId: string;
  createdAt: string;
  rounds: FluencyRound[];
}

/** The first and the last round of a session, for "faster, longer runs, fewer pauses". */
export interface FluencyChange {
  speechRate: number;
  meanLengthOfRun: number;
  pausesPerMinute: number;
}
