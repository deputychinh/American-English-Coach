import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

import { ToastProvider } from '@/components/Toast/Toast';
import { Language } from '@/enums/language.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import type { StoredRun } from '@/interfaces/local-store.interface';
import { setLanguage } from '@/locales';
import { jsonResponse, mockApi } from '@/test-utils/api-mock';
import { runsStore } from '@/utils/local-store.util';

import { SettingsScreen } from './SettingsScreen';

const health = {
  status: 'ok',
  version: '1.0.0',
  realtime_enabled: true,
  model_ready: true,
  tts_available: true,
  tutor_available: true,
  tutor_model: 'gpt-6-luna',
};

const profiles = [
  { id: 'default', name: 'Người học', created_at: '2026-10-01T00:00:00Z', runs: 3 },
];

const renderScreen = (): ReactElement => (
  <ToastProvider>
    <SettingsScreen />
  </ToastProvider>
);

describe('SettingsScreen', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = 'light';
    setLanguage(Language.Vi);
  });

  it('switches the interface language and remembers it', async () => {
    const user = userEvent.setup();
    mockApi({ '/api/v1/profiles': () => jsonResponse(profiles) });
    render(renderScreen());
    await user.click(screen.getByRole('tab', { name: 'English' }));
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(JSON.parse(localStorage.getItem(StorageKey.Language) ?? '""')).toBe('en');
    await user.click(screen.getByRole('tab', { name: 'Tiếng Việt' }));
    expect(screen.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeInTheDocument();
  });

  it('switches the theme, saves the server address and reports the check', async () => {
    const user = userEvent.setup();
    mockApi({
      '/api/v1/health': () => jsonResponse(health),
      '/api/v1/profiles': () => jsonResponse(profiles),
    });
    render(renderScreen());
    await user.click(screen.getByRole('tab', { name: 'Tối' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: /^Địa chỉ máy chấm/ }));
    await user.type(screen.getByRole('textbox', { name: 'Địa chỉ máy chấm' }), '192.168.1.9:8765');
    await user.click(screen.getByRole('button', { name: 'Lưu và kiểm tra' }));
    await waitFor(() => expect(screen.getAllByRole('status')[0]).toHaveTextContent(/gpt-6-luna/));
    expect(JSON.parse(localStorage.getItem(StorageKey.ApiBaseUrl) ?? '""')).toBe(
      'http://192.168.1.9:8765',
    );
  });

  it('pairs the device with a 6-digit code and can unpair', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      '/api/v1/pair': () => jsonResponse({ token: 'tok-abc', device_name: 'iPhone' }),
      '/api/v1/profiles': () => jsonResponse(profiles),
    });
    render(renderScreen());
    await user.click(screen.getByRole('button', { name: /^Ghép nối điện thoại/ }));
    const pair = screen.getByRole('button', { name: 'Ghép nối' });
    expect(pair).toBeDisabled();
    await user.type(screen.getByLabelText('Mã ghép nối (6 số)'), '12ab3456');
    expect(pair).toBeEnabled();
    await user.click(pair);
    await waitFor(() => expect(screen.getByText(/Đã ghép nối: iPhone/)).toBeInTheDocument());
    const pairCalls = fetchMock.mock.calls.filter((call: unknown[]) =>
      new URL((call[0] as Request).url).pathname.endsWith('/pair'),
    );
    expect(pairCalls).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(StorageKey.DeviceToken) ?? '""')).toBe('tok-abc');
    await user.click(screen.getByRole('button', { name: 'Hủy ghép nối' }));
    expect(localStorage.getItem(StorageKey.DeviceToken)).toBeNull();
    expect(screen.getByRole('button', { name: 'Ghép nối' })).toBeInTheDocument();
  });

  it('shows the failure message when the code is rejected', async () => {
    const user = userEvent.setup();
    mockApi({
      '/api/v1/pair': () => jsonResponse({ detail: 'bad', code: 'UNAUTHORIZED' }, 401),
      '/api/v1/profiles': () => jsonResponse(profiles),
    });
    render(renderScreen());
    await user.click(screen.getByRole('button', { name: /^Ghép nối điện thoại/ }));
    await user.type(screen.getByLabelText('Mã ghép nối (6 số)'), '000000');
    await user.click(screen.getByRole('button', { name: 'Ghép nối' }));
    await waitFor(() => expect(screen.getByText(/Mã không đúng/)).toBeInTheDocument());
  });

  it('clears every learner record on the device after a confirm, keeping theme and language', async () => {
    const user = userEvent.setup();
    mockApi({ '/api/v1/profiles': () => jsonResponse(profiles) });
    localStorage.setItem(StorageKey.Calibration, JSON.stringify({ aperture: { min: 0, max: 1 } }));
    localStorage.setItem(StorageKey.Lesson, JSON.stringify({ u01: { step: 2 } }));
    localStorage.setItem(StorageKey.Theme, JSON.stringify('dark'));
    await runsStore().put({ id: 'r1', profileId: 'default' } as StoredRun);
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(renderScreen());
    await user.click(screen.getByRole('button', { name: /^Dữ liệu trên thiết bị/ }));
    const clear = screen.getByRole('button', { name: 'Xóa dữ liệu trên thiết bị này' });
    await user.click(clear);
    expect(localStorage.getItem(StorageKey.Lesson)).not.toBeNull();
    await user.click(clear);
    expect(await screen.findByText('Đã xóa dữ liệu trên thiết bị.')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(StorageKey.Calibration)).toBeNull();
    expect(localStorage.getItem(StorageKey.Lesson)).toBeNull();
    expect(localStorage.getItem(StorageKey.Theme)).not.toBeNull();
    expect(await runsStore().get('r1')).toBeNull();
  });
});
