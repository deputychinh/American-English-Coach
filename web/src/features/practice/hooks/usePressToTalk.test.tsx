import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';

import type { PressToTalkOptions } from '@/interfaces/press-to-talk.interface';

import { usePressToTalk } from './usePressToTalk';

describe('usePressToTalk', () => {
  let now = 0;
  const options = (over: Partial<PressToTalkOptions> = {}): PressToTalkOptions => ({
    isBusy: false,
    isRecording: false,
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    ...over,
  });

  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => vi.restoreAllMocks());

  it('holds to talk: starts on press and scores on release', async () => {
    const props = options();
    const { result } = renderHook(() => usePressToTalk(props));
    act(() => result.current.onPointerDown());
    expect(props.start).toHaveBeenCalledTimes(1);
    now += 900;
    await act(async () => {
      result.current.onPointerUp();
      await Promise.resolve();
    });
    expect(props.stop).toHaveBeenCalledTimes(1);
    // The click that follows the release does not start a new take.
    now += 10;
    act(() => result.current.onClick());
    expect(props.start).toHaveBeenCalledTimes(1);
  });

  it('a short tap starts a take that keeps going until a second tap', () => {
    const props = options();
    const { result, rerender } = renderHook((p: PressToTalkOptions) => usePressToTalk(p), {
      initialProps: props,
    });
    act(() => result.current.onPointerDown());
    now += 120;
    act(() => {
      result.current.onPointerUp();
      result.current.onClick();
    });
    expect(props.start).toHaveBeenCalledTimes(1);
    expect(props.stop).not.toHaveBeenCalled();

    const recording = { ...props, isRecording: true };
    rerender(recording);
    now += 3000;
    act(() => {
      result.current.onPointerDown();
      result.current.onPointerUp();
    });
    act(() => result.current.onClick());
    expect(props.stop).toHaveBeenCalledTimes(1);
  });

  it('toggles from the keyboard, ignores presses while scoring and blocks the callout', () => {
    const props = options();
    const { result, rerender } = renderHook((p: PressToTalkOptions) => usePressToTalk(p), {
      initialProps: props,
    });
    act(() => result.current.onClick());
    expect(props.start).toHaveBeenCalledTimes(1);

    rerender({ ...props, isBusy: true });
    act(() => {
      result.current.onPointerDown();
      result.current.onClick();
    });
    expect(props.start).toHaveBeenCalledTimes(1);

    const preventDefault = vi.fn();
    result.current.onContextMenu({ preventDefault } as unknown as MouseEvent);
    expect(preventDefault).toHaveBeenCalled();
  });
});
