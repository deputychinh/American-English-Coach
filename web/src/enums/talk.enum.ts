/** How formal a phrase is (plan v2 §5.1): to a close friend, to anyone, to a boss or a client. */
export enum Register {
  Casual = 'casual',
  Neutral = 'neutral',
  Formal = 'formal',
}

/** A grammar ending the scorer checks was said (plan v2 §5.2): third person/plural -s, past -ed. */
export enum GrammarEnding {
  S = 's',
  Ed = 'ed',
}

export enum TalkKind {
  /** Pick the phrase that fits the situation, then say it. */
  Situation = 'situation',
  /** Change a sentence as the cue says, by voice. */
  Drill = 'drill',
}
