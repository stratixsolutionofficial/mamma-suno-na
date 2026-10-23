/* =====================================================================
   Mamma, Sunao Na · collage.js
   The desk around the closed book: photos and videos scattered like
   prints on a table, partly tucked under the book.
     - hover / focus / tap a print -> it lifts out, the rest fade back
     - a video plays while lifted; the birthday song dips under it
     - few prints: big and close to the book; many: smaller, spread out,
       and anything that doesn't fit takes turns in the slots
   The song itself is the app's BGM (app.js): it ducks on its own for any
   unmuted playing video; data-duck="soft" asks it to dip, not go silent.
   ===================================================================== */
(function () {
  'use strict';
  const esc = SS.esc;
  const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v'];
  const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

  // ------------------------------------------------------------------
  // Items: what was uploaded in admin -> "Collage media" (api/gallery):
  // photos + videos (voice-only recordings stay on the Aawaazein page)
  // ------------------------------------------------------------------
  UI.collageItems = function (data) {
    if (!data) return [];
    const out = [], seen = new Set();
    const add = (it, type) => {
      if (!it || !it.url || seen.has(it.url)) return;
      seen.add(it.url);
      out.push({ src: it.url, type, alt: it.caption || '' });
    };
    (data.photos || []).forEach((p) => { if (PHOTO_EXT.includes(String(p.ext || '').toLowerCase())) add(p, 'photo'); });
    (data.videos || []).forEach((v) => { if (VIDEO_EXT.includes(String(v.ext || '').toLowerCase())) add(v, 'video'); });
    return out;
  };

  // ------------------------------------------------------------------
  // Layout
  // ------------------------------------------------------------------
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H_OF = 1.16; // a print is about 1.16x as tall as wide (image + paper margin)
  function overlap(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function distToRect(px, py, r) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.hypot(dx, dy);
  }
  function candidates(s, W, H, B, rand) {
    const h = s * H_OF, step = s * 0.74, out = [];
    for (let cy = h * 0.42; cy <= H - h * 0.36; cy += step * 1.05) {
      for (let cx = s * 0.4; cx <= W - s * 0.36; cx += step) {
        const x = cx + (rand() - 0.5) * step * 0.5, y = cy + (rand() - 0.5) * step * 0.5;
        const r = { x: x - s / 2, y: y - h / 2, w: s, h };
        // allowed to tuck under the book a little, never to vanish behind it
        if (overlap(r, B) / (s * h) > 0.42) continue;
        const vis = overlap(r, { x: 0, y: 0, w: W, h: H }) / (s * h);
        if (vis < 0.82) continue;
        out.push({ x, y, d: distToRect(x, y, B) });
      }
    }
    return out;
  }
  function pick(cand, k, s, rand) {
    const chosen = [];
    if (!cand.length) return chosen;
    let first = cand.reduce((a, c) => (c.d + rand() * s * 0.3 < a.d ? c : a), cand[0]);
    chosen.push(first);
    const left = cand.filter((c) => c !== first);
    while (chosen.length < k && left.length) {
      let best = -Infinity, bi = 0;
      for (let i = 0; i < left.length; i++) {
        const c = left[i];
        let m = Infinity;
        for (const q of chosen) m = Math.min(m, Math.hypot(c.x - q.x, c.y - q.y));
        // spacing matters until prints are ~2 widths apart; after that, closeness to the book wins
        const sc = Math.min(m / s, 2.1) - 0.5 * (c.d / s) + rand() * 0.12;
        if (sc > best) { best = sc; bi = i; }
      }
      chosen.push(left.splice(bi, 1)[0]);
    }
    return chosen;
  }
  function layout(n, W, H, B, seed) {
    const free = Math.max(W * H - B.w * B.h * 0.85, W * H * 0.2);
    const sMax = Math.min(230, W * 0.4, H * 0.3);
    const sMin = Math.min(sMax, Math.max(66, Math.min(100, W * 0.19)));
    let s = clamp(Math.sqrt((free * 0.42) / Math.max(n, 1)), sMin, sMax);
    let cand = [];
    for (let i = 0; i < 10; i++) {
      cand = candidates(s, W, H, B, rng(seed + i));
      if (cand.length >= n || s <= sMin) break;
      s = Math.max(sMin, s * 0.9);
    }
    const spots = pick(cand, Math.min(n, cand.length), s, rng(seed ^ 0x9e37));
    const rand = rng(seed ^ 0x51ed);
    return { s, spots: spots.map((p) => ({ x: p.x, y: p.y, rot: (rand() - 0.5) * 15, tape: rand() < 0.45, tapeRot: (rand() - 0.5) * 18, z: 1 + Math.floor(rand() * 30) })) };
  }

  // ------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------
  /**
   * UI.mountCollage(screen, book, items, onLeave) -> { leave() }
   * screen: positioned container (the cover <main>), book: .cover-book
   */
  UI.mountCollage = function (screen, book, items, onLeave) {
    const reduced = SS.reducedMotion();
    const root = document.createElement('div');
    root.className = 'cover-collage';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', SS.t('collage.label'));
    screen.prepend(root);
    const seed = hash(items.map((i) => i.src).join('|') || 'desk');

    // marigold petals on the desk, always (they keep an empty desk alive too)
    const pr = rng(seed ^ 0xbeef);
    let petals = '';
    for (let i = 0; i < 9; i++) {
      petals += `<i class="cl-petal" style="left:${(pr() * 96).toFixed(1)}%;top:${(pr() * 96).toFixed(1)}%;--pr:${Math.round(pr() * 360)}deg;--ps:${(0.7 + pr() * 0.6).toFixed(2)}">${MOTIF.petal(pr() < 0.6 ? '#E5822A' : '#E0A526')}</i>`;
    }
    root.insertAdjacentHTML('beforeend', `<div class="cl-petals" aria-hidden="true">${petals}</div>`);
    if (!items.length) return { leave() {} };

    const queue = items.slice();
    const tiles = [];
    let active = null, actTok = 0, lastPtr = 'mouse', leaveT = 0, swapIv = 0, L = null;

    const media = (it) => it.type === 'video'
      ? `<video muted playsinline loop preload="metadata" data-duck="soft" src="${esc(it.src)}#t=0.1"></video><span class="cl-play" aria-hidden="true">${MOTIF.play()}</span><span class="cl-mute" aria-hidden="true">${MOTIF.speakerOff()}</span>`
      : `<img src="${esc(it.src)}" alt="" loading="lazy" decoding="async" draggable="false">`;
    function fill(tile, it) {
      tile._item = it;
      tile.classList.toggle('is-video', it.type === 'video');
      tile.classList.remove('muted', 'playing');
      tile.setAttribute('aria-label', (it.alt || (it.type === 'video' ? 'Video' : 'Photo')) + (it.type === 'video' ? ' (video)' : ''));
      const box = tile.querySelector('.cl-img');
      box.innerHTML = media(it);
      tile.querySelector('.cl-cap').textContent = it.alt || '';
      if (it.ar) box.style.setProperty('--ar', it.ar); else box.style.removeProperty('--ar');
      const m = box.firstElementChild;
      const setAr = (w, h) => { if (!it.ar && w && h) box.style.setProperty('--ar', clamp(w / h, 0.72, 1.4).toFixed(3)); };
      if (it.type === 'video') m.addEventListener('loadedmetadata', () => setAr(m.videoWidth, m.videoHeight), { once: true });
      else if (m.complete) setAr(m.naturalWidth, m.naturalHeight); else m.addEventListener('load', () => setAr(m.naturalWidth, m.naturalHeight), { once: true });
      m.addEventListener('error', () => tile.classList.add('broken'), { once: true });
    }

    function place() {
      const sr = screen.getBoundingClientRect(), br = book.getBoundingClientRect();
      const W = sr.width, H = Math.max(sr.height, innerHeight);
      const B = { x: br.left - sr.left, y: br.top - sr.top, w: br.width, h: br.height };
      L = layout(items.length, W, H, B, seed);
      L.W = W; L.H = H; L.B = B;
      root.style.setProperty('--s', L.s.toFixed(1) + 'px');
      // grow / shrink the tile set to the number of spots
      while (tiles.length > L.spots.length) { const t = tiles.pop(); queue.unshift(t._item); t.remove(); }
      while (tiles.length < L.spots.length && queue.length) tiles.push(makeTile(queue.shift(), tiles.length));
      tiles.forEach((t, i) => {
        const p = L.spots[i];
        t._p = p;
        t.style.setProperty('--x', (p.x - L.s / 2).toFixed(1) + 'px');
        t.style.setProperty('--y', (p.y - (L.s * H_OF) / 2).toFixed(1) + 'px');
        t.style.setProperty('--r0', p.rot.toFixed(2) + 'deg');
        t.style.setProperty('--tr', p.tapeRot.toFixed(1) + 'deg');
        t.style.zIndex = p.z;
        t.classList.toggle('tape', p.tape);
      });
      if (active) lift(active);
    }
    function makeTile(it, i) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'cl-tile' + (root.classList.contains('in') ? ' seen' : '');
      t.style.setProperty('--d', (reduced ? 0 : 140 + i * 55) + 'ms');
      t.innerHTML = '<span class="cl-img"></span><span class="cl-cap" aria-hidden="true"></span>';
      fill(t, it);
      t.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { clearTimeout(leaveT); activate(t); } });
      t.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { clearTimeout(leaveT); leaveT = setTimeout(() => { if (active === t) deactivate(); }, 70); } });
      t.addEventListener('focus', () => activate(t));
      t.addEventListener('blur', () => { if (active === t && lastPtr !== 'touch') deactivate(); });
      t.addEventListener('click', () => {
        if (lastPtr === 'touch') { active === t && !t.classList.contains('muted') ? deactivate() : activate(t, true); return; }
        if (t.classList.contains('muted')) unmute(t); // a click is a real gesture: sound can come on now
      });
      root.appendChild(t);
      return t;
    }

    // lift: bigger, straight, pushed out from under the book and kept on screen
    function lift(t) {
      const p = t._p, s = L.s, h = s * H_OF, B = L.B;
      const k = clamp(Math.min(L.W * 0.62, L.H * 0.46, 340) / s, 1.12, 1.75);
      const S = s * k, SH = h * k;
      let cx = p.x, cy = p.y;
      const bx = B.x + B.w / 2, by = B.y + B.h / 2;
      let dx = cx - bx, dy = cy - by;
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      for (let moved = 0; moved < s * 1.6; moved += 6) {
        if (overlap({ x: cx - S / 2, y: cy - SH / 2, w: S, h: SH }, B) / (S * SH) < 0.1) break;
        cx += dx * 6; cy += dy * 6;
      }
      const m = 10;
      cx = clamp(cx, S / 2 + m, L.W - S / 2 - m);
      cy = clamp(cy, SH / 2 + m, L.H - SH / 2 - m);
      t.style.setProperty('--px', (cx - p.x).toFixed(1) + 'px');
      t.style.setProperty('--py', (cy - p.y).toFixed(1) + 'px');
      t.style.setProperty('--k', k.toFixed(3));
    }
    function activate(t, gesture) {
      if (active === t) return;
      if (active) deactivate();
      active = t;
      const tok = ++actTok;
      lift(t);
      t.classList.add('on');
      root.classList.add('has-active');
      screen.classList.add('collage-active');
      const v = t.querySelector('video');
      if (!v) return;
      if (gesture) SS.primeAudio();
      v.muted = false;
      v.play().then(() => {
        if (tok !== actTok) { v.pause(); return; }
        t.classList.add('playing');
      }).catch(() => {
        if (tok !== actTok) return;
        // the browser wants a tap before sound: play silently and offer the tap
        v.muted = true;
        t.classList.add('muted');
        v.play().then(() => { if (tok === actTok) t.classList.add('playing'); else v.pause(); }).catch(() => {});
      });
    }
    function unmute(t) {
      const v = t.querySelector('video');
      if (!v) return;
      v.muted = false;
      t.classList.remove('muted');
      v.play().catch(() => { v.muted = true; t.classList.add('muted'); });
    }
    function deactivate() {
      const t = active;
      if (!t) return;
      active = null; actTok++;
      t.classList.remove('on', 'playing', 'muted');
      ['--px', '--py', '--k'].forEach((k) => t.style.removeProperty(k));
      root.classList.remove('has-active');
      screen.classList.remove('collage-active');
      const v = t.querySelector('video');
      if (v) { v.pause(); v.muted = true; }
    }

    // more prints than spots: they take turns, one slot at a time
    function swap() {
      if (!queue.length || active || document.hidden) return;
      const free = tiles.filter((t) => t !== active);
      if (!free.length) return;
      const t = free[Math.floor(Math.random() * free.length)];
      t.classList.add('swapping');
      setTimeout(() => {
        if (!t.isConnected) return;
        queue.push(t._item);
        fill(t, queue.shift());
        t.classList.remove('swapping');
      }, 480);
    }

    const onDown = (e) => {
      lastPtr = e.pointerType || 'mouse';
      if (lastPtr === 'touch' && active && !e.target.closest('.cl-tile')) deactivate();
    };
    const onKey = (e) => { if (e.key === 'Escape' && active) { const t = active; deactivate(); t.blur(); } };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    let rT = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(place, 120); });

    requestAnimationFrame(() => {
      if (!root.isConnected) return;
      place();
      ro.observe(screen);
      requestAnimationFrame(() => root.classList.add('in'));
      // after the arrival stagger, hover/fade should respond at once
      setTimeout(() => tiles.forEach((t) => t.classList.add('seen')), (reduced ? 0 : 140 + tiles.length * 55) + 700);
      if (queue.length && !reduced) swapIv = setInterval(swap, 5200);
    });

    const api = {
      leave() {
        deactivate();
        clearInterval(swapIv); clearTimeout(rT); clearTimeout(leaveT);
        ro.disconnect();
        document.removeEventListener('pointerdown', onDown, true);
        document.removeEventListener('keydown', onKey);
        root.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      }
    };
    if (onLeave) onLeave(api.leave);
    return api;
  };
})();
