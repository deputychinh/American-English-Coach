import { render, screen, waitFor } from '@testing-library/react';

import { StorageKey } from '@/enums/storage-key.enum';
import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { PlanCard } from './PlanCard';

const plan = {
  today: '2026-10-17',
  goal_runs: 3,
  runs_today: 2,
  streak_days: 4,
  week: [
    { date: '2026-10-11', runs: 0, ok: 0, check: 0, error: 0, goal_met: false },
    { date: '2026-10-12', runs: 3, ok: 9, check: 1, error: 0, goal_met: true },
    { date: '2026-10-13', runs: 1, ok: 3, check: 0, error: 0, goal_met: false },
    { date: '2026-10-14', runs: 3, ok: 9, check: 1, error: 0, goal_met: true },
    { date: '2026-10-15', runs: 4, ok: 9, check: 1, error: 0, goal_met: true },
    { date: '2026-10-16', runs: 3, ok: 9, check: 1, error: 0, goal_met: true },
    { date: '2026-10-17', runs: 2, ok: 6, check: 0, error: 0, goal_met: false },
  ],
  focus: [
    {
      phoneme: 'TH',
      ipa: 'θ',
      reason: 'weak',
      sound_id: 'c09',
      total: 10,
      ok_rate: 0.3,
      days_since: 1,
    },
    {
      phoneme: 'NG',
      ipa: 'ŋ',
      reason: 'review',
      sound_id: 'c07',
      total: 10,
      ok_rate: 0.9,
      days_since: 7,
    },
    {
      phoneme: 'ZH',
      ipa: 'ʒ',
      reason: 'new',
      sound_id: null,
      total: 0,
      ok_rate: null,
      days_since: null,
    },
  ],
  practised_sounds: 12,
  total_sounds: 39,
};

describe('PlanCard', () => {
  afterEach(() => localStorage.clear());

  it('shows goal progress, the streak, seven days and the focus list with reasons', async () => {
    const fetchMock = mockApi({ '/api/v1/plan': () => jsonResponse(plan) });
    render(<PlanCard headingId="today" />);
    await waitFor(() => expect(screen.getByText('2/3 lần thu hôm nay')).toBeInTheDocument());
    expect(screen.getByText('4 ngày liên tiếp')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    const days = screen.getByRole('list', { name: 'Bảy ngày gần nhất' });
    expect(days.querySelectorAll('.week-strip__day')).toHaveLength(7);
    expect(days.querySelectorAll('.week-strip__day--met')).toHaveLength(4);
    expect(days.querySelector('[aria-current="date"]')).toHaveClass('week-strip__day--some');
    expect(screen.getByText('Đã luyện 12/39 âm.')).toBeInTheDocument();
    expect(screen.getByText('30% đạt sau 10 lần')).toBeInTheDocument();
    expect(screen.getByText('7 ngày chưa luyện')).toBeInTheDocument();
    expect(screen.getByText('Chưa luyện lần nào')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /Luyện ngay/ });
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('sound=c09'));
    expect(links[2]).toHaveAttribute('href', expect.stringContaining('/mirror'));
    const url = new URL((fetchMock.mock.calls[0]?.[0] as Request).url);
    expect(url.searchParams.get('goal')).toBe('3');
    expect(url.searchParams.get('tz_offset')).toBe(String(-new Date().getTimezoneOffset()));
  });

  it('uses the stored daily goal and can hide the focus list', async () => {
    localStorage.setItem(StorageKey.DailyGoal, '5');
    const fetchMock = mockApi({
      '/api/v1/plan': () => jsonResponse({ ...plan, goal_runs: 5, streak_days: 0 }),
    });
    render(<PlanCard headingId="week" showFocus={false} />);
    await waitFor(() => expect(screen.getByText('2/5 lần thu hôm nay')).toBeInTheDocument());
    expect(screen.queryByText('30% đạt sau 10 lần')).not.toBeInTheDocument();
    expect(screen.queryByText(/ngày liên tiếp/)).not.toBeInTheDocument();
    const url = new URL((fetchMock.mock.calls[0]?.[0] as Request).url);
    expect(url.searchParams.get('goal')).toBe('5');
  });

  it('shows a retryable error when the plan cannot be loaded', async () => {
    mockApi({ '/api/v1/plan': () => jsonResponse({ detail: 'down', code: 'NOT_READY' }, 503) });
    render(<PlanCard headingId="today" />);
    await waitFor(() => expect(screen.getByText('down')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });
});
