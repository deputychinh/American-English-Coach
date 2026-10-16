import type { vi } from '@/locales/vi';

/** Shape of the copy dictionary (derived from the Vietnamese source of truth). */
export type Copy = typeof vi;

/** Recursive partial used by secondary locales while they are incomplete. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type CopyOverrides = DeepPartial<Copy>;
