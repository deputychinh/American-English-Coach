import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import type { AutoStopReason, RecorderOptions } from '@/interfaces/vad.interface';
import { assessmentFixture } from '@/test-utils/assessment.fixture';

import { SpeakCheck } from './SpeakCheck';

const auto: { stop: ((reason: AutoStopReason) => void) | undefined } = { stop: undefined };
const recorder = {
  status: RecorderStatus.Idle,
  level: 0,
  seconds: 0,
  error: null as string | null,
  hasSpeech: false,
  start: vi.fn(() => {
    recorder.status = RecorderStatus.Recording;
    return Promise.resolve();
  }),
  stop: vi.fn(() => {
    recorder.status = RecorderStatus.Idle;
    return Promise.resolve({ blob: new Blob(), url: 'blob:x', startedAt: 1, durationSeconds: 1 });
  }),
};
vi.mock('@/features/practice/hooks/useRecorder', () => ({
  useRecorder: (options: RecorderOptions = {}) => {
    auto.stop = options.onAutoStop;
    return recorder;
  },
}));
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play: vi.fn(), isPlaying: false, error: null }),
}));
const assess = vi.fn();
vi.mock('@/features/practice/services/assessment.service', () => ({
  assess: (...args: unknown[]) => assess(...args) as unknown,
}));

const onTarget = {
  t: 1.5,
  features: {
    aperture: 0.3,
    width: 0.3,
    roundness: 0.9,
    jaw: 0.2,
    lipClosed: 0,
    lowerLipTuck: 0,
    teethVisible: 0,
    tongueVisible: 0,
  },
  quality: 1,
  outline: [],
};
const tracker: MouthTracker = {
  status: TrackerStatus.Ready,
  error: null,
  fps: 30,
  isFaceVisible: true,
  latest: null,
  attachVideo: () => undefined,
  attachCanvas: () => undefined,
  framesBetween: () => [onTarget],
  rawSince: () => [],
  snapshotMouth: () => Promise.resolve(null),
};

const resultWith = (verdict: 'ok' | 'error') => {
  const result = assessmentFixture();
  for (const word of result.words)
    for (const phone of word.phones) if (phone.symbol === 'TH') phone.verdict = verdict as never;
  return result;
};

const deck = (
  <SpeakCheck
    tracker={tracker}
    targets={{ roundness: { min: 0.6 }, width: { max: 0.45 } }}
    drillId="c09"
    words={['think', 'three']}
    symbol="TH"
    ipa="θ"
  />
);

describe('SpeakCheck', () => {
  beforeEach(() => {
    assess.mockReset();
    recorder.status = RecorderStatus.Idle;
    recorder.start.mockClear();
  });

  it('scores sound and mouth together and counts three passes as mastery', async () => {
    const user = userEvent.setup();
    assess.mockResolvedValue(resultWith('ok'));
    const { rerender } = render(deck);
    await user.click(screen.getByRole('button', { name: 'Tự nói lại: Bật' }));
    expect(screen.getByText('think')).toBeInTheDocument();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole('button', { name: 'Nói thử' }));
      rerender(deck);
      await user.click(screen.getByRole('button', { name: 'Dừng và chấm' }));
      await waitFor(() => expect(screen.getByText(/Âm \/θ\/: Đạt/)).toBeInTheDocument());
    }
    expect(screen.getByRole('status')).toHaveTextContent('Đã nắm được âm này!');
    expect(screen.getByLabelText('3/3 lần đúng liên tiếp')).toBeInTheDocument();
    expect(assess.mock.calls[0]?.[0]).toMatchObject({
      item: { id: 'sound:c09:mirror:think', text: 'think', focus: ['TH'] },
    });
    expect(screen.getByRole('button', { name: /Của bạn/ })).toBeEnabled();
  });

  it('stops by itself when the learner finishes speaking and queues the next try', async () => {
    const user = userEvent.setup();
    assess.mockResolvedValue(resultWith('error'));
    render(deck);
    await user.click(screen.getByRole('button', { name: 'Nói thử' }));
    await act(async () => {
      auto.stop?.('end');
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Khẩu hình đúng nhưng âm chưa chuẩn'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Chuẩn bị lần tiếp theo');
    expect(screen.getByLabelText('0/3 lần đúng liên tiếp')).toBeInTheDocument();
  });

  it('says when nothing was heard', async () => {
    const user = userEvent.setup();
    render(deck);
    await user.click(screen.getByRole('button', { name: 'Nói thử' }));
    await act(async () => {
      auto.stop?.('no-speech');
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Chưa nghe thấy tiếng');
    expect(assess).not.toHaveBeenCalled();
  });
});
