// App-shell service worker (plan B4 "controlled offline").
//
// `BUILD` is rewritten by scripts/build-sw.mjs with the Next build id and the hashed asset list,
// so every deploy gets its own shell cache and `activate` drops the previous one. Strategies:
//   - shell (HTML routes, /_next/static, icons, manifest, worklets, MediaPipe runtime): cache
//     first; navigations match without the query string and fall back to "/" for unknown routes;
//   - read-only API (content, course, plan, progress, profiles, calibration, past runs and
//     reference audio): network first; the last good response is kept in a cache that survives
//     deploys, keyed by URL + learner profile + voice, so lessons, history and the mirror guide
//     stay readable without the API;
//   - everything else (health/ready, assess, pairing, mutations, cross-origin): never touched.
const BUILD = { version: 'dev', assets: [] }; // __AEC_BUILD__
const SHELL_CACHE = `coach-shell-${BUILD.version}`;
const API_CACHE = 'coach-api-v1';
const SHELL = [
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
  '/manifest.webmanifest',
  '/theme.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/worklets/pcm-recorder.worklet.js',
  ...BUILD.assets,
];
const OFFLINE_API = [
  '/api/v1/content/',
  '/api/v1/course',
  '/api/v1/plan',
  '/api/v1/progress',
  '/api/v1/profiles',
  '/api/v1/calibration',
  '/api/v1/runs/',
  '/api/v1/audio',
];
const KEY_HEADERS = { 'x-coach-profile': 'coach_profile', 'x-coach-voice': 'coach_voice' };

const isOfflineApi = (pathname) => OFFLINE_API.some((prefix) => pathname.startsWith(prefix));

/** Cache key for an API request: the URL plus the headers that change the body. */
const apiCacheKey = (request) => {
  const url = new URL(request.url);
  for (const [header, param] of Object.entries(KEY_HEADERS)) {
    const value = request.headers.get(header);
    if (value) url.searchParams.set(param, value);
  }
  return url.href;
};

/** The precache tolerates individual misses: one absent icon must not disable offline. */
const precache = async () => {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(SHELL.map((path) => cache.add(path)));
};

const dropOldCaches = async () => {
  const keep = new Set([SHELL_CACHE, API_CACHE]);
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('coach-') && !keep.has(name))
      .map((n) => caches.delete(n)),
  );
};

/** Serves `bytes=start-end` out of a complete cached body (Safari media elements require 206). */
const rangeResponse = async (full, rangeHeader) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  const body = await full.arrayBuffer();
  if (!match) return new Response(body, { status: 200, headers: full.headers });
  const total = body.byteLength;
  const start = match[1] === '' ? Math.max(0, total - Number(match[2])) : Number(match[1]);
  const end =
    match[2] === '' || match[1] === '' ? total - 1 : Math.min(Number(match[2]), total - 1);
  const headers = new Headers(full.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
};

const withoutRange = (headers) => {
  const copy = new Headers(headers);
  copy.delete('range');
  return copy;
};

const networkFirst = async (request) => {
  const cache = await caches.open(API_CACHE);
  const key = apiCacheKey(request);
  const range = request.headers.get('range');
  // Media elements ask for byte ranges; a 206 cannot be cached, so the network copy is the full file.
  const upstream = range
    ? new Request(request, { headers: withoutRange(request.headers) })
    : request;
  try {
    const response = await fetch(upstream);
    if (response.status === 200) await cache.put(key, response.clone()).catch(() => undefined);
    return range && response.status === 200 ? rangeResponse(response, range) : response;
  } catch (error) {
    const cached = await cache.match(key);
    if (!cached) throw error;
    return range ? rangeResponse(cached, range) : cached;
  }
};

const cacheFirst = async (request, isNavigation) => {
  const cache = await caches.open(SHELL_CACHE);
  const key = isNavigation ? new URL(request.url).pathname : request;
  const cached = await cache.match(key, { ignoreSearch: isNavigation });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) await cache.put(key, response.clone()).catch(() => undefined);
    return response;
  } catch (error) {
    const home = isNavigation ? await cache.match('/') : undefined;
    if (!home) throw error;
    return home;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    if (isOfflineApi(url.pathname)) event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request, request.mode === 'navigate'));
});
