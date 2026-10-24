import type { EngineWorkerRequest, EngineWorkerResponse } from '@/interfaces/engine.interface';
import { base64ToFloat32, float32ToBase64 } from '@/utils/float32-base64.util';

const { store } = vi.hoisted(() => ({
  store: { storedManifest: vi.fn(), downloadModel: vi.fn() },
}));
vi.mock('@/features/engine/services/web-model-store.service', () => ({
  storedManifest: store.storedManifest,
  downloadModel: store.downloadModel,
  manifestUrl: () => 'http://localhost:3000/models/w2v.mm8/manifest.json',
  modelSource: () => ({ cacheName: 'aec-model-w2v.mm8', urls: ['p0'], bytes: 6 }),
}));

const { resetWebEngine, webPhonemeEngine } = await import('./web-engine.service');

const MANIFEST = { name: 'w2v.mm8', bytes: 6, sha256: 'x', parts: [] };

/** Answers like the real worker: load → nothing, run → 2 frames × 3 log-probabilities. */
const fakeWorker = (fail: string | null = null) => {
  const requests: EngineWorkerRequest[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<EngineWorkerResponse>) => void) | null,
    terminate: vi.fn(),
    postMessage: (request: EngineWorkerRequest) => {
      requests.push(request);
      const response: EngineWorkerResponse = {
        id: request.id,
        error: fail,
        milliseconds: 42,
        posteriors:
          request.type === 'run' ? { frames: 2, vocab: 3, data: new Float32Array(6) } : null,
      };
      queueMicrotask(() =>
        worker.onmessage?.({ data: response } as MessageEvent<EngineWorkerResponse>),
      );
    },
  };
  return { worker, requests };
};

describe('web phoneme engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', 'http://localhost:3000/');
  });

  it('reports the stored model and the device memory', async () => {
    resetWebEngine(() => fakeWorker().worker as unknown as Worker);
    store.storedManifest.mockResolvedValue(MANIFEST);
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    expect(await webPhonemeEngine.status({ name: 'w2v.mm8.onnx' })).toEqual({
      downloaded: true,
      bytes: 6,
      loaded: false,
      coreML: false,
      physicalMemory: 4 * 1024 ** 3,
    });
    store.storedManifest.mockResolvedValue(null);
    expect((await webPhonemeEngine.status({ name: 'w2v.mm8.onnx' })).downloaded).toBe(false);
  });

  it('loads the model in the worker on one thread without cross-origin isolation', async () => {
    const fake = fakeWorker();
    resetWebEngine(() => fake.worker as unknown as Worker);
    store.storedManifest.mockResolvedValue(MANIFEST);
    const loaded = await webPhonemeEngine.load({ name: 'w2v.mm8.onnx', coreML: true, threads: 2 });
    expect(loaded).toEqual({ milliseconds: 42, coreML: false });
    expect(fake.requests[0]).toMatchObject({
      type: 'load',
      threads: 1,
      wasmPaths: 'http://localhost:3000/vendor/onnxruntime/',
      source: { cacheName: 'aec-model-w2v.mm8' },
    });
    expect((await webPhonemeEngine.status({ name: 'w2v.mm8.onnx' })).loaded).toBe(true);
  });

  it('asks for the download before loading a model that is not there', async () => {
    resetWebEngine(() => fakeWorker().worker as unknown as Worker);
    store.storedManifest.mockResolvedValue(null);
    await expect(
      webPhonemeEngine.load({ name: 'w2v.mm8.onnx', coreML: false, threads: 2 }),
    ).rejects.toThrow('Cần tải gói chấm điểm trước');
  });

  it('returns posteriors in the native plugin format and times a benchmark', async () => {
    const fake = fakeWorker();
    resetWebEngine(() => fake.worker as unknown as Worker);
    const samples = float32ToBase64(new Float32Array([0, 0.5, -0.5]));
    const out = await webPhonemeEngine.posteriors({ samples });
    expect(out).toMatchObject({ frames: 2, vocab: 3, milliseconds: 42 });
    expect(base64ToFloat32(out.data)).toHaveLength(6);
    expect(fake.requests[0]).toMatchObject({ type: 'run' });

    const timing = await webPhonemeEngine.benchmark({ seconds: 0.01, runs: 2 });
    expect(timing).toEqual({ milliseconds: [42, 42], coreML: false });
  });

  it('passes worker errors on to the caller', async () => {
    resetWebEngine(() => fakeWorker('out of memory').worker as unknown as Worker);
    await expect(
      webPhonemeEngine.posteriors({ samples: float32ToBase64(new Float32Array(1)) }),
    ).rejects.toThrow('out of memory');
  });

  it('forwards download progress to listeners until they are removed', async () => {
    resetWebEngine(() => fakeWorker().worker as unknown as Worker);
    const handler = vi.fn();
    const listener = await webPhonemeEngine.addListener('downloadProgress', handler);
    store.downloadModel.mockImplementation(
      ({ onProgress }: { onProgress: (p: { received: number; expected: number }) => void }) => {
        onProgress({ received: 3, expected: 6 });
        return Promise.resolve(MANIFEST);
      },
    );
    const options = { url: 'u', name: 'n', sha256: 's', headers: {} };
    expect(await webPhonemeEngine.download(options)).toEqual({
      path: 'http://localhost:3000/models/w2v.mm8/manifest.json',
    });
    expect(handler).toHaveBeenCalledWith({ received: 3, expected: 6 });
    await listener.remove();
    await webPhonemeEngine.download(options);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cancels a running download and says it will resume', async () => {
    resetWebEngine(() => fakeWorker().worker as unknown as Worker);
    store.downloadModel.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const running = webPhonemeEngine.download({ url: 'u', name: 'n', sha256: 's', headers: {} });
    await webPhonemeEngine.cancelDownload();
    await expect(running).rejects.toThrow('Đã hủy');
  });

  it('keeps a download failure that is not a cancel', async () => {
    resetWebEngine(() => fakeWorker().worker as unknown as Worker);
    store.downloadModel.mockRejectedValue(new Error('HTTP 503'));
    await expect(
      webPhonemeEngine.download({ url: 'u', name: 'n', sha256: 's', headers: {} }),
    ).rejects.toThrow('HTTP 503');
  });
});
