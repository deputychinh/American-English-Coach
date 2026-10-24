import type { BeforeInstallPromptEvent } from '@/interfaces/install.interface';

/**
 * Chromium fires `beforeinstallprompt` once, often before any screen has mounted, so the event
 * is caught at start-up (RegisterServiceWorker) and kept here until the learner taps Install.
 */

let deferred: BeforeInstallPromptEvent | null = null;
let isListening = false;
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((listener) => listener());

export const listenForInstallPrompt = (): void => {
  if (isListening) return;
  isListening = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
};

export const subscribeInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const hasInstallPrompt = (): boolean => deferred !== null;

/** Shows the browser's own install dialog; a prompt can be used only once. */
export const promptInstall = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
};
