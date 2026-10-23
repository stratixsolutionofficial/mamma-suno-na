// POST /api/upload-token  — Vercel Blob "client upload" handshake.
//
// A Vercel function can receive at most 4.5 MB per request, so large files
// (phone videos, photos) can't be streamed through api/upload.
// Instead the browser (assets/vendor/blob-client.js → upload()) calls this
// route for a short-lived client token scoped to ONE pathname, then sends the
// bytes straight to Vercel Blob. The BLOB_READ_WRITE_TOKEN never leaves here.
//
// Why we don't use @vercel/blob/client's handleUpload here:
//   That subpath import pulls in browser-bundled stubs for undici/crypto which
//   cause FUNCTION_INVOCATION_FAILED on Vercel at module load time.
//   We replicate the token-generation logic using only node:crypto instead.
//
// Token format matches @vercel/blob/client's generateClientTokenFromReadWriteToken:
//   vercel_blob_client_{storeId}_{base64("{hmac_hex}.{payloadBase64}")}
//
// GET returns {} — dev-server.mjs overrides this to return { blobApiUrl } so
// the same browser code works locally against the fake Blob API.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs' };

// Keep in sync with api/upload.js and dev-server.mjs
const SAFE_APP   = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(answers\/[A-Za-z0-9._-]+\.json|audio\/[A-Za-z0-9._-]+\.(webm|m4a))$/;
const SAFE_MEDIA = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(media\/(photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|heic|heif|json)|videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|m4a|mp3|ogg|wav|aac|json)|greetings\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|json))|config\/(questions\.json|greeting-video\.(mp4|webm|mov|m4v|json)))$/i;

const MAX_MEDIA = 200 * 1024 * 1024;
const MAX_APP   =  30 * 1024 * 1024;

function adminOk(given) {
  const want = process.env.ADMIN_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
function keyFrom(cp) {
  try { return (JSON.parse(cp || '{}') || {}).key || ''; } catch { return ''; }
}

// Replicates @vercel/blob/client generateClientTokenFromReadWriteToken.
// Uses Web Crypto (Node 19+) when available, falls back to createHmac.
async function makeClientToken(pathname, opts) {
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!rwToken) throw Object.assign(new Error('BLOB_READ_WRITE_TOKEN is not set'), { status: 500 });
  const [,,,storeId] = rwToken.split('_');
  if (!storeId) throw Object.assign(new Error('Invalid BLOB_READ_WRITE_TOKEN format'), { status: 500 });

  const payloadB64 = Buffer.from(JSON.stringify({
    pathname,
    maximumSizeInBytes: opts.maximumSizeInBytes,
    addRandomSuffix:    opts.addRandomSuffix,
    allowOverwrite:     opts.allowOverwrite,
    tokenPayload:       opts.tokenPayload,
    onUploadCompleted:  opts.onUploadCompleted,
    validUntil:         opts.validUntil
  })).toString('base64');

  let sig;
  if (globalThis.crypto?.subtle) {
    // Web Crypto path (Node 19+, same as the SDK uses)
    const key = await globalThis.crypto.subtle.importKey(
      'raw', new TextEncoder().encode(rwToken),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const buf = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
    sig = Buffer.from(new Uint8Array(buf)).toString('hex');
  } else {
    sig = createHmac('sha256', rwToken).update(payloadB64).digest('hex');
  }

  return `vercel_blob_client_${storeId}_${Buffer.from(`${sig}.${payloadB64}`).toString('base64')}`;
}

export default async function handler(req, res) {
  // GET: tell the browser there is no local fake Blob API (dev-server overrides this)
  if (req.method === 'GET') return res.status(200).json({});
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });

  const type = body.type;

  // Vercel Blob POSTs this after each upload completes; just acknowledge it.
  if (type === 'blob.upload-completed') return res.status(200).json({ type, response: 'ok' });

  if (type !== 'blob.generate-client-token') return res.status(400).json({ error: 'Invalid event type' });

  const { pathname = '', callbackUrl, clientPayload } = body.payload || {};

  const isApp   = SAFE_APP.test(pathname);
  const isMedia = SAFE_MEDIA.test(pathname);
  if (!isApp && !isMedia)                          return res.status(400).json({ error: 'bad path' });
  if (isMedia && !adminOk(keyFrom(clientPayload))) return res.status(401).json({ error: 'unauthorized' });

  try {
    const tokenPayload = JSON.stringify({ kind: isMedia ? 'media' : 'app' });
    const clientToken  = await makeClientToken(pathname, {
      maximumSizeInBytes: isMedia ? MAX_MEDIA : MAX_APP,
      addRandomSuffix:    false,
      allowOverwrite:     true,
      tokenPayload,
      onUploadCompleted:  { callbackUrl, tokenPayload },
      validUntil:         Date.now() + 3_600_000
    });
    return res.status(200).json({ type, clientToken });
  } catch (e) {
    const status = (e && e.status) || 500;
    return res.status(status).json({ error: String((e && e.message) || e) });
  }
}
