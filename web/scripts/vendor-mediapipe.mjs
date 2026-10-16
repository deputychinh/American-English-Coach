// Copies the MediaPipe vision WASM runtime from node_modules and downloads the Face Landmarker
// model into public/vendor/mediapipe. These 43 MB of binaries are not committed; the checksum of
// the model is pinned here and recorded in docs/DATA-MANIFEST.json.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TARGET = join(ROOT, 'public', 'vendor', 'mediapipe');
const WASM_SOURCE = join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MODEL_SHA256 =
  process.env.MEDIAPIPE_MODEL_SHA256 ??
  '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const copyWasm = async () => {
  await mkdir(TARGET, { recursive: true });
  for (const name of await readdir(WASM_SOURCE)) {
    await copyFile(join(WASM_SOURCE, name), join(TARGET, name));
  }
};

const fetchModel = async () => {
  const path = join(TARGET, 'face_landmarker.task');
  if (await exists(path)) {
    const digest = sha256(await readFile(path));
    if (!MODEL_SHA256 || digest === MODEL_SHA256) return digest;
  }
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`model download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = sha256(buffer);
  if (MODEL_SHA256 && digest !== MODEL_SHA256) {
    throw new Error(`model checksum mismatch: ${digest}`);
  }
  await writeFile(path, buffer);
  return digest;
};

await copyWasm();
const digest = await fetchModel();
process.stdout.write(`mediapipe vendored into public/vendor/mediapipe (model sha256 ${digest})\n`);
