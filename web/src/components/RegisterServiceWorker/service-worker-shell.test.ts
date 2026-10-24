import type { ServiceWorkerRoute } from '@/interfaces/service-worker.interface';
import {
  loadServiceWorker,
  navigationRequest,
  pageRequest,
  workerRequest,
} from '@/test-utils/service-worker';

const ORIGIN = 'http://127.0.0.1:8765';
const SHELL_CACHE = 'coach-shell-dev';
const ROUTES = [
  '/',
  '/sounds/',
  '/practice/',
  '/mirror/',
  '/calibration/',
  '/progress/',
  '/settings/',
  '/course/',
  '/welcome/',
  '/privacy/',
  '/curriculum/',
  '/listen/',
  '/placement/',
  '/vocab/',
  '/talk/',
  '/fluency/',
  '/today/',
  '/lesson/',
  '/licenses/',
];
const FILES = [
  '/manifest.webmanifest',
  '/theme.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/worklets/pcm-recorder.worklet.js',
];

const html = (name: string): Response =>
  new Response(`<html>${name}</html>`, { status: 200, headers: { 'content-type': 'text/html' } });

const shellRoutes = (except: string[] = []): Record<string, ServiceWorkerRoute> =>
  Object.fromEntries(
    [...ROUTES, ...FILES]
      .filter((path) => !except.includes(path))
      .map((path) => [path, () => html(path)]),
  );

describe('service worker: app shell', () => {
  it('precaches every route and static file on install and tolerates one missing file', async () => {
    const worker = loadServiceWorker(shellRoutes(['/icons/icon.svg']));
    await worker.install();
    const cached = await worker.cachedUrls(SHELL_CACHE);
    for (const path of [...ROUTES, ...FILES].filter((p) => p !== '/icons/icon.svg')) {
      expect(cached).toContain(`${ORIGIN}${path}`);
    }
    expect(cached).not.toContain(`${ORIGIN}/icons/icon.svg`);
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it('drops shell caches of older builds on activate but keeps downloaded lessons', async () => {
    const worker = loadServiceWorker(shellRoutes());
    await worker.seed('coach-v2', '/', html('legacy'));
    await worker.seed('coach-shell-old', '/', html('old'));
    await worker.seed('coach-api-v1', '/api/v1/content/sounds', html('lessons'));
    await worker.seed('other-app', '/', html('other'));
    await worker.install();
    await worker.activate();
    expect((await worker.cacheNames()).sort()).toEqual(['coach-api-v1', SHELL_CACHE, 'other-app']);
    expect(worker.claim).toHaveBeenCalledOnce();
  });

  it('serves a navigation with a query string from the precached route without the network', async () => {
    const worker = loadServiceWorker(shellRoutes());
    await worker.install();
    worker.fetchMock.mockClear();
    const response = await worker.respond(navigationRequest('/sounds/?id=v01'));
    expect(await response?.text()).toBe('<html>/sounds/</html>');
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the home shell for an unknown route while offline', async () => {
    const worker = loadServiceWorker(shellRoutes());
    await worker.install();
    const response = await worker.respond(navigationRequest('/nowhere/'));
    expect(await response?.text()).toBe('<html>/</html>');
  });

  it('caches a hashed asset on first use and answers from the cache afterwards', async () => {
    const chunk = '/_next/static/chunks/app.js';
    const worker = loadServiceWorker({
      [chunk]: () => new Response('console.log(1)', { status: 200 }),
    });
    const first = await worker.respond(pageRequest(chunk));
    expect(await first?.text()).toBe('console.log(1)');
    const second = await worker.respond(pageRequest(chunk));
    expect(await second?.text()).toBe('console.log(1)');
    expect(worker.fetchMock).toHaveBeenCalledOnce();
    expect(await worker.cachedUrls(SHELL_CACHE)).toEqual([`${ORIGIN}${chunk}`]);
  });

  it('answers a worker script with a fresh response that keeps its headers', async () => {
    const bootstrap = '/_next/static/chunks/turbopack-worker-x.js';
    const worker = loadServiceWorker({
      [bootstrap]: () =>
        new Response('importScripts()', {
          status: 200,
          headers: { 'Cross-Origin-Embedder-Policy': 'require-corp' },
        }),
    });
    for (const attempt of [1, 2]) {
      const response = await worker.respond(workerRequest(`${bootstrap}#params=%5B%5D`));
      expect(await response?.text(), String(attempt)).toBe('importScripts()');
      expect(response?.url).toBe('');
      expect(response?.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    }
    expect(worker.fetchMock).toHaveBeenCalledOnce();
  });

  it('returns but never caches a non-200 response', async () => {
    const missing = '/_next/static/chunks/gone.js';
    const worker = loadServiceWorker({ [missing]: () => new Response('nope', { status: 404 }) });
    const response = await worker.respond(pageRequest(missing));
    expect(response?.status).toBe(404);
    expect(await worker.cachedUrls(SHELL_CACHE)).toEqual([]);
  });

  it('lets non-GET, cross-origin, live-status and model requests pass through untouched', async () => {
    const worker = loadServiceWorker();
    expect(await worker.respond(pageRequest('/api/v1/assess', { method: 'POST' }))).toBeNull();
    expect(
      await worker.respond(new Request('https://example.com/api/v1/content/sounds')),
    ).toBeNull();
    expect(await worker.respond(pageRequest('/api/v1/health'))).toBeNull();
    expect(await worker.respond(pageRequest('/api/v1/ready'))).toBeNull();
    expect(await worker.respond(pageRequest('/api/v1/pair', { method: 'POST' }))).toBeNull();
    // The web app's model parts live in the engine's own cache, not twice in the shell cache.
    expect(await worker.respond(pageRequest('/models/w2v.mm8/part-00.bin'))).toBeNull();
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it('rejects like the network when nothing is cached for an offline asset', async () => {
    const worker = loadServiceWorker();
    await expect(worker.respond(pageRequest('/_next/static/chunks/x.js'))).rejects.toThrow(
      'Failed to fetch',
    );
  });
});
