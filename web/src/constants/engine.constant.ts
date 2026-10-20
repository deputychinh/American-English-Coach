/** Quantized model file (per-channel int8 MatMul; see backend/scripts/export_onnx.py). */
export const ENGINE_MODEL_NAME = 'w2v.mm8.onnx';

/** Shown before the download (App Store 4.2.3(ii)); the manifest has the exact byte count. */
export const ENGINE_MODEL_MEGABYTES = 357;

/** Benchmark: seconds of synthetic audio per run and number of timed runs. */
export const ENGINE_BENCH_SECONDS = 3;
export const ENGINE_BENCH_RUNS = 5;

/** Intra-op threads for the CPU run: two keeps the UI thread and the camera responsive. */
export const ENGINE_THREADS = 2;
