import { Language } from '@/enums/language.enum';
import { StorageKey } from '@/enums/storage-key.enum';

import {
  copyFor,
  en,
  getCopy,
  readLanguage,
  setLanguage,
  subscribeLanguage,
  vi as viCopy,
} from './index';

type Tree = Record<string, unknown>;

const leaves = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? leaves(value as Tree, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('locales', () => {
  afterEach(() => {
    setLanguage(Language.Vi);
    localStorage.clear();
  });

  it('has the same keys in English and Vietnamese and no empty strings', () => {
    expect([...leaves(en as Tree)].sort()).toEqual([...leaves(viCopy as Tree)].sort());
    const strings = (tree: Tree): string[] =>
      Object.values(tree).flatMap((value) =>
        typeof value === 'string'
          ? [value]
          : typeof value === 'object' && value
            ? strings(value as Tree)
            : [],
      );
    expect(strings(en as Tree).every((text) => text.trim().length > 0)).toBe(true);
    expect(en.plan.streak(3)).toBe('3-day streak');
    expect(viCopy.plan.streak(3)).toBe('3 ngày liên tiếp');
  });

  it('switches the active dictionary, stores the choice and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLanguage(listener);
    expect(readLanguage()).toBe(Language.Vi);
    setLanguage(Language.En);
    expect(getCopy().nav.home).toBe('Home');
    expect(copyFor(Language.Vi).nav.home).toBe('Trang chủ');
    expect(document.documentElement.lang).toBe('en');
    expect(JSON.parse(localStorage.getItem(StorageKey.Language) ?? '""')).toBe('en');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
