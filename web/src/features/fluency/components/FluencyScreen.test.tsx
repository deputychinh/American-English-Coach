import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import type { FluencyMetrics } from '@/interfaces/fluency.interface';
import type { RecorderOptions } from '@/interfaces/vad.interface';
import type * as FluencyUtil from '@/utils/fluency.util';
import { encodeWav } from '@/utils/wav-encoder.util';

import { FluencyScreen } from './FluencyScreen';

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
    Promise.resolve({
      blob: encodeWav(new Float32Array(1600)),
      url: 'blob:take',
      durationSeconds: 0.1,
      startedAt: 0,
    }),
  ),
};
vi.mock('@/features/practice/hooks/useRecorder', () => ({
  useRecorder: (options: RecorderOptions) => {
    recorder.options = options;
    return {
      status: RecorderStatus.Idle,
      level: 0.1,
      seconds: 12,
      error: null,
      hasSpeech: false,
      start: recorder.start,
      stop: recorder.stop,
    };
  },
}));

const measured: FluencyMetrics[] = [];
vi.mock('@/utils/fluency.util', async (importOriginal) => ({
  ...(await importOriginal<typeof FluencyUtil>()),
  analyzeFluency: () => measured.shift(),
}));

const metrics = (speechRate: number, meanLengthOfRun: number, pausesPerMinute: number) => ({
  speakingSeconds: 50,
  phonationSeconds: 40,
  syllables: Math.round((speechRate * 50) / 60),
  pauses: 10,
  speechRate,
  articulationRate: 3.5,
  meanLengthOfRun,
  pausesPerMinute,
  meanPauseSeconds: 0.6,
});

const speakRound = async (start: string): Promise<void> => {
  await userEvent.click(await screen.findByRole('button', { name: start }));
  await userEvent.click(screen.getByRole('button', { name: 'Xong sớm' }));
};

describe('FluencyScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    search = 'unit=u09';
    measured.length = 0;
  });

  it("shows the unit's topic with ideas and phrases to listen to", async () => {
    render(<FluencyScreen />);
    expect(await screen.findByRole('heading', { name: /Hôm qua bạn đã làm gì/ })).toBeVisible();
    expect(screen.getByText('Buổi chiều')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: /Nghe “Yesterday, I worked until five.”/ }),
    );
    expect(play).toHaveBeenCalledWith('Yesterday, I worked until five.');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Đổi chủ đề' }), 'u18');
    expect(screen.getByRole('heading', { name: /Gọi đồ cho cả nhóm bạn/ })).toBeVisible();
  });

  it('runs three shorter rounds, compares them and keeps the session for the trend', async () => {
    measured.push(metrics(150, 4, 20), metrics(162, 5, 16), metrics(171, 6.5, 12));
    render(<FluencyScreen />);
    await speakRound('Bắt đầu lần 1 · 60 giây');
    expect(recorder.options).toMatchObject({ endsOnSilence: false, maxSeconds: 60 });
    expect(await screen.findByText('Xong lần 1.')).toBeVisible();
    expect(screen.getByRole('cell', { name: '150' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Tiếp: lần 2 · 45 giây' }));
    await speakRound('Bắt đầu lần 2 · 45 giây');
    expect(recorder.options.maxSeconds).toBe(45);
    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp: lần 3 · 30 giây' }));
    await speakRound('Bắt đầu lần 3 · 30 giây');
    await userEvent.click(await screen.findByRole('button', { name: 'Xem kết quả' }));

    expect(screen.getByRole('heading', { name: 'Xong 3 lần!' })).toBeVisible();
    expect(screen.getByText(/nhanh hơn 21 âm tiết\/phút/)).toBeVisible();
    expect(screen.getByText(/ít ngắt hơn 8 lần\/phút/)).toBeVisible();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    const saved = JSON.parse(localStorage.getItem('coach.fluency') ?? '{}') as Record<
      string,
      { promptId: string; rounds: unknown[] }[]
    >;
    expect(Object.values(saved)[0]?.[0]).toMatchObject({ promptId: 'fl.u09' });
    expect(Object.values(saved)[0]?.[0]?.rounds).toHaveLength(3);
    const trend = within(screen.getByRole('region', { name: 'Xu hướng của bạn' }));
    expect(trend.getAllByRole('listitem')).toHaveLength(1);
    expect(trend.getByText(/Hôm qua bạn đã làm gì$/)).toBeVisible();
    expect(recorder.start).toHaveBeenCalledTimes(3);
  });

  it('asks to try the round again when no voice was heard', async () => {
    measured.push(metrics(0, 0, 0), metrics(140, 4, 18));
    measured[0] = { ...measured[0]!, syllables: 0 };
    render(<FluencyScreen />);
    await speakRound('Bắt đầu lần 1 · 60 giây');
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa nghe thấy giọng nói');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại lần này' }));
    await speakRound('Bắt đầu lần 1 · 60 giây');
    expect(await screen.findByText('Xong lần 1.')).toBeVisible();
  });

  it('can hide the numbers while practising', async () => {
    measured.push(metrics(150, 4, 20));
    render(<FluencyScreen />);
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Ẩn số đo trong lúc luyện' }),
    );
    await speakRound('Bắt đầu lần 1 · 60 giây');
    expect(await screen.findByText('Xong lần 1.')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    await waitFor(() => expect(localStorage.getItem('coach.fluencyHidden')).toBe('true'));
  });
});
