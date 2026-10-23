import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import type { RecorderOptions } from '@/interfaces/vad.interface';
import { resetRunsStore, reviewStore } from '@/utils/local-store.util';

import { TalkScreen } from './TalkScreen';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

const play = vi.fn();
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play, stop: vi.fn(), isPlaying: false, error: null }),
}));

const recorder = {
  options: {} as RecorderOptions,
  start: vi.fn(() => Promise.resolve()),
  stop: vi.fn(() =>
    Promise.resolve({ blob: new Blob(['x']), url: 'blob:take', durationSeconds: 1, startedAt: 0 }),
  ),
};
vi.mock('@/features/practice/hooks/useRecorder', () => ({
  useRecorder: (options: RecorderOptions) => {
    recorder.options = options;
    return {
      status: RecorderStatus.Idle,
      level: 0,
      seconds: 0,
      error: null,
      hasSpeech: false,
      start: recorder.start,
      stop: recorder.stop,
    };
  },
}));

const assess = vi.fn();
vi.mock('@/features/practice/services/assessment.service', () => ({
  assess: (...args: unknown[]) => assess(...args) as unknown,
}));

const speak = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
  await act(async () => {
    recorder.options.onAutoStop?.('end');
    await Promise.resolve();
  });
};

describe('TalkScreen', () => {
  beforeEach(() => {
    search = '';
    localStorage.clear();
    resetRunsStore();
    play.mockClear();
    assess.mockReset();
  });

  it('picks the casual phrase for a friend, says it and keeps the answer', async () => {
    const user = userEvent.setup();
    assess.mockResolvedValue({
      words: [{ word: 'hey', ipa: '', phones: [{ verdict: 'ok' }] }],
    });
    render(<TalkScreen />);
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu 10 thẻ' }));
    expect(screen.getByText('Thẻ 1 / 10')).toBeInTheDocument();
    expect(screen.getByText('Chào và giới thiệu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Hey, I'm Minh." }));
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi: câu thân mật.');
    await speak();
    expect(await screen.findByText('Phát âm rõ ràng.')).toBeInTheDocument();
    const [request] = assess.mock.calls[0] as [{ item: { id: string; text: string } }];
    expect(request.item).toMatchObject({ id: 'talk:f.greet.casual', text: "Hey, I'm Minh." });
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    await waitFor(() => expect(screen.getByText('Thẻ 2 / 10')).toBeInTheDocument());
    const [card] = await reviewStore().listCards('default');
    expect(card).toMatchObject({ itemId: 'f.greet.casual', mode: ReviewMode.Register });
    const [event] = await reviewStore().listReviews('default');
    expect(event?.grade).toBe(ReviewGrade.Good);
  });

  it('marks a phrase in the wrong register as not yet learnt', async () => {
    const user = userEvent.setup();
    render(<TalkScreen />);
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu 10 thẻ' }));
    await user.click(
      screen.getByRole('button', {
        name: /Good morning\. My name is Minh/,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Chưa hợp. Tình huống này cần câu thân mật.',
    );
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    await waitFor(async () =>
      expect((await reviewStore().listReviews('default'))[0]?.grade).toBe(ReviewGrade.Again),
    );
  });

  it("practises one unit's phrases and pattern from the unit page", async () => {
    search = 'unit=u09';
    render(<TalkScreen />);
    expect(
      await screen.findByText('Luyện cụm giao tiếp và mẫu câu của đơn vị u09.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu 7 thẻ' })).toBeInTheDocument();
    expect(screen.queryByText('Đến hạn')).not.toBeInTheDocument();
  });
});
