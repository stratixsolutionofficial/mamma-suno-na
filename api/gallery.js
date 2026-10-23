// GET /api/gallery?space=<space>
//
// Public read for the album: returns the photos (for the collage) and the
// videos/voice recordings gathered from other people, with their captions.
// No secret — these are meant to be seen inside the app by Mamma and the
// family. (The app itself sits behind the family PIN; these URLs are public
// but unguessable.) Writing media still needs the admin secret, see api/upload.js.
//
// Layout in Blob:
//   <space>/media/photos/<id>.<ext>      the image
//   <space>/media/photos/<id>.json       { caption, order, by, ... }  (optional)
//   <space>/media/videos/<id>.<ext>      the video / audio recording
//   <space>/media/videos/<id>.json       { caption, order, by, poster, ... } (optional)

import { list } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

const SAFE_SPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// filename (no extension) -> grouping key, so "<id>.jpg" and "<id>.json" pair up
function baseId(pathname) {
  const file = pathname.split('/').pop() || '';
  return file.replace(/\.[^.]+$/, '');
}

async function collect(prefix) {
  const { blobs } = await list({ prefix, limit: 1000 });
  const media = new Map(); // id -> { id, url, pathname, ext, size, uploadedAt }
  const sidecars = [];     // { id, url }

  for (const b of blobs) {
    const ext = (b.pathname.split('.').pop() || '').toLowerCase();
    const id = baseId(b.pathname);
    if (ext === 'json') { sidecars.push({ id, url: b.url }); continue; }
    media.set(id, {
      id,
      url: b.url,
      pathname: b.pathname,
      ext,
      size: b.size || 0,
      uploadedAt: b.uploadedAt || null
    });
  }

  // fold caption sidecars into their media item
  await Promise.all(sidecars.map(async (s) => {
    const item = media.get(s.id);
    if (!item) return;
    try {
      const r = await fetch(s.url, { cache: 'no-store' });
      if (r.ok) Object.assign(item, { meta: await r.json() });
    } catch (e) { /* ignore a bad sidecar */ }
  }));

  const items = [...media.values()];
  items.sort((a, b) => {
    const oa = (a.meta && a.meta.order != null) ? a.meta.order : 1e9;
    const ob = (b.meta && b.meta.order != null) ? b.meta.order : 1e9;
    if (oa !== ob) return oa - ob;
    return String(a.uploadedAt).localeCompare(String(b.uploadedAt));
  });
  return items.map((it) => ({
    id: it.id,
    url: it.url,
    ext: it.ext,
    caption: (it.meta && it.meta.caption) || '',
    by: (it.meta && it.meta.by) || '',
    order: (it.meta && it.meta.order != null) ? it.meta.order : null
  }));
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const space = url.searchParams.get('space') || '';
  if (!SAFE_SPACE.test(space)) return res.status(400).json({ error: 'bad space' });

  try {
    const [photos, videos] = await Promise.all([
      collect(space + '/media/photos/'),
      collect(space + '/media/videos/')
    ]);
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ space, photos, videos });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
