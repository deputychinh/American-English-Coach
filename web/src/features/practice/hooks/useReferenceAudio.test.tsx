import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKey } from '@/enums/storage-key.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { resetVoiceLibrary } from '@/features/practice/services/voice-library.service';

// The real hook, not a mock: this is the path that played nothing on a paired iPhone.
const fetchMock = vi.fn<typeof fetch>();
const played: string[] = [];

const urlOf = (input: RequestInfo | URL | undefined): string =>
  input instanceof Request ? input.url : input instanceof URL ? input.href : (input ?? '');

/** No bundled voices unless a test provides the manifest; `audio` answers the server call. */
const serve = (audio: () => Promise<Response>, manifest: object | null = null): void => {
  fetchMock.mockImplementation((input) =>
    urlOf(input).endsWith('/voice/manifest.json')
      ? Promise.resolve(
          manifest ? new Response(JSON.stringify(manifest)) : new Response('', { status: 404 }),
        )
      : audio(),
  );
};

beforeEach(() => {
  resetVoiceLibrary();
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
    serve(() => Promise.resolve(new Response(new Blob(['RIFF']), { status: 200 })));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('sheep'));
    await waitFor(() => expect(played.some((src) => src.startsWith('blob:'))).toBe(true));
    const [url, init] =
      fetchMock.mock.calls.find(([u]) => urlOf(u).includes('/api/v1/audio')) ?? [];
    expect(url).toEqual(expect.stringContaining('/api/v1/audio?text=sheep'));
    expect(new Headers(init?.headers).get('X-Coach-Token')).toBe('tok-phone');
    expect(result.current.error).toBeNull();
  });

  it('tells an unpaired phone what to do instead of staying silent', async () => {
    serve(() => Promise.resolve(new Response('{}', { status: 401 })));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('moon'));
    await waitFor(() => expect(result.current.error).toMatch(/ghép nối/));
    expect(result.current.isPlaying).toBe(false);
  });

  it('reports a server that cannot be reached', async () => {
    serve(() => Promise.reject(new TypeError('Load failed')));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('food'));
    await waitFor(() => expect(result.current.error).toMatch(/máy chấm/));
  });

  it('plays the voice shipped with the app without calling the server', async () => {
    serve(() => Promise.reject(new Error('the server must not be called')), {
      model: 'gpt-4o-mini-tts',
      disclosure: 'AI-generated voices (OpenAI TTS)',
      primary: 'marin',
      extra: ['cedar'],
      clips: { ship: 'abc123def456' },
    });
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('ship'));
    await waitFor(() =>
      expect(played).toContain('http://localhost:3000/voice/marin/abc123def456.m4a'),
    );
    expect(fetchMock.mock.calls.some(([u]) => urlOf(u).includes('/api/v1/audio'))).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stop drops a clip that is still downloading, so it never plays over a recording', async () => {
    let answer: (response: Response) => void = () => undefined;
    serve(() => new Promise<Response>((resolve) => (answer = resolve)));
    const { result } = renderHook(() => useReferenceAudio());
    act(() => result.current.play('ship'));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => urlOf(u).includes('/api/v1/audio'))).toBe(true),
    );
    act(() => result.current.stop());
    expect(result.current.isPlaying).toBe(false);
    answer(new Response(new Blob(['RIFF']), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(played.some((src) => src.startsWith('blob:'))).toBe(false);
  });
});
