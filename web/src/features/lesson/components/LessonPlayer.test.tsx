import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { StorageKey } from '@/enums/storage-key.enum';
import { readLessonPosition } from '@/features/lesson/services/lesson-position.service';
import type { AssessmentResponse, PracticeItem } from '@/interfaces/practice.interface';

import { LessonPlayer } from './LessonPlayer';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('unit=u09'),
}));

vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play: vi.fn(), isPlaying: false, error: null }),
}));

// The practice screen (microphone, camera) has its own tests; here it reports a scripted result.
vi.mock('@/features/practice/components/PracticeSession', () => ({
  PracticeSession: ({
    item,
    banner,
    extraActions,
    onResult,
  }: {
    item: PracticeItem;
    banner: ReactNode;
    extraActions: ReactNode;
    onResult: (result: AssessmentResponse) => void;
  }) => (
    <div>
      {banner}
      <p data-testid="prompt">{item.text}</p>
      <button
        type="button"
        onClick={() => onResult({ summary: { error: 0 } } as unknown as AssessmentResponse)}
      >
        say it well
      </button>
      {extraActions}
    </div>
  ),
}));

describe('LessonPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(StorageKey.ForceLocalMode, 'true');
  });

  it('walks the unit from the description to the end and saves the place on the way', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer />);
    expect(await screen.findByText(/Bước 1\/5 · Làm quen âm/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu nghe' }));

    // Listening: answer every question with the first option.
    while (screen.queryByRole('group')) {
      const [first] = screen.getAllByRole('button', { pressed: false });
      if (first) await user.click(first);
      await user.click(screen.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }));
    }

    expect(await screen.findByText(/Bước 3\/5 · Luyện từng từ · 1\//)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'say it well' }));
    expect(screen.getByText(/Đạt 1\//)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(readLessonPosition('u09')).toMatchObject({ step: 2, index: 1 });

    // Skip the rest: the gate says one is not enough, then "move on anyway".
    while (screen.queryByText(/Bước 3\/5/) && screen.queryByRole('button', { name: 'Bỏ qua' })) {
      await user.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    }
    expect(screen.getByRole('heading', { name: 'Kiểm tra trước khi đi tiếp' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Luyện lại mục chưa đạt' }));
    expect(screen.getByText(/Bước 3\/5 · Luyện từng từ · 2\//)).toBeInTheDocument();
    while (screen.queryByText(/Bước 3\/5/) && screen.queryByRole('button', { name: 'Bỏ qua' })) {
      await user.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    }
    await user.click(screen.getByRole('button', { name: 'Vẫn đi tiếp' }));

    expect(screen.getByText(/Bước 4\/5/)).toBeInTheDocument();
    while (screen.queryByRole('button', { name: 'Bỏ qua' })) {
      if (screen.queryByText(/Bước 5\/5 · Dùng khi giao tiếp · 1\//)) {
        // Role-play: the partner's line (played by the model voice) and what to answer.
        expect(screen.getByText('What did you do yesterday?')).toBeInTheDocument();
        expect(screen.getByText('Đến lượt bạn:')).toBeInTheDocument();
        expect(screen.getByTestId('prompt')).toHaveTextContent('I worked until five.');
      }
      await user.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    }
    expect(screen.getByRole('heading', { name: 'Xong bài học!' })).toBeInTheDocument();
    expect(screen.getByText(/Nói đạt 1\//)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Học lại từ đầu' }));
    await waitFor(() => expect(screen.getByText(/Bước 1\/5/)).toBeInTheDocument());
    expect(readLessonPosition('u09')).toBeNull();
  });
});
