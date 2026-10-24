import { env } from '@/config/env';
import { StorageKey } from '@/enums/storage-key.enum';

import { isDeviceFirst, isLocalMode } from './api-base.util';

const setStandaloneWeb = (isStandalone: boolean): void => {
  Object.defineProperty(env, 'isStandaloneWeb', { value: isStandalone, configurable: true });
};

const setNative = (isNative: boolean): void => {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, protocol: isNative ? 'capacitor:' : 'http:' },
    configurable: true,
  });
};

describe('isLocalMode', () => {
  const original = window.location;
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: original, configurable: true });
    setStandaloneWeb(false);
    localStorage.clear();
  });

  it('is off on the web unless forced', () => {
    setNative(false);
    expect(isLocalMode()).toBe(false);
    localStorage.setItem(StorageKey.ForceLocalMode, 'true');
    expect(isLocalMode()).toBe(true);
  });

  it('is the default in the iOS app from the first launch', () => {
    setNative(true);
    expect(isLocalMode()).toBe(true);
  });

  it('is the default in the web app built for static hosting, which has no server', () => {
    setNative(false);
    setStandaloneWeb(true);
    expect(isDeviceFirst()).toBe(true);
    expect(isLocalMode()).toBe(true);
    localStorage.setItem(StorageKey.OnDeviceScoring, 'false');
    expect(isLocalMode()).toBe(false);
  });

  it('keeps a paired server until the model is downloaded or the learner switches', () => {
    setNative(true);
    localStorage.setItem(StorageKey.DeviceToken, JSON.stringify('tok'));
    expect(isLocalMode()).toBe(false);
    localStorage.setItem(StorageKey.EngineReady, 'true');
    expect(isLocalMode()).toBe(true);
    localStorage.setItem(StorageKey.OnDeviceScoring, 'false');
    expect(isLocalMode()).toBe(false);
  });
});
