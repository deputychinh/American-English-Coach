import { jsonResponse } from '@/test-utils/api-mock';
import { loadServiceWorker, pageRequest } from '@/test-utils/service-worker';

const ORIGIN = 'http://127.0.0.1:8765';
const API_CACHE = 'coach-api-v1';

const wav = (length: number): Response =>
  new Response(new Uint8Array(Array.from({ length }, (_, i) => i)), {
    status: 200,
    headers: { 'content-type': 'audio/wav' },
  });

describe('service worker: read-only API', () => {
  it('fetches lesson content from the network and keeps the copy for offline', async () => {
    const worker = loadServiceWorker({
      '/api/v1/content/sounds': () => jsonResponse([{ id: 'v01' }]),
    });
    const response = await worker.respond(pageRequest('/api/v1/content/sounds'));
    expect(await response?.json()).toEqual([{ id: 'v01' }]);
    expect(await worker.cachedUrls(API_CACHE)).toEqual([`${ORIGIN}/api/v1/content/sounds`]);
  });

  it('serves the last good response when the network fails, per learner profile', async () => {
    let isOnline = true;
    const worker = loadServiceWorker({
      '/api/v1/progress': (request) =>
        isOnline
          ? jsonResponse({ profile: request.headers.get('x-coach-profile') ?? 'default' })
          : null,
    });
    const forProfile = (profile?: string): Request =>
      pageRequest('/api/v1/progress', profile ? { headers: { 'X-Coach-Profile': profile } } : {});
    await worker.respond(forProfile());
    await worker.respond(forProfile('p2'));
    isOnline = false;
    expect(await (await worker.respond(forProfile()))?.json()).toEqual({ profile: 'default' });
    expect(await (await worker.respond(forProfile('p2')))?.json()).toEqual({ profile: 'p2' });
    expect(await worker.cachedUrls(API_CACHE)).toEqual([
      `${ORIGIN}/api/v1/progress`,
      `${ORIGIN}/api/v1/progress?coach_profile=p2`,
    ]);
  });

  it('rejects like the network when nothing is cached yet', async () => {
    const worker = loadServiceWorker();
    await expect(worker.respond(pageRequest('/api/v1/plan'))).rejects.toThrow('Failed to fetch');
  });

  it('returns error responses without caching them', async () => {
    const worker = loadServiceWorker({
      '/api/v1/course': () => jsonResponse({ detail: 'boom' }, 500),
    });
    const response = await worker.respond(pageRequest('/api/v1/course'));
    expect(response?.status).toBe(500);
    expect(await worker.cachedUrls(API_CACHE)).toEqual([]);
  });

  it('answers ranged audio requests with a 206 slice of the full cached file', async () => {
    let isOnline = true;
    const worker = loadServiceWorker({ '/api/v1/audio': () => (isOnline ? wav(10) : null) });
    const ranged = (range: string, voice?: string): Request =>
      pageRequest('/api/v1/audio?text=think', {
        headers: { range, ...(voice ? { 'X-Coach-Voice': voice } : {}) },
      });

    const first = await worker.respond(ranged('bytes=0-'));
    expect(first?.status).toBe(206);
    expect(first?.headers.get('content-range')).toBe('bytes 0-9/10');
    expect([...new Uint8Array(await first!.arrayBuffer())]).toHaveLength(10);
    // The network copy is requested whole, so the full file can be cached.
    expect(worker.fetchMock.mock.calls[0]?.[0].headers.has('range')).toBe(false);

    isOnline = false;
    const slice = await worker.respond(ranged('bytes=2-4'));
    expect(slice?.status).toBe(206);
    expect(slice?.headers.get('content-range')).toBe('bytes 2-4/10');
    expect(slice?.headers.get('content-length')).toBe('3');
    expect([...new Uint8Array(await slice!.arrayBuffer())]).toEqual([2, 3, 4]);

    const tail = await worker.respond(ranged('bytes=-2'));
    expect(tail?.headers.get('content-range')).toBe('bytes 8-9/10');
    expect([...new Uint8Array(await tail!.arrayBuffer())]).toEqual([8, 9]);

    // Another voice is another file: nothing cached under that key, so it fails like offline.
    await expect(worker.respond(ranged('bytes=0-', 'human'))).rejects.toThrow('Failed to fetch');
    expect(await worker.cachedUrls(API_CACHE)).toEqual([`${ORIGIN}/api/v1/audio?text=think`]);
  });

  it('hands an unranged audio request straight through and caches it whole', async () => {
    const worker = loadServiceWorker({ '/api/v1/audio': () => wav(4) });
    const response = await worker.respond(pageRequest('/api/v1/audio?text=ship'));
    expect(response?.status).toBe(200);
    expect([...new Uint8Array(await response!.arrayBuffer())]).toEqual([0, 1, 2, 3]);
    expect(await worker.cachedUrls(API_CACHE)).toEqual([`${ORIGIN}/api/v1/audio?text=ship`]);
  });
});
