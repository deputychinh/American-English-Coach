import { cx } from './cx.util';

describe('cx', () => {
  it('joins class names and skips falsy entries', () => {
    expect(cx('chip', false, null, undefined, '', 'chip--ok')).toBe('chip chip--ok');
    expect(cx(false)).toBe('');
  });
});
