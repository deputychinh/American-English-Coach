import { StorageKey } from '@/enums/storage-key.enum';

import {
  announceUnauthorized,
  deviceHeaders,
  noteUnauthorized,
  withDeviceToken,
} from './api-base.util';

describe('device token', () => {
  afterEach(() => localStorage.clear());

  it('adds the X-Coach-Token header only when a token is stored', () => {
    const bare = new Request('http://localhost/api/v1/health');
    expect(withDeviceToken(bare)).toBe(bare);
    expect(deviceHeaders()).toEqual({});
    localStorage.setItem(StorageKey.DeviceToken, JSON.stringify('tok-123'));
    expect(withDeviceToken(bare).headers.get('X-Coach-Token')).toBe('tok-123');
    expect(deviceHeaders()).toEqual({ 'X-Coach-Token': 'tok-123' });
  });

  it('announces a 401 through a window event and passes the response through', () => {
    const listener = vi.fn();
    window.addEventListener('coach:unauthorized', listener);
    const denied = new Response(null, { status: 401 });
    expect(noteUnauthorized(denied)).toBe(denied);
    expect(noteUnauthorized(new Response(null, { status: 200 })).status).toBe(200);
    announceUnauthorized();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener('coach:unauthorized', listener);
  });
});
