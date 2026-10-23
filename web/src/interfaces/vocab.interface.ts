import type { VocabKind, VocabReview } from '@/enums/vocab.enum';
import type { ReviewCard } from '@/interfaces/srs.interface';

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
export interface VocabTurn {
  item: VocabItem;
  card: ReviewCard;
  isNew: boolean;
}

export interface VocabPlanInput {
  items: readonly VocabItem[];
  cards: readonly ReviewCard[];
  profileId: string;
  now: Date;
}

export interface VocabPlan {
  turns: VocabTurn[];
  due: number;
  fresh: number;
  /** New cards are held back because too many reviews are due. */
  newPaused: boolean;
}

export interface VocabOverview extends VocabPlan {
  /** Items with at least one answered card. */
  started: number;
  /** Items recalled with probability ≥ 90 % in every mode they have. */
  remembered: number;
  total: number;
}
