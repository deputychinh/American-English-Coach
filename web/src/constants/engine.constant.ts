/** Quantized model file (per-channel int8 MatMul; see backend/scripts/export_onnx.py). */
export const ENGINE_MODEL_NAME = 'w2v.mm8.onnx';

/** Stored with each on-device result so scores from different models are never mixed. */
export const ENGINE_MODEL_VERSION = 'w2v.mm8@ios';

/** Shown before the download (App Store 4.2.3(ii)). */
export const ENGINE_MODEL_MEGABYTES = 357;

/** Public release asset (GitHub release `model-v1`, Apache-2.0 attribution in its NOTICE.txt). */
export const ENGINE_MODEL_URL =
  'https://github.com/deputychinh/American-English-Coach/releases/download/model-v1/w2v.mm8.onnx';
export const ENGINE_MODEL_SHA256 =
  'abe3279418149e8676f808c45b69b96ed7946a6d0e8900bae90d178d44e43a44';
export const ENGINE_MODEL_BYTES = 356_487_600;

/** Benchmark: seconds of synthetic audio per run and number of timed runs. */
export const ENGINE_BENCH_SECONDS = 3;
export const ENGINE_BENCH_RUNS = 5;

/** Intra-op threads for the CPU run: two keeps the UI thread and the camera responsive. */
export const ENGINE_THREADS = 2;

/** Same weights run by ONNX Runtime Web in the browser (web app without a scoring server). */
export const WEB_ENGINE_MODEL_VERSION = 'w2v.mm8@web';

/**
 * Cache Storage bucket for the model parts. Not `coach-…`: the service worker drops every
 * `coach-` cache of an older build, and a 357 MB download must survive deploys.
 */
export const WEB_ENGINE_CACHE = 'aec-model-w2v.mm8';

/** ONNX Runtime Web's WASM files, copied from node_modules by scripts/vendor-onnxruntime.mjs. */
export const WEB_ENGINE_WASM_PATH = '/vendor/onnxruntime/';

/** Browser threads need cross-origin isolation (COOP/COEP); four is where wav2vec2 stops scaling. */
export const WEB_ENGINE_MAX_THREADS = 4;
