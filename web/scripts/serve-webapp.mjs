// Serves web/out-webapp the way a static host would (make serve-webapp, web app e2e): the
// `_headers` rules apply, folders answer with their index.html, unknown paths get 404.html.
// For previews and tests only; production uses a real static host.
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'out-webapp');
const PORT = Number(process.argv[2] ?? 3300);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.task': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};

/** `_headers` → [[pattern, {name: value}]]; `/*` matches everything, `/a/*` a prefix. */
const parseHeaders = (text) => {
  const rules = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('/')) rules.push([line.trim(), {}]);
    else if (line.trim() && rules.length > 0) {
      const [name, ...value] = line.trim().split(':');
      rules.at(-1)[1][name] = value.join(':').trim();
    }
  }
  return rules;
};

const rules = parseHeaders(await readFile(join(ROOT, '_headers'), 'utf8'));

const headersFor = (pathname) => {
  const out = {};
  for (const [pattern, headers] of rules) {
    const isMatch = pattern.endsWith('*')
      ? pathname.startsWith(pattern.slice(0, -1))
      : pathname === pattern;
    if (isMatch) Object.assign(out, headers);
  }
  return out;
};

const resolveFile = async (pathname) => {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [join(ROOT, safe), join(ROOT, safe, 'index.html')]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const file = await resolveFile(pathname);
  const path = file ?? join(ROOT, '404.html');
  response.writeHead(file ? 200 : 404, {
    ...headersFor(pathname),
    'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(response);
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`web app on http://127.0.0.1:${PORT}\n`);
});
