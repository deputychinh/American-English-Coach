/** How a review card asks for its item (docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md §4.2, §5). */
export enum ReviewMode {
  /** Hear the item, pick its meaning. */
  Listen = 'listen',
  /** See the meaning, say the item; the phoneme scorer grades it. */
  Speak = 'speak',
  /** Hear a sentence with a gap, say the whole sentence. */
  Cloze = 'cloze',
  /** Read a situation, pick the phrase in the right register, say it (plan v2 §5.1). */
  Register = 'register',
  /** Hear a sentence and a cue, say the changed sentence (plan v2 §5.2). */
  Transform = 'transform',
}

/** The learner's recall on one review; the values are the FSRS ratings. */
export enum ReviewGrade {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

/** Where a card is in the FSRS memory model. */
export enum CardPhase {
  New = 'new',
  Learning = 'learning',
  Review = 'review',
  Relearning = 'relearning',
}
