/** One spoken answer: waiting, recording, being scored, then scored or not scorable. */
export enum TakePhase {
  Idle = 'idle',
  Recording = 'recording',
  Scoring = 'scoring',
  Scored = 'scored',
  Failed = 'failed',
}
