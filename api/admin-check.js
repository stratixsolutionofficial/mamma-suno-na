// POST /api/admin-check   body: {}   header: x-admin-key: <secret>
//
// Tiny endpoint so admin.html can verify the admin password (ADMIN_SECRET)
// before showing the panel. The real protection is still server-side on every
// write (api/upload) and on the private answer read (api/answers); this just
// gates the page UI so the tools aren't shown to someone without the key.

import { timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs' };

function adminOk(given) {
  const want = process.env.ADMIN_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  const key = req.headers['x-admin-key'];
  if (!adminOk(key)) return res.status(401).json({ ok: false });
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true });
}
