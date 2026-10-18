import type { Copy } from '@/interfaces/copy.interface';

/** English "Today" home copy. */
export const enHome: Pick<Copy, 'today'> = {
  today: {
    greeting: (name: string): string => `Hi ${name}`,
    greetingNoName: 'Hi there',
    streak: (days: number): string => `${days}-day streak`,
    settings: 'Settings',
    goalTitle: "Today's goal",
    goal: (done: number, goal: number): string => `${done}/${goal} sessions`,
    goalDone: "Today's goal done",
    continueLabel: 'Continue your path',
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
