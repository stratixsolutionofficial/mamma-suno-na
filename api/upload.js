// POST /api/upload?path=<space>/audio/<id>.webm   -> stores the request body in Blob
// DELETE /api/upload?path=...                      -> removes it
//
// Mamma's app calls this to back up a kept answer (audio + a small JSON manifest).
// The Blob token stays here on the server; the browser never sees it.
// Uploads are allowed without a secret (so her phone "just works"), but only
// into this edition's folder and only for the file types we expect. Reading
// everything back requires the admin secret (see api/answers.js).

import { put, del } from '@vercel/blob';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

// Only let the app write where it's supposed to: "<something>/answers/*.json"
// or "<something>/audio/*.(webm|m4a)". Blocks path traversal and junk.
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(answers\/[A-Za-z0-9._-]+\.json|audio\/[A-Za-z0-9._-]+\.(webm|m4a))$/;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 30 * 1024 * 1024; // 30 MB per upload — plenty for one segment
    req.on('data', (c) => { total += c.length; if (total > MAX) reject(new Error('too large')); else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const path = (req.query && req.query.path) || new URL(req.url, 'http://x').searchParams.get('path');
  if (!path || !SAFE.test(path)) return res.status(400).json({ error: 'bad path' });

  try {
    if (req.method === 'DELETE') {
      // Reconstruct the public URL for this path, then delete by URL.
      // (del also accepts a pathname when the store is unambiguous.)
      await del(path).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const blob = await put(path, body, {
        access: 'public',          // URLs are public but unguessable (random space + id)
        contentType,
        addRandomSuffix: false,     // stable path so re-uploads overwrite, not duplicate
        allowOverwrite: true
      });
      return res.status(200).json({ url: blob.url, pathname: blob.pathname });
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
