import { act, render, screen } from '@testing-library/react';

import { VisemeGroup } from '@/api/coach.schema';
import type { TrackedSample } from '@/interfaces/tracker.interface';

import { MirrorGuide } from './MirrorGuide';

const target = {
  group: VisemeGroup.V4,
  name_vi: 'Môi tròn, chu ra',
  sounds: ['UW', 'W'],
  targets: { roundness: { min: 0.6 }, width: { max: 0.45 } },
  hold_ms: 10,
  hint_vi: 'Chu môi tròn.',
  common_error_vi: 'Môi dẹt.',
};

const sample = (roundness: number, width: number): TrackedSample => ({
  t: 1,
  raw: {
    aperture: 0.3,
    width,
    roundness,
    jaw: 0.2,
    lipClosed: 0,
    lowerLipTuck: 0,
    teethVisible: 0,
    tongueVisible: 0,
  },
  features: {
    aperture: 0.3,
    width,
    roundness,
    jaw: 0.2,
    lipClosed: 0,
    lowerLipTuck: 0,
    teethVisible: 0,
    tongueVisible: 0,
  },
  quality: 1,
  outline: [],
});

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

  it('shows the target copy and the bars for the target features', () => {
    render(<MirrorGuide sound="UW" target={target} features={null} muted camera={<p>cam</p>} />);
    expect(screen.getByText('Môi tròn, chu ra')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Độ tròn môi' })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Độ rộng miệng' })).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Độ mở hàm' })).not.toBeInTheDocument();
  });

  it('asks to hold while on target and shows a direction hint after being off', async () => {
    const { rerender } = render(
      <MirrorGuide sound="UW" target={target} features={sample(0.9, 0.2)} muted camera={null} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Giữ nguyên');
    rerender(
      <MirrorGuide sound="UW" target={target} features={sample(0.1, 0.9)} muted camera={null} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5);
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
    rerender(
      <MirrorGuide sound="UW" target={target} features={sample(0.1, 0.9)} muted camera={null} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    rerender(
      <MirrorGuide sound="UW" target={target} features={sample(0.1, 0.91)} muted camera={null} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Độ tròn môi: tăng ↑');
  });

  it('explains audio-only sounds', () => {
    render(<MirrorGuide sound="K" target={null} features={null} muted camera={null} />);
    expect(screen.getByText(/camera không thấy/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Không có mẫu khẩu hình' })).toBeInTheDocument();
  });
});
