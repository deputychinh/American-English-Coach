import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKey } from '@/enums/storage-key.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';

// The real hook, not a mock: this is the path that played nothing on a paired iPhone.
const fetchMock = vi.fn<typeof fetch>();
const played: string[] = [];

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:clip-${String(played.length)}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    played.push(this.src);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  localStorage.setItem(StorageKey.DeviceToken, JSON.stringify('tok-phone'));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  played.length = 0;
  localStorage.clear();
});

describe('useReferenceAudio', () => {
  it('downloads the clip with the pairing token and plays it', async () => {
    fetchMock.mockResolvedValue(new Response(new Blob(['RIFF']), { status: 200 }));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('sheep'));
    await waitFor(() => expect(played.some((src) => src.startsWith('blob:'))).toBe(true));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toEqual(expect.stringContaining('/api/v1/audio?text=sheep'));
    expect(new Headers(init?.headers).get('X-Coach-Token')).toBe('tok-phone');
    expect(result.current.error).toBeNull();
  });

  it('tells an unpaired phone what to do instead of staying silent', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('moon'));
    await waitFor(() => expect(result.current.error).toMatch(/ghép nối/));
    expect(result.current.isPlaying).toBe(false);
  });

  it('reports a server that cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('food'));
    await waitFor(() => expect(result.current.error).toMatch(/máy chấm/));
  });
});
