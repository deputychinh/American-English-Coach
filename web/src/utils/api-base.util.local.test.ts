import { StorageKey } from '@/enums/storage-key.enum';

import { isLocalMode } from './api-base.util';

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
