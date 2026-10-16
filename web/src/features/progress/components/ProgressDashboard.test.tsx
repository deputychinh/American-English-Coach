import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  it('renders the per-sound table, the recent runs and the settings', async () => {
    mockApi({ '/api/v1/progress': () => jsonResponse(progress) });
    render(<ProgressDashboard />);
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '/θ/' })).toBeInTheDocument());
    expect(screen.getByRole('img', { name: '50% đạt' })).toBeInTheDocument();
    expect(screen.getByText(/Đã phản bác/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem' })).toHaveAttribute(
      'href',
      expect.stringContaining('run=run-1'),
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /Mặc định bật camera/ }));
    expect(localStorage.getItem('coach.camera')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Xóa hiệu chỉnh khẩu hình' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã xóa');
  });

  it('shows empty states when nothing was recorded', async () => {
    mockApi({ '/api/v1/progress': () => jsonResponse({ runs: 0, phonemes: [], recent: [] }) });
    render(<ProgressDashboard />);
    await waitFor(() => expect(screen.getAllByText('Chưa có lần thu nào.')).toHaveLength(2));
  });
});
