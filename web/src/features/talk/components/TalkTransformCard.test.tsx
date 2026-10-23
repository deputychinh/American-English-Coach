import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import talkJson from '@/data/content/talk.json';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { ReviewGrade } from '@/enums/review.enum';
import { TalkKind } from '@/enums/talk.enum';
import type { PatternDrillItem, TalkDeck } from '@/interfaces/talk.interface';
import type { RecorderOptions } from '@/interfaces/vad.interface';
import { talkItems } from '@/utils/talk.util';

import { TalkTransformCard } from './TalkTransformCard';

const play = vi.fn();
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play, stop: vi.fn(), isPlaying: false, error: null }),
}));

const recorder = { options: {} as RecorderOptions, start: vi.fn(() => Promise.resolve()) };
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
      stop: () =>
        Promise.resolve({ blob: new Blob(['x']), url: 'blob:t', durationSeconds: 1, startedAt: 0 }),
    };
  },
}));

const assess = vi.fn();
vi.mock('@/features/practice/services/assessment.service', () => ({
  assess: (...args: unknown[]) => assess(...args) as unknown,
}));

const item = talkItems(talkJson as unknown as TalkDeck).find(
  (entry): entry is PatternDrillItem => entry.kind === TalkKind.Drill && entry.id === 'p.past-ed.1',
) as PatternDrillItem;

const workedWithEnding = (ending: string): unknown => ({
  words: [
    { word: 'i', ipa: '', phones: [{ verdict: 'ok' }] },
    {
      word: 'worked',
      ipa: '',
      phones: [{ verdict: 'ok' }, { verdict: 'ok' }, { verdict: 'ok' }, { verdict: ending }],
    },
  ],
});

const speak = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
  await act(async () => {
    recorder.options.onAutoStop?.('end');
    await Promise.resolve();
  });
};

describe('TalkTransformCard', () => {
  beforeEach(() => {
    play.mockClear();
    assess.mockReset();
  });

  it('plays the sentence and shows the cue', () => {
    render(<TalkTransformCard item={item} onAnswer={vi.fn()} />);
    expect(play).toHaveBeenCalledWith('I work until five.');
    expect(screen.getByText('yesterday')).toBeInTheDocument();
    expect(screen.getByText(/Đuôi -ed đọc \/t\//)).toBeInTheDocument();
  });

  it('says when the -ed ending was dropped and lets the learner overrule it', async () => {
    const onAnswer = vi.fn();
    assess.mockResolvedValue(workedWithEnding('error'));
    render(<TalkTransformCard item={item} onAnswer={onAnswer} />);
    await speak();
    expect(
      await screen.findByText('Chưa nghe thấy đuôi -ed ở “worked”. Đừng nuốt âm cuối.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng.');
    expect(screen.getByText('worked', { selector: 'mark' })).toBeInTheDocument();
    const [request] = assess.mock.calls[0] as [{ item: { id: string; text: string } }];
    expect(request.item).toMatchObject({
      id: 'talk:p.past-ed.1',
      text: 'I worked until five yesterday.',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Mình nói đúng, máy chấm sai' }));
    expect(onAnswer).toHaveBeenCalledWith(ReviewGrade.Good);
  });

  it('grades a clear ending as good', async () => {
    const onAnswer = vi.fn();
    assess.mockResolvedValue(workedWithEnding('ok'));
    render(<TalkTransformCard item={item} onAnswer={onAnswer} />);
    await speak();
    expect(await screen.findByText('Đuôi -ed ở “worked” rõ ràng.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /máy chấm sai/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(onAnswer).toHaveBeenCalledWith(ReviewGrade.Good);
  });

  it('shows the answer to a learner who does not know it yet', async () => {
    const onAnswer = vi.fn();
    render(<TalkTransformCard item={item} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mình chưa biết' }));
    expect(screen.getByText('Hôm qua mình làm việc tới năm giờ.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nghe mẫu' }));
    expect(play).toHaveBeenLastCalledWith('I worked until five yesterday.');
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(onAnswer).toHaveBeenCalledWith(ReviewGrade.Again);
  });

  it('lets the learner grade themselves when the take cannot be scored', async () => {
    const onAnswer = vi.fn();
    assess.mockRejectedValue(new Error('Máy chấm chưa chạy'));
    render(<TalkTransformCard item={item} onAnswer={onAnswer} />);
    await speak();
    expect(await screen.findByText('Máy chấm chưa chạy')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mình nói được' }));
    expect(onAnswer).toHaveBeenCalledWith(ReviewGrade.Good);
  });
});
