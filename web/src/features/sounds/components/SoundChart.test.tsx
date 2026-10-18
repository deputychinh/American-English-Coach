import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { SoundChart } from './SoundChart';

const params = { get: vi.fn<(key: string) => string | null>(() => null) };
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  usePathname: () => '/sounds',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const cards = [
  {
    id: 'v01',
    symbol: 'iː',
    us: 'i',
    group: 'vowel',
    example: 'see',
    contrast: 'sit',
    arpabet: 'IY',
    tip: 'Kéo môi ngang.',
    note: '',
    viseme_group: 'V6',
  },
  {
    id: 'c01',
    symbol: 'θ',
    us: 'θ',
    group: 'consonant',
    example: 'think',
    contrast: 'sink',
    arpabet: 'TH',
    tip: 'Lưỡi giữa răng.',
    note: 'Ghi chú',
    viseme_group: null,
  },
];

describe('SoundChart', () => {
  it('groups cards, marks camera visibility and opens the detail from the id param', async () => {
    mockApi({ '/api/v1/content/phonemes': () => jsonResponse(cards) });
    params.get.mockReturnValue('c01');
    render(<SoundChart />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^Nguyên âm/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: /^Phụ âm/ })).toBeInTheDocument();
    expect(document.querySelectorAll('.confidence-badge')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: '/θ/' })).toBeInTheDocument();
    expect(screen.getByText('Lưỡi giữa răng.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Soi gương âm này' })).toHaveAttribute(
      'href',
      expect.stringContaining('/mirror?sound=TH'),
    );
  });

  it('shows an error state with retry when the API fails', async () => {
    mockApi({ '/api/v1/content/phonemes': () => jsonResponse({ detail: 'down' }, 503) });
    params.get.mockReturnValue(null);
    render(<SoundChart />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('down'));
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

describe('SoundChart filters', () => {
  it('filters by group tab and by search text', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    mockApi({ '/api/v1/content/phonemes': () => jsonResponse(cards) });
    params.get.mockReturnValue(null);
    render(<SoundChart />);
    await waitFor(() => expect(document.querySelectorAll('.sound-chart__card')).toHaveLength(2));
    await user.click(screen.getByRole('tab', { name: 'Phụ âm' }));
    expect(document.querySelectorAll('.sound-chart__card')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'Tất cả' }));
    await user.type(screen.getByRole('searchbox'), 'see');
    expect(document.querySelectorAll('.sound-chart__card')).toHaveLength(1);
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText(/Không có âm nào khớp/)).toBeInTheDocument();
  });
});
