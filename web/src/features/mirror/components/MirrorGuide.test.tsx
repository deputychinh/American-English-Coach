import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { VisemeGroup } from '@/api/coach.schema';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import type { MouthTracker, TrackedSample } from '@/interfaces/tracker.interface';

import { MirrorGuide } from './MirrorGuide';

const target = {
  group: VisemeGroup.V4,
  name_vi: 'Môi tròn, chu ra',
  sounds: ['UW', 'W'],
  targets: { roundness: { min: 0.6 }, width: { max: 0.45 } },
  hold_ms: 10,
  hint_vi: 'Chu môi tròn.',
  common_error_vi: 'Môi dẹt.',
  confidence: 'high',
};

const features = (roundness: number, width: number) => ({
  aperture: 0.3,
  width,
  roundness,
  jaw: 0.2,
  lipClosed: 0,
  lowerLipTuck: 0,
  teethVisible: 0,
  tongueVisible: 0,
});

const sample = (roundness: number, width: number): TrackedSample => ({
  t: 1,
  raw: features(roundness, width),
  features: features(roundness, width),
  quality: 1,
  outline: [
    { x: 0.4, y: 0.6 },
    { x: 0.6, y: 0.6 },
    { x: 0.5, y: 0.65 },
  ],
});

const trackerWith = (latest: TrackedSample | null): MouthTracker => ({
  status: latest ? TrackerStatus.Ready : TrackerStatus.Idle,
  error: null,
  fps: 0,
  isFaceVisible: latest !== null,
  latest,
  attachVideo: () => undefined,
  attachCanvas: () => undefined,
  framesBetween: () => [],
  rawSince: () => [],
  snapshotMouth: () => Promise.resolve(null),
  retry: () => undefined,
});

const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('MirrorGuide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => vi.useRealTimers());

  it('shows a chip per target feature, the details and the bars', () => {
    render(<MirrorGuide sound="UW" target={target} tracker={trackerWith(null)} muted />);
    const chips = screen.getByRole('list', { name: 'Trạng thái từng đặc trưng khẩu hình' });
    expect(chips).toHaveTextContent('Độ tròn môi');
    expect(chips).toHaveTextContent('Độ rộng miệng');
    expect(screen.queryByText('Chu môi tròn.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(screen.getByText('Chu môi tròn.')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Độ tròn môi', hidden: true })).toBeInTheDocument();
    expect(
      screen.queryByRole('meter', { name: 'Độ mở hàm', hidden: true }),
    ).not.toBeInTheDocument();
    const ring = screen.getByRole('meter', { name: /Độ khớp khẩu hình 0/ });
    expect(within(ring).getByText('Đưa mặt vào khung')).toBeInTheDocument();
  });

  it('scores the match, asks to hold on target and names the one correction when off', async () => {
    const { rerender } = render(
      <MirrorGuide sound="UW" target={target} tracker={trackerWith(sample(0.9, 0.2))} muted />,
    );
    await tick(5);
    expect(screen.getByRole('meter', { name: /Độ khớp khẩu hình 100/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Giữ nguyên…');
    expect(screen.getByRole('img', { name: /Mẫu môi cần đạt/ })).toBeInTheDocument();
    await tick(20);
    rerender(
      <MirrorGuide sound="UW" target={target} tracker={trackerWith(sample(0.9, 0.21))} muted />,
    );
    await tick(5);
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!');

    rerender(
      <MirrorGuide sound="UW" target={target} tracker={trackerWith(sample(0.1, 0.9))} muted />,
    );
    await tick(5);
    expect(screen.getByRole('meter', { name: /Độ khớp khẩu hình 0/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('Chu môi tròn hơn');
    await tick(600);
    rerender(
      <MirrorGuide sound="UW" target={target} tracker={trackerWith(sample(0.1, 0.91))} muted />,
    );
    await tick(5);
    expect(screen.getAllByText('Chu môi tròn hơn').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Chỉnh theo gợi ý · Chu môi tròn hơn');
  });

  it('explains audio-only sounds and shows no dial', () => {
    render(<MirrorGuide sound="K" target={null} tracker={trackerWith(null)} muted />);
    expect(screen.getAllByText(/camera không thấy/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('meter', { name: /Độ khớp/ })).not.toBeInTheDocument();
  });
});
