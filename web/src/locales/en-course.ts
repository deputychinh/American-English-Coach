import type { Copy } from '@/interfaces/copy.interface';

/** English course, onboarding and privacy copy. */
export const enCourse: Pick<Copy, 'privacy' | 'course' | 'onboarding' | 'curriculum'> = {
  privacy: {
    title: 'Privacy policy',
    updated: 'Updated 20 Oct 2026. On the iPhone your voice and image are processed on the device.',
    sections: [
      {
        heading: 'Where data is processed',
        paragraphs: [
          'Recordings are scored on the iPhone by the scoring pack downloaded to it, then discarded; they are not sent anywhere.',
          'The camera video is only processed on the device to measure the mouth; it is not stored or sent.',
          'Scores, learner profiles, lesson progress, interface choices and the daily goal are stored on the device.',
          'Classroom server (optional, Settings → Advanced): only when you connect one yourself are recordings and mouth measurements (eight numeric features and lip outline points) sent to the server you run on the same network, or over HTTPS you configure. Results are then stored in a SQLite file on that server.',
          'The AI tutor exists only on a classroom server and is off by default. When you configure a provider and press the button, the scored result (text) or one mouth photo is sent to that provider under its terms.',
        ],
      },
      {
        heading: 'Downloading the scoring pack and model voices',
        paragraphs: [
          'On first use the app downloads the scoring pack (about 357 MB) from GitHub. As with any file download, GitHub sees the device IP address; the app sends nothing else with it.',
          'The model voices were generated beforehand by OpenAI text-to-speech and ship inside the app; the app sends nothing to OpenAI.',
        ],
      },
      {
        heading: 'None of these',
        paragraphs: [
          'Accounts, ads, telemetry, behavioural analytics or sharing with third parties.',
        ],
      },
      {
        heading: 'Permissions',
        paragraphs: [
          'Camera and Microphone while you practise; Notifications for the reminder (optional, asked only when you turn it on); Local network only when you connect a classroom server.',
        ],
      },
      {
        heading: 'Deleting data',
        paragraphs: [
          'Settings → Data on this device → "Clear data on this device" removes results, profiles and progress. Deleting the app also removes the scoring pack. On a classroom server: delete the profile in Settings → Profiles, or delete data/coach.sqlite3.',
        ],
      },
    ],
  },
  course: {
    title: '14-day course for Vietnamese learners',
    lead: '10–15 minutes a day, from final consonants and /θ/ /ð/ to vowels, stress and intonation.',
    statDone: 'Days completed',
    statCurrent: 'Current day',
    dayShort: (index: number): string => `Day ${index}`,
    dayTitle: (index: number, title: string): string => `Day ${index} · ${title}`,
    minutes: (minutes: number): string => `${minutes} min`,
    itemsDone: (done: number, total: number): string => `${done}/${total} items`,
    currentBadge: 'In progress',
    kind: { sound: 'Sound', pair: 'Pair', sentence: 'Sentence' },
    runs: (count: number): string => `${count} recordings`,
    notYet: 'Not yet',
    loadFailed: 'Could not load the course from the scoring server.',
  },
  curriculum: {
    title: 'Clear pronunciation path',
    lead: 'Four levels, 24 units of five steps, ordered by the errors Vietnamese speakers make most.',
    quickPath: '14-day quick path',
    statDone: 'Units completed',
    statCurrent: 'In progress',
    unitShort: (index: number): string => `Unit ${index}`,
    levelTitle: (id: string, title: string): string => `Level ${id.replace('L', '')} · ${title}`,
    unitsDone: (done: number, total: number): string => `${done}/${total} units`,
    meta: (days: number, minutes: number): string => `${days} days · ${minutes} min/day`,
    currentBadge: 'In progress',
    doneBadge: 'Done',
    vnError: 'Common Vietnamese error',
    steps: {
      describe: 'See the mouth shape',
      discriminate: 'Listen and discriminate',
      controlled: 'Scored practice',
      guided: 'Shadowing',
      communicate: 'Use it in conversation',
    },
    discriminateSummary: (pairs: number, stress: number, focus: number): string =>
      [
        pairs ? `${pairs} word pairs` : '',
        stress ? `${stress} stress words` : '',
        focus ? `${focus} focus-word sentences` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    comingSoon: 'Coming soon',
    proSoon: 'Pro · coming soon',
    targetWords: 'Target words',
    itemDone: 'scored',
    loadFailed: 'Could not load the path from the scoring server.',
  },
  onboarding: {
    title: 'Getting started with American English Coach',
    lead: 'Three steps, about a minute: permissions, your profile and the mouth calibration.',
    stepsAria: 'Getting-started steps',
    steps: { intro: 'Permissions', profile: 'Profile', calibrate: 'Calibration' },
    introTitle: 'What the app needs and why',
    introMic:
      'The microphone records you reading words and sentences; the app scores every sound you say.',
    introCamera: 'The camera follows lips, jaw, and visible teeth and tongue in real time.',
    introPrivacy:
      'Video never leaves the device. When scoring on the device your voice stays too; with your own scoring server paired, recordings go only to that server.',
    allow: 'Allow microphone and camera',
    asking: 'Asking for permission…',
    later: 'Later',
    next: 'Continue',
    granted: 'allowed',
    denied: 'denied',
    missing: 'no device',
    micStatus: (state: string): string => `Microphone: ${state}`,
    cameraStatus: (state: string): string => `Camera: ${state}`,
    profileTitle: 'Who is practising?',
    profileLead:
      'One profile per person keeps progress, weekly plan and calibration apart. You can change it in Settings.',
    profileName: 'Your name',
    profilePlaceholder: 'For example: Minh',
    createProfile: 'Create profile and continue',
    useDefault: 'Use the default profile',
    profileOffline: 'The scoring server is not reachable, so the profile was not created.',
    skipProfile: 'Skip this step',
    calibrateTitle: 'Mouth calibration (20 seconds)',
    calibrateLead:
      'The mirror and the mouth feedback need to learn your mouth once. Do it now or when you first open the mirror.',
    calibrateNow: 'Calibrate now',
    finish: 'Later, go to home',
  },
};
