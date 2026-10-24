import type { WebModelManifest } from '@/interfaces/engine.interface';
import { sha256Hex } from '@/utils/posteriors.util';

import { downloadModel, modelSource, storedManifest } from './web-model-store.service';

const BASE = 'http://localhost:3000/models/w2v.mm8/';
const PARTS = { 'part-00.bin': 'aaaa', 'part-01.bin': 'bb' };

const bytesOf = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);

const manifest = async (): Promise<WebModelManifest> => ({
  name: 'w2v.mm8',
  bytes: 6,
  sha256: await sha256Hex(bytesOf('aaaabb')),
  parts: await Promise.all(
    Object.entries(PARTS).map(async ([file, text]) => ({
      file,
      bytes: text.length,
      sha256: await sha256Hex(bytesOf(text)),
    })),
  ),
});

/** Cache Storage in memory: the subset the store uses. */
const memoryCaches = () => {
  const store = new Map<string, Response>();
  const cache = {
    match: (url: string) => Promise.resolve(store.get(url)?.clone()),
    put: (url: string, response: Response) => {
      store.set(url, response);
      return Promise.resolve();
    },
  };
  return { store, caches: { open: () => Promise.resolve(cache) } };
};

const network = (served: Record<string, string>, status = 200) =>
  vi.fn((url: string) => {
    const name = url.slice(BASE.length);
    const body = served[name];
    return Promise.resolve(
      body === undefined
        ? new Response('missing', { status: 404 })
        : new Response(body, { status }),
    );
  });

const signal = new AbortController().signal;

describe('web model store', () => {
  let memory: ReturnType<typeof memoryCaches>;

  beforeEach(async () => {
    memory = memoryCaches();
    vi.stubGlobal('caches', memory.caches);
    window.history.replaceState(null, '', 'http://localhost:3000/');
    const served = { ...PARTS, 'manifest.json': JSON.stringify(await manifest()) };
    vi.stubGlobal('fetch', network(served));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('downloads every part, reports progress and marks the model complete last', async () => {
    expect(await storedManifest()).toBeNull();
    const onProgress = vi.fn();
    const result = await downloadModel({ onProgress, signal });
    expect(result.parts).toHaveLength(2);
    expect(onProgress).toHaveBeenLastCalledWith({ received: 6, expected: 6 });
    expect([...memory.store.keys()]).toEqual([
      `${BASE}part-00.bin`,
      `${BASE}part-01.bin`,
      `${BASE}manifest.json`,
    ]);
    expect((await storedManifest())?.bytes).toBe(6);
    expect(modelSource(result)).toEqual({
      cacheName: 'aec-model-w2v.mm8',
      urls: [`${BASE}part-00.bin`, `${BASE}part-01.bin`],
      bytes: 6,
    });
  });

  it('resumes: a verified part already on the device is not downloaded again', async () => {
    await memory.caches
      .open()
      .then((cache) => cache.put(`${BASE}part-00.bin`, new Response('aaaa')));
    await downloadModel({ onProgress: vi.fn(), signal });
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url as string);
    expect(urls).toEqual([`${BASE}manifest.json`, `${BASE}part-01.bin`]);
  });

  it('refuses a damaged part and leaves the model incomplete', async () => {
    const served = { 'part-00.bin': 'aaaa', 'part-01.bin': 'XX' };
    vi.stubGlobal(
      'fetch',
      network({ ...served, 'manifest.json': JSON.stringify(await manifest()) }),
    );
    await expect(downloadModel({ onProgress: vi.fn(), signal })).rejects.toThrow('bị hỏng');
    expect(await storedManifest()).toBeNull();
  });

  it('refuses a part longer than the manifest says', async () => {
    const served = { 'part-00.bin': 'aaaaa', 'part-01.bin': 'bb' };
    vi.stubGlobal(
      'fetch',
      network({ ...served, 'manifest.json': JSON.stringify(await manifest()) }),
    );
    await expect(downloadModel({ onProgress: vi.fn(), signal })).rejects.toThrow('bị hỏng');
  });

  it('says when the web server has no scoring pack', async () => {
    vi.stubGlobal('fetch', network({}));
    await expect(downloadModel({ onProgress: vi.fn(), signal })).rejects.toThrow('HTTP 404');
  });

  it('says when a part cannot be downloaded', async () => {
    vi.stubGlobal('fetch', network({ 'manifest.json': JSON.stringify(await manifest()) }));
    await expect(downloadModel({ onProgress: vi.fn(), signal })).rejects.toThrow(
      'Tải một phần gói bị lỗi (HTTP 404).',
    );
  });

  it('treats a model with a missing part as not downloaded', async () => {
    const cache = await memory.caches.open();
    await cache.put(`${BASE}manifest.json`, Response.json(await manifest()));
    await cache.put(`${BASE}part-00.bin`, new Response('aaaa'));
    expect(await storedManifest()).toBeNull();
  });
});
