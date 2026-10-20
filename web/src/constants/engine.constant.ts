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
