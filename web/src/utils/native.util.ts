import { isNativeShell } from '@/utils/api-base.util';

type Haptic = 'light' | 'medium' | 'success' | 'warning';

/**
 * Thin wrappers around Capacitor plugins. Every call is a no-op outside the native shell, and
 * the plugin modules are imported lazily so the web bundle never evaluates them.
 */
export const nativeHaptic = async (kind: Haptic): Promise<void> => {
  if (!isNativeShell()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (kind === 'light') await Haptics.impact({ style: ImpactStyle.Light });
    else if (kind === 'medium') await Haptics.impact({ style: ImpactStyle.Medium });
    else if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
    else await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // Haptics are a nicety; a missing plugin must never break practice.
  }
};

export const nativeKeepAwake = async (enabled: boolean): Promise<void> => {
  if (!isNativeShell()) return;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    if (enabled) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    // Screen timeout only; ignore.
  }
};

/** Status bar colour follows the theme; the splash hides once the web app has painted. */
export const nativeConfigureChrome = async (isDark: boolean): Promise<void> => {
  if (!isNativeShell()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {
    // Not available (e.g. web preview inside Capacitor dev); ignore.
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // Splash already hidden.
  }
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    // Keyboard plugin absent on this platform.
  }
};
