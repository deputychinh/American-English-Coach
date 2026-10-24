import { FLUENCY_HISTORY_LIMIT, FLUENCY_TREND_SESSIONS } from '@/constants/fluency.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { readPlacement } from '@/features/placement/services/placement.service';
import type { FluencyDeck, FluencyPrompt, FluencySession } from '@/interfaces/fluency.interface';
import { readStorage, writeStorage } from '@/utils/storage.util';

/**
 * "Nói 3 lần" on the device: the bundled prompts (content/fluency.json) and each profile's
 * finished sessions in local storage (a session is a few numbers, so 60 of them stay tiny).
 */

type SessionsByProfile = Record<string, FluencySession[]>;

const NO_SESSIONS: FluencySession[] = [];
const listeners = new Set<() => void>();
let cached: { raw: string; sessions: FluencySession[] } | null = null;

let deck: Promise<FluencyDeck> | null = null;

export const loadFluencyDeck = (): Promise<FluencyDeck> => {
  deck ??= import('@/data/content/fluency.json').then(
    (module) => module.default as unknown as FluencyDeck,
  );
  return deck;
};

/** The unit's prompt, else the first one. */
export const promptFor = (prompts: FluencyPrompt[], unitId: string | null): FluencyPrompt | null =>
  prompts.find((prompt) => prompt.unit === unitId) ?? prompts[0] ?? null;

const readAll = (): SessionsByProfile => readStorage<SessionsByProfile>(StorageKey.Fluency, {});

export const readSessions = (profileId: string): FluencySession[] => readAll()[profileId] ?? [];

/** Keeps the session, dropping the oldest beyond the limit; returns the profile's sessions. */
export const saveSession = (session: FluencySession): FluencySession[] => {
  const all = readAll();
  const kept = [...(all[session.profileId] ?? []), session].slice(-FLUENCY_HISTORY_LIMIT);
  writeStorage(StorageKey.Fluency, { ...all, [session.profileId]: kept });
  listeners.forEach((listener) => listener());
  return kept;
};

/** A finished "Nói 3 lần", stamped now. */
export const recordSession = (
  session: Omit<FluencySession, 'id' | 'createdAt'>,
  now = new Date(),
): FluencySession[] =>
  saveSession({
    ...session,
    id: `${now.getTime().toString(36)}-${session.promptId}`,
    createdAt: now.toISOString(),
  });

export const subscribeSessions = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The same array until the stored sessions change (a `useSyncExternalStore` snapshot). */
export const sessionsSnapshot = (profileId: string): FluencySession[] => {
  const raw = JSON.stringify(readSessions(profileId));
  if (cached?.raw !== raw) cached = { raw, sessions: JSON.parse(raw) as FluencySession[] };
  return cached.sessions;
};

/** Before hydration nothing is stored (the static HTML has no learner). */
export const serverSessions = (): FluencySession[] => NO_SESSIONS;

/** The unit the placement check started the learner at, if any. */
export const placedUnitId = (): string | null => readPlacement()?.unitId ?? null;

/** The latest sessions with a last round, oldest first, for the trend. */
export const trendSessions = (sessions: FluencySession[]): FluencySession[] =>
  sessions.filter((session) => session.rounds.length > 0).slice(-FLUENCY_TREND_SESSIONS);
