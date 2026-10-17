import type { Mock } from 'vitest';

/** Answers one network fetch in a service-worker unit test; `null` fails like being offline. */
export type ServiceWorkerRoute = (request: Request) => Response | null;

/** What a unit test can do with public/sw.js once loaded into an isolated worker-like scope. */
export interface ServiceWorkerHarness {
  /** Runs the `install` listener and waits for its `waitUntil` work. */
  install: () => Promise<void>;
  /** Runs the `activate` listener and waits for its `waitUntil` work. */
  activate: () => Promise<void>;
  /** Runs the `fetch` listener; `null` when the worker let the request pass through. */
  respond: (request: Request) => Promise<Response | null>;
  /** Names of the caches that currently exist. */
  cacheNames: () => Promise<string[]>;
  /** URLs stored in one cache, in insertion order. */
  cachedUrls: (cacheName: string) => Promise<string[]>;
  /** Puts a response into a cache ahead of the test (e.g. a stale shell cache). */
  seed: (cacheName: string, url: string, response: Response) => Promise<void>;
  /** The `fetch` the worker calls for the network. */
  fetchMock: Mock<(input: Request) => Promise<Response>>;
  skipWaiting: Mock<() => void>;
  claim: Mock<() => Promise<void>>;
}
