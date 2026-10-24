// Copies the ONNX Runtime Web WASM runtime (the phoneme model's engine in the web app) from
// node_modules into public/vendor/onnxruntime. Like MediaPipe, these 11 MB are not committed.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const TARGET = join(ROOT, 'public', 'vendor', 'onnxruntime');
// What `onnxruntime-web/wasm` loads at runtime (CPU, SIMD, threads when cross-origin isolated).
const FILES = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];

await mkdir(TARGET, { recursive: true });
for (const name of FILES) await copyFile(join(SOURCE, name), join(TARGET, name));
process.stdout.write(`onnxruntime-web runtime copied to ${TARGET}\n`);
