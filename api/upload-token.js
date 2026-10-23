// POST /api/upload-token  — Vercel Blob "client upload" handshake.
//
// A Vercel function can receive at most 4.5 MB per request, so big files
// (phone videos, long recordings) can't be streamed through api/upload.
// Instead the browser (assets/vendor/blob-client.js → upload()) calls this
// route for a short-lived client token scoped to ONE pathname, then sends the
// bytes straight to Vercel Blob. The BLOB_READ_WRITE_TOKEN never leaves here.
//
// Same rules as api/upload.js:
//   - album/config paths (SAFE_MEDIA) need the admin secret. The browser passes
//     it in clientPayload as {"key": "..."} because @vercel/blob 0.27's upload()
//     can't add custom headers to this request.
//   - Mamma's app paths (SAFE_APP) are allowed without a secret.
//
// Vercel Blob also POSTs a signed "blob.upload-completed" callback here after
// each upload; handleUpload verifies the signature and we just acknowledge it.
//
// GET returns {} — the browser uses it to check for a local fake Blob API
// (dev-server.mjs answers with { blobApiUrl }); on Vercel there is none.

import { handleUpload } from '@vercel/blob/client';
import { timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs' };

// Keep in sync with api/upload.js and dev-server.mjs
const SAFE_APP = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(answers\/[A-Za-z0-9._-]+\.json|audio\/[A-Za-z0-9._-]+\.(webm|m4a))$/;
const SAFE_MEDIA = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(media\/(photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|json)|videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|m4a|mp3|ogg|wav|aac|json)|greetings\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|json))|config\/(questions\.json|greeting-video\.(mp4|webm|mov|m4v|json)))$/i;

const MAX_MEDIA = 200 * 1024 * 1024; // 200 MB, same cap as before
const MAX_APP = 30 * 1024 * 1024;    // a voice-note segment is far smaller

function adminOk(given) {
  const want = process.env.ADMIN_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

function keyFrom(clientPayload) {
  try { return (JSON.parse(clientPayload || '{}') || {}).key || ''; } catch { return ''; }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({});
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const isApp = SAFE_APP.test(pathname);
        const isMedia = SAFE_MEDIA.test(pathname);
        if (!isApp && !isMedia) throw Object.assign(new Error('bad path'), { status: 400 });
        if (isMedia && !adminOk(keyFrom(clientPayload))) throw Object.assign(new Error('unauthorized'), { status: 401 });
        return {
          maximumSizeInBytes: isMedia ? MAX_MEDIA : MAX_APP,
          addRandomSuffix: false,   // stable path so re-uploads overwrite, not duplicate
          allowOverwrite: true,
          // Don't echo clientPayload (it holds the admin key) into the token
          // or the upload-completed callback.
          tokenPayload: JSON.stringify({ kind: isMedia ? 'media' : 'app' })
        };
      },
      onUploadCompleted: async () => { /* nothing to do; the gallery lists Blob directly */ }
    });
    return res.status(200).json(result);
  } catch (e) {
    const status = (e && e.status) || 400;
    return res.status(status).json({ error: String((e && e.message) || e) });
  }
}
