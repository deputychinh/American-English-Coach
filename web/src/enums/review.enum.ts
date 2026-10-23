/** How a review card asks for its item (docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md §4.2). */
export enum ReviewMode {
  /** Hear the item, pick its meaning. */
  Listen = 'listen',
  /** See the meaning, say the item; the phoneme scorer grades it. */
  Speak = 'speak',
  /** Hear a sentence with a gap, say the whole sentence. */
  Cloze = 'cloze',
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
