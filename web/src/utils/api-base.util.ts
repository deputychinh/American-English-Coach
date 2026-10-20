import { env } from '@/config/env';
import {
  DEFAULT_PROFILE_ID,
  DEVICE_TOKEN_HEADER,
  NATIVE_DEFAULT_API_BASE_URL,
  PROFILE_HEADER,
  UNAUTHORIZED_EVENT,
} from '@/constants/api.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { readStorage } from '@/utils/storage.util';

/** True inside the Capacitor shell (iOS app), where the API lives on another host. */
export const isNativeShell = (): boolean =>
  typeof window !== 'undefined' && /^(capacitor|ionic):$/.test(window.location.protocol);

/**
 * The app answers its own API (content, progress, plan, profiles) and scores on the device. In
 * the iOS app that is the default from the first launch; a learner paired with their own scoring
 * server keeps using it until the model is downloaded or they switch back. Tests and development
 * can force it with `coach.forceLocalMode`.
 */
export const isLocalMode = (): boolean => {
  if (readStorage<boolean>(StorageKey.ForceLocalMode, false)) return true;
  if (!isNativeShell() || !readStorage<boolean>(StorageKey.OnDeviceScoring, true)) return false;
  const isPaired = readStorage<string>(StorageKey.DeviceToken, '') !== '';
  return !isPaired || readStorage<boolean>(StorageKey.EngineReady, false);
};

/** Normalises a learner-typed server address: scheme added, trailing slash removed. */
export const normaliseBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
};

/** API origin at runtime: the saved server address wins, then the build-time value, then same-origin. */
export const resolveApiBaseUrl = (buildTimeBaseUrl: string): string =>
  storedApiBaseUrl() || buildTimeBaseUrl;

/**
 * Saved server address (normalised). Inside the native shell nothing is same-origin, so the
 * default is the address baked in at build time (`make ios-device` uses the Mac's LAN address)
 * and otherwise the Mac's loopback, which is what the iOS simulator sees.
 */
export const storedApiBaseUrl = (): string => {
  const stored = normaliseBaseUrl(readStorage<string>(StorageKey.ApiBaseUrl, ''));
  if (stored) return stored;
  if (!isNativeShell()) return '';
  return normaliseBaseUrl(env.nativeApiBaseUrl) || NATIVE_DEFAULT_API_BASE_URL;
};

/**
 * Sends an `/api/...` request to the saved server instead of the page's own origin.
 * The body is copied as bytes on purpose: `new Request(url, request)` would hand the browser a
 * stream body, and streamed uploads need HTTP/2, so every POST to a LAN server failed with
 * "Failed to fetch" / "Load failed" while GETs worked.
 */
export const redirectToApiBase = async (request: Request, baseUrl: string): Promise<Request> => {
  if (!baseUrl) return request;
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return request;
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  return new Request(`${baseUrl}${url.pathname}${url.search}`, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.clone().arrayBuffer() : undefined,
    signal: request.signal,
  });
};

/** Device token obtained by pairing (Settings → Ghép nối); '' on the Mac itself. */
export const deviceToken = (): string => readStorage<string>(StorageKey.DeviceToken, '');

/** Headers to add to every API request: the pairing token when the device has one. */
export const deviceHeaders = (): Record<string, string> => {
  const token = deviceToken();
  return token ? { [DEVICE_TOKEN_HEADER]: token } : {};
};

/** Clone a request with the pairing token attached (no-op when there is none). */
export const withDeviceToken = (request: Request): Request => {
  const token = deviceToken();
  if (!token) return request;
  const headers = new Headers(request.headers);
  headers.set(DEVICE_TOKEN_HEADER, token);
  return new Request(request, { headers });
};

/** Id of the learner profile chosen on this device ('default' until one is picked). */
export const activeProfileId = (): string =>
  readStorage<string>(StorageKey.ProfileId, '') || DEFAULT_PROFILE_ID;

/** Header naming the active profile; omitted for the default profile. */
export const profileHeaders = (): Record<string, string> => {
  const id = activeProfileId();
  return id === DEFAULT_PROFILE_ID ? {} : { [PROFILE_HEADER]: id };
};

/** Clone a request with the active profile named (no-op for the default profile). */
export const withProfile = (request: Request): Request => {
  const id = activeProfileId();
  if (id === DEFAULT_PROFILE_ID) return request;
  const headers = new Headers(request.headers);
  headers.set(PROFILE_HEADER, id);
  return new Request(request, { headers });
};

/** Everything a request needs to be accepted and scoped: pairing token + active profile. */
export const withClientHeaders = (request: Request): Request =>
  withProfile(withDeviceToken(request));

/** Lets the shell show the "pair this device" banner when the server rejects us. */
export const announceUnauthorized = (): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
};

/** Surface a 401 from any API call as an unauthorized event; returns the response unchanged. */
export const noteUnauthorized = (response: Response): Response => {
  if (response.status === 401) announceUnauthorized();
  return response;
};
