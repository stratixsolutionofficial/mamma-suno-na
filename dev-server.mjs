// Local dev server — LOCAL TESTING ONLY, never deployed.
//
// It serves the static site AND fakes the three serverless routes
// (api/upload, api/gallery, api/answers) by storing blobs on disk under
// ./.localblob instead of Vercel Blob. The JSON shapes, the path rules, and
// the ADMIN_SECRET gate match the real api/*.js, so if the flow works here it
// works on Vercel.
//
// Run:   ADMIN_SECRET=test123 node dev-server.mjs
// Open:  http://localhost:3000            (app, PIN 231070)
//        http://localhost:3000/admin.html (Album upload; admin key = test123)
//
// Uploaded files live in ./.localblob and are served at /_localblob/<path>.
// Delete that folder to reset. It is gitignored.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BLOB_DIR = path.join(ROOT, '.localblob');
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test123';
const ORIGIN = () => `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.aac': 'audio/aac'
};

// Same path rules as api/upload.js
const SAFE_APP = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(answers\/[A-Za-z0-9._-]+\.json|audio\/[A-Za-z0-9._-]+\.(webm|m4a))$/;
const SAFE_MEDIA = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(media\/(photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|json)|videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|m4a|mp3|ogg|wav|aac|json))|config\/(questions\.json|greeting-video\.(mp4|webm|mov|m4v|json)))$/i;
const SAFE_SPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function adminOk(given) {
  if (!ADMIN_SECRET || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(ADMIN_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0; const MAX = 200 * 1024 * 1024;
    req.on('data', (c) => { n += c.length; if (n > MAX) reject(new Error('too large')); else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const blobUrl = (p) => `${ORIGIN()}/_localblob/${p}`;

// ---- api/upload (POST/DELETE) ----
async function apiUpload(req, res, url) {
  const p = url.searchParams.get('path') || '';
  const isApp = SAFE_APP.test(p), isMedia = SAFE_MEDIA.test(p);
  if (!isApp && !isMedia) return json(res, 400, { error: 'bad path' });
  if (isMedia && !adminOk(req.headers['x-admin-key'])) return json(res, 401, { error: 'unauthorized' });

  const abs = path.join(BLOB_DIR, p);
  if (!abs.startsWith(BLOB_DIR)) return json(res, 400, { error: 'bad path' }); // defense in depth

  if (req.method === 'DELETE') {
    await fs.rm(abs, { force: true }).catch(() => {});
    return json(res, 200, { ok: true });
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
    return json(res, 200, { url: blobUrl(p), pathname: p });
  }
  res.writeHead(405); res.end();
}

// ---- api/gallery (GET, public) ----
async function listPrefix(prefix) {
  const dir = path.join(BLOB_DIR, prefix);
  let names = [];
  try { names = await fs.readdir(dir); } catch { return []; }
  const media = new Map(); const sidecars = [];
  for (const name of names) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const id = name.replace(/\.[^.]+$/, '');
    if (ext === 'json') { sidecars.push({ id, file: path.join(dir, name) }); continue; }
    media.set(id, { id, url: blobUrl(prefix + name), ext });
  }
  for (const s of sidecars) {
    const it = media.get(s.id); if (!it) continue;
    try { it.meta = JSON.parse(await fs.readFile(s.file, 'utf8')); } catch {}
  }
  const items = [...media.values()];
  items.sort((a, b) => ((a.meta?.order ?? 1e9) - (b.meta?.order ?? 1e9)));
  return items.map((it) => ({ id: it.id, url: it.url, ext: it.ext, caption: it.meta?.caption || '', by: it.meta?.by || '', order: it.meta?.order ?? null }));
}
async function readConfig(space) {
  const out = { questions: null, greetingVideo: null };
  const dir = path.join(BLOB_DIR, space, 'config');
  let names = []; try { names = await fs.readdir(dir); } catch { return out; }
  let greetMeta = null, greetFile = null;
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower === 'questions.json') { try { out.questions = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8')); } catch {} }
    else if (lower === 'greeting-video.json') { try { greetMeta = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8')); } catch {} }
    else if (/^greeting-video\.(mp4|webm|mov|m4v)$/i.test(lower)) { greetFile = { url: blobUrl(`${space}/config/${name}`), ext: lower.split('.').pop() }; }
  }
  if (greetFile) out.greetingVideo = { url: greetFile.url, ext: greetFile.ext, caption: (greetMeta && greetMeta.caption) || '' };
  return out;
}
async function apiGallery(req, res, url) {
  const space = url.searchParams.get('space') || '';
  if (!SAFE_SPACE.test(space)) return json(res, 400, { error: 'bad space' });
  const [photos, videos, config] = await Promise.all([listPrefix(`${space}/media/photos/`), listPrefix(`${space}/media/videos/`), readConfig(space)]);
  return json(res, 200, { space, photos, videos, config });
}

// ---- api/admin-check (POST, admin) ----
async function apiAdminCheck(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
  if (!adminOk(req.headers['x-admin-key'])) return json(res, 401, { ok: false });
  return json(res, 200, { ok: true });
}

// ---- api/answers (GET, admin) ----
async function apiAnswers(req, res, url) {
  if (!adminOk(url.searchParams.get('key'))) return json(res, 401, { error: 'unauthorized' });
  const space = url.searchParams.get('space') || '';
  if (!SAFE_SPACE.test(space)) return json(res, 400, { error: 'bad space' });
  const dir = path.join(BLOB_DIR, space, 'answers');
  let names = []; try { names = await fs.readdir(dir); } catch {}
  const answers = [];
  for (const n of names.filter((x) => x.endsWith('.json'))) {
    try { answers.push(JSON.parse(await fs.readFile(path.join(dir, n), 'utf8'))); } catch {}
  }
  answers.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return json(res, 200, { space, count: answers.length, answers });
}

// ---- static + localblob serving ----
// Supports HTTP Range requests (206), like Vercel does. Without this the
// browser can't seek in audio/video, so e.g. the birthday song's startAt
// offset silently snaps back to 0.
async function serveFile(res, abs, download, req) {
  try {
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) return false;
    const type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
    const size = stat.size;
    const base = { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
    const range = req && req.headers.range;
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] || m[2])) {
      let start, end;
      if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
      else { start = Math.max(0, size - Number(m[2])); end = size - 1; } // suffix range: last N bytes
      if (start >= size || start > end) {
        res.writeHead(416, { ...base, 'content-range': `bytes */${size}` });
        res.end();
        return true;
      }
      res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      if (req.method === 'HEAD') { res.end(); return true; }
      createReadStream(abs, { start, end }).pipe(res);
      return true;
    }
    res.writeHead(200, { ...base, 'content-length': size });
    if (req && req.method === 'HEAD') { res.end(); return true; }
    createReadStream(abs).pipe(res);
    return true;
  } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, ORIGIN());
    const pth = decodeURIComponent(url.pathname);
    if (process.env.DEV_LOG) console.log(req.method, pth + (url.search || ''));  // DEV_LOG=1 to trace requests

    if (pth === '/api/upload') return void apiUpload(req, res, url);
    if (pth === '/api/gallery') return void apiGallery(req, res, url);
    if (pth === '/api/answers') return void apiAnswers(req, res, url);
    if (pth === '/api/admin-check') return void apiAdminCheck(req, res);

    // Clean URL for admin: /admin -> /admin.html (avoids falling through to the
    // SPA, which is why /admin#/janamdin opened the birthday reveal before).
    if (pth === '/admin' || pth === '/admin/') {
      res.writeHead(302, { location: '/admin.html' }); return res.end();
    }

    if (pth.startsWith('/_localblob/')) {
      const abs = path.join(BLOB_DIR, pth.slice('/_localblob/'.length));
      if (!abs.startsWith(BLOB_DIR)) { res.writeHead(400); return res.end(); }
      if (await serveFile(res, abs, false, req)) return;
      res.writeHead(404); return res.end('not found');
    }

    // static files from project root
    let rel = pth === '/' ? '/index.html' : pth;
    const abs = path.join(ROOT, rel);
    if (!abs.startsWith(ROOT)) { res.writeHead(400); return res.end(); }
    if (await serveFile(res, abs, false, req)) return;
    // SPA-ish fallback
    if (await serveFile(res, path.join(ROOT, 'index.html'), false, req)) return;
    res.writeHead(404); res.end('not found');
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Local dev server (fake Blob) running`);
  console.log(`  App:    ${ORIGIN()}/            (PIN 231070)`);
  console.log(`  Admin:  ${ORIGIN()}/admin.html  (admin key: ${ADMIN_SECRET})`);
  console.log(`  Uploads stored in ./.localblob  (delete to reset)\n`);
});
