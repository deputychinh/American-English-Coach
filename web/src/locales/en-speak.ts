import type { Copy } from '@/interfaces/copy.interface';

/** English mirror speaking-check copy. */
export const enSpeak: Pick<Copy, 'speak'> = {
  speak: {
    say: 'Say this word',
    record: 'Try it',
    stop: 'Stop and score',
    scoring: 'Scoring…',
    listen: 'Play the model',
    replay: 'Play back your recording',
    prev: 'Previous word',
    next: 'Next word',
    sound: (ipa: string): string => `Sound /${ipa}/`,
    mouth: 'Mouth shape',
    verdict: { ok: 'Correct', check: 'Close', error: 'Not yet', none: 'Not heard' },
    mouthOk: 'Correct',
    mouthOff: 'Not yet',
    mouthNone: 'Camera cannot see it',
    mouthNotNeeded: 'Judged by ear',
    headline: {
      both: 'Sound and mouth shape both correct!',
      sound: 'The sound is right; adjust your mouth as the cue says.',
      noFace:
        'The sound is right but the camera could not see your mouth: face the camera and try again.',
      mouth: 'The mouth shape is right but the sound is off: play the model and try again.',
      neither: 'Play the model, match the ghost lips, then try again.',
    },
    streak: (count: number, total: number): string => `${count}/${total} correct in a row`,
    mastered: 'You have got this sound!',
    masteredHint:
      'Sound and mouth shape correct three times in a row. Move on or practise sentences.',
    again: 'Try again',
    practiceSentences: 'Practise sentences with this sound',
  },
};
