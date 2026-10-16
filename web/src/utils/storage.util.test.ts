import { StorageKey } from '@/enums/storage-key.enum';

import { readStorage, removeStorage, writeStorage } from './storage.util';

describe('storage util', () => {
  afterEach(() => localStorage.clear());

  it('round-trips JSON values and falls back when missing', () => {
    expect(readStorage(StorageKey.Muted, false)).toBe(false);
    writeStorage(StorageKey.Muted, true);
    expect(readStorage(StorageKey.Muted, false)).toBe(true);
    removeStorage(StorageKey.Muted);
    expect(readStorage(StorageKey.Muted, 'none')).toBe('none');
  });

  it('survives corrupt data and a throwing storage', () => {
    localStorage.setItem(StorageKey.Theme, '{not json');
    expect(readStorage(StorageKey.Theme, 'light')).toBe('light');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeStorage(StorageKey.Theme, 'dark')).not.toThrow();
    spy.mockRestore();
  });
});
