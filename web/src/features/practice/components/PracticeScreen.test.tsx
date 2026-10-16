import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';
import { assessmentFixture } from '@/test-utils/assessment.fixture';

import { PracticeScreen } from './PracticeScreen';

const params = new Map<string, string>();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => params.get(key) ?? null }),
  usePathname: () => '/practice',
}));
vi.mock('@/features/mirror/hooks/useMouthTracker', () => ({
  useMouthTracker: () => ({
    status: 'idle',
    error: null,
    fps: 0,
    isFaceVisible: false,
    latest: null,
    attachVideo: vi.fn(),
    attachCanvas: vi.fn(),
    framesBetween: () => [],
    rawSince: () => [],
  }),
}));

const content = {
  '/api/v1/content/pairs': () =>
    jsonResponse([
      {
        id: 'think-sink',
        focus: 'TH',
        words: ['think', 'sink'],
        error_id: 'x',
        title_vi: '/θ/ và /s/',
      },
    ]),
  '/api/v1/content/sentences': () => jsonResponse([]),
  '/api/v1/calibration': () => jsonResponse(null),
};

describe('PracticeScreen', () => {
  beforeEach(() => params.clear());

  it('lists items when no item is chosen and flags an unknown item', async () => {
    mockApi(content);
    params.set('item', 'pair:nope:0');
    render(<PracticeScreen />);
    await waitFor(() => expect(screen.getByRole('link', { name: 'think' })).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('pair:nope:0');
  });

  it('opens the session for a pair word with listen, camera and record controls', async () => {
    mockApi(content);
    params.set('item', 'pair:think-sink:0');
    render(<PracticeScreen />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '/θ/ và /s/' })).toBeInTheDocument(),
    );
    expect(screen.getByText('think')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thu âm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bật camera' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Nghe mẫu' })).toBeInTheDocument();
  });

  it('re-renders a stored run from the run param', async () => {
    mockApi({ ...content, '/api/v1/runs/run-1': () => jsonResponse(assessmentFixture()) });
    params.set('run', 'run-1');
    render(<PracticeScreen />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '/θ/ nghe lại' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Chọn bài khác' })).toBeInTheDocument();
  });
});
