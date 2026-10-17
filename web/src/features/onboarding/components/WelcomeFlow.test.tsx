import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StorageKey } from '@/enums/storage-key.enum';
import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { WelcomeFlow } from './WelcomeFlow';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

describe('WelcomeFlow', () => {
  afterEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it('asks for permissions, creates a profile and marks the device as onboarded', async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce({ getTracks: () => [{ stop }] })
      .mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    mockApi({
      '/api/v1/profiles': () =>
        jsonResponse(
          { id: 'new00001', name: 'Minh', created_at: '2026-10-17T00:00:00Z', runs: 0 },
          201,
        ),
    });
    render(<WelcomeFlow />);
    await user.click(screen.getByRole('button', { name: 'Cho phép micro và camera' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Micro: đã cho phép · Camera: bị từ chối',
      ),
    );
    expect(stop).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.type(screen.getByLabelText('Tên của bạn'), 'Minh');
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ và tiếp tục' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Hiệu chỉnh khẩu hình/ })).toBeInTheDocument(),
    );
    expect(JSON.parse(localStorage.getItem(StorageKey.ProfileName) ?? '""')).toBe('Minh');
    await user.click(screen.getByRole('button', { name: 'Để sau, vào trang chủ' }));
    expect(JSON.parse(localStorage.getItem(StorageKey.Onboarded) ?? 'false')).toBe(true);
    expect(push).toHaveBeenCalledWith('/');
  });

  it('lets the learner skip when the scoring server is unreachable', async () => {
    const user = userEvent.setup();
    mockApi({ '/api/v1/profiles': () => jsonResponse({ detail: 'down', code: 'NOT_READY' }, 503) });
    render(<WelcomeFlow />);
    await user.click(screen.getByRole('button', { name: 'Để sau' }));
    await user.type(screen.getByLabelText('Tên của bạn'), 'Lan');
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ và tiếp tục' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Chưa kết nối được/));
    await user.click(screen.getByRole('button', { name: 'Bỏ qua bước này' }));
    expect(screen.getByRole('heading', { name: /Hiệu chỉnh khẩu hình/ })).toBeInTheDocument();
  });
});
