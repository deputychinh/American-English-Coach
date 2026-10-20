import type { PracticeItem } from '@/interfaces/practice.interface';

/** One listening question; `answer` indexes `options`. */
export interface ListenQuestion {
  id: string;
  kind: 'pair' | 'stress' | 'focus';
  /** Text sent to the reference voice. */
  prompt: string;
  /** What the learner taps. */
  options: string[];
  answer: number;
  /** Shown above the options ("Bạn nghe thấy từ nào?"). */
  question: string;
}

export interface ListenResult {
  unitId: string;
  total: number;
  correct: number;
  finishedAt: string;
}

export type ListenResults = Record<string, ListenResult>;

export interface ListenQuestionCardProps {
  question: ListenQuestion;
  index: number;
  total: number;
  chosen: number | null;
  isPlaying: boolean;
  audioError: string | null;
  onPlay: () => void;
  onChoose: (option: number) => void;
  onNext: () => void;
  isLast: boolean;
}

/** Where "continue" sends the learner within a unit. */
export interface NextStep {
  kind: 'listen' | 'practice' | 'shadow' | 'done';
  href: { pathname: string; query: Record<string, string> };
}

/** A placement question tagged with the level it comes from. */
export interface PlacementQuestion extends ListenQuestion {
  level: string;
}

/** Stored placement outcome: start at this level's first unit. */
export interface PlacementResult {
  level: string;
  unitId: string;
  /** Listening share right per level. */
  scores: Record<string, number>;
  /** Speaking share of sounds said right per level; absent when the speaking part was skipped. */
  speaking?: Record<string, number>;
  /** What to practise first, from the speaking part. */
  priorities?: PlacementPriority[];
  finishedAt: string;
}

/** One thing to practise first: the sound and the plain-language reason. */
export interface PlacementPriority {
  phoneme: string;
  ipa: string;
  hint: string;
  /** How many times it came up in the speaking part. */
  count: number;
}

/** One sentence of the speaking part and the level it belongs to. */
export interface PlacementSentence {
  level: string;
  item: PracticeItem;
}
