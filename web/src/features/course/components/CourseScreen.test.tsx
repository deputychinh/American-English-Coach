import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { CourseScreen } from './CourseScreen';

const day = (index: number, done: boolean, doneItems: number) => ({
  id: `day${String(index).padStart(2, '0')}`,
  index,
  title_vi: `Ngày ${index} VI`,
  title_en: `Day ${index} EN`,
  goal_vi: 'Mục tiêu',
  minutes: 12,
  items: [
    { kind: 'sound', id: 'c09', label: '/θ/', runs: doneItems > 0 ? 2 : 0, done: doneItems > 0 },
    {
      kind: 'pair',
      id: 'think-sink',
      label: '/θ/ và /s/',
      runs: doneItems > 1 ? 1 : 0,
      done: doneItems > 1,
    },
    { kind: 'sentence', id: 's1', label: 'I think…', runs: 0, done: false },
  ],
  done_items: doneItems,
  total_items: 3,
  is_done: done,
});

describe('CourseScreen', () => {
  it('shows progress, opens the current day and links items to the right drills', async () => {
    mockApi({
      '/api/v1/course': () =>
        jsonResponse({
          days: [day(1, true, 3), day(2, false, 1), day(3, false, 0)],
          current_day: 'day02',
          completed_days: 1,
          total_days: 3,
        }),
    });
    render(<CourseScreen />);
    await waitFor(() => expect(screen.getByText('Ngày 2 · Ngày 2 VI')).toBeInTheDocument());
    expect(screen.getByText('1/3')).toBeInTheDocument();
    const details = document.querySelectorAll('details');
    expect(details[1]).toHaveAttribute('open');
    expect(details[0]).not.toHaveAttribute('open');
    expect(screen.getAllByText(/Đang học/)).toHaveLength(1);
    const current = details[1] as HTMLElement;
    const links = current.querySelectorAll('a');
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('sound=c09'));
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('item=pair%3Athink-sink%3A0'));
    expect(links[2]).toHaveAttribute('href', expect.stringContaining('item=sentence%3As1'));
    expect(current.querySelectorAll('.course-screen__item.is-done')).toHaveLength(1);
  });

  it('shows a retryable error', async () => {
    mockApi({ '/api/v1/course': () => jsonResponse({ detail: 'down', code: 'NOT_READY' }, 503) });
    render(<CourseScreen />);
    await waitFor(() => expect(screen.getByText('down')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });
});
