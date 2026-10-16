import { act, render, screen } from '@testing-library/react';
import { type ReactElement, useEffect, useState } from 'react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { CalibrationFlow } from './CalibrationFlow';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/calibration',
}));

const sample = {
  aperture: 0.1,
  width: 0.5,
  roundness: 0.2,
  jaw: 0.1,
  lipClosed: 0.9,
  lowerLipTuck: 0.1,
};
// A fresh object per call, exactly like the real hook re-rendering on every tracked frame.
vi.mock('@/features/mirror/hooks/useMouthTracker', () => ({
  useMouthTracker: () => ({
    status: 'ready',
    error: null,
    fps: 60,
    isFaceVisible: true,
    latest: null,
    attachVideo: vi.fn(),
    attachCanvas: vi.fn(),
    framesBetween: () => [],
    rawSince: () => Array.from({ length: 20 }, () => ({ ...sample })),
  }),
}));

const visemes = {
  features: Object.keys(sample),
  groups: [],
  calibration: [
    { id: 'rest', prompt_vi: 'Khuôn miệng nghỉ', seconds: 1 },
    { id: 'ee', prompt_vi: 'Nói ee', seconds: 1 },
  ],
};

/** Re-renders the flow every 100 ms, as live tracker updates do in the browser. */
const Harness = (): ReactElement => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div data-tick={tick}>
      <CalibrationFlow />
    </div>
  );
};

describe('CalibrationFlow', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('advances through the steps while the page keeps re-rendering, then saves', async () => {
    const put = vi.fn(() => new Response(null, { status: 204 }));
    const fetchMock = mockApi({
      '/api/v1/content/visemes': () => jsonResponse(visemes),
      '/api/v1/calibration': (_url, init) => (init?.method === 'PUT' ? put() : jsonResponse(null)),
    });
    render(<Harness />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    act(() => {
      screen.getByRole('button', { name: 'Bắt đầu' }).click();
    });
    expect(screen.getByText('Bước 1 / 2')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(screen.getByText('Bước 2 / 2')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa thấy khuôn mặt/)).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(await screen.findByText('Đã hiệu chỉnh xong.')).toBeInTheDocument();
    const calls = fetchMock.mock.calls.map((call: unknown[]) => {
      const input = call[0];
      const init = call[1] as RequestInit | undefined;
      return input instanceof Request
        ? `${input.method} ${input.url}`
        : `${init?.method ?? 'GET'} ${String(input)}`;
    });
    expect(calls.some((entry) => entry.startsWith('PUT') && entry.includes('/calibration'))).toBe(
      true,
    );
  });
});
