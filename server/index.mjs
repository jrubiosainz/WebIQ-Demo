// Servidor local de la demo: sirve dist/ y hace de proxy hacia la API de Web IQ.
// La clave (WEBIQ_API_KEY) se lee de .env y nunca llega al navegador. Sin dependencias.
import { readFileSync, realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_BASE_URL = 'https://api.microsoft.ai/v3';

export const ENDPOINT_PATHS = {
  web: '/search/web',
  news: '/search/news',
  images: '/search/images',
  videos: '/search/videos',
  browse: '/browse',
  auto: '/auto',
};

/** Requisitos de uso y visualización de Web IQ (Exhibit A): máx. 200 caracteres de Grounding Content por fuente. */
export const CHAR_LIMIT = 200;
const TEXT_KEYS = new Set(['content', 'description', 'summary', 'caption', 'snippet']);
const RESULT_KEYS = new Set(['webResults', 'newsResults', 'videoResults', 'imageResults', 'playlists', 'results']);

const MAX_BODY = 64 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** Carga .env sin pisar variables que ya existan en el entorno. */
export function loadEnvFile(file, env = process.env) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return false;
  }
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (env[m[1]] === undefined) env[m[1]] = v;
  }
  return true;
}

/**
 * Recorta el texto de cada fuente a CHAR_LIMIT caracteres en total (presupuesto compartido
 * por content/description/summary/caption de un mismo resultado) y anota la longitud original.
 */
export function trimContent(node, budget = { left: CHAR_LIMIT }) {
  if (Array.isArray(node)) return node.map((x) => trimContent(x, budget));
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (RESULT_KEYS.has(k) && Array.isArray(v)) {
      out[k] = v.map((x) => trimContent(x, { left: CHAR_LIMIT }));
    } else if (TEXT_KEYS.has(k) && typeof v === 'string') {
      const keep = Math.max(0, budget.left);
      if (v.length <= keep) {
        out[k] = v;
        budget.left -= v.length;
      } else {
        out[k] = `${v.slice(0, keep).trimEnd()}…`;
        out[`${k}Length`] = v.length;
        budget.left = 0;
      }
    } else {
      out[k] = trimContent(v, budget);
    }
  }
  return out;
}

/** Nombres de host aceptados: localhost, IP literales (no sirven para DNS rebinding) y los configurados. */
function hostAllowed(value, extra) {
  if (!value) return false;
  let host = value.trim().toLowerCase();
  if (host.startsWith('[')) host = host.slice(1, host.indexOf(']'));
  else if (host.split(':').length === 2) host = host.split(':')[0];
  return host === 'localhost' || host.endsWith('.localhost') || isIP(host) !== 0 || extra.includes(host);
}

function originAllowed(origin, extra) {
  if (!origin) return true;
  try {
    return hostAllowed(new URL(origin).host, extra);
  } catch {
    return false;
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(text),
    ...extraHeaders,
  });
  res.end(text);
}

const fail = (res, status, errorCode, userMessage, headers) => sendJson(res, status, { errorCode, userMessage }, headers);

