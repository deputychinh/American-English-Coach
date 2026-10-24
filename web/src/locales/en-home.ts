import type { Copy } from '@/interfaces/copy.interface';

/** English "Today" home copy, with the "add to home screen" card. */
export const enHome: Pick<Copy, 'today' | 'placement' | 'install'> = {
  placement: {
    title: 'Placement check',
    lead: 'About 3 minutes: 12 listening questions, then 8 short sentences to read aloud, to find your starting level.',
    howTo: 'Listening: tap play and pick an answer. You can skip the speaking part. No penalties.',
    start: 'Start the check',
    resultTitle: 'You should start at',
    levelLine: (title: string, percent: number): string => `${title} · ${percent}% correct`,
    goPath: 'Start learning',
    retake: 'Take it again',
    speakTitle: 'Speaking',
    speakLead:
      'Read 8 short sentences aloud. Every sound is scored to find the 3 things to practise first.',
    speakStart: 'Start speaking',
    speakSkip: 'Skip speaking',
    sentenceOf: (index: number, total: number): string => `Sentence ${index}/${total}`,
    levelLineBoth: (title: string, listen: number, speak: number): string =>
      `${title} · listening ${listen}% · speaking ${speak}%`,
    explain: 'This is the first level where listening (and speaking, if taken) was under 80%.',
    prioritiesTitle: '3 things to practise first',
    practiceSound: 'Practise this sound',
    noPriorities: 'No repeated mistakes in the speaking part. Well done!',
    homeTitle: 'New here?',
    homeHint: 'Listen and speak for 3 minutes to start at the right level.',
    homeCta: 'Placement check',
  },
  today: {
    greeting: (name: string): string => `Hi ${name}`,
    greetingNoName: 'Hi there',
    streak: (days: number): string => `${days}-day streak`,
    settings: 'Settings',
    goalTitle: "Today's goal",
    goal: (done: number, goal: number): string => `${done}/${goal} sessions`,
    goalDone: "Today's goal done",
    continueLabel: 'Continue your path',
    levelLine: (level: number, done: number, total: number): string =>
      `Level ${level} · ${done}/${total} units`,
    unitLine: (index: number, title: string): string => `Unit ${index} · ${title}`,
    next: {
      listen: 'Step 2 · Listen and discriminate',
      practice: 'Step 3 · Scored practice',
      shadow: 'Step 4 · Shadowing',
      done: 'Unit done · review',
    },
    start: 'Start',
    focusTitle: 'Sounds to practise',
    focusEmpty: 'Do a few exercises so the app knows what to review.',
    tiles: {
      mirror: 'Mirror',
      listen: 'Listen',
      chart: '44 sounds',
      path: 'Path',
    },
  },
  install: {
    title: 'Add the app to your home screen',
    body: 'Opens like an app, full screen, and works offline too. No App Store and nothing extra to install.',
    action: 'Install',
    later: 'Not now',
    iosSteps: [
      'Tap the Share button (a square with an arrow pointing up) in the Safari toolbar.',
      'Scroll down and choose “Add to Home Screen”.',
      'Tap “Add”. The app icon appears on your home screen.',
    ],
  },
};
