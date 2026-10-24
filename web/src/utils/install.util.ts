import { InstallPlatform } from '@/enums/install-platform.enum';
import type { InstallEnvironment } from '@/interfaces/install.interface';

/** iPhone, iPod or iPad; iPadOS reports itself as a Mac, but a Mac has no touch screen. */
export const isIosDevice = ({ userAgent, maxTouchPoints }: InstallEnvironment): boolean =>
  /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

/**
 * How to offer "add to home screen": Chromium hands the app its own install prompt; iOS has
 * none, so the learner follows the Share menu; an app already opened from the home screen
 * offers nothing.
 */
export const installPlatform = (
  environment: InstallEnvironment,
  hasPrompt: boolean,
): InstallPlatform => {
  if (environment.isStandalone) return InstallPlatform.None;
  if (hasPrompt) return InstallPlatform.Prompt;
  return isIosDevice(environment) ? InstallPlatform.Ios : InstallPlatform.None;
};

export const currentInstallEnvironment = (): InstallEnvironment => ({
  userAgent: navigator.userAgent,
  maxTouchPoints: navigator.maxTouchPoints,
  isStandalone:
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
});
