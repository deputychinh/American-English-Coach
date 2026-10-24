import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { vi } from 'vitest';

import type {
  ServiceWorkerHarness,
  ServiceWorkerRoute,
} from '@/interfaces/service-worker.interface';

const ORIGIN = 'http://127.0.0.1:8765';
const SOURCE = resolve(process.cwd(), 'public', 'sw.js');

type Listener = (event: Record<string, unknown>) => void;
type MatchOptions = { ignoreSearch?: boolean } | undefined;

const absolute = (key: string | Request): string =>
  typeof key === 'string' ? new URL(key, `${ORIGIN}/sw.js`).href : key.url;

const samePath = (a: string, b: string): boolean => new URL(a).pathname === new URL(b).pathname;

/** A Map-backed CacheStorage with the subset of the Cache API that public/sw.js uses. */
const makeCaches = (network: (request: Request) => Promise<Response>) => {
  const stores = new Map<string, Map<string, Response>>();
  const open = (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    const match = (key: string | Request, options?: MatchOptions): Response | undefined => {
      const url = absolute(key);
      const exact = store.get(url);
      if (exact || !options?.ignoreSearch) return exact?.clone();
      return [...store.entries()].find(([stored]) => samePath(stored, url))?.[1].clone();
    };
    return Promise.resolve({
      match: (key: string | Request, options?: MatchOptions) =>
        Promise.resolve(match(key, options)),
      put: (key: string | Request, response: Response) => {
        if (response.status === 206) return Promise.reject(new TypeError('partial response'));
        store.set(absolute(key), response);
        return Promise.resolve();
      },
      add: async (key: string) => {
        const response = await network(new Request(absolute(key)));
        if (!response.ok) throw new TypeError(`bad status ${response.status}`);
        store.set(absolute(key), response);
      },
      keys: () => Promise.resolve([...store.keys()].map((url) => new Request(url))),
    });
  };
  return {
    open,
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
    has: (name: string) => Promise.resolve(stores.has(name)),
  };
};

/**
 * Loads public/sw.js into a fresh worker-like scope. `routes` answers network fetches by
 * pathname; an unknown path, or a route returning `null`, rejects like a browser offline.
 */
export const loadServiceWorker = (
  routes: Record<string, ServiceWorkerRoute> = {},
): ServiceWorkerHarness => {
  const listeners: Record<string, Listener> = {};
  const fetchMock = vi.fn((input: Request): Promise<Response> => {
    const response = routes[new URL(input.url).pathname]?.(input) ?? null;
    return response ? Promise.resolve(response) : Promise.reject(new TypeError('Failed to fetch'));
  });
  const caches = makeCaches(fetchMock);
  const skipWaiting = vi.fn();
  const claim = vi.fn(() => Promise.resolve());
  const self = {
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener;
    },
    skipWaiting,
    clients: { claim },
    location: { origin: ORIGIN, href: `${ORIGIN}/sw.js` },
  };
  runInNewContext(readFileSync(SOURCE, 'utf8'), {
    self,
    caches,
    fetch: fetchMock,
    URL,
    Request,
    Response,
    Headers,
  });

  const lifecycle = async (type: string): Promise<void> => {
    const pending: Promise<unknown>[] = [];
    listeners[type]?.({ waitUntil: (work: Promise<unknown>) => pending.push(work) });
    await Promise.all(pending);
  };

  return {
    install: () => lifecycle('install'),
    activate: () => lifecycle('activate'),
    respond: (request) => {
      const outcome: { answer: Promise<Response> | null } = { answer: null };
      listeners.fetch?.({
        request,
        respondWith: (work: Promise<Response>) => {
          outcome.answer = work;
        },
      });
      return outcome.answer ?? Promise.resolve(null);
    },
    cacheNames: () => caches.keys(),
    cachedUrls: async (cacheName) =>
      (await (await caches.open(cacheName)).keys()).map((request) => request.url),
    seed: async (cacheName, url, response) => {
      await (await caches.open(cacheName)).put(absolute(url), response);
    },
    fetchMock,
    skipWaiting,
    claim,
  };
};

/** A same-origin request to the fake API origin, as the page would issue it. */
export const pageRequest = (path: string, init?: RequestInit): Request =>
  new Request(`${ORIGIN}${path}`, init);

/** A request for a worker script (`destination` is read-only, so it is set afterwards). */
export const workerRequest = (path: string): Request => {
  const request = new Request(`${ORIGIN}${path}`);
  Object.defineProperty(request, 'destination', { value: 'worker' });
  return request;
};

/** A navigation to a route (`new Request` refuses `mode: 'navigate'`, so it is set afterwards). */
export const navigationRequest = (path: string): Request => {
  const request = new Request(`${ORIGIN}${path}`);
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  return request;
};
