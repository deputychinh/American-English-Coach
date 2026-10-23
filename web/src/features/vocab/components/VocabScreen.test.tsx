import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import deckJson from '@/data/content/vocab.json';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { CardPhase, ReviewGrade, ReviewMode } from '@/enums/review.enum';
import type { RecorderOptions } from '@/interfaces/vad.interface';
import type { VocabDeck } from '@/interfaces/vocab.interface';
import { resetRunsStore, reviewStore } from '@/utils/local-store.util';
import { newCard, reviewCard } from '@/utils/srs.util';

import { VocabScreen } from './VocabScreen';

const play = vi.fn();
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play, stop: vi.fn(), isPlaying: false, error: null }),
}));

const recorder = {
  options: {} as RecorderOptions,
  start: vi.fn(() => Promise.resolve()),
  stop: vi.fn(() =>
    Promise.resolve({
      blob: new Blob(['x']),
      url: 'blob:take',
      durationSeconds: 1,
      startedAt: 0,
    }),
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

const DAY = 86_400_000;

/** A listening card for "today" answered well long ago, so speaking it opens now. */
const stableListening = () => {
  let card = newCard(
    { profileId: 'default', itemId: 'w.today', mode: ReviewMode.Listen },
    new Date(Date.now() - 60 * DAY),
  );
  for (const daysAgo of [60, 59, 50, 30]) {
    card = reviewCard({
      card,
      grade: ReviewGrade.Good,
      now: new Date(Date.now() - daysAgo * DAY),
    }).card;
  }
  return { ...card, due: new Date(Date.now() + 30 * DAY).toISOString() };
};

describe('VocabScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRunsStore();
    play.mockClear();
    assess.mockReset();
  });

  it('starts with new listening cards and keeps each answer on the device', async () => {
    const user = userEvent.setup();
    render(<VocabScreen />);
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu ôn 20 thẻ' }));
    expect(screen.getByText('Thẻ 1 / 20')).toBeInTheDocument();
    expect(play).toHaveBeenCalledWith('today');
    await user.click(screen.getByRole('button', { name: 'hôm nay' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!');
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    await waitFor(() => expect(screen.getByText('Thẻ 2 / 20')).toBeInTheDocument());
    const [card] = await reviewStore().listCards('default');
    expect(card).toMatchObject({ itemId: 'w.today', mode: ReviewMode.Listen, reps: 1 });
    expect(await reviewStore().listReviews('default')).toHaveLength(1);
  });

  it('grades a spoken answer with the scorer and lets the learner overrule it', async () => {
    const user = userEvent.setup();
    await reviewStore().putCards([stableListening()]);
    assess.mockResolvedValue({
      words: [{ word: 'today', ipa: '', phones: [{ verdict: 'ok' }, { verdict: 'check' }] }],
    });
    render(<VocabScreen />);
    await user.click(await screen.findByRole('button', { name: /^Bắt đầu ôn/ }));
    expect(screen.getByText('Nói bằng tiếng Anh:')).toBeInTheDocument();
    expect(screen.getByText('hôm nay')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    expect(recorder.start).toHaveBeenCalled();
    await act(async () => {
      recorder.options.onAutoStop?.('end');
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Gần đúng'));
    const [request] = assess.mock.calls[0] as [
      { item: { id: string; text: string; kind: string } },
    ];
    expect(request.item).toMatchObject({ id: 'vocab:w.today:speak', text: 'today', kind: 'word' });
    await user.click(screen.getByRole('button', { name: 'Mình nói đúng, máy chấm sai' }));
    await waitFor(async () => {
      const cards = await reviewStore().listCards('default');
      expect(cards.find((c) => c.mode === ReviewMode.Speak)?.phase).toBe(CardPhase.Learning);
    });
    const events = await reviewStore().listReviews('default');
    expect(events.map((event) => event.grade)).toEqual([ReviewGrade.Good]);
  });

  it('lets the learner grade themselves when a take cannot be scored', async () => {
    const user = userEvent.setup();
    await reviewStore().putCards([stableListening()]);
    assess.mockRejectedValue(new Error('Máy chấm chưa chạy'));
    render(<VocabScreen />);
    await user.click(await screen.findByRole('button', { name: /^Bắt đầu ôn/ }));
    await user.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    await act(async () => {
      recorder.options.onAutoStop?.('end');
      await Promise.resolve();
    });
    expect(await screen.findByText('Máy chấm chưa chạy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chưa nhớ' }));
    await waitFor(async () =>
      expect((await reviewStore().listReviews('default'))[0]?.grade).toBe(ReviewGrade.Again),
    );
  });

  it('says when nothing is left for today', async () => {
    const { items } = deckJson as unknown as VocabDeck;
    const cards = items.slice(0, 20).map(
      (entry) =>
        reviewCard({
          card: newCard(
            { profileId: 'default', itemId: entry.id, mode: ReviewMode.Listen },
            new Date(),
          ),
          grade: ReviewGrade.Easy,
          now: new Date(),
        }).card,
    );
    await reviewStore().putCards(cards);
    render(<VocabScreen />);
    expect(
      await screen.findByText('Hôm nay ôn xong rồi. Quay lại vào ngày mai nhé.'),
    ).toBeInTheDocument();
  });
});
