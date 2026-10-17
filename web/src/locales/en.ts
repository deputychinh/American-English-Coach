import type { CopyOverrides } from '@/interfaces/copy.interface';

/** English skeleton: keys of the home, navigation and settings surfaces. Fill the rest to ship EN. */
export const en: CopyOverrides = {
  appName: 'American English Coach',
  tagline: 'American English pronunciation practice with mouth shape, sounds and intonation',
  skipToContent: 'Skip to content',
  nav: {
    home: 'Home',
    sounds: '44 sounds',
    practice: 'Practice',
    mirror: 'Mouth mirror',
    progress: 'Progress',
    settings: 'Settings',
    ariaMain: 'Main navigation',
    ariaTabs: 'Tab bar',
  },
  plan: {
    title: 'What to practise today',
    weekTitle: 'This week',
    reasonLabel: { weak: 'Weak', review: 'Review', new: 'New' },
  },
  home: {
    quick: 'Quick start',
    heroCta: 'Practise now',
    heroSecondary: 'Open the mouth mirror',
    lastSession: 'Last session',
    statRuns: 'Scored recordings',
    statOkRate: 'Sounds on target',
    statSounds: 'Sounds practised',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    server: 'Scoring server',
    data: 'Data on this device',
    clearData: 'Clear data on this device',
    about: 'About',
    version: 'Version',
    profiles: {
      title: 'Learner profiles',
      active: 'In use',
      use: 'Use this profile',
      create: 'Create profile',
      import: 'Import from file',
      export: 'Export file',
      remove: 'Delete',
      defaultName: 'Learner',
    },
  },
};
