/* =====================================================================
   Mamma, Sunao Na · app.js  (recipient experience, index.html)
   Hash routes:
     #/                 gate (countdown / PIN / reveal / album)
     #/pehchaan         PIN
     #/janamdin         birthday reveal
     #/shubhkamnayein   greetings wall
     #/tohfa            gift letter
     #/kitaab           closed book cover (where she starts)
     #/pehla-panna      title page
     #/anukram          contents (#/album is an alias)
     #/adhyay/<key>     chapter opening page
     #/sawaal/<key>     question page
     #/antim            colophon (last page)
   ===================================================================== */
(function () {
  'use strict';
  const $app = document.getElementById('app');
  const $live = document.getElementById('live');
  const t = SS.t, r = SS.r, esc = SS.esc;
  const announce = (msg) => { $live.textContent = ''; setTimeout(() => ($live.textContent = msg), 30); };
  let cleanup = [];
  const onLeave = (fn) => cleanup.push(fn);
  let lastRoute = '';
  // Greeting videos uploaded from admin (filled at boot from /api/gallery):
  // [{ url, caption }] — the many-video list, plus the older single one if present.
  let GREETING_VIDEOS = [];

  // ------------------------------------------------------------------
  // Background music (birthday song) — lives OUTSIDE the route lifecycle so it
  // keeps playing as she moves through the book. A floating button (top right)
  // opens a small volume panel: slider + mute. The level is kept for this visit
  // only, so every time she opens the app the song starts ON.
  // ------------------------------------------------------------------
  const BGM = (function () {
    let el = null, started = false, btn = null, panel = null, slider = null, muteBtn = null, pct = null;
    let level = 0.2, lastLevel = 0.2;   // 0..1, not persisted on purpose
    const cfg = () => (EDITION.settings.reveal && EDITION.settings.reveal.cake && EDITION.settings.reveal.cake.song) || null;
    const isMuted = () => level === 0;
    try { SS.ls.del('bgmMuted'); } catch (e) { /* old saved mute from earlier builds */ }

    // iOS Safari ignores element.volume (always 1). There, in-between levels go
    // through a Web Audio gain node, hooked up lazily inside a slider gesture
    // so the AudioContext is allowed to run.
    const volumeWorks = (() => { try { const a = new Audio(); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch (e) { return true; } })();
    let gain = null;
    function ensureGain() {
      if (gain || volumeWorks || !el) return;
      try {
        const ac = SS.primeAudio();
        const src = ac.createMediaElementSource(el);
        gain = ac.createGain();
        src.connect(gain); gain.connect(ac.destination);
      } catch (e) { gain = null; }
    }

    function ensureButton() {
      if (btn) return btn;
      btn = document.createElement('button');
      btn.id = 'bgm-toggle';
      btn.type = 'button';
      btn.className = 'bgm-toggle';
      btn.hidden = true; // shown once the song starts
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'bgm-panel');
      document.body.appendChild(btn);

      panel = document.createElement('div');
      panel.id = 'bgm-panel';
      panel.className = 'bgm-panel';
      panel.hidden = true;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', t('bgm.volume'));
      panel.innerHTML = `
        <button type="button" class="bgm-mute"></button>
        <input type="range" class="bgm-slider" min="0" max="100" step="1" aria-label="${esc(t('bgm.volume'))}">
        <span class="bgm-pct" aria-hidden="true"></span>`;
      document.body.appendChild(panel);
      muteBtn = panel.querySelector('.bgm-mute');
      slider = panel.querySelector('.bgm-slider');
      pct = panel.querySelector('.bgm-pct');

      btn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
      muteBtn.addEventListener('click', () => setMuted(!isMuted()));
      slider.addEventListener('input', () => setLevel(Number(slider.value) / 100));
      // close on outside tap / Escape
      document.addEventListener('pointerdown', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) togglePanel(false);
      }, true);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { togglePanel(false); btn.focus(); } });
      paintButton();
      return btn;
    }
    function togglePanel(open) {
      if (!panel) return;
      const want = typeof open === 'boolean' ? open : panel.hidden;
      panel.hidden = !want;
      btn.setAttribute('aria-expanded', String(want));
      if (want) { paintButton(); slider.focus({ preventScroll: true }); }
    }
    function paintButton() {
      if (!btn) return;
      const muted = isMuted();
      const label = t('bgm.volume') + ': ' + Math.round(level * 100) + '%';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.classList.toggle('is-muted', muted);
      btn.innerHTML = muted ? MOTIF.speakerOff() : MOTIF.speakerOn();
      if (panel) {
        slider.value = String(Math.round(level * 100));
        slider.style.setProperty('--fill', Math.round(level * 100) + '%');
        slider.setAttribute('aria-valuetext', Math.round(level * 100) + '%');
        pct.textContent = Math.round(level * 100) + '%';
        muteBtn.innerHTML = (muted ? MOTIF.speakerOff() : MOTIF.speakerOn()) + `<span class="sr-only">${esc(muted ? t('bgm.unmute') : t('bgm.mute'))}</span>`;
        muteBtn.setAttribute('aria-pressed', String(muted));
      }
    }
    function setLevel(v) {
      level = Math.max(0, Math.min(1, v));
      if (level > 0) lastLevel = level;
      if (level > 0 && level < 1) ensureGain(); // runs inside the slider gesture
      if (el) {
        applyLevel();
        if (level > 0 && el.paused && started) el.play().catch(() => {});
      }
      if (gain) { try { const ac = SS.primeAudio(); if (ac.state === 'suspended') ac.resume(); } catch (e) { /* */ } }
      paintButton();
    }
    function setMuted(m) { setLevel(m ? 0 : (lastLevel || 1)); }

    // ---- Duck under videos ----
    // While any <video> (greeting video, collage/gallery, greeting wall) is
    // playing, the song goes silent so the video's sound can be heard, then
    // comes back when it pauses/ends. Uses `muted` as well as volume because
    // iOS Safari ignores element.volume. Her own mute choice is untouched.
    const playingVideos = new Set();
    let ducked = false, pruneTimer = 0;
    function applyLevel() {
      if (!el) return;
      // data-duck="soft" videos (cover collage) only dip the song; others silence it.
      // Without a working volume (iOS, no gain node yet) a dip isn't possible: silence.
      const soft = ducked && [...playingVideos].every((v) => v.dataset.duck === 'soft') && (volumeWorks || gain);
      const target = ducked ? (soft ? level * 0.15 : 0) : level;
      el.muted = target === 0;
      if (gain) { el.volume = 1; gain.gain.value = target; }
      else el.volume = target;
    }
    function refreshDuck() {
      // a video removed from the page while playing never reports 'pause' to
      // the document, so drop anything detached/paused on every check
      playingVideos.forEach((v) => { if (!v.isConnected || v.paused || v.ended) playingVideos.delete(v); });
      const want = playingVideos.size > 0;
      if (want !== ducked) ducked = want;
      applyLevel(); // the set may have changed even if ducked didn't (soft vs hard)
      clearInterval(pruneTimer);
      if (ducked) pruneTimer = setInterval(refreshDuck, 1000);
    }
    if (typeof document !== 'undefined') {
      // media events don't bubble, so listen in the capture phase
      const onVideo = (e) => {
        const v = e.target;
        if (!(v instanceof HTMLVideoElement)) return;
        if (e.type === 'playing' || e.type === 'play') { if (!v.muted) playingVideos.add(v); }
        else if (e.type === 'volumechange') { if (v.muted) playingVideos.delete(v); else if (!v.paused) playingVideos.add(v); }
        else playingVideos.delete(v);
        refreshDuck();
      };
      ['play', 'playing', 'pause', 'ended', 'emptied', 'volumechange'].forEach((t) => document.addEventListener(t, onVideo, true));
      window.addEventListener('hashchange', () => setTimeout(refreshDuck, 0));
    }
    function start() {
      const c = cfg();
      if (!c || !c.src || started) { if (started) show(); return; }
      started = true;
      const startAt = Number(c.startAt) || 0;
      try {
        el = new Audio(c.src);
        el.loop = true;              // keep the moment going in the background
        el.preload = 'auto';
        applyLevel();
        // Seek to the start offset as soon as we can (before and after metadata).
        const seek = () => { try { if (el.currentTime < startAt) el.currentTime = startAt; } catch (e) { /* */ } };
        el.addEventListener('loadedmetadata', seek, { once: true });
        // CRITICAL: call play() synchronously here. start() runs inside the
        // tap that reaches the cake, so this counts as a user gesture. Calling
        // play() later (e.g. in a 'canplay' handler) escapes the gesture and
        // the browser blocks it — which is why no sound played before.
        const pr = el.play();
        if (pr && pr.then) pr.then(seek).catch(() => {
          // Blocked anyway? Try once more on the next real interaction.
          const retry = () => { el.play().then(seek).catch(() => {}); document.removeEventListener('pointerdown', retry); };
          document.addEventListener('pointerdown', retry, { once: true });
        });
        // on loop, jump back to the offset rather than 0
        el.addEventListener('timeupdate', () => { if (el.loop && startAt && el.currentTime < 0.3) seek(); });
      } catch (e) { /* no song, no problem */ }
      ensureButton();
      show();
    }
    function show() { ensureButton(); btn.hidden = false; paintButton(); }
    // keep playing when tab regains focus (autoplay already unlocked by then)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !el || !started) return;
        if (gain) { try { const ac = SS.primeAudio(); if (ac.state === 'suspended') ac.resume(); } catch (e) { /* */ } }
        if (!isMuted() && el.paused) el.play().catch(() => {});
      });
    }
    return { start, setMuted, setLevel, isMuted };
  })();

  // ------------------------------------------------------------------
  // Router
  // ------------------------------------------------------------------
  function go(hash, opts) {
    if (location.hash === hash) route(); else location.hash = hash;
    if (opts && opts.sweep) sweep();
  }
  function sweep() {
    if (SS.reducedMotion()) return;
    const s = document.createElement('div');
    s.className = 'page-sweep';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
  function render(html, bodyCls) {
    const turn = pendingTurn; pendingTurn = null;
    finishTurn();
    const oldBook = turn && $app.querySelector('.book');
    const snapOld = oldBook ? snapBook(oldBook) : null;
    cleanup.forEach((f) => { try { f(); } catch (e) { console.warn(e); } });
    cleanup = [];
    SS.player.stop();
    UI.setBody(bodyCls);
    document.querySelectorAll('.sheet-back').forEach((s) => s.remove());
    $app.innerHTML = html;
    window.scrollTo(0, 0);
    const nb = snapOld && $app.querySelector('.book');
    if (nb) {
      // the screen fills in its words/answer right after render(); start the
      // turn just after that (still before the browser paints)
      const main = $app.firstElementChild;
      if (main) main.style.animation = 'none';
      Promise.resolve().then(() => { if (nb.isConnected) playTurn(turn, snapOld, nb); });
    }
    const h = $app.querySelector('h1, h2, .qtext');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    return $app;
  }
  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const [name, arg] = [h.split('/')[0], h.split('/').slice(1).join('/')];
    // turning direction: both routes are pages of the book -> turn forward/back
    const from = BOOK.indexOf(lastRoute), to = BOOK.indexOf(h);
    pendingTurn = !SS.reducedMotion() && from >= 0 && to >= 0 && from !== to ? (to > from ? 'next' : 'prev') : null;
    lastRoute = h;
    // guards: lock & pin
    if (name !== '' && SS.now() < SS.unlockAt()) return countdown();
    if (name !== '' && name !== 'pehchaan' && needsPin()) return go('#/pehchaan');
    switch (name) {
      case '': return gate();
      case 'pehchaan': return pin();
      case 'janamdin': return reveal();
      case 'shubhkamnayein': return wall();
      case 'tasveerein': return tasveerein();
      case 'aawaazein': return aawaazein();
      case 'tohfa': return tohfa();
      case 'kitaab': return cover();
      case 'pehla-panna': return titlePage();
      case 'anukram': case 'album': return contents();
      case 'adhyay': return chapter(arg);
      case 'sawaal': return question(arg);
      case 'antim': return endPage();
      default: return notFound();
    }
  }
  window.addEventListener('hashchange', route);

  // ------------------------------------------------------------------
  // The book: fixed page order and numbers
  //   cover · title · contents · [chapter opener, its questions]… · colophon
  // ------------------------------------------------------------------
  let pendingTurn = null;
  const BOOK = (function () {
    let pages = null;
    const build = () => {
      pages = [{ t: 'cover', h: 'kitaab' }, { t: 'title', h: 'pehla-panna' }, { t: 'contents', h: 'anukram' }];
      let n = 1;
      SS.chapters().forEach((c) => {
        const qs = SS.visibleQuestions(c.key);
        if (!qs.length) return;
        pages.push({ t: 'chapter', h: 'adhyay/' + c.key, key: c.key, n: n++ });
        qs.forEach((q) => pages.push({ t: 'q', h: 'sawaal/' + q.key, key: q.key, chapter: c.key, n: n++ }));
      });
      pages.push({ t: 'end', h: 'antim', n: n++ });
    };
    const all = () => { if (!pages) build(); return pages; };
    const indexOf = (h) => {
      if (h == null) return -1;
      if (h === 'album') h = 'anukram';
      return all().findIndex((p) => p.h === h);
    };
    return {
      all,
      indexOf,
      page: (h) => all()[indexOf(h)] || null,
      num: (h) => { const p = all()[indexOf(h)]; return p ? p.n : null; },
      next: (h) => { const i = indexOf(h); return i >= 0 && i < all().length - 1 ? '#/' + all()[i + 1].h : '#/kitaab'; },
      prev: (h) => { const i = indexOf(h); return i > 0 ? '#/' + all()[i - 1].h : null; },
      // first page after this chapter (next chapter opener, or the colophon)
      afterChapter: (key) => {
        const ps = all();
        const i = ps.map((p) => p.chapter === key || p.key === key).lastIndexOf(true);
        return i >= 0 && i < ps.length - 1 ? '#/' + ps[i + 1].h : '#/antim';
      }
    };
  })();
  const turnNext = () => go(BOOK.next(lastRoute));
  const turnPrev = () => { const p = BOOK.prev(lastRoute); if (p) go(p); };

  // ------------------------------------------------------------------
  // Page turns: plain 3D transforms on clones of the pages, so the real
  // page underneath is already the new one. "Kam animation" -> fade only.
  // Wide screens show two pages; there the right leaf turns over the spine
  // and its back is the new left page.
  // ------------------------------------------------------------------
  const SPREAD = matchMedia('(min-width: 900px), (orientation: landscape) and (min-width: 640px)');
  const isSpread = (el) => !!el && el.classList.contains('spread') && SPREAD.matches;
  let turnDone = null;
  function finishTurn() { if (turnDone) turnDone(); }
  function snap(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const node = el.cloneNode(true);
    node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    node.querySelectorAll('video, audio').forEach((n) => n.remove());
    node.classList.add('snap');
    return { node, rect };
  }
  function snapBook(b) {
    return { book: snap(b), l: snap(b.querySelector(':scope > .leaf-l')), r: snap(b.querySelector(':scope > .leaf-r')), spread: isSpread(b), cover: b.classList.contains('cover-book') };
  }
  // a fixed box covering the visible part of rect; content placed at its real offset
  function box(rect) {
    const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
    const d = document.createElement('div');
    Object.assign(d.style, { left: rect.left + 'px', top: top + 'px', width: rect.width + 'px', height: Math.max(0, bottom - top) + 'px' });
    d._top = top;
    return d;
  }
  function place(s, into, top) {
    const n = s.node;
    Object.assign(n.style, { position: 'absolute', left: '0', top: (s.rect.top - top) + 'px', width: s.rect.width + 'px', height: s.rect.height + 'px', margin: '0', minHeight: '0', maxWidth: 'none' });
    into.appendChild(n);
  }
  function still(s) { // static clone (underneath the turning leaf)
    const d = box(s.rect);
    d.className = 'turn-still';
    d.setAttribute('aria-hidden', 'true');
    place(s, d, d._top);
    document.body.appendChild(d);
    return d;
  }
  function leaf(rect, front, back, origin, backCls) {
    const L = box(rect);
    L.className = 'turn-leaf';
    L.setAttribute('aria-hidden', 'true');
    L.style.transformOrigin = origin + ' center';
    const f = document.createElement('div'); f.className = 'face front';
    const b = document.createElement('div'); b.className = 'face back ' + (backCls || '');
    if (front) place(front, f, L._top);
    if (back) place(back, b, L._top);
    f.insertAdjacentHTML('beforeend', '<i class="shade"></i>');
    b.insertAdjacentHTML('beforeend', '<i class="shade"></i>');
    L.append(f, b);
    document.body.appendChild(L);
    return L;
  }
  function playTurn(dir, S, nb) {
    const main = $app.firstElementChild;
    if (main) main.style.animation = 'none';
    const both = S.spread && isSpread(nb);
    const layers = [];
    let L, from, to;
    if (both) {
      const nl = nb.querySelector(':scope > .leaf-l'), nr = nb.querySelector(':scope > .leaf-r');
      if (dir === 'next') {
        L = leaf(S.r.rect, S.r, snap(nl), 'left'); from = 0; to = -180;
        layers.push(still(S.l)); // old left stays until the leaf lands on it
      } else {
        L = leaf(S.l.rect, S.l, snap(nr), 'right'); from = 0; to = 180;
        layers.push(still(S.r));
      }
    } else if (dir === 'next') {
      // Single page: the page lifts off the spine and turns away. Only the
      // visible quarter (0 -> -90deg) is animated: past -90 it would be off
      // screen on a phone (the spine is the screen edge) and just look stuck.
      L = leaf(S.book.rect, S.book, null, 'left', S.cover ? 'endpaper' : ''); from = 0; to = -90;
    } else {
      // previous page, or the cover when closing: it comes in edge-on from the
      // spine and settles over the old page
      const ns = snap(nb);
      const st = still(S.book);
      layers.push(st);
      L = leaf(ns.rect, ns, null, 'left', nb.classList.contains('cover-book') ? 'endpaper' : ''); from = -90; to = 0;
      nb.style.visibility = 'hidden';
      // A different shape underneath (two pages -> one, pages -> the closed
      // cover): the old pages sink and fade while the new one lands, instead
      // of staying full size and vanishing in one frame at the end.
      const a = S.book.rect, b2 = ns.rect;
      if (Math.abs(a.width - b2.width) > 20 || Math.abs(a.height - b2.height) > 40) {
        st.style.transformOrigin = '0 50%';
        st.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.96)', opacity: 0 }],
          { duration: 560, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
      }
    }
    layers.push(L);
    SS.pageSound(nb.classList.contains('cover-book') && dir === 'prev' ? 'close' : 'turn');
    const quarter = Math.abs(to - from) === 90;
    const dur = quarter ? 560 : 760;
    // lifting away speeds up; coming back in slows down as it lands
    const ease = !quarter ? 'cubic-bezier(.45,.05,.3,1)' : from === 0 ? 'cubic-bezier(.45,0,.8,.6)' : 'cubic-bezier(.2,.6,.3,1)';
    const p = (a) => `perspective(2400px) rotateY(${a}deg)`;
    const frames = quarter ? [{ transform: p(from) }, { transform: p(to) }]
      : [{ transform: p(from) }, { transform: p((from + to) / 2) + ' scaleY(1.01)', offset: 0.5 }, { transform: p(to) }];
    const anim = L.animate(frames, { duration: dur, easing: ease, fill: 'forwards' });
    const [sf, sb] = L.querySelectorAll('.shade');
    sf.animate([{ opacity: from ? 0.45 : 0 }, { opacity: from ? 0 : 0.45 }], { duration: dur, easing: ease, fill: 'forwards' });
    sb.animate([{ opacity: from ? 0 : 0.45 }, { opacity: from ? 0.45 : 0 }], { duration: dur, easing: ease, fill: 'forwards' });
    const done = () => {
      if (turnDone !== done) return;
      turnDone = null;
      layers.forEach((x) => x.remove());
      nb.style.visibility = '';
    };
    turnDone = done;
    anim.onfinish = done;
    setTimeout(done, dur + 400); // safety net
  }

  // ------------------------------------------------------------------
  // Turning by swipe, edge tap and arrow keys
  // ------------------------------------------------------------------
  const INTERACTIVE = 'button, a, input, textarea, select, label, video, audio, .play-btn, .sheet';
  const canTurn = () => BOOK.indexOf(lastRoute) >= 0 && !document.body.classList.contains('recording') && !document.querySelector('.sheet-back') && !turnDone;
  let swipe = null, swiped = 0;
  $app.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || !e.target.closest('.book') || e.target.closest('textarea, input')) { swipe = null; return; }
    swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
  });
  $app.addEventListener('pointerup', (e) => {
    if (!swipe || !canTurn()) { swipe = null; return; }
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, dt = Date.now() - swipe.t;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 900 && !String(getSelection())) {
      swiped = Date.now();
      dx < 0 ? turnNext() : turnPrev();
    }
  });
  $app.addEventListener('pointercancel', () => (swipe = null));
  $app.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-turn]');
    if (tb) { e.preventDefault(); if (!turnDone) tb.dataset.turn === 'next' ? turnNext() : turnPrev(); return; }
    const book = e.target.closest('.book');
    if (!book || book.classList.contains('cover-book') || e.target.closest(INTERACTIVE) || Date.now() - swiped < 500 || !canTurn()) return;
    const r = book.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x > 0.84) turnNext(); else if (x < 0.16) turnPrev();
  });
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !canTurn()) return;
    const a = document.activeElement;
    if (a && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) return;
    if (e.key === 'ArrowRight') turnNext();
    if (e.key === 'ArrowLeft') turnPrev();
  });
  // Coming back after a while: the book is closed on her table, ribbon where she stopped
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3 && BOOK.indexOf(lastRoute) > 0 && !document.body.classList.contains('recording')) go('#/kitaab');
    hiddenAt = 0;
  });

  // ------------------------------------------------------------------
  // Page frame pieces
  // ------------------------------------------------------------------
  function runHead(text) {
    return `<header class="rh">
      <a class="iconbtn" href="#/anukram" aria-label="${esc(t('book.contentsLabel'))}">${MOTIF.contents()}</a>
      <span class="rh-t">${esc(text)}</span>
      <a class="iconbtn" href="#/kitaab" aria-label="${esc(t('book.close'))}">${MOTIF.bookShut()}</a>
    </header>`;
  }
  function pageFoot(n, o) {
    o = o || {};
    return `<footer class="pfoot">
      ${o.noPrev ? '<span class="pnav-gap"></span>' : `<button type="button" class="pnav" data-turn="prev" aria-label="${esc(t('book.prev'))}">${MOTIF.back()}</button>`}
      <span class="pno">${n ? '— ' + n + ' —' : ''}</span>
      <button type="button" class="pnav" data-turn="next" aria-label="${esc(t('book.next'))}">${MOTIF.fwd()}</button>
    </footer>`;
  }
  const chapterLine = (c) => t('chapter.label') + ' ' + c.number + ' · ' + r(c.title);
  const dogEar = '<span class="dog-ear" aria-hidden="true"></span>';

  function needsPin() {
    return !SS.isPH(EDITION.pin) && !SS.preview && !SS.ls.get('pinOk', false);
  }

  function gate() {
    if (SS.now() < SS.unlockAt()) return countdown();
    if (needsPin()) return go('#/pehchaan');
    const rv = EDITION.settings.reveal;
    if (rv.enabled && (!rv.playOncePerDevice || !SS.ls.get('revealDone', false))) return go('#/janamdin');
    return go('#/kitaab');
  }

  function notFound() {
    render(`<main class="screen center"><p class="big-title">${esc(t('notfound'))}</p><div style="height:24px"></div><a class="btn" href="#/anukram">${esc(t('chapter.back'))}</a></main>`);
  }

  // ------------------------------------------------------------------
  // Countdown
  // ------------------------------------------------------------------
  function countdown() {
    render(`<main class="screen center">
      <div>${MOTIF.diya('unlit')}</div>
      <p class="big-title" style="margin-top:24px">${esc(t('gate.countdown'))}</p>
      <div class="countdown" aria-live="off">
        <div><b data-d>0</b><span>${esc(t('gate.days'))}</span></div>
        <div><b data-h>0</b><span>${esc(t('gate.hours'))}</span></div>
        <div><b data-m>0</b><span>${esc(t('gate.mins'))}</span></div>
      </div></main>`, 'night');
    UI.dust();
    const tick = () => {
      const left = SS.unlockAt() - SS.now();
      if (left <= 0) { clearInterval(iv); location.hash = '#/'; route(); return; }
      $app.querySelector('[data-d]').textContent = Math.floor(left / 864e5);
      $app.querySelector('[data-h]').textContent = Math.floor((left % 864e5) / 36e5);
      $app.querySelector('[data-m]').textContent = Math.floor((left % 36e5) / 6e4);
    };
    const iv = setInterval(tick, 1000);
    tick();
    onLeave(() => clearInterval(iv));
  }

  // ------------------------------------------------------------------
  // PIN
  // ------------------------------------------------------------------
  function pin() {
    if (!needsPin()) return gate();
    // PIN length follows EDITION.pin (supports 4-6 digits), so the dots and the
    // "all digits entered" check always match the real PIN.
    const PIN_LEN = String(EDITION.pin).length;
    render(`<main class="screen center">
      <h1 class="big-title">${esc(t('pin.title'))}</h1>
      <p class="muted">${esc(r(EDITION.pinHint))}</p>
      <div class="pin-dots" aria-hidden="true">${'<i></i>'.repeat(PIN_LEN)}</div>
      <p class="pin-msg" role="alert"></p>
      <div class="keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}" aria-label="${n}">${n}</button>`).join('')}
        <span></span><button data-k="0" aria-label="0">0</button><button class="k-clear" data-k="x">${esc(t('pin.clear'))}</button>
      </div></main>`);
    let val = '';
    const dots = $app.querySelectorAll('.pin-dots i');
    const msg = $app.querySelector('.pin-msg');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
    const lockState = () => SS.ls.get('pinAttempts', { count: 0, start: Date.now(), lockedUntil: 0 });
    const press = (k) => {
      const st = lockState();
      if (st.lockedUntil > Date.now()) { msg.textContent = t('pin.locked'); return; }
      if (k === 'x') { val = val.slice(0, -1); paint(); return; }
      if (val.length >= PIN_LEN) return;
      val += k; paint();
      if (val.length === PIN_LEN) {
        if (val === String(EDITION.pin)) {
          SS.ls.set('pinOk', true); SS.ls.del('pinAttempts');
          setTimeout(gate, 250);
        } else {
          if (Date.now() - st.start > 15 * 60e3) { st.count = 0; st.start = Date.now(); }
          st.count++;
          if (st.count >= 5) { st.lockedUntil = Date.now() + 15 * 60e3; st.count = 0; st.start = Date.now(); }
          SS.ls.set('pinAttempts', st);
          const box = $app.querySelector('.pin-dots');
          box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
          msg.textContent = st.lockedUntil > Date.now() ? t('pin.locked') : t('pin.wrong');
          setTimeout(() => { val = ''; paint(); }, 400);
        }
      }
    };
    $app.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
    const key = (e) => { if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('x'); };
    document.addEventListener('keydown', key);
    onLeave(() => document.removeEventListener('keydown', key));
  }

  // ------------------------------------------------------------------
  // Birthday reveal
  // ------------------------------------------------------------------
  function reveal() {
    const rv = EDITION.settings.reveal;
    render(`<div class="dawn"></div><main class="screen center" id="rv"></main>`, 'night');
    const $rv = $app.querySelector('#rv');
    UI.dust();
    let alive = true;
    onLeave(() => { alive = false; });
    const skip = () => `<button class="btn link" data-skip style="margin-top:20px">${esc(t('reveal.next'))} →</button>`;

    // Beat 1: Andhera
    $rv.innerHTML = `
      <button class="diya-btn" id="light" aria-label="${esc(t('reveal.lightDiya'))}">${MOTIF.diya('unlit')}</button>
      <p class="big-title" style="margin-top:28px">${esc(t('reveal.lightDiya'))}</p>
      <p class="muted">${esc(t('reveal.tap'))}</p>
      ${SS.ls.get('revealDone', false) ? `<a class="btn link" href="#/kitaab" style="margin-top:36px">${esc(t('reveal.skipToBook'))}</a>` : ''}`;
    $rv.querySelector('#light').addEventListener('click', beat2, { once: true });

    async function beat2() {
      // unlock audio autoplay with a silent play inside the user gesture
      try { const a = new Audio(); a.muted = true; a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; a.play().catch(() => {}); } catch (e) { /* */ }
      SS.player.el = SS.player.el || new Audio();
      const d = $rv.querySelector('.diya');
      d.classList.remove('unlit'); d.classList.add('lit');
      $rv.querySelectorAll('p').forEach((p) => (p.style.opacity = 0));
      SS.vibrate(12);
      await SS.sleep(700);
      $app.querySelector('.dawn').classList.add('on');
      await SS.sleep(SS.reducedMotion() ? 300 : 2400);
      if (!alive) return;
      UI.setBody('');
      beat3();
    }

    // Beat 3: Pehli awaaz
    async function beat3() {
      const lines = INTRO.lines.map((l) => r(l));
      $rv.innerHTML = `<div style="margin-bottom:20px">${MOTIF.diya('lit')}</div>
        ${lines.map((l) => `<p class="hand-line hand-line--title">${esc(l)}</p>`).join('')}${skip()}`;
      $rv.querySelector('[data-skip]').addEventListener('click', beat4, { once: true });
      if (INTRO.voice) SS.player.play([INTRO.voice], {});
      const els = $rv.querySelectorAll('.hand-line');
      for (const el of els) { if (!alive) return; el.classList.add('on'); await SS.sleep(1500); }
      // tap-paced: once the lines are in, the small link becomes a proper button
      const sk = $rv.querySelector('[data-skip]');
      if (alive && sk) { sk.className = 'btn'; sk.style.marginTop = '28px'; }
    }

    // Beat 4 + 5: Cake & phoonk
    let micStream = null, raf = 0, ac = null;
    onLeave(() => stopMic());
    function stopMic() {
      cancelAnimationFrame(raf);
      try { micStream && micStream.getTracks().forEach((x) => x.stop()); } catch (e) { /* */ }
      try { ac && ac.close(); } catch (e) { /* */ }
      micStream = null; ac = null;
    }
    function beat4() {
      if (!alive) return;
      SS.player.stop();
      BGM.start(); // birthday song starts here and keeps playing across pages
      const names = rv.candles.map((k) => SS.callName(k) || k);
      $rv.innerHTML = `
        <button class="diya-btn" id="cake" style="border-radius:12px;width:100%" aria-label="${esc(t('reveal.blowTap'))}">${MOTIF.cake(names)}</button>
        <p class="big-title" style="margin-top:24px">${esc(t('reveal.blow'))}</p>
        <div class="blow-meter" hidden><i></i></div>
        <p class="muted" id="blowhint" aria-live="polite" style="min-height:1.6em;margin:10px 0 0"></p>
        ${rv.cake.blowToExtinguish && SS.micSupported() ? `<button class="btn" id="blowbtn" style="margin-top:14px">${MOTIF.mic()}<span>${esc(t('reveal.blowMic'))}</span></button>` : ''}
        <button class="btn link" id="tapone">${esc(t('reveal.blowTap'))}</button>`;
      let out = 0;
      const candles = [...$rv.querySelectorAll('.candle')];
      const cakeSvg = $rv.querySelector('.cake-wrap');
      const leans = candles.map((c) => c.querySelector('.lean'));
      const hint = $rv.querySelector('#blowhint');
      const blowBtn = $rv.querySelector('#blowbtn');
      const extinguishOne = () => {
        if (out >= candles.length) return;
        candles[out].classList.add('out'); out++;
        SS.vibrate(15);
        if (out === candles.length) done();
      };
      let finishing = false;
      const done = async () => {
        if (finishing) return; finishing = true;
        stopMic();
        await SS.sleep(900);
        beat6();
      };
      $rv.querySelector('#cake').addEventListener('click', extinguishOne);
      $rv.querySelector('#tapone').addEventListener('click', extinguishOne);
      // ---- Blow detection (phoonk) ----
      // The mic + AudioContext must start inside a tap (iOS Safari keeps it
      // suspended otherwise), so there is a clear "Phoonk se bujhaiye" button.
      // If permission was already given earlier we also try to start silently.
      if (blowBtn) {
        blowBtn.addEventListener('click', () => startBlow(true));
        SS.micState().then((st) => {
          if (st === 'denied') { blowBtn.remove(); return; }
          if (st === 'granted') startBlow(false);
        });
      }

      let listening = false;
      async function startBlow(fromTap) {
        if (finishing) return;
        if (listening) { if (ac && ac.state === 'suspended') ac.resume(); return; }
        if (fromTap && !SS.ls.get('micExplained', false) && (await SS.micState()) !== 'granted') {
          const ok = await new Promise((res) => {
            const s = UI.sheet(`<h2>${esc(t('reveal.micAsk'))}</h2><div class="btn-col"><button class="btn" data-ok>${esc(t('rec.permissionOk'))}</button><button class="btn ghost" data-no>${esc(t('reveal.blowTap'))}</button></div>`, { onClose: (v) => res(v === true) });
            s.el.querySelector('[data-ok]').addEventListener('click', () => s.close(true));
            s.el.querySelector('[data-no]').addEventListener('click', () => s.close(false));
          });
          if (!ok) return;
          SS.ls.set('micExplained', true);
        }
        listening = true;
        const AC = window.AudioContext || window.webkitAudioContext;
        ac = new AC(); // created inside the tap (when fromTap) so it isn't suspended
        try { micStream = await SS.getMic(true); }
        catch (e) { listening = false; stopMic(); hint.textContent = t('reveal.micOff'); if (blowBtn) blowBtn.remove(); return; }
        if (!alive || finishing) { stopMic(); return; }
        if (ac.state === 'suspended') { try { await ac.resume(); } catch (e) { /* */ } }
        if (ac.state === 'suspended') { listening = false; return; } // needs a tap; button stays
        const an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.3;
        ac.createMediaStreamSource(micStream).connect(an);
        const td = new Float32Array(an.fftSize), fd = new Float32Array(an.frequencyBinCount);
        const binHz = ac.sampleRate / an.fftSize;
        const meter = $rv.querySelector('.blow-meter'); meter.hidden = false;
        const bar = meter.querySelector('i');
        if (blowBtn) blowBtn.remove();
        hint.textContent = t('reveal.listening');

        // Calibrate the room's noise floor for the first ~600ms, then a "blow"
        // is: loud compared to the floor + energy mostly below 1.5kHz
        // (blowing on a mic is a low, rumbly noise; talking is higher/tonal).
        let floor = 0.01, calN = 0, acc = 0, last = performance.now(), blowSeen = false;
        const started = performance.now();
        const loop = () => {
          if (!alive || finishing) return;
          const now = performance.now();
          const dt = Math.min(64, now - last); last = now;
          an.getFloatTimeDomainData(td); an.getFloatFrequencyData(fd);
          let s = 0; for (let i = 0; i < td.length; i++) s += td[i] * td[i];
          const rms = Math.sqrt(s / td.length);
          if (now - started < 600) { floor = (floor * calN + rms) / (calN + 1); calN++; raf = requestAnimationFrame(loop); return; }
          // fd is in dB -> convert to linear power. lowShare = power below 1.5kHz.
          // flatness (100Hz-1.5kHz) = geometric/arithmetic mean: noise-like
          // blowing is "flat", talking/humming has harmonic peaks (low flatness).
          let low = 0, all = 0, logSum = 0, n = 0, bandSum = 0;
          for (let i = 1; i < fd.length; i++) {
            const p = Math.pow(10, fd[i] / 10);
            all += p;
            const hz = i * binHz;
            if (hz < 1500) low += p;
            if (hz >= 100 && hz < 1500) { logSum += Math.log(p + 1e-20); bandSum += p; n++; }
          }
          const lowShare = all ? low / all : 0;
          const flatness = n && bandSum ? Math.exp(logSum / n) / (bandSum / n) : 0;
          // Gentle thresholds: a normal soft phoonk from ~20-30cm should be enough.
          // (Talking/humming is still ignored by the flatness check.)
          const thr = Math.max(0.012, floor * 2.2);
          const isBlow = lowShare > 0.45 && flatness > 0.03;
          // 0..1 blow strength
          const strength = isBlow ? Math.min(1, Math.max(0, (rms - thr) / (thr * 1.5))) : 0;
          bar.style.width = Math.round(Math.min(1, rms / (thr * 2)) * 100) + '%';

          // flames lean away and shrink while she blows
          cakeSvg.classList.toggle('blowing', strength > 0.05);
          leans.forEach((l, i) => {
            if (candles[i].classList.contains('out')) return;
            const jitter = strength ? (Math.random() - 0.5) * 8 * strength : 0;
            l.style.transform = `skewX(${(-28 * strength + jitter).toFixed(1)}deg) scale(${(1 - 0.25 * strength).toFixed(2)}, ${(1 - 0.4 * strength).toFixed(2)})`;
          });

          // sustained blowing puts candles out one by one, left to right;
          // a stronger phoonk puts them out faster
          // ~1 second of soft blowing puts out all 5; short breath gaps don't reset progress
          if (strength > 0.02) {
            blowSeen = true;
            acc += dt * (0.9 + strength);
            if (acc >= 170) { acc = 0; extinguishOne(); }
          } else {
            acc = Math.max(0, acc - dt * 0.2);
          }
          // gentle fallback hint if nothing sounds like a blow for a while
          if (!blowSeen && now - started > 9000 && hint.textContent === t('reveal.listening')) hint.textContent = t('reveal.micOff');
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    }

    // Beat 6: Mubarak
    async function beat6() {
      if (!alive) return;
      const cover = SS.photo('P-REVEAL-1');
      $rv.innerHTML = `
        <p class="deva-title" lang="hi">${esc(SS.resolve(COPY['reveal.wish'][1] || COPY['reveal.wish'][0]).text)}</p>
        <h1 class="big-title" style="margin-top:6px">${esc(r(COPY['reveal.wish'][0]))}</h1>
        ${cover && cover.src ? UI.photoHTML('P-REVEAL-1', { tilt: -1.5, cls: 'fade-in', delay: 800 }) : ''}
        <div id="after" style="width:100%;margin-top:28px"></div>`;
      if (cover && cover.src) $rv.querySelector('.photo').style.maxWidth = '340px';
      UI.petals(36);
      SS.vibrate(20);
      SS.ls.set('revealDone', true);
      await SS.sleep(3000);
      if (!alive) return;
      beat7();
    }

    // Beat 7: Montage
    function beat7() {
      const clips = UI.greetings('wall').filter((g) => g.playInReveal && g.audio);
      const $a = $rv.querySelector('#after');
      if (!rv.montage.enabled || !clips.length) return beat8();
      $a.innerHTML = `<p class="hand-line on">${esc(t('reveal.montage'))}</p>
        <div id="mcard" style="margin:18px auto;max-width:300px"></div>
        <div class="btn-row"><button class="btn ghost" id="mpause">${MOTIF.pause()}<span class="sr-only">Pause</span></button><button class="btn ghost" id="mnext">${esc(t('reveal.next'))} →</button></div>`;
      let i = -1, total = 0, paused = false, timer = 0;
      const max = (rv.montage.maxSeconds || 90) * 1000;
      const el = new Audio();
      onLeave(() => { el.pause(); clearTimeout(timer); });
      const card = $a.querySelector('#mcard');
      const next = () => {
        clearTimeout(timer);
        i++;
        if (i >= clips.length || total >= max) { el.pause(); return beat8(); }
        const g = clips[i];
        card.innerHTML = (g.photo ? UI.photoHTML(g.photo, { tilt: i % 2 ? 1.5 : -1.5, ar: '1/1', cls: 'fade-in' }) : '') +
          `<p class="big-title" style="font-size:1.7rem;margin-top:12px">${esc(r(g.from))}</p><p class="small-caps">${esc(r(g.relation || ''))}</p>`;
        el.src = g.audio;
        const started = performance.now();
        el.play().catch(() => {});
        // each clip: full if short, else an excerpt up to 12s; respect total budget
        const limit = Math.min(12000, max - total);
        timer = setTimeout(() => { total += performance.now() - started; next(); }, limit);
        el.onended = () => { total += performance.now() - started; next(); };
      };
      $a.querySelector('#mnext').addEventListener('click', next);
      $a.querySelector('#mpause').addEventListener('click', (e) => {
        paused = !paused;
        if (paused) { el.pause(); clearTimeout(timer); } else { el.play().catch(() => {}); timer = setTimeout(next, 8000); }
        e.currentTarget.innerHTML = (paused ? MOTIF.play() : MOTIF.pause()) + '<span class="sr-only">' + (paused ? 'Play' : 'Pause') + '</span>';
      });
      next();
    }

    // Beat 8: Next
    function beat8() {
      const $a = $rv.querySelector('#after');
      const toWall = EDITION.settings.greetings.enabled && EDITION.settings.greetings.showBeforeKitaab;
      $a.innerHTML = `<button class="btn" id="tw">${esc(toWall ? t('reveal.toWall') : t('tohfa.open'))}</button>`;
      $a.querySelector('#tw').addEventListener('click', () => go(toWall ? '#/shubhkamnayein' : '#/tohfa'));
      $a.querySelector('#tw').focus();
    }
  }

  // ------------------------------------------------------------------
  // Greetings wall
  // ------------------------------------------------------------------
  function wall() {
    const list = UI.greetings('wall');
    // Video greetings as a swipeable reel: one framed video at a time, the
    // neighbours peeking in at the sides. No captions (they were file names).
    const N = GREETING_VIDEOS.length;
    const gv = N ? `<section class="reel" aria-roledescription="carousel" aria-label="${esc(t('wall.reel'))}">
        <div class="reel-stage">
        <div class="reel-track" tabindex="0">
          ${GREETING_VIDEOS.map((g, i) => `<div class="reel-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${N}" data-i="${i}">
            <div class="reel-frame">
              <video src="${esc(g.url)}#t=0.1" playsinline preload="metadata" aria-label="${esc(t('wall.reel'))} ${i + 1}"></video>
              <button type="button" class="reel-play" aria-label="${esc(t('wall.reel.play'))} ${i + 1}">${MOTIF.play()}</button>
            </div>
          </div>`).join('')}
        </div>
        ${N > 1 ? `
        <button type="button" class="reel-btn reel-prev" data-step="-1" aria-label="${esc(t('book.prev'))}">${MOTIF.back()}</button>
        <button type="button" class="reel-btn reel-next" data-step="1" aria-label="${esc(t('book.next'))}">${MOTIF.fwd()}</button>
        </div>
        <div class="reel-nav">
          <div class="reel-dots" role="tablist">${GREETING_VIDEOS.map((_, i) => `<button type="button" role="tab" class="reel-dot" data-go="${i}" aria-label="${i + 1} / ${N}"></button>`).join('')}</div>
        </div>
        <p class="reel-count" aria-live="polite"></p>` : '</div>'}
      </section>` : '';
    render(`<main class="screen">
      <div class="topbar"><a class="iconbtn" href="#/kitaab" aria-label="${esc(t('chapter.back'))}">${MOTIF.back()}</a><span class="label"></span></div>
      <div class="wall-title"><h1 class="big-title">${esc(t('wall.title'))}</h1></div>
      ${gv}
      ${list.length ? list.map(UI.greetingCard).join('') : (gv ? '' : `<p class="muted" style="text-align:center">${esc(t('wall.empty'))}</p>`)}
      <div style="height:16px"></div>
      <p class="hand-line on" style="text-align:center">${esc(t('wall.next'))}</p>
      <a class="btn" href="#/tohfa" style="margin-top:12px">${esc(t('reveal.next'))} →</a>
    </main>`);
    UI.wirePlay($app);
    // only one video at a time too
    $app.querySelectorAll('video').forEach((v) => v.addEventListener('play', () => { SS.player.stop(); $app.querySelectorAll('video').forEach((o) => o !== v && o.pause()); }));
    wireReel($app.querySelector('.reel'));
  }
  // Reel behaviour: snap scrolling, arrows/dots/keys, tap-to-play, pause what
  // slides away, and roll on to the next greeting when one finishes.
  function wireReel(reel) {
    if (!reel) return;
    const track = reel.querySelector('.reel-track');
    const slides = [...reel.querySelectorAll('.reel-slide')];
    const dots = [...reel.querySelectorAll('.reel-dot')];
    const count = reel.querySelector('.reel-count');
    const smooth = SS.reducedMotion() ? 'auto' : 'smooth';
    // `cur` is the source of truth. Buttons/dots/keys change it immediately
    // (so rapid clicks always count); the scroll position just follows. While
    // a button-driven scroll is animating we ignore scroll events, otherwise
    // the half-way position would drag `cur` back and the next click is lost.
    let cur = -1, auto = false, autoTimer = 0;
    const vid = (i) => slides[i] && slides[i].querySelector('video');
    const leftFor = (i) => slides[i].offsetLeft - (track.clientWidth - slides[i].clientWidth) / 2;
    const endAuto = () => { auto = false; clearTimeout(autoTimer); };
    const setCur = (i) => {
      if (i === cur) return;
      cur = i;
      slides.forEach((s, k) => s.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.setAttribute('aria-selected', k === i ? 'true' : 'false'));
      reel.querySelectorAll('.reel-btn').forEach((b) => { b.disabled = (+b.dataset.step < 0 && i === 0) || (+b.dataset.step > 0 && i === slides.length - 1); });
      if (count) count.textContent = `${i + 1} / ${slides.length}`;
      // anything that has slid away stops talking
      slides.forEach((s, k) => { if (k !== i) { const v = vid(k); if (!v.paused) v.pause(); } });
    };
    const goTo = (i, play) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      setCur(i);
      auto = true;
      clearTimeout(autoTimer);
      autoTimer = setTimeout(endAuto, 900); // fallback where 'scrollend' isn't supported
      track.scrollTo({ left: leftFor(i), behavior: smooth });
      if (play) vid(i).play().catch(() => {}); // may be blocked without a tap; the play button stays
    };
    // swipes: which slide is centred (nearest centre, once per frame)
    let raf = 0;
    const nearest = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((s, k) => { const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      return best;
    };
    track.addEventListener('scroll', () => {
      if (auto) { clearTimeout(autoTimer); autoTimer = setTimeout(endAuto, 150); return; }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCur(nearest()));
    }, { passive: true });
    track.addEventListener('scrollend', endAuto);
    // a finger on the track always wins over a running button scroll
    track.addEventListener('pointerdown', endAuto, { passive: true });
    track.addEventListener('wheel', endAuto, { passive: true });
    reel.querySelectorAll('.reel-btn').forEach((b) => b.addEventListener('click', () => goTo(cur + +b.dataset.step)));
    dots.forEach((d) => d.addEventListener('click', () => goTo(+d.dataset.go)));
    // ← / → anywhere on this page (not while typing or using a video's own controls)
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !reel.isConnected) return;
      const a = document.activeElement;
      if (a && (/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) || (a.tagName === 'VIDEO' && a.controls))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur - 1); }
    };
    document.addEventListener('keydown', onKey);
    onLeave(() => document.removeEventListener('keydown', onKey));
    // keep the current slide centred if the window is resized / rotated
    const onResize = () => track.scrollTo({ left: leftFor(cur), behavior: 'auto' });
    window.addEventListener('resize', onResize);
    onLeave(() => window.removeEventListener('resize', onResize));
    slides.forEach((s, k) => {
      const v = vid(k), btn = s.querySelector('.reel-play');
      // tapping a side slide brings it to the centre; tapping the centre one plays
      btn.addEventListener('click', () => { if (k !== cur) goTo(k); else v.play().catch(() => {}); });
      s.addEventListener('click', (e) => { if (k !== cur && !e.target.closest('.reel-play')) { e.preventDefault(); goTo(k); } });
      // once started, hand over to the native controls (pause, scrub, fullscreen)
      v.addEventListener('play', () => { s.classList.add('started', 'playing'); v.controls = true; if (k !== cur) goTo(k); });
      v.addEventListener('pause', () => s.classList.remove('playing'));
      v.addEventListener('ended', () => { s.classList.remove('playing'); if (k < slides.length - 1 && k === cur) setTimeout(() => { if (cur === k) goTo(k + 1, true); }, 700); });
    });
    setCur(0);
  }

  // ------------------------------------------------------------------
  // Tohfa (gift letter)
  // ------------------------------------------------------------------
  function tohfa() {
    const paras = r(INTRO.tohfaLetter).split(/\n\s*\n/);
    const third = Math.ceil(paras.length / 3);
    const panels = [paras.slice(0, third), paras.slice(third, third * 2), paras.slice(third * 2)].filter((p) => p.length);
    render(`<main class="screen">
      <div class="topbar"><a class="iconbtn" href="#/kitaab" aria-label="${esc(t('chapter.back'))}">${MOTIF.back()}</a><span class="label"></span></div>
      <div class="inland ${SS.reducedMotion() ? '' : 'unfold'}">
        ${panels.map((ps, i) => `<div class="panel">${i === 0 ? `<div class="stamp" aria-hidden="true">${MOTIF.diya('lit')}</div>` : ''}${ps.map((p) => `<p class="hand-line">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`).join('')}
      </div>
      ${INTRO.tohfaVoice ? UI.playBtnHTML(`data-src="${esc(INTRO.tohfaVoice)}"`, 'Play letter') : ''}
      <p class="muted" style="margin-top:20px">${esc(t('tohfa.explain'))}</p>
      <div class="spacer"></div>
      <a class="btn" href="#/kitaab" style="margin-top:20px" id="open">${esc(t('tohfa.open'))}</a>
    </main>`);
    UI.wirePlay($app);
    const lines = [...$app.querySelectorAll('.inland .hand-line')];
    const base = SS.reducedMotion() ? 0 : 1700;
    lines.forEach((l, i) => setTimeout(() => l.classList.add('on'), base + i * 300));
    $app.querySelector('#open').addEventListener('click', () => SS.ls.set('tohfaSeen', true));
  }

  // ------------------------------------------------------------------
  // Album (home)
  // ------------------------------------------------------------------
  async function answersMap() {
    const all = await SS.answers.all();
    const m = {};
    all.forEach((a) => (m[a.key] = a));
    return m;
  }
  function suggest(ans) {
    const start = EDITION.settings.kitaab.suggestedStartChapter;
    const chs = SS.chapters();
    const si = Math.max(0, chs.findIndex((c) => c.key === start));
    const order = chs.slice(si).concat(chs.slice(0, si)).filter((c) => !c.gated);
    for (const c of order) {
      for (const q of SS.visibleQuestions(c.key)) {
        if (SS.weight(q) === 'heavy') continue;
        const a = ans[q.key];
        if (a && (a.status === 'kept' || a.status === 'not_today')) continue;
        return q;
      }
    }
    return null;
  }
  const enc = encodeURIComponent;
  const keptOf = (ans, key) => !!(ans[key] && ans[key].status === 'kept' && SS.hasContent(ans[key]));

  // ------------------------------------------------------------------
  // Cover (closed cloth-bound book, mauli tied across, ribbon bookmark)
  // ------------------------------------------------------------------
  async function cover() {
    const last = SS.ls.get('lastQ', null);
    const lastPg = last && SS.findQuestion(last) ? BOOK.num('sawaal/' + last) : null;
    const shimmer = !sessionStorage.getItem('ss_foil') && !SS.reducedMotion();
    sessionStorage.setItem('ss_foil', '1');
    // "Mamma ki Kahani" -> a small italic "Mamma ki" over a big "Kahani"
    const words = t('book.coverTitle').trim().split(/\s+/);
    const big = words.pop(), pre = words.join(' ');
    // admin -> Collage media (already fetched at boot, so usually instant)
    const cached = galleryCache.data ? UI.collageItems(galleryCache.data) : [];
    render(`<main class="screen center bookscreen cover-screen ${cached.length ? 'has-collage' : ''}">
      <button class="iconbtn cover-menu" id="menu" aria-label="${esc(t('album.menu'))}">${MOTIF.menu()}</button>
      <div class="book cover-book">
        <button type="button" class="cover ${shimmer ? 'shimmer' : ''}" id="open" aria-label="${esc(t('book.openLabel'))}: ${esc(t('book.coverTitle'))}">
          <span class="spine" aria-hidden="true"></span>
          <span class="cloth" aria-hidden="true">
            ${MOTIF.arch()}
            <span class="cv-inner">
              <span class="cover-motif">${MOTIF['rangoli-lotus']()}</span>
              ${pre ? `<span class="cv-pre">${esc(pre)}</span>` : ''}
              <span class="cover-title">${esc(big)}</span>
              <span class="cv-rule"><i></i><b></b><i></i></span>
              <span class="cv-deva" lang="hi">${esc(t('book.coverDeva'))}</span>
            </span>
            <span class="cover-sub">${esc(t('book.edition', { year: SS.bookYear() }))}</span>
          </span>
          ${MOTIF.mauliTie()}
          <span class="cv-sheen" aria-hidden="true"></span>
        </button>
        ${lastPg ? `<a class="ribbon" id="ribbon" href="#/sawaal/${enc(last)}" aria-label="${esc(t('book.bookmark', { n: lastPg }))}"><span class="rb-n" aria-hidden="true">${lastPg}</span></a>` : ''}
      </div>
    </main>`, 'desk cover-desk');
    const screen = $app.querySelector('.cover-screen');
    const book = $app.querySelector('.cover-book');
    const mount = (items) => {
      screen.classList.toggle('has-collage', items.length > 0);
      UI.mountCollage(screen, book, items, onLeave);
    };
    if (galleryCache.data) mount(cached);
    else fetchGallery().then((d) => { if (screen.isConnected) mount(UI.collageItems(d)); }).catch(() => { if (screen.isConnected) mount([]); });

    // the birthday song: if she came straight here (skipped the reveal, reload),
    // her first tap on this screen starts it. start() is a no-op once playing.
    const kick = () => BGM.start();
    document.addEventListener('pointerdown', kick, true);
    document.addEventListener('keydown', kick, true);
    onLeave(() => { document.removeEventListener('pointerdown', kick, true); document.removeEventListener('keydown', kick, true); });

    // a little light follows the pointer across the cloth (mouse / pen only)
    if (!SS.reducedMotion() && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const cv = book.querySelector('.cover');
      cv.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        book.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg');
        book.style.setProperty('--rx', (-y * 4).toFixed(2) + 'deg');
        book.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%');
        book.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      cv.addEventListener('pointerleave', () => ['--rx', '--ry', '--mx', '--my'].forEach((k) => book.style.removeProperty(k)));
    }

    let opening = false;
    const open = (to) => {
      if (opening) return;
      opening = true;
      SS.primeAudio(); // inside the tap, so the page sound may play
      ['--rx', '--ry', '--mx', '--my'].forEach((k) => book.style.removeProperty(k));
      if (SS.reducedMotion()) return go(to);
      book.classList.add('untie');
      screen.classList.add('opening');
      SS.vibrate(10);
      setTimeout(() => { if (lastRoute === 'kitaab') go(to); }, 720);
    };
    $app.querySelector('#open').addEventListener('click', () => open('#/pehla-panna'));
    const rb = $app.querySelector('#ribbon');
    if (rb) rb.addEventListener('click', (e) => { e.preventDefault(); open(rb.getAttribute('href')); });
    $app.querySelector('#menu').addEventListener('click', menu);
    UI.dust();
  }

  // ------------------------------------------------------------------
  // Title page
  // ------------------------------------------------------------------
  function titlePage() {
    const from = SS.resolve(COPY['book.from'][0]);
    render(`<main class="screen bookscreen">
      <article class="book page-title" aria-label="${esc(t('book.coverTitle'))}">
        <div class="tp">
          <div class="tp-motif">${MOTIF.diyaLine()}</div>
          <h1 class="tp-title">${esc(t('book.coverTitle'))}</h1>
          <div class="tp-rule" aria-hidden="true"><i></i>${MOTIF.marigold(true)}<i></i></div>
          <p class="tp-ed">${esc(t('book.edition', { year: SS.bookYear() }))}</p>
          ${UI.photoHTML('P-COVER', { tilt: -1.5, hideEmpty: true, cls: 'tp-photo' })}
          ${from.missing.length ? '' : `<p class="tp-from">${esc(from.text)}</p>`}
        </div>
        <div class="spacer"></div>
        ${pageFoot('')}
      </article>
    </main>`, 'desk');
  }

  // ------------------------------------------------------------------
  // Contents ("Chapter 3 · Nanaji aur Naniji …… 12")
  // ------------------------------------------------------------------
  async function contents() {
    const ans = await answersMap();
    const q = suggest(ans);
    const bloom = SS.ls.get('bloom', null);
    SS.ls.del('bloom');
    const keptCount = Object.keys(ans).filter((k) => keptOf(ans, k)).length;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const showPwa = keptCount >= 3 && !standalone && !SS.ls.get('pwaShown', false);
    const rows = SS.chapters().map((c) => {
      const qs = SS.visibleQuestions(c.key);
      if (!qs.length) return '';
      const done = qs.filter((x) => keptOf(ans, x.key));
      const flowers = done.map((x) => MOTIF.marigold(true).replace('class="marigold', `class="marigold${bloom === x.key ? ' bloom' : ''}`)).join('');
      return `<li><a class="toc-row" href="#/adhyay/${enc(c.key)}">
        <span class="toc-num">${esc(t('chapter.label'))} ${c.number}</span>
        <span class="toc-line"><span class="toc-title">${esc(r(c.title))}</span><span class="leader" aria-hidden="true"></span><span class="toc-pg"><span class="sr-only">panna </span>${BOOK.num('adhyay/' + c.key)}</span></span>
        ${done.length ? `<span class="toc-dots" role="img" aria-label="${done.length} / ${qs.length}">${flowers}</span>` : ''}
      </a></li>`;
    }).join('');
    render(`<main class="screen bookscreen">
      <article class="book page-contents">
        <header class="rh">
          <a class="iconbtn" href="#/kitaab" aria-label="${esc(t('book.close'))}">${MOTIF.bookShut()}</a>
          <span class="rh-t">${esc(t('book.coverTitle'))}</span>
          <button class="iconbtn" id="menu" aria-label="${esc(t('album.menu'))}">${MOTIF.menu()}</button>
        </header>
        <h1 class="toc-h">${esc(t('book.contents'))}</h1>
        ${showPwa ? `<div class="notice" id="pwa">${esc(t('pwa.install'))}<br><span class="faint">${esc(SS.isIOS() ? t('pwa.ios') : t('pwa.android'))}</span><br><button class="btn link" id="pwaok" style="width:auto;min-height:44px;padding:0">OK</button></div>` : ''}
        ${q ? `<a class="slip" href="#/sawaal/${enc(q.key)}">
            <span class="small-caps">${esc(t('album.today'))}</span>
            <span class="slip-q">${esc(SS.questionStatus(q).prompt)}</span>
            <span class="slip-go">${esc(t('album.answer'))} →</span></a>`
          : `<p class="slip slip-done">${esc(t('album.allDone'))}</p>`}
        <ol class="toc">${rows}
          <li><a class="toc-row" href="#/tasveerein"><span class="toc-line"><span class="toc-title">${esc(t('gallery.photos.title'))}</span><span class="leader" aria-hidden="true"></span><span class="toc-pg">🌼</span></span></a></li>
          <li><a class="toc-row" href="#/aawaazein"><span class="toc-line"><span class="toc-title">${esc(t('gallery.voices.title'))}</span><span class="leader" aria-hidden="true"></span><span class="toc-pg">🎙️</span></span></a></li>
          <li><a class="toc-row" href="#/antim"><span class="toc-line"><span class="toc-title">${esc(t('book.end'))}</span><span class="leader" aria-hidden="true"></span><span class="toc-pg">${BOOK.num('antim')}</span></span></a></li>
        </ol>
        ${pageFoot('')}
      </article>
    </main>`, 'desk');
    $app.querySelector('#menu').addEventListener('click', menu);
    const pwaok = $app.querySelector('#pwaok');
    if (pwaok) pwaok.addEventListener('click', () => { SS.ls.set('pwaShown', true); $app.querySelector('#pwa').remove(); });
  }

  // ------------------------------------------------------------------
  // Colophon (last page)
  // ------------------------------------------------------------------
  async function endPage() {
    const ans = await answersMap();
    const kept = Object.keys(ans).filter((k) => keptOf(ans, k)).length;
    const total = BOOK.all().filter((p) => p.t === 'q').length;
    const place = SS.resolve(COPY['book.colophonPlace'][0], { vars: { year: SS.bookYear() } });
    render(`<main class="screen bookscreen">
      <article class="book page-end">
        ${runHead(r(EDITION.title))}
        <div class="colophon">
          ${MOTIF.diya('lit')}
          <h1 class="end-word">${esc(t('book.end'))}</h1>
          <div class="tp-rule" aria-hidden="true"><i></i>${MOTIF.marigold(true)}<i></i></div>
          <p class="colo">${esc(t('book.colophon'))}</p>
          <p class="colo-place">${esc(place.missing.length ? SS.bookYear() : place.text)}</p>
          <p class="faint">${esc(t('book.colophonCount', { kept, total }))}</p>
        </div>
        <div class="spacer"></div>
        <a class="btn soft" href="#/kitaab">${MOTIF.bookShut()}<span>${esc(t('book.close'))}</span></a>
        ${pageFoot(BOOK.num('antim'))}
      </article>
    </main>`, 'desk');
  }

  // ------------------------------------------------------------------
  // Album media (photos collage + recordings) — read from /api/gallery.
  // These are the photos and the voice/video recordings the family uploads
  // from admin.html. Best-effort: if there's no backend (static hosting) or
  // nothing uploaded yet, the pages show a gentle empty message.
  // ------------------------------------------------------------------
  const galleryCache = { data: null, at: 0 };
  async function fetchGallery(force) {
    const CfG = (EDITION.settings && EDITION.settings.backup) || {};
    const space = CfG.space || EDITION.slug || 'edition';
    if (!force && galleryCache.data && Date.now() - galleryCache.at < 60e3) return galleryCache.data;
    const res = await fetch('api/gallery?space=' + encodeURIComponent(space), { cache: 'no-store' });
    if (!res.ok) throw new Error('load ' + res.status);
    const data = await res.json();
    galleryCache.data = data; galleryCache.at = Date.now();
    return data;
  }

  function mediaBack() {
    return `<header class="rh">
      <a class="iconbtn" href="#/anukram" aria-label="${esc(t('book.contentsLabel'))}">${MOTIF.contents()}</a>
      <span class="rh-t">${esc(t('book.coverTitle'))}</span>
      <a class="iconbtn" href="#/kitaab" aria-label="${esc(t('book.close'))}">${MOTIF.bookShut()}</a>
    </header>`;
  }

  // Photo collage
  async function tasveerein() {
    render(`<main class="screen bookscreen"><article class="book page-gallery">
      ${mediaBack()}
      <h1 class="big-title gall-h">${esc(t('gallery.photos.title'))}</h1>
      <p class="chap-sub">${esc(t('gallery.photos.sub'))}</p>
      <div id="gall" class="collage"><p class="muted center">${esc(t('gallery.loading'))}</p></div>
      <div class="spacer"></div>
      <a class="btn soft" href="#/anukram" style="margin-top:12px">${esc(t('chapter.back'))}</a>
    </article></main>`, 'desk');
    const box = $app.querySelector('#gall');
    try {
      const data = await fetchGallery();
      const photos = (data.photos || []);
      if (!photos.length) { box.innerHTML = `<p class="muted center">${esc(t('gallery.photos.empty'))}</p>`; return; }
      box.innerHTML = photos.map((p, i) => `
        <figure class="tile" data-i="${i}">
          <img src="${esc(p.url)}" alt="${esc(p.caption || '')}" loading="lazy">
          ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
        </figure>`).join('');
      // tap a tile to view it big
      box.querySelectorAll('.tile').forEach((el) => el.addEventListener('click', () => {
        const p = photos[+el.dataset.i];
        const s = UI.sheet(`<img src="${esc(p.url)}" alt="${esc(p.caption || '')}" style="max-width:100%;border-radius:10px">${p.caption ? `<p class="hand" style="margin-top:10px">${esc(p.caption)}</p>` : ''}<button class="btn ghost" data-close style="margin-top:12px">${esc(t('menu.close'))}</button>`, { label: 'Photo' });
        s.el.querySelector('[data-close]').addEventListener('click', () => s.close());
      }));
    } catch (e) {
      box.innerHTML = `<p class="muted center">${esc(t('gallery.offline'))}</p>`;
    }
  }

  // Recordings (video + audio) gathered from other people
  async function aawaazein() {
    render(`<main class="screen bookscreen"><article class="book page-gallery">
      ${mediaBack()}
      <h1 class="big-title gall-h">${esc(t('gallery.voices.title'))}</h1>
      <p class="chap-sub">${esc(t('gallery.voices.sub'))}</p>
      <div id="gall" class="rec-list"><p class="muted center">${esc(t('gallery.loading'))}</p></div>
      <div class="spacer"></div>
      <a class="btn soft" href="#/anukram" style="margin-top:12px">${esc(t('chapter.back'))}</a>
    </article></main>`, 'desk');
    const box = $app.querySelector('#gall');
    try {
      const data = await fetchGallery();
      const vids = (data.videos || []);
      if (!vids.length) { box.innerHTML = `<p class="muted center">${esc(t('gallery.voices.empty'))}</p>`; return; }
      const isVideo = (ext) => ['mp4', 'webm', 'mov', 'm4v'].includes((ext || '').toLowerCase());
      box.innerHTML = vids.map((v) => `
        <figure class="rec-card">
          ${isVideo(v.ext)
            ? `<video src="${esc(v.url)}" controls preload="metadata" playsinline></video>`
            : `<audio src="${esc(v.url)}" controls preload="metadata"></audio>`}
          ${v.caption ? `<figcaption class="hand">${esc(v.caption)}</figcaption>` : ''}
        </figure>`).join('');
    } catch (e) {
      box.innerHTML = `<p class="muted center">${esc(t('gallery.offline'))}</p>`;
    }
  }

  function menu() {
    const phone = EDITION.helpContact && !SS.isPH(EDITION.helpContact.phone) ? EDITION.helpContact.phone : null;
    const s = UI.sheet(`
      <h2>${esc(r(EDITION.title))}</h2>
      <button class="opt" data-go="#/janamdin">${esc(t('menu.replay'))}</button>
      <button class="opt" data-go="#/shubhkamnayein">${esc(t('menu.greetings'))}</button>
      <button class="opt" data-go="#/tasveerein">${esc(t('menu.photos'))}</button>
      <button class="opt" data-go="#/aawaazein">${esc(t('menu.voices'))}</button>
      <button class="opt" data-go="#/tohfa">${esc(t('menu.tohfa'))}</button>
      <button class="opt" data-go="#/kitaab">${esc(t('menu.book'))}</button>
      <button class="opt" data-share>${esc(t('menu.share'))}</button>
      <label class="toggle">${esc(t('menu.lessMotion'))}<input type="checkbox" data-motion ${SS.ls.get('lessMotion', false) ? 'checked' : ''}></label>
      <label class="toggle">${esc(t('menu.pageSound'))}<input type="checkbox" data-sound ${SS.pageSoundOn() ? 'checked' : ''}></label>
      <label class="toggle"><span>${esc(COPY['menu.hindi'][0])} <span class="faint">(${esc(COPY['menu.hindi'][1])})</span></span><input type="checkbox" data-hindi ${SS.lang() === 'hindi' ? 'checked' : ''}></label>
      ${phone ? `<a class="opt" href="tel:${esc(phone)}">${esc(t('menu.help'))}</a>` : ''}
      <button class="btn ghost" data-close style="margin-top:6px">${esc(t('menu.close'))}</button>`, { label: 'Menu' });
    s.el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { s.close(); go(b.dataset.go); }));
    s.el.querySelector('[data-close]').addEventListener('click', () => s.close());
    s.el.querySelector('[data-share]').addEventListener('click', () => { s.close(); shareCopy(); });
    s.el.querySelector('[data-motion]').addEventListener('change', (e) => { SS.ls.set('lessMotion', e.target.checked); s.close(); route(); });
    s.el.querySelector('[data-hindi]').addEventListener('change', (e) => { SS.ls.set('lang', e.target.checked ? 'hindi' : 'hinglish'); s.close(); route(); });
    s.el.querySelector('[data-sound]').addEventListener('change', (e) => {
      SS.ls.set('pageSound', e.target.checked);
      if (e.target.checked) { SS.primeAudio(); setTimeout(() => SS.pageSound('turn'), 60); } // a sample, inside the tap
    });
  }

  async function shareCopy() {
    UI.toast(t('share.preparing'));
    try {
      const file = await SS.exportFile();
      const res = await SS.shareOrDownload(file, r(EDITION.title));
      if (res !== 'cancelled') UI.toast(t('share.done'), true);
      SS.ls.set('lastShareCount', (await SS.answers.all()).filter((a) => a.status === 'kept').length);
    } catch (e) { console.error(e); UI.toast('Abhi nahi ho paaya. Thodi der baad phir try kijiye.'); }
  }

  // ------------------------------------------------------------------
  // Chapter
  // ------------------------------------------------------------------
  // Chapter opener: a section page (number in Roman + Devanagari, the
  // rangoli in the centre, the cover photo pasted in), and on the facing
  // page the chapter's own little contents.
  async function chapter(key) {
    const c = SS.chapter(key);
    if (!c || c.enabled === false) return notFound();
    if (c.gated && !sessionStorage.getItem('ss_gate_' + c.key)) return yaadonRitual(c);
    const qs = SS.visibleQuestions(c.key);
    const ans = await answersMap();
    const first = qs.find((q) => !keptOf(ans, q.key)) || qs[0];
    const motif = (c.motif === 'diya' ? MOTIF.diyaLine : (MOTIF[c.motif] || MOTIF['rangoli-lotus']))();
    const allDone = qs.length && qs.every((q) => keptOf(ans, q.key));
    const started = qs.some((q) => keptOf(ans, q.key));
    const tributes = c.key === 'yaadon-mein' ? UI.greetings('tribute') : [];
    const pal = 'pal-' + c.palette;
    render(`<main class="screen bookscreen">
      <article class="book spread ${pal}">
        <section class="leaf leaf-l ${pal} chap-page ${SS.reducedMotion() ? '' : 'animate'}">
          ${runHead(r(EDITION.title))}
          <div class="chap-nums"><span class="small-caps">${esc(COPY['chapter.label'][0])} ${c.number}</span><span class="deva" lang="hi">${esc(COPY['chapter.label'][1])} ${SS.devaNum(c.number)}</span></div>
          <div class="rangoli-wrap">${motif}
            <div class="titles">
              <h1 class="big-title">${esc(r(c.title))}</h1>
              <p class="deva-title" lang="hi">${esc(c.deva || '')}</p>
            </div>
          </div>
          <p class="chap-sub">${esc(r(c.subtitle || ''))}</p>
          ${c.cover ? UI.photoHTML(c.cover, { cls: 'plate fade-in', delay: 900, hideEmpty: true }) : ''}
          <div class="spacer"></div>
        </section>
        <section class="leaf leaf-r ${pal}">
          <div class="ornament" aria-hidden="true"><i></i>${MOTIF.marigold(true)}<i></i></div>
          <h2 class="small-caps in-chap">${esc(t('book.inChapter'))}</h2>
          <ol class="qlist">
            ${qs.map((q) => {
              const a = ans[q.key];
              const heavy = SS.weight(q) === 'heavy' && !c.gated;
              const words = SS.questionStatus(q).prompt.split(/\s+/);
              const short = words.slice(0, 7).join(' ') + (words.length > 7 ? '…' : '');
              const kept = keptOf(ans, q.key);
              const state = kept ? MOTIF.marigold(true) : heavy ? MOTIF.feather() : MOTIF.marigold(false);
              const nt = !kept && a && a.status === 'not_today';
              return `<li><a href="#/sawaal/${enc(q.key)}" class="${nt ? 'nt' : ''}"><span class="state">${state}</span>
                <span class="qt">${esc(heavy ? t('chapter.heavyLine') : short)}${a && a.seal ? ' ✉︎' : ''}</span>
                ${nt ? '<span class="mini-ear" aria-hidden="true"></span>' : ''}<span class="toc-pg">${BOOK.num('sawaal/' + q.key)}</span></a></li>`;
            }).join('')}
          </ol>
          ${allDone ? `<p class="notice">${esc(t('chapter.done'))}</p>` : ''}
          ${first ? `<a class="btn" href="#/sawaal/${enc(first.key)}">${esc(started && !allDone ? t('q.next') : t('chapter.start'))} →</a>` : ''}
          ${tributes.length ? `<h2 class="big-title" style="font-size:1.6rem;margin:28px 0 18px">${esc(t('chapter.yaadon.tributes'))}</h2>${tributes.map(UI.greetingCard).join('')}` : ''}
          <div class="spacer"></div>
          ${pageFoot(BOOK.num('adhyay/' + c.key))}
        </section>
      </article>
    </main>`, 'desk');
    UI.wirePlay($app);
  }

  function yaadonRitual(c) {
    const ppl = (c.diyas || []).filter((k) => SS.people[k]);
    render(`<main class="screen center">
      <div class="topbar" style="align-self:stretch"><a class="iconbtn" href="#/anukram" aria-label="${esc(t('book.contentsLabel'))}">${MOTIF.back()}</a></div>
      <p class="big-title" style="font-size:1.6rem">${esc(t('chapter.yaadon.intro'))}</p>
      <div class="diya-row">
        ${ppl.map((k) => {
          const p = SS.people[k];
          const ph = p.photo && SS.photo(p.photo);
          return `<button data-k="${k}" aria-pressed="false" aria-label="${esc(SS.callName(k))} ke liye diya">
            ${ph && ph.src ? UI.photoHTML(p.photo, {}) : ''}${MOTIF.diya('unlit')}<span class="nm">${esc(SS.callName(k))}</span></button>`;
        }).join('')}
      </div>
      <div id="ready" style="width:100%"></div>
      <a class="btn link" href="${BOOK.afterChapter(c.key)}" style="margin-top:28px">${esc(t('book.skipChapter'))} →</a>
    </main>`, 'night');
    UI.dust();
    let lit = 0;
    $app.querySelectorAll('.diya-row button').forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      b.setAttribute('aria-pressed', 'true');
      const d = b.querySelector('.diya'); d.classList.remove('unlit'); d.classList.add('lit');
      SS.vibrate(10);
      lit++;
      if (lit === ppl.length) setTimeout(() => {
        const $r = $app.querySelector('#ready');
        $r.innerHTML = `<p class="big-title" style="font-size:1.7rem;margin:22px 0 16px">${esc(t('chapter.yaadon.ready'))}</p>
          <div class="btn-col"><button class="btn" id="yes">${esc(t('q.heavyYes'))}</button><a class="btn ghost" href="#/anukram">${esc(t('q.heavyNo'))}</a></div>`;
        $r.querySelector('#yes').addEventListener('click', () => { sessionStorage.setItem('ss_gate_' + c.key, '1'); chapter(c.key); });
        $r.querySelector('#yes').focus();
      }, 900);
    }));
  }

  // ------------------------------------------------------------------
  // Question
  // ------------------------------------------------------------------
  async function question(key) {
    const q = SS.findQuestion(key);
    if (!q) return notFound();
    const st = SS.questionStatus(q);
    if (!st.visible) return notFound();
    const c = SS.chapter(q.chapter);
    if (c.gated && !sessionStorage.getItem('ss_gate_' + c.key)) return yaadonRitual(c);
    const heavy = SS.weight(q) === 'heavy';
    if (heavy && !c.gated && !sessionStorage.getItem('ss_heavy_' + q.key)) return heavyGate(q, c);

    SS.ls.set('lastQ', q.key);
    let ans = (await SS.answers.get(q.key)) || null;
    // text draft mirror (survives refresh even if IDB write was in flight)
    const mirror = SS.ls.get('draft:' + q.key, null);
    if (mirror && (!ans || (mirror.at > (ans.updatedAt || 0) && mirror.text !== ans.text))) {
      ans = await SS.answers.save(q.key, { text: mirror.text });
    }
    const qs = SS.visibleQuestions(c.key);
    const lastInChapter = qs.length && qs[qs.length - 1].key === q.key;
    const photo = q.photo && SS.photo(q.photo);
    const here = 'sawaal/' + q.key;
    const pg = BOOK.num(here);
    const pal = 'pal-' + c.palette;
    const keptNow = ans && ans.status === 'kept' && SS.hasContent(ans);
    const drop = (st.prompt.match(/^\p{L}/u) || [''])[0];
    const rest = st.prompt.slice(drop.length);

    // left page: the question, set like a printed page. Right page: her answer.
    render(`<main class="screen bookscreen">
      <article class="book spread ${pal} ${ans && ans.status === 'not_today' && !keptNow ? 'folded' : ''}">
        ${dogEar}
        <section class="leaf leaf-l ${pal}">
          ${runHead(chapterLine(c))}
          ${photo && photo.src ? UI.photoHTML(q.photo, { cls: 'q-photo fade-in' }) + `<div class="q-photo-line">${esc(t('q.photo'))}</div>` : ''}
          ${EDITION.settings.kitaab.showAskedBy ? `<div class="small-caps asked">${esc(SS.askedByLine(q.askedBy))}</div>` : ''}
          <h1 class="qtext" lang="hi-Latn" aria-label="${esc(st.prompt)}">${drop ? `<span class="dropcap" aria-hidden="true">${esc(drop)}</span>` : ''}<span class="qw" aria-hidden="true"></span></h1>
          ${st.sub ? `<p class="qsub" lang="hi-Latn">${esc(st.sub)}</p>` : ''}
        </section>
        <section class="leaf leaf-r ${pal}">
          <div id="kept"></div>
          <div id="work"></div>
          <div id="after"></div>
          <div class="spacer"></div>
          <div class="q-foot" id="foot" style="justify-content:center">
            <button class="btn link" id="nottoday" style="flex:0 1 auto" ${keptNow ? 'hidden' : ''}>${esc(t('q.notToday'))}</button>
          </div>
          ${pageFoot(pg)}
        </section>
      </article>
    </main>
    <div class="vignette"></div>`, 'desk');
    const $qw = $app.querySelector('.qtext .qw');
    const delay = SS.reducedMotion() ? 0 : UI.wordReveal($qw, rest);
    $qw.removeAttribute('aria-label');
    if (SS.reducedMotion()) $qw.textContent = rest;
    const sub = $app.querySelector('.qsub');
    if (sub) sub.style.animationDelay = delay + 400 + 'ms';

    const $kept = $app.querySelector('#kept'), $work = $app.querySelector('#work'), $after = $app.querySelector('#after');
    // "Next" turns the page. After the last question of a chapter the book closes to its cover.
    const goNext = () => go(lastInChapter ? '#/kitaab' : BOOK.next(here));
    // "Not today": fold the page corner (as if marked to come back), then turn.
    // It won't be suggested as "Aaj ka sawaal" again, but stays open any time.
    $app.querySelector('#nottoday').addEventListener('click', async () => {
      const a = await SS.answers.get(q.key);
      if (!(a && a.status === 'kept')) {
        await SS.answers.save(q.key, { status: 'not_today' });
        if (!SS.reducedMotion()) { $app.querySelector('.book').classList.add('folded', 'folding'); await SS.sleep(520); }
      }
      go(BOOK.next(here));
    });

    if (ans && ans.recovered) {
      UI.toast(t('rec.recovered'), true);
      ans = await SS.answers.save(q.key, { recovered: false });
    }

    // ---- her answer, as the text of the book ----
    const paras = (s) => s.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const envelope = (seal, inner) => `<div class="envelope">
        <div class="env-body">
          <span class="env-flap" aria-hidden="true"></span>
          ${MOTIF.mauli()}${MOTIF.waxSeal()}
          <div class="cond">${esc(SS.sealLabel(seal))}</div>
          <button type="button" class="btn link env-read">${esc(t('book.readSealed'))}</button>
        </div>
        <div class="env-letter" hidden>${inner}</div>
      </div>`;
    let drawSeq = 0;
    async function drawKept() {
      const seq = ++drawSeq;
      if (!ans || !SS.hasContent(ans) || ans.status !== 'kept') { $kept.innerHTML = ''; return; }
      const a = ans;
      const segs = SS.activeSegments(a);
      // drawn synchronously (so a page turn shows it); the recording date fills in after
      if (segs.length) SS.recordedAt(a).then((iso) => {
        const el = seq === drawSeq && $kept.querySelector('.mn-date');
        if (el && iso) el.textContent = SS.formatDate(iso);
      });
      const voice = segs.length ? `<aside class="margin-note">
          <span class="mn-label">${esc(t('book.said'))}</span>
          ${UI.playBtnHTML('data-mine', t('rec.play'))}
          <span class="mn-date"></span>
          <button type="button" class="mn-del" data-del>${MOTIF.trash()}<span>${esc(t('rec.deleteShort'))}</span></button>
        </aside>` : '';
      const text = a.text && a.text.trim() ? `<div class="book-text" lang="hi-Latn">${paras(a.text)}</div>` : '';
      const body = `<div class="answer">${voice}${text}</div>`;
      $kept.innerHTML = a.seal ? envelope(a.seal, body) : body;
      UI.wirePlay($kept, () => SS.segmentBlobs(SS.activeSegments(ans)));
      const rd = $kept.querySelector('.env-read');
      if (rd) rd.addEventListener('click', () => { $kept.querySelector('.env-letter').hidden = false; $kept.querySelector('.envelope').classList.add('open'); rd.remove(); });
      const del = $kept.querySelector('[data-del]');
      if (del) del.addEventListener('click', async () => {
        const yes = await UI.confirm(t('rec.deleteAsk'), t('rec.deleteYes'), t('rec.deleteNo'));
        if (!yes) return;
        SS.player.stop();
        const cur = await SS.answers.get(q.key);
        const take = cur && (cur.takes || []).filter((x) => x.active).pop();
        if (!take) return;
        ans = await SS.deleteTake(q.key, take.take);
        UI.toast(t('rec.deleted'), true);
        announce(t('rec.deleted'));
        if (!SS.hasContent(ans)) { $after.innerHTML = ''; $app.querySelector('#nottoday').hidden = false; chooser(false); }
        drawKept();
      });
    }
    drawKept();

    // ---- mode chooser ----
    function chooser(appending) {
      $after.innerHTML = '';
      const last = SS.ls.get('mode', 'speak');
      const speak = `<button class="btn ${last === 'speak' ? '' : 'soft'}" data-m="speak">${MOTIF.mic()}<span>${esc(t('q.speak'))}</span></button>`;
      const write = `<button class="btn ${last === 'write' ? '' : 'soft'}" data-m="write">${MOTIF.pen()}<span>${esc(t('q.write'))}</span></button>`;
      // a blank page, waiting for her
      const blank = !appending && !(ans && ans.status === 'kept' && SS.hasContent(ans));
      $work.innerHTML = (blank ? `<p class="blank-wait">${esc(t('book.waiting'))}</p>` : '') +
        `<div class="mode-choose btn-col">${last === 'write' ? write + speak : speak + write}</div>`;
      $work.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
        SS.ls.set('mode', b.dataset.m);
        b.dataset.m === 'speak' ? speakMode(appending) : writeMode();
      }));
    }

    // ---- after keeping: petal, seal, follow-up ----
    async function afterKeep(fromEl) {
      UI.petalFrom(fromEl);
      SS.vibrate(12);
      UI.toast(t('q.saved'), true);
      announce(t('q.saved'));
      SS.ls.set('bloom', q.key);
      SS.ls.del('draft:' + q.key);
      ans = await SS.answers.get(q.key);
      drawKept();
      $work.innerHTML = '';
      $app.querySelector('#nottoday').hidden = true;
      if (SS.isSealable(q) && !ans.seal && !ans.sealAsked) {
        await sealSheet();
        ans = await SS.answers.get(q.key);
        drawKept();
      }
      await maybeBackupNudge();
      const fu = EDITION.settings.kitaab.followupsEnabled && (q.followups || [])[0];
      if (fu && !ans.followupShown) {
        await SS.answers.save(q.key, { followupShown: true });
        $after.innerHTML = `<div class="followup"><div class="small-caps">${esc(t('q.followupLead'))}</div>
          <p class="q">${esc(r(fu, { askedBy: q.askedBy }))}</p>
          <div class="btn-col"><button class="btn" id="fyes">${esc(t('q.followupYes'))}</button><button class="btn ghost" id="fno">${esc(t('q.next'))}</button></div></div>`;
        $after.querySelector('#fyes').addEventListener('click', () => chooser(true));
        $after.querySelector('#fno').addEventListener('click', goNext);
      } else {
        $after.innerHTML = `<div class="btn-col" style="margin-top:20px"><button class="btn" id="nx">${esc(t('q.next'))} →</button>
          <button class="btn ghost" id="more">${esc(t('rec.more'))}</button></div>`;
        $after.querySelector('#nx').addEventListener('click', goNext);
        $after.querySelector('#more').addEventListener('click', () => chooser(true));
      }
    }

    async function maybeBackupNudge() {
      const every = EDITION.settings.backupNudgeEvery || 5;
      const kept = (await SS.answers.all()).filter((a) => a.status === 'kept').length;
      const lastShared = SS.ls.get('lastShareCount', 0);
      if (kept - lastShared >= every && SS.ls.get('lastNudgeAt', 0) !== kept) {
        SS.ls.set('lastNudgeAt', kept);
        const yes = await UI.confirm(t('share.nudge'), t('share.yes'), t('share.no'));
        if (yes) await shareCopy();
      }
    }

    // ---- seal sheet ----
    function sealSheet() {
      return new Promise((resolve) => {
        const ppl = SEAL_PEOPLE.filter((k) => SS.people[k]);
        const s = UI.sheet(`
          <h2>${esc(t('seal.ask'))}</h2>
          <button class="opt" data-kind="date">${esc(t('seal.date'))}</button>
          <div data-panel="date" hidden><input type="date" id="sdate" aria-label="${esc(t('seal.date'))}" min="${new Date().toISOString().slice(0, 10)}"><button class="btn" data-ok="date">${esc(t('seal.ok'))}</button></div>
          <button class="opt" data-kind="event">${esc(t('seal.event'))}</button>
          <div data-panel="event" hidden>
            <div class="chips">${SEAL_SUGGESTIONS.map((s2) => `<button class="chip" data-sug="${esc(r(s2))}">${esc(r(s2))}</button>`).join('')}</div>
            <input type="text" id="sevent" aria-label="${esc(t('seal.event'))}" lang="hi-Latn"><button class="btn" data-ok="event">${esc(t('seal.ok'))}</button></div>
          <button class="opt" data-kind="person">${esc(t('seal.person', { name: '…' }))}</button>
          <div data-panel="person" hidden><div class="chips">${ppl.map((k) => `<button class="chip" data-person="${k}">${esc(t('seal.person', { name: SS.callName(k) }))}</button>`).join('')}</div></div>
          <button class="opt" data-kind="after_me">${esc(t('seal.afterMe'))}</button>
          <button class="opt" data-kind="none">${esc(t('seal.none'))}</button>`, {
          label: t('seal.ask'),
          onClose: async (v) => {
            if (v && v.kind) {
              await SS.answers.save(q.key, { seal: Object.assign({ at: Date.now() }, v), sealAsked: true });
              UI.toast(t('seal.done'), true);
              return resolve();
            }
            // dismissed or "khula rakhein": confirm explicitly
            const ok = await UI.confirm(t('seal.confirmOpen'), t('q.heavyYes'), t('seal.ok'));
            if (ok) { await SS.answers.save(q.key, { sealAsked: true }); resolve(); }
            else { sealSheet().then(resolve); }
          }
        });
        const el = s.el;
        el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.kind;
          el.querySelectorAll('.opt').forEach((o) => o.classList.toggle('sel', o === b));
          el.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== k));
          if (k === 'after_me') s.close({ kind: 'after_me' });
          if (k === 'none') s.close('none');
          const p = el.querySelector(`[data-panel="${k}"] input`);
          if (p) p.focus();
        }));
        el.querySelectorAll('[data-sug]').forEach((b) => b.addEventListener('click', () => { el.querySelector('#sevent').value = b.dataset.sug; }));
        el.querySelectorAll('[data-person]').forEach((b) => b.addEventListener('click', () => s.close({ kind: 'person', forPerson: b.dataset.person })));
        el.querySelector('[data-ok="date"]').addEventListener('click', () => { const v = el.querySelector('#sdate').value; if (v) s.close({ kind: 'date', openOn: v }); });
        el.querySelector('[data-ok="event"]').addEventListener('click', () => { const v = el.querySelector('#sevent').value.trim(); if (v) s.close({ kind: 'event', eventLabel: v }); });
      });
    }

    // ---- write mode ----
    function writeMode() {
      $after.innerHTML = '';
      const current = ans && ans.text ? ans.text : '';
      $work.innerHTML = `
        <label class="sr-only" for="ta">${esc(t('q.write'))}</label>
        <textarea id="ta" class="textarea" lang="hi-Latn" autocapitalize="sentences" spellcheck="false" placeholder="${esc(t('write.placeholder'))}" style="margin-top:22px">${esc(current)}</textarea>
        <div class="save-status" aria-live="polite"></div>
        <div class="btn-col" style="margin-top:12px">
          <button class="btn" id="keep">${MOTIF.tick()}<span>${esc(t('q.keepText'))}</span></button>
          <button class="btn soft" id="tospeak">${MOTIF.mic()}<span>${esc(t('q.switchSpeak'))}</span></button>
        </div>`;
      const ta = $work.querySelector('#ta');
      const status = $work.querySelector('.save-status');
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 180) + 'px'; };
      grow();
      let timer = 0;
      const persist = async () => {
        clearTimeout(timer);
        ans = await SS.answers.save(q.key, { text: ta.value, status: ans && ans.status === 'kept' ? 'kept' : 'draft' });
        status.innerHTML = MOTIF.tick() + esc(t('q.saved'));
      };
      ta.addEventListener('input', () => {
        grow();
        SS.ls.set('draft:' + q.key, { text: ta.value, at: Date.now() });
        status.textContent = t('q.saving');
        clearTimeout(timer);
        timer = setTimeout(persist, 800);
      });
      onLeave(() => { if (timer) { clearTimeout(timer); SS.answers.save(q.key, { text: ta.value }); } });
      $work.querySelector('#tospeak').addEventListener('click', () => { persist(); speakMode(true); });
      $work.querySelector('#keep').addEventListener('click', async (e) => {
        if (!ta.value.trim() && !SS.activeSegments(ans).length) { ta.focus(); return; }
        await persist();
        await SS.answers.save(q.key, { status: 'kept' });
        afterKeep(e.currentTarget);
      });
      setTimeout(() => ta.focus(), 50);
    }

    // ---- speak mode (Diya recorder) ----
    function speakMode(appending) {
      $after.innerHTML = '';
      if (!SS.micSupported()) {
        $work.innerHTML = `<p class="notice" style="margin-top:22px">${esc(t('rec.unsupported'))}</p><button class="btn" id="tw">${esc(t('q.write'))}</button>`;
        $work.querySelector('#tw').addEventListener('click', () => { SS.ls.set('mode', 'write'); writeMode(); });
        return;
      }
      // take bookkeeping: appending -> extend active take, else start new take
      const takes = (ans && ans.takes) || [];
      const active = takes.filter((x) => x.active).pop();
      const maxTake = takes.reduce((m, x) => Math.max(m, x.take), 0);
      let cur = appending && active ? { take: active.take, segments: active.segments.slice(), appending: true } : { take: maxTake + 1, segments: [] };
      let rec = null;
      let reviewDur = 0;

      const NB = 31; // live voice bars
      $work.innerHTML = `<div class="recorder">
        <div class="rec-stage"><span class="rings" aria-hidden="true"></span>
          <button class="diya-btn" id="diya" aria-pressed="false" aria-label="${esc(t('rec.labelStart'))}">${MOTIF.diya('unlit')}</button></div>
        <div class="rec-status" id="rstatus" hidden><i class="rec-dot" aria-hidden="true"></i><span id="rstat">${esc(t('rec.listening'))}</span></div>
        <div class="vbars" id="vbars" aria-hidden="true" hidden>${'<i></i>'.repeat(NB)}</div>
        <div class="rec-label" id="rlabel">${esc(t('rec.idle'))}</div>
        <div class="timer" id="timer"></div>
        <div class="hint" id="hint" aria-live="polite"></div>
        <div id="controls"></div>
      </div>`;
      const $d = $work.querySelector('.diya'), $btn = $work.querySelector('#diya');
      const $label = $work.querySelector('#rlabel'), $timer = $work.querySelector('#timer'), $hint = $work.querySelector('#hint'), $ctl = $work.querySelector('#controls');
      const vig = $app.querySelector('.vignette');
      const setDiya = (cls) => { $d.classList.remove('unlit', 'lit', 'ember'); $d.classList.add(cls); };
      const $status = $work.querySelector('#rstatus'), $stat = $work.querySelector('#rstat');
      const $vbars = $work.querySelector('#vbars'), bars = [...$vbars.children], $rings = $work.querySelector('.rings');
      // Voice visuals: bars scroll right->left with recent loudness, rings ripple out on louder syllables.
      const hist = new Array(NB).fill(0);
      let lastBar = 0, lastRing = 0, peakSince = 0;
      const lessMotion = SS.reducedMotion();
      function visual(l) {
        const now = performance.now();
        $d.style.setProperty('--lvl', l.toFixed(3));
        $d.style.setProperty('--sway', (Math.sin(now / 260) * 3 * l).toFixed(2));
        if (now - lastBar > 60) {
          lastBar = now;
          hist.shift(); hist.push(l);
          for (let i = 0; i < NB; i++) bars[i].style.transform = `scaleY(${Math.max(0.08, hist[i]).toFixed(3)})`;
        }
        if (!lessMotion && l > 0.45 && now - lastRing > 420) {
          lastRing = now;
          const ring = document.createElement('i');
          ring.style.setProperty('--s', (1.25 + l * 0.6).toFixed(2));
          $rings.appendChild(ring);
          setTimeout(() => ring.remove(), 1500);
        }
      }
      function resetBars() { hist.fill(0); bars.forEach((b) => (b.style.transform = 'scaleY(.08)')); }
      onLeave(() => { if (rec && rec.state !== 'stopped') { rec.stop(); } document.body.classList.remove('recording'); });

      $btn.addEventListener('click', async () => {
        if (!rec || rec.state === 'stopped') return begin();
        if (rec.state === 'recording' || rec.state === 'paused') return finish();
      });
      // Space / Enter work natively on <button>

      // "Bol ke batayein" / "Bol ke bhi" / "Aur batana hai" was the tap: start recording right away.
      // (Tapping the lit diya, or "Stop", stops it.)
      begin();

      async function begin() {
        SS.primeAudio(); // synchronous, still inside the tap -> works on iOS
        $label.textContent = '';
        const state = await SS.micState();
        if (state === 'denied') return denied();
        if (state !== 'granted' && !SS.ls.get('micExplained', false)) {
          const ok = await new Promise((res) => {
            const s = UI.sheet(`<div style="text-align:center">${MOTIF.diya('lit')}</div><h2>${esc(t('rec.permission'))}</h2><button class="btn" data-ok>${esc(t('rec.permissionOk'))}</button>`, { onClose: (v) => res(v === true) });
            s.el.querySelector('[data-ok]').addEventListener('click', () => s.close(true));
          });
          if (!ok) { $label.textContent = t('rec.idle'); return; }
          SS.ls.set('micExplained', true);
        }
        rec = new SS.Recorder(q.key, cur.take, {
          onLevel(l) { if (rec && rec.state === 'recording') visual(l); else $d.style.setProperty('--lvl', l.toFixed(3)); },
          onTick(ms) { $timer.textContent = SS.fmtTime(ms); },
          onSilence(s) { if (s) { $hint.textContent = t('rec.silence'); setTimeout(() => { if ($hint.textContent === t('rec.silence')) $hint.textContent = ''; }, 4000); } },
          onBreath() { $hint.textContent = t('rec.breath'); setTimeout(() => ($hint.textContent = ''), 6000); },
          onState(s) { paint(s); }
        });
        setDiya('lit');
        try { await rec.start(); }
        catch (e) { console.warn(e); rec = null; setDiya('unlit'); return denied(); }
      }

      function paint(s) {
        if (s === 'recording') {
          setDiya('lit'); vig.classList.add('on'); document.body.classList.add('recording');
          $btn.setAttribute('aria-pressed', 'true'); $btn.setAttribute('aria-label', t('rec.labelStop'));
          $label.textContent = '';
          $status.hidden = false; $status.classList.remove('paused'); $stat.textContent = t('rec.listening');
          $vbars.hidden = false; $vbars.classList.remove('off');
          $ctl.innerHTML = `<div class="btn-row" style="margin-top:10px"><button class="btn ghost" id="pause">${MOTIF.pause()}<span>${esc(t('rec.pause'))}</span></button><button class="btn ink" id="stop">${MOTIF.stop()}<span>${esc(t('rec.stop'))}</span></button></div>`;
          $ctl.querySelector('#pause').addEventListener('click', () => rec.pause());
          $ctl.querySelector('#stop').addEventListener('click', finish);
          announce(t('rec.labelStop'));
        } else if (s === 'paused') {
          setDiya('ember'); vig.classList.remove('on');
          $status.classList.add('paused'); $stat.textContent = t('rec.pausedShort'); $vbars.classList.add('off');
          $hint.textContent = t('rec.paused');
          $ctl.innerHTML = `<div class="btn-row" style="margin-top:10px"><button class="btn" id="resume">${MOTIF.mic()}<span>${esc(t('rec.resume'))}</span></button><button class="btn ink" id="stop">${MOTIF.stop()}<span>${esc(t('rec.stop'))}</span></button></div>`;
          $ctl.querySelector('#resume').addEventListener('click', () => { $hint.textContent = ''; rec.resume(); });
          $ctl.querySelector('#stop').addEventListener('click', finish);
          announce(t('rec.paused'));
        }
      }

      async function finish() {
        if (!rec || rec.state === 'stopped') return;
        setDiya('ember'); vig.classList.remove('on'); document.body.classList.remove('recording');
        $status.hidden = true; $vbars.hidden = true; resetBars(); $d.style.setProperty('--lvl', 0);
        $ctl.innerHTML = ''; $hint.textContent = t('q.saving');
        const res = await rec.stop();
        cur.segments.push(...res.segments);
        reviewDur += res.durationMs;
        // persist the take immediately (inactive until "Save"; never deleted)
        const a = (await SS.answers.get(q.key)) || { takes: [] };
        const tk = (a.takes || []).filter((x) => x.take !== cur.take);
        const prev = (a.takes || []).find((x) => x.take === cur.take);
        tk.push({ take: cur.take, active: prev ? prev.active : false, segments: cur.segments.slice() });
        ans = await SS.answers.save(q.key, { takes: tk });
        review();
      }

      function review() {
        $btn.setAttribute('aria-pressed', 'false'); $btn.setAttribute('aria-label', t('rec.labelStart'));
        $label.textContent = ''; $timer.textContent = SS.fmtTime(reviewDur); $hint.textContent = '';
        $ctl.innerHTML = `<div class="review">${UI.playBtnHTML('data-review', t('rec.play'))}</div>
          <div class="btn-col">
            <button class="btn" id="keep">${MOTIF.tick()}<span>${esc(t('rec.keep'))}</span></button>
            <button class="btn soft" id="more">${MOTIF.plus()}<span>${esc(t('rec.more'))}</span></button>
            <button class="btn ghost" id="again">${MOTIF.redo()}<span>${esc(t('rec.again'))}</span></button>
            <button class="btn link" id="alsowrite">${MOTIF.pen()}<span>${esc(t('q.switchWrite'))}</span></button>
          </div>`;
        UI.wirePlay($ctl, () => SS.segmentBlobs(cur.segments));
        announce(t('rec.keep'));
        $ctl.querySelector('#keep').addEventListener('click', async (e) => {
          const a = await SS.answers.get(q.key);
          const tk = (a.takes || []).map((x) => Object.assign({}, x, { active: x.take === cur.take }));
          await SS.answers.save(q.key, { takes: tk, status: 'kept' });
          afterKeep(e.currentTarget);
        });
        $ctl.querySelector('#more').addEventListener('click', () => { rec = null; setDiya('unlit'); $ctl.innerHTML = ''; begin(); });
        $ctl.querySelector('#again').addEventListener('click', async () => {
          // new take; previous stays stored (inactive)
          SS.player.stop();
          const a = await SS.answers.get(q.key);
          const maxT = (a.takes || []).reduce((m, x) => Math.max(m, x.take), 0);
          cur = { take: maxT + 1, segments: [] }; reviewDur = 0; rec = null;
          setDiya('unlit'); $ctl.innerHTML = ''; $timer.textContent = '';
          begin();
        });
        $ctl.querySelector('#alsowrite').addEventListener('click', async () => {
          const a = await SS.answers.get(q.key);
          const tk = (a.takes || []).map((x) => Object.assign({}, x, { active: x.take === cur.take }));
          ans = await SS.answers.save(q.key, { takes: tk });
          SS.ls.set('mode', 'write'); writeMode();
        });
      }

      function denied() {
        $ctl.innerHTML = `<p class="notice">${esc(t('rec.denied'))}</p>
          <div class="btn-col"><button class="btn soft" id="how">${esc(t('rec.deniedHow'))}</button><button class="btn" id="tw">${esc(t('q.write'))}</button></div>
          <p class="faint" id="howtxt" hidden>${esc(SS.isIOS() ? t('rec.deniedIos') : t('rec.deniedAndroid'))}</p>`;
        $ctl.querySelector('#how').addEventListener('click', () => ($ctl.querySelector('#howtxt').hidden = false));
        $ctl.querySelector('#tw').addEventListener('click', () => { SS.ls.set('mode', 'write'); writeMode(); });
      }
    }

    // initial work area
    if (ans && ans.status === 'kept' && SS.hasContent(ans)) {
      $after.innerHTML = `<div class="btn-col" style="margin-top:20px"><button class="btn" id="nx">${esc(t('q.next'))} →</button><button class="btn ghost" id="more">${esc(t('rec.more'))}</button></div>`;
      $after.querySelector('#nx').addEventListener('click', goNext);
      $after.querySelector('#more').addEventListener('click', () => chooser(true));
    } else if (ans && SS.hasContent(ans) && ans.text && ans.text.trim()) {
      writeMode(); // continue a text draft
    } else {
      chooser(false);
    }
  }

  function heavyGate(q, c) {
    // a quiet page of its own; she can simply turn past it
    render(`<main class="screen bookscreen">
      <article class="book pal-dusk gate-page">
        ${runHead(chapterLine(c))}
        <div class="gate-card">
          ${MOTIF.feather()}
          <p>${esc(t('q.heavyGate'))}</p>
          <div class="btn-col" style="width:100%;margin-top:16px">
            <button class="btn" id="yes">${esc(t('q.heavyYes'))}</button>
            <button class="btn ghost" data-turn="next">${esc(t('q.heavyNo'))}</button>
          </div>
        </div>
        <div class="spacer"></div>
        ${pageFoot(BOOK.num('sawaal/' + q.key))}
      </article></main>`, 'desk');
    $app.querySelector('#yes').addEventListener('click', () => { sessionStorage.setItem('ss_heavy_' + q.key, '1'); question(q.key); });
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  async function boot() {
    document.documentElement.lang = SS.lang() === 'hindi' ? 'hi' : 'hi-Latn';
    document.title = r(EDITION.title);
    if (SS.preview) {
      const b = document.createElement('div');
      b.className = 'banner';
      document.documentElement.classList.add('has-banner');
      b.innerHTML = `${esc(t('preview.banner'))}${/\d/.test(SS.preview) ? ' · ' + esc(SS.preview) : ''} · <a href="?endpreview#/">End preview</a>`;
      document.body.appendChild(b);
    }
    try { await SS.recoverRecordings(); } catch (e) { console.warn('recover failed', e); }
    // Pull question overrides + greeting video from the cloud (best-effort) and
    // apply them before the first render, so edits from admin show up.
    try {
      const data = await fetchGallery(true);
      if (data && data.config) {
        SS.applyQuestionOverrides(data.config.questions);
        if (data.config.greetingVideo) GREETING_VIDEOS.push(data.config.greetingVideo);
      }
      if (data && Array.isArray(data.greetings)) GREETING_VIDEOS.push(...data.greetings.filter((g) => g && g.url));
    } catch (e) { /* offline or no backend: use content.js as-is */ }
    SS.backup.kick(); // push anything that didn't make it up last time
    route();
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  boot();
})();
