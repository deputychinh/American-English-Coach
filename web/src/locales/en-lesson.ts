/** Lesson player copy (split from `en.ts` to keep files short). */
export const enLesson = {
  lesson: {
    title: 'Lesson',
    start: 'Start the lesson',
    resume: (step: number, total: number): string => `Continue · step ${step}/${total}`,
    review: 'Take this lesson again',
    loading: 'Preparing the lesson…',
    notFound: 'This unit is not in the course.',
    stepOf: (step: number, total: number, label: string): string =>
      `Step ${step}/${total} · ${label}`,
    steps: {
      describe: 'Meet the sound',
      discriminate: 'Hear the difference',
      controlled: 'Word by word',
      guided: 'Say it after the model',
      communicate: 'Use it to talk',
    },
    describeLead: 'See how the mouth moves, play the key words, then start.',
    example: 'Example',
    contrast: 'Easy to confuse with',
    listen: (word: string): string => `Play “${word}”`,
    startListening: 'Start listening',
    next: 'Next',
    skip: 'Skip',
    itemOf: (index: number, total: number): string => `${index}/${total}`,
    passedCount: (passed: number, total: number): string => `${passed}/${total} passed`,
    gateTitle: 'Check before moving on',
    gateShort: (passed: number, total: number, need: number): string =>
      `You passed ${passed}/${total} items. This step needs ${need}.`,
    gateOk: (passed: number, total: number): string =>
      `You passed ${passed}/${total} items. That is enough for the next step.`,
    retryFailed: 'Practise the missed items',
    goOn: 'Move on anyway',
    nextStep: 'Next step',
    scenario: 'Situation',
    doneTitle: 'Lesson complete!',
    doneListen: (percent: number): string => `${percent}% heard correctly`,
    doneSpeak: (passed: number, total: number): string => `${passed}/${total} items passed`,
    doneAdvice:
      'Come back tomorrow for the missed items; short daily practice beats one long session.',
    backToCourse: 'Back to the course',
    restart: 'Start over',
  },
};
