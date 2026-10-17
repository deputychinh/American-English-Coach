import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

import { ToastProvider } from '@/components/Toast/Toast';
import { StorageKey } from '@/enums/storage-key.enum';
import { jsonResponse, mockApi } from '@/test-utils/api-mock';

import { ProfilesCard } from './ProfilesCard';

const base = [
  { id: 'default', name: 'Người học', created_at: '2026-10-01T00:00:00Z', runs: 3 },
  { id: 'ab12cd34', name: 'Minh', created_at: '2026-10-10T00:00:00Z', runs: 1 },
];

const nth = <T,>(items: T[], index: number): T => {
  const item = items[index];
  if (item === undefined) throw new Error(`missing item ${index}`);
  return item;
};
const methods = (calls: unknown[][]): string[] => calls.map((call) => (call[0] as Request).method);

const statusText = (): string =>
  document.querySelector('.profiles-card__status')?.textContent ?? '';

const renderCard = (): ReactElement => (
  <ToastProvider>
    <ProfilesCard />
  </ToastProvider>
);

describe('ProfilesCard', () => {
  afterEach(() => localStorage.clear());

  it('lists profiles, marks the active one and switches (dropping the local calibration)', async () => {
    const user = userEvent.setup();
    localStorage.setItem(StorageKey.Calibration, JSON.stringify({ aperture: { min: 0, max: 1 } }));
    mockApi({ '/api/v1/profiles': () => jsonResponse(base) });
    render(renderCard());
    await waitFor(() => expect(screen.getByText('Minh')).toBeInTheDocument());
    expect(screen.getByText('Người học').parentElement).toHaveTextContent('Đang dùng');
    await user.click(screen.getByRole('button', { name: 'Dùng hồ sơ này' }));
    expect(JSON.parse(localStorage.getItem(StorageKey.ProfileId) ?? '""')).toBe('ab12cd34');
    expect(localStorage.getItem(StorageKey.Calibration)).toBeNull();
    expect(statusText()).toBe('Đang dùng hồ sơ Minh.');
    expect(screen.getByText('Minh').parentElement).toHaveTextContent('Đang dùng');
  });

  it('creates a profile and makes it active', async () => {
    const user = userEvent.setup();
    let list = base;
    mockApi({
      '/api/v1/profiles': (_url, init) => {
        if (init?.method === 'POST') {
          const created = {
            id: 'new00001',
            name: 'Lan',
            created_at: '2026-10-17T00:00:00Z',
            runs: 0,
          };
          list = [...list, created];
          return jsonResponse(created, 201);
        }
        return jsonResponse(list);
      },
    });
    render(renderCard());
    await waitFor(() => expect(screen.getByText('Minh')).toBeInTheDocument());
    const create = screen.getByRole('button', { name: 'Tạo hồ sơ' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('Tên hồ sơ mới'), 'Lan');
    await user.click(create);
    await waitFor(() => expect(screen.getByText('Lan')).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(StorageKey.ProfileName) ?? '""')).toBe('Lan');
  });

  it('renames, confirms before deleting and never offers to delete the default profile', async () => {
    const user = userEvent.setup();
    let list = base;
    const fetchMock = mockApi({
      '/api/v1/profiles': () => jsonResponse(list),
      '/api/v1/profiles/ab12cd34': (_url, init) => {
        if (init?.method === 'DELETE') {
          list = list.filter((p) => p.id !== 'ab12cd34');
          return new Response(null, { status: 204 });
        }
        list = list.map((p) => (p.id === 'ab12cd34' ? { ...p, name: 'Minh Anh' } : p));
        return jsonResponse(list[1]);
      },
    });
    render(renderCard());
    await waitFor(() => expect(screen.getByText('Minh')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Xóa' })).toHaveLength(1);
    await user.click(nth(screen.getAllByRole('button', { name: 'Đổi tên' }), 1));
    const field = screen.getByLabelText('Tên hồ sơ');
    await user.clear(field);
    await user.type(field, 'Minh Anh');
    await user.click(screen.getByRole('button', { name: 'Lưu tên' }));
    await waitFor(() => expect(screen.getByText('Minh Anh')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Xóa hồ sơ "Minh Anh"');
    await user.click(screen.getByRole('button', { name: 'Xóa hồ sơ' }));
    await waitFor(() => expect(screen.queryByText('Minh Anh')).not.toBeInTheDocument());
    expect(methods(fetchMock.mock.calls).filter((m) => m === 'DELETE')).toHaveLength(1);
  });

  it('exports a profile as a JSON download and imports a snapshot file', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:aec');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const snapshot = {
      format: 'aec-profile/1',
      exported_at: '2026-10-17T05:00:00Z',
      profile: base[1],
      calibration: null,
      runs: [],
    };
    mockApi({
      '/api/v1/profiles': () => jsonResponse(base),
      '/api/v1/profiles/ab12cd34/export': () => jsonResponse(snapshot),
      '/api/v1/profiles/import': () =>
        jsonResponse(
          { profile: { ...base[1], id: 'imp00001' }, imported_runs: 0, skipped_runs: 0 },
          201,
        ),
    });
    render(renderCard());
    await waitFor(() => expect(screen.getByText('Minh')).toBeInTheDocument());
    await user.click(nth(screen.getAllByRole('button', { name: 'Xuất tệp' }), 1));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(statusText()).toBe('Đã xuất tệp hồ sơ.');

    const file = new File([JSON.stringify(snapshot)], 'aec-minh.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText('Nhập từ tệp'), file);
    await waitFor(() => expect(statusText()).toContain('Đã nhập hồ sơ Minh'));

    const bad = new File(['{"nope":1}'], 'x.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Nhập từ tệp'), bad);
    await waitFor(() => expect(statusText()).toMatch(/không đúng định dạng/));
  });
});
