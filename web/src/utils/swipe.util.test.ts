import { describe, expect, it } from 'vitest';

import { classifySwipe } from '@/utils/swipe.util';

describe('classifySwipe', () => {
  it('reads a long horizontal drag as left or right', () => {
    expect(classifySwipe({ dx: -90, dy: 10, ms: 400 })).toBe('left');
    expect(classifySwipe({ dx: 90, dy: -12, ms: 400 })).toBe('right');
  });

  it('reads a short quick flick as a swipe', () => {
    expect(classifySwipe({ dx: -30, dy: 2, ms: 50 })).toBe('left');
    expect(classifySwipe({ dx: 0, dy: 40, ms: 60 })).toBe('down');
  });

  it('ignores taps, slow short drags and diagonals', () => {
    expect(classifySwipe({ dx: 3, dy: 2, ms: 90 })).toBeNull();
    expect(classifySwipe({ dx: -30, dy: 0, ms: 400 })).toBeNull();
    expect(classifySwipe({ dx: -80, dy: 70, ms: 200 })).toBeNull();
  });
});
