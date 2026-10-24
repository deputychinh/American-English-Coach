// Finishes the web app export (make build-webapp) for a static host:
//   - splits the phoneme model into parts under out-webapp/models/w2v.mm8/ with a manifest of
//     checksums (static hosts cap files at ~25 MB; parts also let a phone resume a download);
//   - writes `_headers` (Cloudflare Pages / Netlify format): cross-origin isolation so ONNX
//     Runtime can use threads, long caching for hashed files and model parts.
// The model comes from MODEL_PATH, else data/models/onnx, else the public release (checked).
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'out-webapp');
const MODEL_NAME = 'w2v.mm8';
const TARGET = join(OUT, 'models', MODEL_NAME);
const LOCAL_MODEL = join(ROOT, '..', 'data', 'models', 'onnx', `${MODEL_NAME}.onnx`);
const RELEASE_URL = `https://github.com/deputychinh/American-English-Coach/releases/download/model-v1/${MODEL_NAME}.onnx`;
const MODEL_SHA256 = 'abe3279418149e8676f808c45b69b96ed7946a6d0e8900bae90d178d44e43a44';
const PART_BYTES = 24 * 1024 * 1024;

const HEADERS = `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Permissions-Policy: camera=(self), microphone=(self)
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/models/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache
`;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const loadModel = async () => {
  const path = process.env.MODEL_PATH ?? LOCAL_MODEL;
  if (await exists(path)) return readFile(path);
  process.stdout.write(`downloading ${RELEASE_URL}\n`);
  const response = await fetch(RELEASE_URL);
  if (!response.ok) throw new Error(`model download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const model = await loadModel();
const digest = sha256(model);
if (digest !== MODEL_SHA256) throw new Error(`model checksum mismatch: ${digest}`);

await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
const parts = [];
for (let offset = 0; offset < model.length; offset += PART_BYTES) {
  const bytes = model.subarray(offset, offset + PART_BYTES);
  const file = `part-${String(parts.length).padStart(2, '0')}.bin`;
  await writeFile(join(TARGET, file), bytes);
  parts.push({ file, bytes: bytes.length, sha256: sha256(bytes) });
}
const manifest = { name: MODEL_NAME, bytes: model.length, sha256: digest, parts };
await writeFile(join(TARGET, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(OUT, '_headers'), HEADERS);
process.stdout.write(`web app ready in ${OUT}: model in ${parts.length} parts, _headers written\n`);
