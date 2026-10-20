import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EngineCard } from './EngineCard';

const { engine, modelSource } = vi.hoisted(() => ({
  engine: {
    status: vi.fn(),
    download: vi.fn(),
    cancelDownload: vi.fn(),
    load: vi.fn(),
    benchmark: vi.fn(),
    addListener: vi.fn(),
  },
  modelSource: vi.fn(),
}));
vi.mock('@/features/engine/services/engine.service', () => ({
  PhonemeEngine: engine,
  modelSource: () => modelSource() as unknown,
}));

const status = (downloaded: boolean) => ({
  downloaded,
  bytes: downloaded ? 356_000_000 : 0,
  loaded: false,
  coreML: false,
  physicalMemory: 6e9,
});

describe('EngineCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('downloads the model from the paired server with its checksum and token', async () => {
    engine.status.mockResolvedValueOnce(status(false)).mockResolvedValue(status(true));
    modelSource.mockResolvedValue({
      url: 'http://mac.local:8765/api/v1/models/w2v.mm8.onnx',
      file: { bytes: 356_000_000, sha256: 'abc' },
      headers: { 'X-Coach-Token': 'tok' },
    });
    engine.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    engine.download.mockResolvedValue({ path: '/models/w2v.mm8.onnx' });
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: /Tải mô hình \(357 MB\)/ }));
    await waitFor(() =>
      expect(engine.download).toHaveBeenCalledWith({
        url: 'http://mac.local:8765/api/v1/models/w2v.mm8.onnx',
        name: 'w2v.mm8.onnx',
        sha256: 'abc',
        headers: { 'X-Coach-Token': 'tok' },
      }),
    );
    expect(await screen.findByRole('button', { name: 'Đo tốc độ (CPU)' })).toBeInTheDocument();
  });

  it('says when there is no server to download from', async () => {
    engine.status.mockResolvedValue(status(false));
    modelSource.mockResolvedValue(null);
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: /Tải mô hình/ }));
    expect(await screen.findByText(/Cần ghép nối với máy chấm/)).toBeInTheDocument();
  });

  it('loads the model and reports the median and best timing', async () => {
    engine.status.mockResolvedValue(status(true));
    engine.load.mockResolvedValue({ milliseconds: 812.4, coreML: true });
    engine.benchmark.mockResolvedValue({ milliseconds: [700, 500, 650, 900, 600], coreML: true });
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Đo tốc độ (Neural Engine)' }));
    expect(engine.load).toHaveBeenCalledWith({ name: 'w2v.mm8.onnx', coreML: true, threads: 2 });
    expect(await screen.findByText('Đã nạp sau 812 ms · Neural Engine')).toBeInTheDocument();
    expect(
      screen.getByText('3 giây âm thanh: trung vị 650 ms, nhanh nhất 500 ms'),
    ).toBeInTheDocument();
  });

  it('shows a failure instead of staying silent', async () => {
    engine.status.mockResolvedValue(status(true));
    engine.load.mockRejectedValue(new Error('out of memory'));
    render(<EngineCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Đo tốc độ (CPU)' }));
    expect(await screen.findByText('Không thực hiện được: out of memory')).toBeInTheDocument();
  });
});

describe('EngineCard preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('turns on-device scoring on by default and marks the downloaded model ready', async () => {
    engine.status.mockResolvedValue(status(true));
    render(<EngineCard />);
    const toggle = await screen.findByRole('checkbox', { name: /Dùng chấm trên máy/ });
    expect(toggle).toBeChecked();
    expect(localStorage.getItem('coach.engineReady')).toBe('true');
    await userEvent.click(toggle);
    expect(localStorage.getItem('coach.onDeviceScoring')).toBe('false');
  });
});
