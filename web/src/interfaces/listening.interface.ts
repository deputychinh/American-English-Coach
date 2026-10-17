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
