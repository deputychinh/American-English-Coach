import { dayStartUtc, localDate, pickFocus, streakDays, weekSummary } from './planner.util';

// Mirrors backend/tests/unit/test_planner.py so both planners follow the same rules.
const VIETNAM = 7 * 60;
const TODAY = '2026-10-17';

describe('planner', () => {
  it('uses the learner zone for local days', () => {
    const lateEveningUtc = new Date(Date.UTC(2026, 9, 16, 18, 30));
    expect(localDate(lateEveningUtc, VIETNAM)).toBe('2026-10-17');
    expect(localDate(lateEveningUtc, 0)).toBe('2026-10-16');
    expect(dayStartUtc('2026-10-17', VIETNAM).toISOString()).toBe('2026-10-16T17:00:00.000Z');
  });

  it('sums seven zero-filled days ending today', () => {
    const week = weekSummary(
      [
        { day: '2026-10-17', ok: 4, check: 0, error: 0 },
        { day: '2026-10-17', ok: 3, check: 1, error: 0 },
        { day: '2026-10-15', ok: 2, check: 2, error: 0 },
        { day: '2026-10-01', ok: 9, check: 9, error: 9 },
      ],
      TODAY,
    );
    expect(week.map((d) => d.day)).toEqual(
      [11, 12, 13, 14, 15, 16, 17].map((n) => `2026-10-${String(n)}`),
    );
    expect([week[6]?.runs, week[6]?.ok, week[6]?.check]).toEqual([2, 7, 1]);
    expect(week[4]?.runs).toBe(1);
  });

  it('counts the streak back from today or yesterday', () => {
    expect(streakDays(new Set(), TODAY)).toBe(0);
    expect(streakDays(new Set(['2026-10-17', '2026-10-16', '2026-10-15']), TODAY)).toBe(3);
    expect(streakDays(new Set(['2026-10-16', '2026-10-15']), TODAY)).toBe(2);
    expect(streakDays(new Set(['2026-10-17', '2026-10-15']), TODAY)).toBe(1);
  });

  it('prefers weak sounds, then review, then new ones, without repeats', () => {
    const picks = pickFocus(
      [
        { phoneme: 'TH', total: 10, ok: 3, lastDay: '2026-10-16' },
        { phoneme: 'IH', total: 10, ok: 6, lastDay: '2026-10-16' },
        { phoneme: 'K', total: 10, ok: 4, lastDay: '2026-10-16' },
        { phoneme: 'NG', total: 10, ok: 9, lastDay: '2026-10-10' },
        { phoneme: 'N', total: 2, ok: 0, lastDay: '2026-10-16' },
        { phoneme: 'S', total: 10, ok: 10, lastDay: '2026-10-17' },
      ],
      ['IY', 'IH', 'TH', 'DH', 'S'],
      TODAY,
    );
    expect(picks.map((p) => [p.phoneme, p.reason])).toEqual([
      ['TH', 'weak'],
      ['K', 'weak'],
      ['NG', 'review'],
    ]);
    expect(picks[0]?.okRate).toBe(0.3);
    expect(picks[2]?.daysSince).toBe(7);
  });

  it('fills with new sounds in chart order for a beginner', () => {
    const picks = pickFocus(
      [{ phoneme: 'IY', total: 1, ok: 1, lastDay: TODAY }],
      ['IY', 'IH', 'TH', 'DH'],
      TODAY,
    );
    expect(picks.map((p) => [p.phoneme, p.reason])).toEqual([
      ['IH', 'new'],
      ['TH', 'new'],
      ['DH', 'new'],
    ]);
    expect(pickFocus([], [], TODAY)).toEqual([]);
  });
});
