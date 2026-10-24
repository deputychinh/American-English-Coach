import { env } from '@/config/env';
import { WEB_ENGINE_CACHE } from '@/constants/engine.constant';
import type {
  WebModelDownload,
  WebModelManifest,
  WebModelSource,
} from '@/interfaces/engine.interface';
import { getCopy } from '@/locales';
import { sha256Hex } from '@/utils/posteriors.util';

/**
 * The phoneme model in the browser: downloaded part by part into Cache Storage. Parts let any
 * static host serve it (most cap a file at 25 MB), make a broken download resume where it
 * stopped, and keep memory low because each part is checked on its own. The manifest is stored
 * last, so "manifest in the cache" means "every part is there and verified".
 */

const baseUrl = (): string => new URL(env.engineModelBaseUrl, window.location.href).href;

export const manifestUrl = (): string => new URL('manifest.json', baseUrl()).href;

const partUrls = (manifest: WebModelManifest): string[] =>
  manifest.parts.map((part) => new URL(part.file, baseUrl()).href);

export const modelSource = (manifest: WebModelManifest): WebModelSource => ({
  cacheName: WEB_ENGINE_CACHE,
  urls: partUrls(manifest),
  bytes: manifest.bytes,
});

const openCache = (): Promise<Cache> => caches.open(WEB_ENGINE_CACHE);

/** The verified model on this device, or `null` when it is missing or incomplete. */
export const storedManifest = async (): Promise<WebModelManifest | null> => {
  if (typeof caches === 'undefined') return null;
  const cache = await openCache();
  const response = await cache.match(manifestUrl());
  if (!response) return null;
  const manifest = (await response.json()) as WebModelManifest;
  const present = await Promise.all(partUrls(manifest).map((url) => cache.match(url)));
  return present.every(Boolean) ? manifest : null;
};

const fetchManifest = async (signal: AbortSignal): Promise<WebModelManifest> => {
  const response = await fetch(manifestUrl(), { cache: 'no-store', signal });
  if (!response.ok) throw new Error(getCopy().engine.webManifestFailed(response.status));
  return (await response.json()) as WebModelManifest;
};

/** Reads a body chunk by chunk so the progress bar moves inside a 24 MB part too. */
const readBody = async (
  response: Response,
  expected: number,
  onChunk: (bytes: number) => void,
): Promise<Uint8Array<ArrayBuffer>> => {
  const out = new Uint8Array(expected);
  if (!response.body) {
    const all = new Uint8Array(await response.arrayBuffer());
    onChunk(all.byteLength);
    return all;
  }
  const reader = response.body.getReader();
  let offset = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (offset + value.byteLength > expected) throw new Error(getCopy().engine.webPartCorrupt);
    out.set(value, offset);
    offset += value.byteLength;
    onChunk(value.byteLength);
  }
  if (offset !== expected) throw new Error(getCopy().engine.webPartCorrupt);
  return out;
};

const isPartValid = async (cached: Response | undefined, sha256: string): Promise<boolean> =>
  cached !== undefined && (await sha256Hex(await cached.arrayBuffer())) === sha256;

/** Downloads what is missing, checks every part, then marks the model complete. */
export const downloadModel = async ({
  onProgress,
  signal,
}: WebModelDownload): Promise<WebModelManifest> => {
  // Ask the browser not to evict 357 MB under storage pressure (installed apps usually get it).
  await navigator.storage?.persist?.().catch(() => false);
  const manifest = await fetchManifest(signal);
  const cache = await openCache();
  const urls = partUrls(manifest);
  let received = 0;
  const report = (bytes: number): void => {
    received += bytes;
    onProgress({ received, expected: manifest.bytes });
  };
  for (const [index, part] of manifest.parts.entries()) {
    const url = urls[index] ?? '';
    if (await isPartValid(await cache.match(url), part.sha256)) {
      report(part.bytes);
      continue;
    }
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(getCopy().engine.webPartFailed(response.status));
    const bytes = await readBody(response, part.bytes, report);
    if ((await sha256Hex(bytes)) !== part.sha256) throw new Error(getCopy().engine.webPartCorrupt);
    await cache.put(
      url,
      new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }),
    );
  }
  await cache.put(manifestUrl(), Response.json(manifest));
  return manifest;
};
