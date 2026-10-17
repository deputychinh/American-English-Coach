import { StorageKey } from '@/enums/storage-key.enum';

import {
  activeProfileId,
  announceUnauthorized,
  deviceHeaders,
  noteUnauthorized,
  profileHeaders,
  withClientHeaders,
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

  it('names the active profile only when it is not the default one', () => {
    const bare = new Request('http://localhost/api/v1/progress');
    expect(activeProfileId()).toBe('default');
    expect(profileHeaders()).toEqual({});
    expect(withClientHeaders(bare)).toBe(bare);
    localStorage.setItem(StorageKey.ProfileId, JSON.stringify('ab12cd34'));
    localStorage.setItem(StorageKey.DeviceToken, JSON.stringify('tok-123'));
    const scoped = withClientHeaders(bare);
    expect(scoped.headers.get('X-Coach-Profile')).toBe('ab12cd34');
    expect(scoped.headers.get('X-Coach-Token')).toBe('tok-123');
    expect(profileHeaders()).toEqual({ 'X-Coach-Profile': 'ab12cd34' });
  });
});
