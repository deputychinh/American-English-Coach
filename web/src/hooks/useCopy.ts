'use client';

import { useSyncExternalStore } from 'react';

import { Language } from '@/enums/language.enum';
import type { Copy } from '@/interfaces/copy.interface';
import { copyFor, readLanguage, subscribeLanguage } from '@/locales';

/** Copy accessor for components; re-renders when the learner switches the interface language. */
export const useCopy = (): Copy => {
  const language = useSyncExternalStore(subscribeLanguage, readLanguage, () => Language.Vi);
  return copyFor(language);
};

/** The active language (for `lang` attributes and locale-aware formatting). */
export const useLanguage = (): Language =>
  useSyncExternalStore(subscribeLanguage, readLanguage, () => Language.Vi);
