import { formatDateTime, formatPercent } from './format.util';

describe('format util', () => {
  it('formats dates in Vietnamese and keeps garbage as is', () => {
    expect(formatDateTime('2026-10-16T10:00:00Z')).toMatch(/2026/);
    expect(formatDateTime('nope')).toBe('nope');
  });

  it('formats percentages safely', () => {
    expect(formatPercent(1, 4)).toBe('25%');
    expect(formatPercent(1, 0)).toBe('0%');
  });
});
