import { seedFrom, shuffleSeeded } from './shuffle.util';

describe('shuffleSeeded', () => {
  it('is deterministic for a seed and keeps every item', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const first = shuffleSeeded(items, seedFrom('u03'));
    const second = shuffleSeeded(items, seedFrom('u03'));
    expect(first).toEqual(second);
    expect([...first].sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(shuffleSeeded(items, seedFrom('u04'))).not.toEqual(first);
  });
});
