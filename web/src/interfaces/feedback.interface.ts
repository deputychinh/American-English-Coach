import type { components } from '@/api/coach.schema';

/** AI feedback on what the learner said: grammar, word choice, formality (plan v2 V6). */
export type ContentFeedback = components['schemas']['ContentFeedback'];
export type FeedbackIssue = components['schemas']['FeedbackIssue'];

export interface FeedbackRequest {
  transcript: string;
  /** The task in Vietnamese, so the tutor can judge whether the formality fits. */
  taskVi: string | null;
}

/** The part of the Web Speech API recogniser the app uses (not in TypeScript's DOM types). */
export interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** The browser's speech-to-text, used to fill the transcript box (`useDictation`). */
export interface Dictation {
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
}
