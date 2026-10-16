import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { ProgressDashboard } from './ProgressDashboard';

const progress = {
  runs: 1,
  phonemes: [{ phoneme: 'TH', ipa: 'θ', total: 4, ok: 2, check: 1, error: 1 }],
  recent: [
    {
      id: 'run-1',
      item_id: 'pair:think-sink:0',
      text: 'think',
      created_at: '2026-10-16T10:00:00Z',
      ok: 2,
      check: 1,
      error: 1,
      model_version: 'fake@test',
      disputed: true,
    },
  ],
};

describe('ProgressDashboard', () => {
  afterEach(() => localStorage.clear());

  it('renders stats, the ranked per-sound table, recent runs and the settings link', async () => {
    mockApi({
      '/api/v1/progress': () => jsonResponse(progress),
      '/api/v1/content/sounds': () =>
        jsonResponse([{ id: 'c09', symbol: 'θ', us: 'θ', arpabet: 'TH', group: 'consonant' }]),
    });
    render(<ProgressDashboard />);
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '/θ/' })).toBeInTheDocument());
    expect(screen.getByRole('img', { name: '50% đạt' })).toBeInTheDocument();
    expect(screen.getByText(/Đã phản bác/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem/ })).toHaveAttribute(
      'href',
      expect.stringContaining('run=run-1'),
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: '/θ/' })).toHaveAttribute(
        'href',
        expect.stringContaining('sound=c09'),
      ),
    );
    expect(screen.getByRole('link', { name: /Mở cài đặt/ })).toHaveAttribute('href', '/settings');
    expect(document.querySelectorAll('.stat')).toHaveLength(4);
  });

  it('shows empty states when nothing was recorded', async () => {
    mockApi({
      '/api/v1/progress': () => jsonResponse({ runs: 0, phonemes: [], recent: [] }),
      '/api/v1/content/sounds': () => jsonResponse([]),
    });
    render(<ProgressDashboard />);
    await waitFor(() => expect(screen.getAllByText('Chưa có lần thu nào.')).toHaveLength(2));
  });
});
