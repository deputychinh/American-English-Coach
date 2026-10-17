import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { CurriculumScreen } from './CurriculumScreen';

const unit = ({
  index,
  id,
  done,
  doneIds,
}: {
  index: number;
  id: string;
  done: boolean;
  doneIds: string[];
}) => ({
  id,
  level: 'L1',
  index,
  title_vi: `Đơn vị ${index} VI`,
  title_en: `Unit ${index} EN`,
  goal_vi: 'Mục tiêu',
  vn_error_vi: 'Lỗi hay mắc',
  minutes: 12,
  days: 5,
  focus_sounds: ['c09'],
  steps: [
    { kind: 'describe', sounds: ['c09'], notes_vi: 'Đầu lưỡi ra giữa hai hàm răng.' },
    {
      kind: 'discriminate',
      pairs: ['think-sink'],
      stress: [{ word: 'about', syllables: ['a', 'BOUT'], stressed: 1 }],
      focus: [],
    },
    {
      kind: 'controlled',
      items: [
        { kind: 'sound', id: 'c09' },
        { kind: 'pair', id: 'think-sink' },
      ],
    },
    { kind: 'guided', sentences: ['s1'] },
    { kind: 'communicate', scenario_vi: 'Kể về gia đình.', target_words: ['mother', 'three'] },
  ],
  progress: {
    done_items: doneIds.length,
    total_items: 2,
    is_done: done,
    done_ids: doneIds,
  },
});

describe('CurriculumScreen', () => {
  it('shows levels, opens the current unit and links its steps', async () => {
    mockApi({
      '/api/v1/curriculum': () =>
        jsonResponse({
          levels: [
            {
              id: 'L1',
              title_vi: 'Nền tảng',
              title_en: 'Foundation',
              goal_vi: 'Nghe ra từng âm.',
              units: [
                unit({
                  index: 1,
                  id: 'u01',
                  done: true,
                  doneIds: ['sound:c09', 'pair:think-sink'],
                }),
                unit({ index: 2, id: 'u02', done: false, doneIds: ['sound:c09'] }),
              ],
              done_units: 1,
            },
          ],
          current_unit: 'u02',
          completed_units: 1,
          total_units: 2,
        }),
    });
    render(<CurriculumScreen />);
    await waitFor(() => expect(screen.getByText('Cấp 1 · Nền tảng')).toBeInTheDocument());
    expect(screen.getByText('1/2')).toBeInTheDocument();
    const details = document.querySelectorAll('details');
    expect(details[0]).not.toHaveAttribute('open');
    expect(details[1]).toHaveAttribute('open');
    const current = details[1] as HTMLElement;
    expect(current).toHaveTextContent('Người Việt hay mắc');
    expect(current).toHaveTextContent('1 cặp từ · 1 từ trọng âm');
    const links = current.querySelectorAll('a');
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/sounds'));
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('sound=c09'));
    expect(links[1]?.className).toContain('is-done');
    expect(links[2]).toHaveAttribute('href', expect.stringContaining('item=pair%3Athink-sink%3A0'));
    expect(links[3]).toHaveAttribute('href', expect.stringContaining('item=sentence%3As1'));
    expect(screen.getByRole('link', { name: 'Lộ trình nhanh 14 ngày' })).toHaveAttribute(
      'href',
      '/course',
    );
  });

  it('shows a retryable error', async () => {
    mockApi({
      '/api/v1/curriculum': () => jsonResponse({ detail: 'down', code: 'NOT_READY' }, 503),
    });
    render(<CurriculumScreen />);
    await waitFor(() => expect(screen.getByText('down')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });
});
