import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { ListenScreen } from './ListenScreen';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('unit=u03'),
}));

const play = vi.fn();
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play, isPlaying: false, error: null }),
}));

const curriculum = {
  levels: [
    {
      id: 'L1',
      title_vi: 'Nền tảng',
      title_en: 'Foundation',
      goal_vi: '',
      done_units: 0,
      units: [
        {
          id: 'u03',
          level: 'L1',
          index: 3,
          title_vi: 'Âm TH',
          title_en: 'TH',
          goal_vi: '',
          vn_error_vi: '',
          minutes: 12,
          days: 5,
          focus_sounds: ['c09'],
          steps: [
            { kind: 'describe', sounds: ['c09'], notes_vi: '' },
            {
              kind: 'discriminate',
              pairs: ['think-sink'],
              stress: [],
              focus: [],
            },
            { kind: 'controlled', items: [{ kind: 'sound', id: 'c09' }] },
            { kind: 'guided', sentences: ['s1'] },
            { kind: 'communicate', scenario_vi: '', target_words: ['three'] },
          ],
          progress: { done_items: 0, total_items: 1, is_done: false, done_ids: [] },
        },
      ],
    },
  ],
  current_unit: 'u03',
  completed_units: 0,
  total_units: 1,
};

describe('ListenScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    play.mockClear();
    mockApi({
      '/api/v1/curriculum': () => jsonResponse(curriculum),
      '/api/v1/content/pairs': () =>
        jsonResponse([
          { id: 'think-sink', focus: 'TH', words: ['think', 'sink'], error_id: 'x', title_vi: 't' },
        ]),
      '/api/v1/content/sentences': () => jsonResponse([]),
    });
  });

  it('plays, grades each answer and ends with a saved summary', async () => {
    const user = userEvent.setup();
    render(<ListenScreen />);
    await waitFor(() => expect(screen.getByText('Câu 1 / 2')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Phát âm thanh' }));
    expect(play).toHaveBeenCalledWith(expect.stringMatching(/^(think|sink)$/));
    const options = screen.getAllByRole('button', { name: /^(think|sink)$/ });
    expect(options).toHaveLength(2);
    await user.click(options[0]!);
    expect(screen.getByRole('status')).toHaveTextContent(/Đúng rồi|Chưa đúng/);
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));
    expect(screen.getByText('Câu 2 / 2')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^(think|sink)$/ })[1]!);
    await user.click(screen.getByRole('button', { name: 'Xem kết quả' }));
    expect(screen.getByRole('heading', { name: 'Kết quả nghe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sang bước luyện có chấm' })).toHaveAttribute(
      'href',
      expect.stringContaining('sound=c09'),
    );
    const stored = JSON.parse(localStorage.getItem('coach.listening') ?? '{}') as Record<
      string,
      { total: number }
    >;
    expect(stored.u03?.total).toBe(2);
  });
});
