import type { Copy } from '@/interfaces/copy.interface';

/** English listening-step copy. */
export const enListen: Pick<Copy, 'listen'> = {
  listen: {
    title: 'Listen and discriminate',
    lead: (unit: string): string =>
      `${unit} · Listen before you speak: pick the word, the stressed syllable or the focus word you hear.`,
    backToPath: 'Back to the path',
    play: 'Play the audio',
    whichWord: 'Which word did you hear?',
    whichSyllable: 'Which syllable is stressed?',
    whichFocus: 'Which word is the focus of the sentence?',
    progress: (index: number, total: number): string => `Question ${index} / ${total}`,
    correct: 'Correct!',
    wrong: (answer: string): string => `Not quite. Answer: ${answer}. Play it again to compare.`,
    next: 'Next question',
    finish: 'See the results',
    summaryTitle: 'Listening results',
    accuracy: 'Accuracy',
    answered: 'Correct / total',
    adviceGood: 'Your ear tells them apart. Move on to scored practice.',
    adviceAgain:
      'Listen once more before speaking; pronunciation settles once the ear can tell the difference.',
    continuePractice: 'Go to scored practice',
    again: 'Listen again from the start',
    noQuestions: 'This unit has no listening exercise yet.',
    doneBadge: (percent: number): string => `Listened · ${percent}%`,
    start: 'Start listening',
  },
};
