import { WEB_ENGINE_MAX_THREADS, WEB_ENGINE_WASM_PATH } from '@/constants/engine.constant';
import {
  downloadModel,
  manifestUrl,
  modelSource,
  storedManifest,
} from '@/features/engine/services/web-model-store.service';
import type {
  EngineDownloadProgress,
  EngineWorkerCall,
  EngineWorkerResponse,
  PhonemeEnginePlugin,
} from '@/interfaces/engine.interface';
import { getCopy } from '@/locales';
import { base64ToFloat32, float32ToBase64 } from '@/utils/float32-base64.util';

/**
 * The `PhonemeEngine` plugin for browsers (web app without a scoring server): same calls and
 * shapes as the iOS plugin, run by ONNX Runtime Web in a worker. The voice never leaves the
 * device; only the model is downloaded, once.
 */

type Posteriors = NonNullable<EngineWorkerResponse['posteriors']>;

const SAMPLE_RATE = 16_000;
const GIBIBYTE = 1024 ** 3;

const createDefaultWorker = (): Worker =>
  new Worker(new URL('../workers/phoneme.worker.ts', import.meta.url), { type: 'module' });

let createWorker = createDefaultWorker;
let worker: Worker | null = null;
let nextId = 1;
let isLoaded = false;
let download: AbortController | null = null;
const pending = new Map<number, (response: EngineWorkerResponse) => void>();
const progressListeners = new Set<(progress: EngineDownloadProgress) => void>();

const engineWorker = (): Worker => {
  if (worker) return worker;
  const created = createWorker();
  created.onmessage = (event: MessageEvent<EngineWorkerResponse>) => {
    pending.get(event.data.id)?.(event.data);
    pending.delete(event.data.id);
  };
  worker = created;
  return created;
};

const call = (request: EngineWorkerCall): Promise<EngineWorkerResponse> => {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, (response) => {
      if (response.error === null) resolve(response);
      else reject(new Error(response.error));
    });
    const transfer = request.type === 'run' ? [request.samples.buffer] : [];
    engineWorker().postMessage({ ...request, id }, { transfer });
  });
};

/** Threads only work when the page is cross-origin isolated (the web app's COOP/COEP headers). */
const threadCount = (): number =>
  globalThis.crossOriginIsolated
    ? Math.max(1, Math.min(WEB_ENGINE_MAX_THREADS, navigator.hardwareConcurrency || 1))
    : 1;

const runSamples = async (
  samples: Float32Array,
): Promise<{ milliseconds: number; posteriors: Posteriors }> => {
  const response = await call({ type: 'run', samples });
  if (!response.posteriors) throw new Error(getCopy().engine.webNoOutput);
  return { milliseconds: response.milliseconds, posteriors: response.posteriors };
};

/** A tone with some noise, like the native benchmark: the model's speed does not depend on it. */
const syntheticAudio = (seconds: number): Float32Array =>
  Float32Array.from(
    { length: Math.round(seconds * SAMPLE_RATE) },
    (_, index) => Math.sin(index / 7) * 0.3 + (Math.random() - 0.5) * 0.05,
  );

export const webPhonemeEngine: PhonemeEnginePlugin = {
  status: async () => {
    const manifest = await storedManifest();
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
    return {
      downloaded: manifest !== null,
      bytes: manifest?.bytes ?? 0,
      loaded: isLoaded,
      coreML: false,
      physicalMemory: memory * GIBIBYTE,
    };
  },
  // The browser reads the parted copy next to the app; `url` and `sha256` describe the iOS file.
  download: async () => {
    const controller = new AbortController();
    download = controller;
    try {
      await downloadModel({
        signal: controller.signal,
        onProgress: (progress) => progressListeners.forEach((listener) => listener(progress)),
      });
      return { path: manifestUrl() };
    } catch (cause) {
      if (controller.signal.aborted) throw new Error(getCopy().engine.webCancelled, { cause });
      throw cause;
    } finally {
      download = null;
    }
  },
  cancelDownload: () => {
    download?.abort();
    return Promise.resolve();
  },
  load: async () => {
    const manifest = await storedManifest();
    if (!manifest) throw new Error(getCopy().engine.needModel);
    const response = await call({
      type: 'load',
      source: modelSource(manifest),
      threads: threadCount(),
      wasmPaths: new URL(WEB_ENGINE_WASM_PATH, window.location.href).href,
    });
    isLoaded = true;
    return { milliseconds: response.milliseconds, coreML: false };
  },
  posteriors: async ({ samples }) => {
    const { milliseconds, posteriors } = await runSamples(base64ToFloat32(samples));
    return {
      frames: posteriors.frames,
      vocab: posteriors.vocab,
      data: float32ToBase64(posteriors.data),
      milliseconds,
    };
  },
  benchmark: async ({ seconds, runs }) => {
    const milliseconds: number[] = [];
    for (let run = 0; run < runs; run += 1) {
      milliseconds.push((await runSamples(syntheticAudio(seconds))).milliseconds);
    }
    return { milliseconds, coreML: false };
  },
  addListener: (_event, handler) => {
    progressListeners.add(handler);
    return Promise.resolve({
      remove: () => {
        progressListeners.delete(handler);
        return Promise.resolve();
      },
    });
  },
};

/** Tests only: a fake worker instead of ONNX Runtime, and a fresh engine. */
export const resetWebEngine = (factory: () => Worker = createDefaultWorker): void => {
  worker?.terminate();
  worker = null;
  createWorker = factory;
  isLoaded = false;
  pending.clear();
  progressListeners.clear();
};
