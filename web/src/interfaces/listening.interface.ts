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
  scores: Record<string, number>;
  finishedAt: string;
}
