import type { Copy } from '@/interfaces/copy.interface';

/** English course, onboarding and privacy copy. */
export const enCourse: Pick<Copy, 'privacy' | 'course' | 'onboarding'> = {
  privacy: {
    title: 'Privacy policy',
    updated:
      'Updated 17 October 2026. The app and the scoring server are software you run yourself; no developer server receives your data.',
    sections: [
      {
        heading: 'Where data is processed',
        paragraphs: [
          'Camera video is processed on the device only, to measure mouth shape; it is never stored or sent.',
          'Mouth measurements (eight numeric features and lip-outline points) and the recording of a practice attempt go to the scoring server you run on a computer on the same network, or over HTTPS you configure. Recordings are scored and discarded; results live in an SQLite file on that server.',
          'Learner profiles, interface choices and the daily goal are kept on the device and on your scoring server.',
          'The AI tutor is off by default. Only when you configure a provider and press the button does the app send the scored result (text) or one mouth photo to that provider under its terms.',
        ],
      },
      {
        heading: 'There is no',
        paragraphs: [
          'Account, advertising, telemetry, behavioural analytics or sharing with third parties.',
        ],
      },
      {
        heading: 'Permissions',
        paragraphs: [
          'Camera and Microphone only when you turn them on; Local Network to reach the scoring server; Notifications for the optional reminder.',
        ],
      },
      {
        heading: 'Deleting data',
        paragraphs: [
          'Settings → "Clear data on this device". On the scoring server: delete the profile in Settings → Profiles, or delete data/coach.sqlite3.',
        ],
      },
    ],
  },
  course: {
    title: '14-day course for Vietnamese learners',
    lead: '10–15 minutes a day, from final consonants and /θ/ /ð/ to vowels, stress and intonation. Every item is an existing drill; a day is complete once each item has at least one scored recording.',
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
  onboarding: {
    title: 'Getting started with American English Coach',
    lead: 'Three steps, about a minute: permissions, your profile and the mouth calibration.',
    stepsAria: 'Getting-started steps',
    steps: { intro: 'Permissions', profile: 'Profile', calibrate: 'Calibration' },
    introTitle: 'What the app needs and why',
    introMic:
      'The microphone records you reading words and sentences; every sound is scored on your computer.',
    introCamera: 'The camera follows lips, jaw, and visible teeth and tongue in real time.',
    introPrivacy:
      'Video never leaves the device. Only mouth measurements and recordings go to the local scoring server.',
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
