import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { resetModelDownload } from '@/features/engine/services/model-download.service';

import { EngineCard } from './EngineCard';

const { engine } = vi.hoisted(() => ({
  engine: {
    status: vi.fn(),
    download: vi.fn(),
    cancelDownload: vi.fn(),
    load: vi.fn(),
    benchmark: vi.fn(),
    addListener: vi.fn(),
  },
}));
vi.mock('@/features/engine/services/engine.service', () => ({
  PhonemeEngine: engine,
  isEngineAvailable: () => true,
}));

const status = (downloaded: boolean) => ({
  downloaded,
  bytes: downloaded ? 356_487_600 : 0,
  loaded: false,
  coreML: false,
  physicalMemory: 6e9,
});

describe('EngineCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetModelDownload();
  });

  it('downloads the scoring pack from the public release with its checksum', async () => {
    engine.status.mockResolvedValue(status(false));
    engine.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    engine.download.mockResolvedValue({ path: '/models/w2v.mm8.onnx' });
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tải ngay' }));
    await waitFor(() =>
      expect(engine.download).toHaveBeenCalledWith({
        url: 'https://github.com/deputychinh/American-English-Coach/releases/download/model-v1/w2v.mm8.onnx',
        name: 'w2v.mm8.onnx',
        sha256: 'abe3279418149e8676f808c45b69b96ed7946a6d0e8900bae90d178d44e43a44',
        headers: {},
      }),
    );
    expect(await screen.findByText('Gói chấm điểm đã sẵn sàng trên máy.')).toBeInTheDocument();
    expect(localStorage.getItem('coach.engineReady')).toBe('true');
  });

  it('offers a retry when the download fails', async () => {
    engine.status.mockResolvedValue(status(false));
    engine.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    engine.download.mockRejectedValue(new Error('downloaded model failed its SHA-256 check'));
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tải ngay' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('SHA-256');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('keeps on-device scoring on by default and times the model for testers', async () => {
    engine.status.mockResolvedValue(status(true));
    engine.load.mockResolvedValue({ milliseconds: 812.4, coreML: true });
    engine.benchmark.mockResolvedValue({ milliseconds: [700, 500, 650, 900, 600], coreML: true });
    render(<EngineCard />);
    const toggle = await screen.findByRole('checkbox', { name: /Dùng chấm trên máy/ });
    expect(toggle).toBeChecked();
    await userEvent.click(screen.getByText('Đo tốc độ (dành cho kiểm thử)'));
    await userEvent.click(screen.getByRole('button', { name: 'Đo tốc độ (Neural Engine)' }));
    expect(engine.load).toHaveBeenCalledWith({ name: 'w2v.mm8.onnx', coreML: true, threads: 2 });
    expect(await screen.findByText('Đã nạp sau 812 ms · Neural Engine')).toBeInTheDocument();
    expect(
      screen.getByText('3 giây âm thanh: trung vị 650 ms, nhanh nhất 500 ms'),
    ).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(localStorage.getItem('coach.onDeviceScoring')).toBe('false');
  });

  it('shows a benchmark failure instead of staying silent', async () => {
    engine.status.mockResolvedValue(status(true));
    engine.load.mockRejectedValue(new Error('out of memory'));
    render(<EngineCard />);
    await userEvent.click(await screen.findByText('Đo tốc độ (dành cho kiểm thử)'));
    await userEvent.click(screen.getByRole('button', { name: 'Đo tốc độ (CPU)' }));
    expect(await screen.findByText('Không thực hiện được: out of memory')).toBeInTheDocument();
  });
});
