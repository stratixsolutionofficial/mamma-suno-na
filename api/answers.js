// GET /api/answers?space=<space>&key=<ADMIN_SECRET>
// Returns every uploaded answer manifest for the edition, newest first, with
// public audio URLs. This is the read side — only you, with the secret.
//
// The secret is checked in constant time against ADMIN_SECRET (set in Vercel).
// Without a correct secret this returns 401 and leaks nothing.

import { list } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs' };

function secretOk(given) {
  const want = process.env.ADMIN_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const SAFE_SPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const key = url.searchParams.get('key');
  const space = url.searchParams.get('space') || '';

  if (!secretOk(key)) return res.status(401).json({ error: 'unauthorized' });
  if (!SAFE_SPACE.test(space)) return res.status(400).json({ error: 'bad space' });

  try {
    const prefix = space + '/answers/';
    const { blobs } = await list({ prefix, limit: 1000 });
    const answers = [];
    for (const b of blobs) {
      try {
        const r = await fetch(b.url, { cache: 'no-store' });
        if (r.ok) answers.push(await r.json());
      } catch (e) { /* skip a bad manifest */ }
    }
    answers.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ space, count: answers.length, answers });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
