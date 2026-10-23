// POST /api/upload?path=<space>/audio/<id>.webm   -> stores the request body in Blob
// DELETE /api/upload?path=...                      -> removes it
//
// Two kinds of writers use this:
//
//  1. Mamma's app, backing up a kept answer (audio + a small JSON manifest).
//     These go to "<space>/audio/*" and "<space>/answers/*" and are allowed
//     WITHOUT a secret, so her phone "just works". The Blob token stays here on
//     the server; the browser never sees it.
//
//  2. You, from admin.html, uploading the family's photos (for the collage) and
//     video/voice recordings gathered from other people. These go to
//     "<space>/media/photos/*" and "<space>/media/videos/*" and REQUIRE the
//     admin secret (x-admin-key header == ADMIN_SECRET), so a random visitor
//     can't add media to the album.
//
// Reading the private answer list back still requires the admin secret (see
// api/answers.js). The media gallery is read publicly (see api/gallery.js).

import { put, del } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

// Mamma's app may write only here (unguarded):
//   "<space>/answers/*.json" or "<space>/audio/*.(webm|m4a)"
const SAFE_APP = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(answers\/[A-Za-z0-9._-]+\.json|audio\/[A-Za-z0-9._-]+\.(webm|m4a))$/;

// Admin (with secret) may write the album media and config:
//   "<space>/media/photos/*.(jpg|jpeg|png|webp|gif)"
//   "<space>/media/videos/*.(mp4|webm|mov|m4v)"  video, or
//   "<space>/media/videos/*.(m4a|mp3|ogg|wav|aac)" an audio recording, or
//   "<space>/media/(photos|videos)/*.json"   (caption sidecar / manifest)
//   "<space>/config/questions.json"          (question overrides from admin)
//   "<space>/media/greetings/*.(mp4|webm|mov|m4v|json)"  greeting videos (many) + caption sidecars
//   "<space>/config/greeting-video.(mp4|webm|mov|m4v)"  legacy single greeting video (delete only)
//   "<space>/config/greeting-video.json"     (legacy greeting video caption)
const SAFE_MEDIA = /^[A-Za-z0-9][A-Za-z0-9._-]*\/(media\/(photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|heic|heif|json)|videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|m4a|mp3|ogg|wav|aac|json)|greetings\/[A-Za-z0-9._-]+\.(mp4|webm|mov|m4v|json))|config\/(questions\.json|greeting-video\.(mp4|webm|mov|m4v|json)))$/i;

function adminOk(given) {
  const want = process.env.ADMIN_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 200 * 1024 * 1024; // 200 MB per upload — room for a short video
    req.on('data', (c) => { total += c.length; if (total > MAX) reject(new Error('too large')); else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const path = (req.query && req.query.path) || new URL(req.url, 'http://x').searchParams.get('path');
  if (!path) return res.status(400).json({ error: 'bad path' });

  const isApp = SAFE_APP.test(path);
  const isMedia = SAFE_MEDIA.test(path);
  if (!isApp && !isMedia) return res.status(400).json({ error: 'bad path' });

  // Album media (photos/videos) is admin-only, both to write and to delete.
  if (isMedia && !adminOk(req.headers['x-admin-key'])) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    if (req.method === 'DELETE') {
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
