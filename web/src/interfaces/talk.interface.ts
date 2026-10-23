import type { ReviewGrade } from '@/enums/review.enum';
import type { GrammarEnding, Register, TalkKind } from '@/enums/talk.enum';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type { ReviewCard, ReviewPlan, ReviewTurn } from '@/interfaces/srs.interface';

/** content/talk.json (`aec-talk/1`): functional phrases and spoken patterns (plan v2 §5). */

export interface TalkPhrase {
  en: string;
  vi: string;
}

/** A communicative function said three ways, with a situation that calls for each. */
export interface TalkFunction {
  id: string;
  title_vi: string;
  title_en: string;
  units: string[];
  phrases: Record<Register, TalkPhrase>;
  situations: Record<Register, string>;
}

/** "I work every day." + "yesterday" → "I worked yesterday."; `target` carries the grammar. */
export interface TalkDrill {
  id: string;
  prompt: string;
  cue: string;
  answer: string;
  target: string;
  vi: string;
}

export interface TalkPattern {
  id: string;
  unit: string;
  title_vi: string;
  title_en: string;
  rule_vi: string;
  /** The ending whose sound is checked on the target's last phone. */
  ending: GrammarEnding | null;
  drills: TalkDrill[];
}

export interface TalkDeck {
  schema: string;
  functions: TalkFunction[];
  patterns: TalkPattern[];
}

/** One situation of a function: pick and say the phrase in its register. */
export interface SituationItem {
  kind: TalkKind.Situation;
  /** `${function id}.${register}` */
  id: string;
  unit: string;
  fn: TalkFunction;
  register: Register;
}

export interface PatternDrillItem {
  kind: TalkKind.Drill;
  id: string;
  unit: string;
  pattern: TalkPattern;
  drill: TalkDrill;
}

export type TalkItem = SituationItem | PatternDrillItem;

export type TalkTurn = ReviewTurn<TalkItem>;

export interface TalkPlanInput {
  items: readonly TalkItem[];
  cards: readonly ReviewCard[];
  profileId: string;
  now: Date;
}

export interface TalkOverview extends ReviewPlan<TalkItem> {
  /** Items with at least one answered card. */
  started: number;
  total: number;
}

/** A spoken transformation, graded on the target's phones. */
export interface TransformGrade {
  grade: ReviewGrade;
  /** Verdict of the ending's sound; null when the pattern has no checked ending. */
  ending: ScoreVerdict | null;
}

/** What one unit practises: its functions and its pattern. */
export interface UnitTalk {
  functions: TalkFunction[];
  pattern: TalkPattern | null;
}

/** What the talk screen loads: the deck in course order and what to practise. */
export interface TalkState {
  items: TalkItem[];
  overview: TalkOverview;
  /** Every item of the requested unit, when one is requested. */
  unitTurns: TalkTurn[] | null;
}

/** A sentence cut around a phrase, to show the phrase highlighted. */
export interface PhraseSplit {
  before: string;
  match: string;
  after: string;
}
