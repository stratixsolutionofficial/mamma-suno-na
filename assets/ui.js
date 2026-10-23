/* =====================================================================
   Mamma, Sunao Na · ui.js
   Shared UI pieces: photo frame, greeting card, play buttons, sheet, toast,
   petals, dust, and the book renderer (used by index.html and padho.html).
   ===================================================================== */
(function () {
  'use strict';
  const UI = (window.UI = {});
  const esc = SS.esc;

  UI.EMOTIONS = {
    yaadein: 'Yaadein', khushi: 'Khushi', hasi: 'Hasi-Mazaak', pyaar: 'Pyaar', garv: 'Garv', himmat: 'Himmat',
    dard: 'Dard', kami: 'Kami', shukriya: 'Shukriya', seekh: 'Seekh', sapne: 'Sapne', 'ladai-sulah': 'Ladai aur Sulah'
  };

  // Paper grain: draw a 160px noise tile once and reuse it as a static background.
  (function grain() {
    const run = () => {
      const g = document.querySelector('.grain');
      if (!g || g.dataset.ready) return;
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 60 + Math.random() * 60;            // warm brown speckle
        img.data[i] = v; img.data[i + 1] = v * 0.8; img.data[i + 2] = v * 0.55;
        img.data[i + 3] = Math.random() < 0.5 ? Math.random() * 26 : 0;
      }
      ctx.putImageData(img, 0, 0);
      g.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
      g.dataset.ready = '1';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  })();

  UI.setBody = function (cls) {
    const keep = [];
    if (SS.reducedMotion()) keep.push('less-motion');
    document.body.className = [cls || ''].concat(keep).join(' ').trim();
  };

  UI.photoHTML = function (id, o) {
    o = o || {};
    const p = SS.photo(id);
    if (!p) return '';
    if (!p.src && o.hideEmpty) return '';
    const style = [o.tilt ? `--tilt:${o.tilt}deg` : '', o.ar ? `--ar:${o.ar}` : '', o.delay ? `--delay:${o.delay}ms` : ''].filter(Boolean).join(';');
    const inner = p.src
      ? `<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async">`
      : `<div class="ph-empty" role="img" aria-label="${esc(p.alt)}"><span>${esc(p.alt)}</span></div>`;
    return `<figure class="photo ${o.cls || ''}" style="${style}"><i class="c1"></i><i class="c2"></i>${inner}${o.caption ? `<figcaption>${esc(o.caption)}</figcaption>` : ''}</figure>`;
  };

  // ---- Play buttons: <button class="play-btn" data-src="..." | data-blob-key="..."> ----
  UI.playBtnHTML = (attrs, label) => `<button type="button" class="play-btn" ${attrs}><span class="pi">${MOTIF.play()}</span><span class="pl">${esc(label || 'Play')}</span></button>`;
  UI.wirePlay = function (root, resolver) {
    root.querySelectorAll('.play-btn').forEach((b) => {
      if (b._wired) return;
      b._wired = true;
      b.addEventListener('click', async () => {
        if (b.classList.contains('playing')) { SS.player.stop(); return; }
        const list = b.dataset.src ? [b.dataset.src] : await resolver(b);
        if (!list || !list.length) return;
        b.classList.add('playing');
        b.querySelector('.pi').innerHTML = MOTIF.pause();
        b.setAttribute('aria-pressed', 'true');
        SS.player.play(list, {
          onStop() { b.classList.remove('playing'); b.querySelector('.pi').innerHTML = MOTIF.play(); b.setAttribute('aria-pressed', 'false'); }
        });
      });
    });
  };

  UI.greetingCard = function (g) {
    const from = SS.r(g.from);
    const big = !!g.featured;
    const photo = g.photo ? UI.photoHTML(g.photo, { tilt: big ? -0.8 : 2, ar: big ? '4/3' : '1/1', hideEmpty: !big }) : '';
    return `<article class="gcard ${big ? '' : 'small'}">
      ${photo}
      <h3>${esc(from)}</h3>
      <div class="rel">${esc(SS.r(g.relation || ''))}</div>
      ${g.text ? `<div class="msg" lang="hi-Latn">${esc(SS.r(g.text))}</div>` : ''}
      ${g.audio ? UI.playBtnHTML(`data-src="${esc(g.audio)}"`, ('Play ' + from + "'s message")) : ''}
      ${g.video ? `<video controls preload="metadata" playsinline src="${esc(g.video)}" aria-label="${esc(from)} ka video"></video>` : ''}
      ${g.memory ? `<div class="memory"><div class="small-caps">${esc(SS.t('wall.memory'))}</div><div class="msg">${esc(SS.r(g.memory))}</div></div>` : ''}
    </article>`;
  };
  UI.greetings = (placement) => GREETINGS
    .filter((g) => g.status === 'approved' && (g.placement || 'wall') === placement && !SS.isPH(g.from))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));

  // ---- Toast ----
  UI.toast = function (msg, withTick) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = (withTick ? MOTIF.tick() : '') + `<span>${esc(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  };

  // ---- Sheet (bottom dialog with focus handling) ----
  UI.sheet = function (html, o) {
    o = o || {};
    const prev = document.activeElement;
    const back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" ${o.label ? `aria-label="${esc(o.label)}"` : ''} tabindex="-1"><div class="grab"></div>${html}</div>`;
    document.body.appendChild(back);
    const sheet = back.firstElementChild;
    let closed = false;
    const api = {
      el: sheet,
      close(v) {
        if (closed) return; closed = true;
        back.remove(); document.removeEventListener('keydown', onKey);
        try { prev && prev.focus && prev.focus(); } catch (e) { /* */ }
        o.onClose && o.onClose(v);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && o.dismissable !== false) { api.close('dismiss'); }
      if (e.key === 'Tab') {
        const f = sheet.querySelectorAll('button, a, input, textarea, [tabindex="0"]');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', (e) => { if (e.target === back && o.dismissable !== false) api.close('dismiss'); });
    setTimeout(() => { const f = sheet.querySelector('button, input, a'); (f || sheet).focus(); }, 30);
    return api;
  };
  UI.confirm = (text, yes, no) => new Promise((res) => {
    const s = UI.sheet(`<h2>${esc(text)}</h2><div class="btn-col"><button class="btn" data-v="1">${esc(yes)}</button><button class="btn ghost" data-v="0">${esc(no)}</button></div>`,
      { onClose: (v) => res(v === true) });
    s.el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => s.close(b.dataset.v === '1')));
  });

  // ---- Petals ----
  UI.petals = function (n) {
    if (SS.reducedMotion()) return;
    const colors = ['#E5822A', '#E0A526', '#F2A93B', '#C4621A'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'petal';
      p.innerHTML = MOTIF.petal(colors[i % colors.length]);
      const x = Math.random() * 100;
      p.style.left = x + 'vw';
      document.body.appendChild(p);
      const drift = (Math.random() - 0.5) * 30;
      const dur = 2600 + Math.random() * 1400;
      const a = p.animate([
        { transform: `translate(0,0) rotate(0deg)`, opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { transform: `translate(${drift / 2}vw, 50vh) rotate(${Math.random() * 200}deg)`, offset: 0.55 },
        { transform: `translate(${drift}vw, 92vh) rotate(${140 + Math.random() * 200}deg)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${drift}vw, 94vh) rotate(${160 + Math.random() * 200}deg)`, opacity: 0 }
      ], { duration: dur, delay: Math.random() * 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      a.onfinish = () => p.remove();
    }
  };
  // single petal drifting from an element (save animation)
  UI.petalFrom = function (el) {
    if (SS.reducedMotion() || !el) return;
    const r = el.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'petal';
    p.innerHTML = MOTIF.petal();
    p.style.left = r.left + r.width / 2 - 9 + 'px';
    p.style.top = r.top - 10 + 'px';
    document.body.appendChild(p);
    const a = p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-24px, 40px) rotate(40deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(20px, 90px) rotate(90deg)', offset: 0.6 },
      { transform: 'translate(0, 130px) rotate(140deg)', opacity: 0 }
    ], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    a.onfinish = () => p.remove();
  };

  // ---- Dust motes ----
  UI.dust = function () {
    let d = document.querySelector('.dust');
    if (SS.reducedMotion()) { d && d.remove(); return; }
    if (d) return;
    d = document.createElement('div');
    d.className = 'dust'; d.setAttribute('aria-hidden', 'true');
    let s = '';
    for (let i = 0; i < 15; i++) {
      s += `<i style="left:${Math.random() * 100}%;--dur:${12 + Math.random() * 8}s;--delay:${-Math.random() * 20}s;--rise:-${20 + Math.random() * 40}vh;--drift:${(Math.random() - 0.5) * 40}px;width:${2 + Math.random() * 3}px;height:${2 + Math.random() * 3}px"></i>`;
    }
    d.innerHTML = s;
    document.body.appendChild(d);
  };

  UI.wordReveal = function (el, text) {
    const words = text.split(/\s+/).filter(Boolean);
    const group = words.length * 45 + 600 > 2200 ? 2 : 1;
    let html = '', idx = 0;
    for (let i = 0; i < words.length; i += group) {
      html += `<span class="w" style="animation-delay:${idx * 45 * (group === 2 ? 1.4 : 1)}ms">${esc(words.slice(i, i + group).join(' '))}</span> `;
      idx++;
    }
    el.innerHTML = html;
    el.setAttribute('aria-label', text);
    return Math.min(2200, idx * 45 * (group === 2 ? 1.4 : 1) + 600);
  };

  // ---- Book renderer ----
  /**
   * opts: { answers:[], mode:'self'|'reader', blobs(segIds)->Promise<Blob[]>, info(key)->{chapter,prompt,emotions,askedBy},
   *         onOpenSeal(answer) -> Promise<bool> }
   */
  UI.renderBook = function (root, opts) {
    const kept = opts.answers.filter((a) => a.status === 'kept' && SS.hasContent(a));
    const filter = { emo: null };
    const draw = () => {
      const byCh = {};
      kept.forEach((a) => {
        const inf = opts.info(a);
        if (!inf) return;
        if (filter.emo && !(inf.emotions || []).includes(filter.emo)) return;
        (byCh[inf.chapter] = byCh[inf.chapter] || []).push({ a, inf });
      });
      const emos = new Set();
      kept.forEach((a) => { const inf = opts.info(a); inf && (inf.emotions || []).forEach((e) => emos.add(e)); });
      let html = '';
      if (opts.mode === 'reader' && emos.size) {
        html += `<div class="emo-filter" role="group" aria-label="Bhaav se chuniye"><button class="chip ${!filter.emo ? 'sel' : ''}" data-emo="">All</button>` +
          [...emos].map((e) => `<button class="chip ${filter.emo === e ? 'sel' : ''}" data-emo="${e}">${esc(UI.EMOTIONS[e] || e)}</button>`).join('') + '</div>';
      }
      if (!kept.length) html += `<p class="muted">${esc(SS.t('book.empty'))}</p>`;
      CHAPTERS.forEach((c) => {
        const items = byCh[c.key];
        if (!items) return;
        html += `<section class="book-chap"><div class="small-caps">${esc(SS.t('chapter.label'))} ${c.number}</div><h2>${esc(SS.r(c.title))}</h2>`;
        items.forEach(({ a, inf }) => {
          const sealedShut = a.seal && !SS.sealIsOpen(a.seal) && !a._opened;
          html += `<div class="book-ans" data-key="${esc(a.key)}">
            ${inf.askedBy ? `<div class="small-caps">${esc(inf.askedBy)}</div>` : ''}
            <div class="q">${esc(inf.prompt)}</div>`;
          if (sealedShut) {
            html += `<div class="sealed-env">${MOTIF.mauli()}${MOTIF.waxSeal()}<div class="cond">${esc(SS.sealLabel(a.seal))}</div>
              <button class="btn soft open-seal" style="margin-top:14px">${esc(SS.t('seal.open'))}</button></div>`;
          } else {
            if (a.text && a.text.trim()) html += `<div class="a" lang="hi-Latn">${esc(a.text)}</div>`;
            if (SS.activeSegments(a).length) html += UI.playBtnHTML(`data-ans="${esc(a.key)}"`, 'Play');
            if (a.seal) html += `<div class="faint" style="margin-top:6px">✉︎ ${esc(SS.sealLabel(a.seal))}</div>`;
          }
          html += '</div>';
        });
        html += '</section>';
      });
      root.innerHTML = html;
      root.querySelectorAll('[data-emo]').forEach((b) => b.addEventListener('click', () => { filter.emo = b.dataset.emo || null; draw(); }));
      root.querySelectorAll('.open-seal').forEach((b) => b.addEventListener('click', async () => {
        const key = b.closest('.book-ans').dataset.key;
        const a = kept.find((x) => x.key === key);
        if (await opts.onOpenSeal(a)) { a._opened = true; draw(); }
      }));
      UI.wirePlay(root, (b) => { const a = kept.find((x) => x.key === b.dataset.ans); return opts.blobs(SS.activeSegments(a)); });
      if (opts.afterDraw) opts.afterDraw(root);
    };
    draw();
  };
})();