/** null si el cuerpo supera el límite; el resto se descarta sin guardarlo para poder responder 413. */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const onData = (chunk) => {
      size += chunk.length;
      if (size <= limit) return void chunks.push(chunk);
      req.off('data', onData);
      req.resume();
      resolve(null);
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validate(endpoint, body) {
  if (endpoint === 'browse') {
    return typeof body.url === 'string' && /^https?:\/\/\S+$/i.test(body.url) ? null : '"url" must be an http(s) URL.';
  }
  return typeof body.query === 'string' && body.query.trim() ? null : '"query" must be a non-empty string.';
}

async function proxy(req, res, endpoint, opts) {
  if (req.method !== 'POST') return fail(res, 405, 'MethodNotAllowed', 'Use POST.', { allow: 'POST' });
  if (!opts.apiKey) {
    return fail(res, 503, 'MissingApiKey', 'WEBIQ_API_KEY is not set on the demo server. Copy .env.example to .env and restart it.');
  }
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
    return fail(res, 415, 'UnsupportedMediaType', 'Send the body as application/json.');
  }
  const raw = await readBody(req, MAX_BODY);
  if (raw === null) return fail(res, 413, 'PayloadTooLarge', `The body exceeds ${MAX_BODY / 1024} KB.`, { connection: 'close' });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(res, 400, 'InvalidJson', 'The body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 400, 'InvalidJson', 'The body must be a JSON object.');
  const invalid = validate(endpoint, body);
  if (invalid) return fail(res, 400, 'InvalidRequest', invalid);

  const started = performance.now();
  let upstream;
  try {
    upstream = await opts.fetch(`${opts.baseUrl}${ENDPOINT_PATHS[endpoint]}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-apikey': opts.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      return fail(res, 504, 'UpstreamTimeout', `Web IQ did not answer within ${Math.round(opts.timeoutMs / 1000)} s.`);
    }
    return fail(res, 502, 'UpstreamUnreachable', `Could not reach Web IQ (${e?.cause?.code ?? e?.message ?? 'network error'}).`);
  }
  const text = await upstream.text();
  const latencyMs = Math.round(performance.now() - started);
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawContent: text.slice(0, 500) };
    }
  }
  // Sin caché ni almacenamiento: la respuesta solo vive mientras dura la petición.
  return sendJson(res, 200, { status: upstream.status, latencyMs, data: trimContent(data) });
}

async function serveStatic(req, res, distDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'MethodNotAllowed', 'Use GET.', { allow: 'GET, HEAD' });
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return fail(res, 400, 'BadPath', 'Malformed path.');
  }
  const root = resolve(distDir);
  let file = resolve(join(root, pathname));
  if (file !== root && !file.startsWith(root + sep)) return fail(res, 403, 'Forbidden', 'Path outside dist/.');
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) {
    // Fallback de SPA: cualquier ruta sin extensión carga la app.
    if (extname(pathname)) return fail(res, 404, 'NotFound', 'File not found.');
    file = join(root, 'index.html');
    info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('dist/ no existe: ejecuta «npm run build» (o usa «npm run dev» con este servidor en marcha).\n');
    }
  }
  const data = await readFile(file);
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': data.length,
    'cache-control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  res.end(req.method === 'HEAD' ? undefined : data);
}

/**
 * Crea el servidor (sin escuchar). Opciones: apiKey, baseUrl, distDir, timeoutMs,
 * allowedHosts (nombres extra además de localhost e IP) y fetch (para tests).
 */
export function createApp(options = {}) {
  const opts = {
    apiKey: (options.apiKey ?? '').trim(),
    baseUrl: (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    distDir: options.distDir ?? join(ROOT, 'dist'),
    timeoutMs: options.timeoutMs ?? 30_000,
    allowedHosts: (options.allowedHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean),
    fetch: options.fetch ?? globalThis.fetch,
  };
  return createServer(async (req, res) => {
    try {
      if (!hostAllowed(req.headers.host, opts.allowedHosts)) return fail(res, 403, 'ForbiddenHost', 'Unexpected Host header.');
      const { pathname } = new URL(req.url ?? '/', 'http://x');
      if (pathname === '/api/status') {
        if (req.method !== 'GET') return fail(res, 405, 'MethodNotAllowed', 'Use GET.', { allow: 'GET' });
        return sendJson(res, 200, { ok: true, hasKey: !!opts.apiKey, endpoints: Object.keys(ENDPOINT_PATHS) });
      }
      const m = pathname.match(/^\/api\/webiq\/([a-z]+)\/?$/);
      if (m) {
        if (!originAllowed(req.headers.origin, opts.allowedHosts)) return fail(res, 403, 'ForbiddenOrigin', 'Cross-origin requests are not allowed.');
        if (!Object.hasOwn(ENDPOINT_PATHS, m[1])) return fail(res, 404, 'UnknownEndpoint', `Unknown endpoint "${m[1]}".`);
        return await proxy(req, res, m[1], opts);
      }
      if (pathname.startsWith('/api/')) return fail(res, 404, 'NotFound', 'Unknown API route.');
      return await serveStatic(req, res, opts.distDir);
    } catch (e) {
      if (!res.headersSent) fail(res, 500, 'InternalError', e instanceof Error ? e.message : 'Unexpected error.');
      else res.destroy();
    }
  });
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  loadEnvFile(join(ROOT, '.env'));
  const port = Number(process.env.PORT) || 8787;
  const host = process.env.HOST || '127.0.0.1';
  const apiKey = process.env.WEBIQ_API_KEY ?? '';
  const app = createApp({
    apiKey,
    baseUrl: process.env.WEBIQ_BASE_URL,
    allowedHosts: (process.env.WEBIQ_ALLOWED_HOSTS ?? '').split(','),
  });
  app.on('error', (e) => {
    console.error(`No se pudo arrancar en ${host}:${port}: ${e.message}`);
    process.exit(1);
  });
  app.listen(port, host, () => {
    console.log(`Microsoft Web IQ · demo en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(apiKey.trim() ? '  WEBIQ_API_KEY configurada: pestaña «En vivo» activa.' : '  Falta WEBIQ_API_KEY: copia .env.example a .env para la pestaña «En vivo».');
    console.log('  Desarrollo: deja este servidor en marcha y usa «npm run dev» (proxy /api).');
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      app.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000).unref();
    });
  }
}
