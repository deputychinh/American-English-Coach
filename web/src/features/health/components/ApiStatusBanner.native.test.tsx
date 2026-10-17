import { render, screen, waitFor } from '@testing-library/react';

import { ApiStatusBanner } from './ApiStatusBanner';

vi.mock('@/utils/api-base.util', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isNativeShell: () => true,
}));

describe('ApiStatusBanner inside the iOS shell', () => {
  it('points an unreachable scoring server at the address field instead of `make api`', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );
    render(<ApiStatusBanner />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('make api-lan'));
    expect(screen.getByRole('status')).not.toHaveTextContent('chạy `make api`.');
    expect(screen.getByRole('link', { name: 'Mở Cài đặt' })).toHaveAttribute('href', '/settings');
  });
});
