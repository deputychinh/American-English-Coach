import { StorageKey } from '@/enums/storage-key.enum';

import { normaliseBaseUrl, redirectToApiBase, resolveApiBaseUrl } from './api-base.util';

describe('api base util', () => {
  afterEach(() => localStorage.clear());

  it('normalises typed addresses', () => {
    expect(normaliseBaseUrl(' 192.168.1.5:8765/ ')).toBe('http://192.168.1.5:8765');
    expect(normaliseBaseUrl('https://coach.local')).toBe('https://coach.local');
    expect(normaliseBaseUrl('')).toBe('');
  });

  it('prefers the stored server, then the build-time value', () => {
    expect(resolveApiBaseUrl('http://build')).toBe('http://build');
    localStorage.setItem(StorageKey.ApiBaseUrl, JSON.stringify('10.0.0.2:8765'));
    expect(resolveApiBaseUrl('http://build')).toBe('http://10.0.0.2:8765');
  });

  it('redirects /api requests to the saved server and leaves pages alone', () => {
    const same = new Request(`${window.location.origin}/api/v1/health`, { method: 'GET' });
    expect(redirectToApiBase(same, 'http://10.0.0.2:8765').url).toBe(
      'http://10.0.0.2:8765/api/v1/health',
    );
    const other = new Request('http://elsewhere/api/v1/health');
    expect(redirectToApiBase(other, 'http://10.0.0.2:8765').url).toBe(
      'http://10.0.0.2:8765/api/v1/health',
    );
    const page = new Request(`${window.location.origin}/sounds/`);
    expect(redirectToApiBase(page, 'http://10.0.0.2:8765')).toBe(page);
    expect(redirectToApiBase(same, '')).toBe(same);
  });
});
