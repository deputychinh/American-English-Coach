import type { VocabKind, VocabReview } from '@/enums/vocab.enum';
import type { ReviewCard, ReviewPlan, ReviewTurn } from '@/interfaces/srs.interface';

export interface VocabExample {
  en: string;
  vi: string;
}

/** One entry of content/vocab.json (backend/app/eval/vocab_draft.py). */
export interface VocabItem {
  id: string;
  kind: VocabKind;
  text: string;
  ipa: string;
  pos: string;
  meaning_vi: string;
  example: VocabExample;
  units: string[];
  level: number;
  review: VocabReview;
}

export interface VocabDeck {
  schema: string;
  items: VocabItem[];
}

/** The example with the item cut out, for the fill-the-gap card. */
export interface Cloze {
  before: string;
  after: string;
}

/** One card to ask now and the item it asks about. */
export type VocabTurn = ReviewTurn<VocabItem>;

export interface VocabPlanInput {
  items: readonly VocabItem[];
  cards: readonly ReviewCard[];
  profileId: string;
  now: Date;
}

export type VocabPlan = ReviewPlan<VocabItem>;

export interface VocabOverview extends VocabPlan {
  /** Items with at least one answered card. */
  started: number;
  /** Items recalled with probability ≥ 90 % in every mode they have. */
  remembered: number;
  total: number;
}
