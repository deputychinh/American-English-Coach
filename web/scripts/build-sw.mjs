// Finalises the service worker after `next build`: stamps the Next build id as the shell-cache
// version and lists every hashed asset under out/_next/static so the shell is precached whole.
// public/sw.js stays the readable source; out/sw.js is what the API serves.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// `out` for the export the API serves; `out-webapp` for the web app (make build-webapp).
const OUT = join(ROOT, process.env.WEB_OUT_DIR ?? 'out');
const SOURCE = join(ROOT, 'public', 'sw.js');
const TARGET = join(OUT, 'sw.js');
const BUILD_ID = join(ROOT, '.next', 'BUILD_ID');
const STATIC_DIR = join(OUT, '_next', 'static');
const MARKER = /^const BUILD = .*; \/\/ __AEC_BUILD__$/m;
// Source maps, and the copies Turbopack emits of ONNX Runtime's own files and of the worker's
// source: the app loads the runtime from /vendor/onnxruntime and the compiled worker chunk, so
// precaching these would cost every learner 14 MB for nothing.
const SKIPPED = /\.map$|^ort[.-].*\.(wasm|mjs)$|\.ts$/;

const listAssets = async () => {
  const entries = await readdir(STATIC_DIR, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !SKIPPED.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => `/_next/static/${relative(STATIC_DIR, path).split(sep).join('/')}`)
    .sort();
};

const source = await readFile(SOURCE, 'utf8');
if (!MARKER.test(source)) throw new Error('public/sw.js has no `// __AEC_BUILD__` marker line');
const version = (await readFile(BUILD_ID, 'utf8')).trim();
const assets = await listAssets();
const stamped = source.replace(
  MARKER,
  () => `const BUILD = ${JSON.stringify({ version, assets })}; // __AEC_BUILD__`,
);
await writeFile(TARGET, stamped);
process.stdout.write(
  `service worker stamped: build ${version}, ${assets.length} precached assets\n`,
);
