/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/wasm';

import type {
  EngineWorkerRequest,
  EngineWorkerResponse,
  WebModelSource,
} from '@/interfaces/engine.interface';
import { logSoftmaxRows, normaliseSamples } from '@/utils/posteriors.util';

/**
 * wav2vec2 on ONNX Runtime Web, off the main thread so the camera and the UI stay smooth.
 * Same steps as the iOS plugin: normalise → logits → log-softmax per 20 ms frame.
 */

let session: ort.InferenceSession | null = null;

/** Parts are copied one by one into a single buffer: peak memory is the model plus one part. */
const readModel = async ({
  cacheName,
  urls,
  bytes,
}: WebModelSource): Promise<Uint8Array<ArrayBuffer>> => {
  const cache = await caches.open(cacheName);
  const model = new Uint8Array(bytes);
  let offset = 0;
  for (const url of urls) {
    const response = await cache.match(url);
    if (!response) throw new Error(`model part missing: ${url}`);
    const part = new Uint8Array(await response.arrayBuffer());
    model.set(part, offset);
    offset += part.byteLength;
  }
  if (offset !== bytes) throw new Error('model size mismatch');
  return model;
};

const load = async (
  source: WebModelSource,
  threads: number,
  wasmPaths: string,
): Promise<EngineWorkerResponse['posteriors']> => {
  if (session) return null;
  ort.env.wasm.wasmPaths = wasmPaths;
  ort.env.wasm.numThreads = threads;
  ort.env.wasm.proxy = false;
  session = await ort.InferenceSession.create(await readModel(source), {
    graphOptimizationLevel: 'all',
    executionProviders: ['wasm'],
  });
  return null;
};

const run = async (samples: Float32Array): Promise<EngineWorkerResponse['posteriors']> => {
  if (!session) throw new Error('model not loaded');
  const input = normaliseSamples(samples);
  const outputs = await session.run({
    input_values: new ort.Tensor('float32', input, [1, input.length]),
  });
  const logits = outputs.logits;
  if (!logits) throw new Error('model returned no logits');
  const [, frames = 0, vocab = 0] = logits.dims;
  const data = new Float32Array(logits.data as Float32Array);
  logSoftmaxRows(data, frames, vocab);
  logits.dispose();
  return { frames, vocab, data };
};

self.onmessage = (event: MessageEvent<EngineWorkerRequest>): void => {
  const request = event.data;
  const started = performance.now();
  const work =
    request.type === 'load'
      ? load(request.source, request.threads, request.wasmPaths)
      : run(request.samples);
  work
    .then((posteriors) => {
      const response: EngineWorkerResponse = {
        id: request.id,
        error: null,
        milliseconds: performance.now() - started,
        posteriors,
      };
      const transfer = posteriors ? [posteriors.data.buffer] : [];
      self.postMessage(response, { transfer });
    })
    .catch((cause: unknown) => {
      const response: EngineWorkerResponse = {
        id: request.id,
        error: cause instanceof Error ? cause.message : String(cause),
        milliseconds: performance.now() - started,
        posteriors: null,
      };
      self.postMessage(response);
    });
};
