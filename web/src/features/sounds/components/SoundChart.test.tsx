import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { SoundChart } from './SoundChart';

const params = { get: vi.fn<(key: string) => string | null>(() => null) };
vi.mock('next/navigation', () => ({ useSearchParams: () => params, usePathname: () => '/sounds' }));

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
    await waitFor(() => expect(screen.getByText('Nguyên âm')).toBeInTheDocument());
    expect(screen.getByText('Phụ âm')).toBeInTheDocument();
    expect(screen.getAllByText('Camera nhìn thấy')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '/θ/' })).toBeInTheDocument();
    expect(screen.getByText('Lưỡi giữa răng.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luyện từ này' })).toHaveAttribute(
      'href',
      expect.stringContaining('item=word%3Athink'),
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
