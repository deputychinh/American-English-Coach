import { Language } from '@/enums/language.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import type { Copy } from '@/interfaces/copy.interface';
import { readStorage, writeStorage } from '@/utils/storage.util';

import { en } from './en';
import { vi } from './vi';

export { en, vi };

/** Vietnamese is the product language and the build-time dictionary (static metadata, tests). */
export const copy = vi;

const DICTIONARIES: Record<Language, Copy> = { [Language.Vi]: vi, [Language.En]: en };
const listeners = new Set<() => void>();
let current: Language | null = null;

/** The learner's interface language: stored choice, else Vietnamese. */
const parseLanguage = (value: string): Language =>
  (Object.values(Language) as string[]).includes(value) ? (value as Language) : Language.Vi;

export const readLanguage = (): Language => {
  current ??= parseLanguage(readStorage<string>(StorageKey.Language, ''));
  return current;
};

/** Dictionary for the active language; for code outside React (services, utils, hooks). */
export const getCopy = (): Copy => DICTIONARIES[readLanguage()];

export const copyFor = (language: Language): Copy => DICTIONARIES[language];

/** Switch the interface language; `useCopy()` consumers re-render, `<html lang>` follows. */
export const setLanguage = (language: Language): void => {
  current = language;
  writeStorage(StorageKey.Language, language);
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
};

export const subscribeLanguage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
