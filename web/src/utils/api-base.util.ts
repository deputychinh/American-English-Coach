import { StorageKey } from '@/enums/storage-key.enum';
import { readStorage } from '@/utils/storage.util';

/** True inside the Capacitor shell (iOS app), where the API lives on another host. */
export const isNativeShell = (): boolean =>
  typeof window !== 'undefined' && /^(capacitor|ionic):$/.test(window.location.protocol);

/** Normalises a learner-typed server address: scheme added, trailing slash removed. */
export const normaliseBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
};

/** API origin at runtime: the saved server address wins, then the build-time value, then same-origin. */
export const resolveApiBaseUrl = (buildTimeBaseUrl: string): string =>
  storedApiBaseUrl() || buildTimeBaseUrl;

/** Saved server address (normalised) or '' when the learner has not set one. */
export const storedApiBaseUrl = (): string =>
  normaliseBaseUrl(readStorage<string>(StorageKey.ApiBaseUrl, ''));

/** Sends an `/api/...` request to the saved server instead of the page's own origin. */
export const redirectToApiBase = (request: Request, baseUrl: string): Request => {
  if (!baseUrl) return request;
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return request;
  return new Request(`${baseUrl}${url.pathname}${url.search}`, request);
};
