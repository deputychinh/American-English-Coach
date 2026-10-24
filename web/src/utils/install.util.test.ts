import { InstallPlatform } from '@/enums/install-platform.enum';

import { installPlatform, isIosDevice } from './install.util';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140';

describe('install util', () => {
  it('recognises iPhone, and iPad that calls itself a Mac with a touch screen', () => {
    expect(isIosDevice({ userAgent: IPHONE, maxTouchPoints: 5, isStandalone: false })).toBe(true);
    expect(isIosDevice({ userAgent: MAC, maxTouchPoints: 5, isStandalone: false })).toBe(true);
    expect(isIosDevice({ userAgent: MAC, maxTouchPoints: 0, isStandalone: false })).toBe(false);
    expect(isIosDevice({ userAgent: ANDROID, maxTouchPoints: 5, isStandalone: false })).toBe(false);
  });

  it('prefers the browser prompt, falls back to Share-menu steps on iOS, else offers nothing', () => {
    const android = { userAgent: ANDROID, maxTouchPoints: 5, isStandalone: false };
    const iphone = { userAgent: IPHONE, maxTouchPoints: 5, isStandalone: false };
    expect(installPlatform(android, true)).toBe(InstallPlatform.Prompt);
    expect(installPlatform(android, false)).toBe(InstallPlatform.None);
    expect(installPlatform(iphone, false)).toBe(InstallPlatform.Ios);
  });

  it('offers nothing once the app runs from the home screen', () => {
    const installed = { userAgent: IPHONE, maxTouchPoints: 5, isStandalone: true };
    expect(installPlatform(installed, true)).toBe(InstallPlatform.None);
  });
});
