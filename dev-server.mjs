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
import { timingSafeEqual, createHmac, createHash, randomBytes } from 'node:crypto';
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
const SAFE_MEDIA = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(media\/(photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|json)|videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|m4a|mp3|ogg|wav|aac|json)|greetings\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|json))|config\/(questions\.json|greeting-video\.(mp4|webm|mov|m4v|json)))$/i;
const SAFE_SPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function adminOk(given) {
  if (!ADMIN_SECRET || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(ADMIN_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
function readBody(req, max = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0; let over = false;
    req.on('data', (c) => { n += c.length; if (n > max) over = true; else if (!over) chunks.push(c); });
    req.on('end', () => (over ? reject(Object.assign(new Error('too large'), { tooLarge: true })) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}
const blobUrl = (p) => `${ORIGIN()}/_localblob/${p}`;

// Vercel rejects function request bodies over 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE).
// Enforced here too so anything still sent through a function fails locally first.
const FUNCTION_BODY_LIMIT = 4.5 * 1024 * 1024;

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
    let body;
    try { body = await readBody(req, FUNCTION_BODY_LIMIT); }
    catch (e) { if (e.tooLarge) return json(res, 413, { error: 'FUNCTION_PAYLOAD_TOO_LARGE (Vercel limit is 4.5 MB)' }); throw e; }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
    return json(res, 200, { url: blobUrl(p), pathname: p });
  }
  res.writeHead(405); res.end();
}

// ---- api/upload-token (client-upload handshake, mirrors api/upload-token.js) ----
// GET tells the browser to use the fake Blob API below instead of Vercel's.
// POST hands out a short-lived token scoped to one pathname. The token shape
// matches the SDK's ("vercel_blob_client_<store>_<base64(sig.payload)>").
const TOKEN_KEY = createHash('sha256').update('local-blob:' + ADMIN_SECRET).digest();
const MAX_MEDIA = 200 * 1024 * 1024, MAX_APP = 30 * 1024 * 1024;
const sign = (s) => createHmac('sha256', TOKEN_KEY).update(s).digest('hex');
async function apiUploadToken(req, res) {
  if (req.method === 'GET') return json(res, 200, { blobApiUrl: `${ORIGIN()}/_blobapi` });
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
  let body; try { body = JSON.parse((await readBody(req, FUNCTION_BODY_LIMIT)).toString('utf8')); } catch { return json(res, 400, { error: 'bad body' }); }
  if (body?.type === 'blob.upload-completed') return json(res, 200, { type: body.type, response: 'ok' });
  if (body?.type !== 'blob.generate-client-token') return json(res, 400, { error: 'Invalid event type' });
  const { pathname = '', clientPayload } = body.payload || {};
  const isApp = SAFE_APP.test(pathname), isMedia = SAFE_MEDIA.test(pathname);
  if (!isApp && !isMedia) return json(res, 400, { error: 'bad path' });
  let key = ''; try { key = (JSON.parse(clientPayload || '{}') || {}).key || ''; } catch {}
  if (isMedia && !adminOk(key)) return json(res, 401, { error: 'unauthorized' });
  const payload = Buffer.from(JSON.stringify({ pathname, maximumSizeInBytes: isMedia ? MAX_MEDIA : MAX_APP, validUntil: Date.now() + 3600e3 })).toString('base64');
  const clientToken = 'vercel_blob_client_local_' + Buffer.from(`${sign(payload)}.${payload}`).toString('base64');
  return json(res, 200, { type: body.type, clientToken });
}

// ---- fake Vercel Blob REST API (what @vercel/blob's client upload() calls) ----
//   PUT  /_blobapi/?pathname=…                          single upload
//   POST /_blobapi/mpu?pathname=…  x-mpu-action=create  -> { key, uploadId }
//                                  x-mpu-action=upload  -> { etag }   (one part)
//                                  x-mpu-action=complete (JSON [{etag, partNumber}])
const MPU_DIR = path.join(BLOB_DIR, '.mpu');
const blobErr = (res, status, code, message) => json(res, status, { error: { code, message } });
function readToken(req, pathname) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const enc = tok.split('_')[4] || '';
  const [sig, payload] = Buffer.from(enc, 'base64').toString().split('.');
  if (!sig || !payload) return { err: 'missing or malformed client token' };
  const a = Buffer.from(sig), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { err: 'bad token signature' };
  const t = JSON.parse(Buffer.from(payload, 'base64').toString());
  if (t.validUntil < Date.now()) return { err: 'token expired' };
  if (t.pathname !== pathname) return { err: 'token is for a different pathname' };
  return { t };
}
async function finishBlob(res, p, size) {
  const type = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
  console.log(`  [blob] stored ${p} (${(size / 1048576).toFixed(1)} MB)`);
  return json(res, 200, { url: blobUrl(p), downloadUrl: blobUrl(p) + '?download=1', pathname: p, contentType: type, contentDisposition: `inline; filename="${path.basename(p)}"` });
}
async function fakeBlobApi(req, res, url, sub) {
  const p = url.searchParams.get('pathname') || '';
  const { t, err } = readToken(req, p);
  if (err) return blobErr(res, 403, 'forbidden', err);
  const abs = path.join(BLOB_DIR, p);
  if (!abs.startsWith(BLOB_DIR + path.sep)) return blobErr(res, 400, 'bad_request', 'bad pathname');
  const readLimited = async () => {
    try { return await readBody(req, t.maximumSizeInBytes); }
    catch (e) { if (e.tooLarge) { blobErr(res, 400, 'file_too_large', 'File is too large'); return null; } throw e; }
  };

  if (sub === '/' && req.method === 'PUT') {
    const body = await readLimited(); if (!body) return;
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
    return finishBlob(res, p, body.length);
  }
  if (sub === '/mpu' && req.method === 'POST') {
    const action = req.headers['x-mpu-action'];
    if (action === 'create') {
      const uploadId = randomBytes(12).toString('hex');
      await fs.mkdir(path.join(MPU_DIR, uploadId), { recursive: true });
      return json(res, 200, { key: p, uploadId });
    }
    const uploadId = String(req.headers['x-mpu-upload-id'] || '');
    if (!/^[a-f0-9]{24}$/.test(uploadId)) return blobErr(res, 400, 'bad_request', 'bad upload id');
    const dir = path.join(MPU_DIR, uploadId);
    if (action === 'upload') {
      const n = Number(req.headers['x-mpu-part-number']);
      if (!Number.isInteger(n) || n < 1 || n > 10000) return blobErr(res, 400, 'bad_request', 'bad part number');
      const body = await readLimited(); if (!body) return;
      await fs.writeFile(path.join(dir, String(n)), body);
      return json(res, 200, { etag: `"${createHash('md5').update(body).digest('hex')}"` });
    }
    if (action === 'complete') {
      const parts = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8'));
      parts.sort((x, y) => x.partNumber - y.partNumber);
      const bufs = [];
      for (const part of parts) bufs.push(await fs.readFile(path.join(dir, String(part.partNumber))));
      const all = Buffer.concat(bufs);
      if (all.length > t.maximumSizeInBytes) return blobErr(res, 400, 'file_too_large', 'File is too large');
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, all);
      await fs.rm(dir, { recursive: true, force: true });
      return finishBlob(res, p, all.length);
    }
    return blobErr(res, 400, 'bad_request', 'bad x-mpu-action');
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
  const [photos, videos, greetings, config] = await Promise.all([listPrefix(`${space}/media/photos/`), listPrefix(`${space}/media/videos/`), listPrefix(`${space}/media/greetings/`), readConfig(space)]);
  return json(res, 200, { space, photos, videos, greetings, config });
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
    if (pth === '/api/upload-token') return void apiUploadToken(req, res);
    if (pth === '/_blobapi/' || pth === '/_blobapi') return void fakeBlobApi(req, res, url, '/');
    if (pth === '/_blobapi/mpu') return void fakeBlobApi(req, res, url, '/mpu');

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
