import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import { assessmentFixture } from '@/test-utils/assessment.fixture';

import { SpeakCheck } from './SpeakCheck';

const recorder = {
  status: RecorderStatus.Idle,
  level: 0,
  seconds: 0,
  error: null as string | null,
  start: vi.fn(() => {
    recorder.status = RecorderStatus.Recording;
    return Promise.resolve();
  }),
  stop: vi.fn(() => {
    recorder.status = RecorderStatus.Idle;
    return Promise.resolve({ blob: new Blob(), url: '', startedAt: 1, durationSeconds: 1 });
  }),
};
vi.mock('@/features/practice/hooks/useRecorder', () => ({ useRecorder: () => recorder }));
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

/** A result whose TH phone carries the given verdict. */
const resultWith = (verdict: 'ok' | 'error') => {
  const result = assessmentFixture();
  for (const word of result.words)
    for (const phone of word.phones) if (phone.symbol === 'TH') phone.verdict = verdict as never;
  return result;
};

describe('SpeakCheck', () => {
  beforeEach(() => {
    assess.mockReset();
    recorder.status = RecorderStatus.Idle;
  });

  it('scores sound and mouth together and counts a streak towards mastery', async () => {
    const user = userEvent.setup();
    assess.mockResolvedValue(resultWith('ok'));
    const { rerender } = render(
      <SpeakCheck
        tracker={tracker}
        targets={{ roundness: { min: 0.6 }, width: { max: 0.45 } }}
        drillId="c09"
        words={['think', 'three']}
        symbol="TH"
        ipa="θ"
      />,
    );
    expect(screen.getByText('think')).toBeInTheDocument();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole('button', { name: 'Nói thử' }));
      rerender(
        <SpeakCheck
          tracker={tracker}
          targets={{ roundness: { min: 0.6 }, width: { max: 0.45 } }}
          drillId="c09"
          words={['think', 'three']}
          symbol="TH"
          ipa="θ"
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Dừng và chấm' }));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    }
    expect(screen.getByRole('status')).toHaveTextContent('Đã nắm được âm này!');
    expect(screen.getByRole('status')).toHaveTextContent('3/3 lần đúng liên tiếp');
    expect(assess.mock.calls[0]?.[0]).toMatchObject({
      item: { id: 'sound:c09:mirror:think', text: 'think', focus: ['TH'] },
    });
  });

  it('says the mouth is right but the sound is not, and resets the streak', async () => {
    const user = userEvent.setup();
    assess.mockResolvedValue(resultWith('error'));
    const { rerender } = render(
      <SpeakCheck
        tracker={tracker}
        targets={{ roundness: { min: 0.6 } }}
        drillId="c09"
        words={['think']}
        symbol="TH"
        ipa="θ"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Nói thử' }));
    rerender(
      <SpeakCheck
        tracker={tracker}
        targets={{ roundness: { min: 0.6 } }}
        drillId="c09"
        words={['think']}
        symbol="TH"
        ipa="θ"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Dừng và chấm' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Khẩu hình đúng nhưng âm chưa chuẩn'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('0/3 lần đúng liên tiếp');
  });
});
