import { render, screen, waitFor } from '@testing-library/react';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { ApiStatusBanner } from './ApiStatusBanner';

const health = (overrides: object): object => ({
  status: 'ok',
  version: '1.0.0',
  realtime_enabled: true,
  model_ready: true,
  tts_available: true,
  ...overrides,
});

describe('ApiStatusBanner', () => {
  it('reports ready, missing model, disabled and offline', async () => {
    mockApi({ '/api/v1/health': () => jsonResponse(health({})) });
    const { unmount } = render(<ApiStatusBanner />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Máy chấm sẵn sàng'));
    unmount();

    mockApi({ '/api/v1/health': () => jsonResponse(health({ model_ready: false })) });
    const second = render(<ApiStatusBanner />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('make models'));
    second.unmount();

    mockApi({ '/api/v1/health': () => jsonResponse(health({ realtime_enabled: false })) });
    const third = render(<ApiStatusBanner />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('đang tắt'));
    third.unmount();

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );
    render(<ApiStatusBanner />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('make api'));
  });
});
