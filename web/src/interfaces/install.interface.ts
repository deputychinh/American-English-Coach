/** Chromium's `beforeinstallprompt` event (not in the DOM typings). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What the install card needs to know about this browser. */
export interface InstallEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  isStandalone: boolean;
}
