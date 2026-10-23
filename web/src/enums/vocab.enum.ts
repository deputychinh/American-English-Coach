/** A vocabulary item is one word or a multi-word chunk ("turn it on", "Nice to meet you too."). */
export enum VocabKind {
  Word = 'word',
  Chunk = 'chunk',
}

/** Draft items have a meaning nobody has checked yet; the app labels them. */
export enum VocabReview {
  Draft = 'draft',
  Approved = 'approved',
}
