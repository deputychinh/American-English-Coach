import type { Copy } from '@/interfaces/copy.interface';

/** English "Today" home copy. */
export const enHome: Pick<Copy, 'today' | 'placement'> = {
  placement: {
    title: 'Placement check',
    lead: 'About 3 minutes: 12 listening questions from easy to hard to find your starting level.',
    howTo: 'Tap play, listen and pick an answer. No speaking, no penalties.',
    start: 'Start the check',
    resultTitle: 'You should start at',
    levelLine: (title: string, percent: number): string => `${title} · ${percent}% correct`,
    goPath: 'Start learning',
    retake: 'Take it again',
    homeTitle: 'New here?',
    homeHint: 'Answer 12 listening questions in 3 minutes to start at the right level.',
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
    levelLine: (title: string, done: number, total: number): string =>
      `${title} · ${done}/${total} units`,
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
};
