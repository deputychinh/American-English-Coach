'use client';

import { type ReactElement, useSyncExternalStore } from 'react';

import { COPY } from '@/constants/copy.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { Theme } from '@/enums/theme.enum';
import { writeStorage } from '@/utils/storage.util';

import './ThemeToggle.css';

const subscribe = (listener: () => void): (() => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === Theme.Dark ? Theme.Dark : Theme.Light;

/** Switches `data-theme` on <html>; /theme.js applied the saved value before hydration. */
export const ThemeToggle = (): ReactElement => {
  const theme = useSyncExternalStore(subscribe, readTheme, () => Theme.Light);

  const toggle = (): void => {
    const next = theme === Theme.Dark ? Theme.Light : Theme.Dark;
    document.documentElement.dataset.theme = next;
    writeStorage(StorageKey.Theme, next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={COPY.theme.toggle}
      aria-pressed={theme === Theme.Dark}
      title={theme === Theme.Dark ? COPY.theme.light : COPY.theme.dark}
    >
      <span aria-hidden="true">{theme === Theme.Dark ? '☾' : '☀'}</span>
    </button>
  );
};
