import type { AssessmentResponse } from '@/interfaces/practice.interface';

/** One scored take kept on the device (the same fields the server stores). */
export interface StoredRun {
  id: string;
  profileId: string;
  itemId: string;
  text: string;
  modelVersion: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  disputed: boolean;
  result: AssessmentResponse;
}

export interface LocalProfile {
  id: string;
  name: string;
  createdAt: string;
}

/** Runs of every profile on this device (IndexedDB in the app, memory where it is missing). */
export interface RunsStore {
  add: (run: StoredRun) => Promise<void>;
  list: (profileId: string) => Promise<StoredRun[]>;
  get: (id: string) => Promise<StoredRun | null>;
  put: (run: StoredRun) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
}

/** Verdict counts of one sound and the time (ISO) of the last run containing it. */
export interface SoundTally {
  total: number;
  ok: number;
  check: number;
  error: number;
  last: string;
}
