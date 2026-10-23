/* =====================================================================
   Mamma, Sunao Na · core.js
   Shared engine for index.html (Mamma), padho.html (reader), admin.html, g.html.
   - Template engine ({{vars}}, gender helper, conditions)
   - Copy / language
   - Storage (IndexedDB: answers, recordings, chunks) + localStorage flags
   - Diya recorder (MediaRecorder, chunked, crash-safe)
   - Single audio player, export / import, book renderer
   No dependencies.
   ===================================================================== */
(function () {
  'use strict';
  const SS = (window.SS = {});

  // ------------------------------------------------------------------
  // Markers
  // ------------------------------------------------------------------
  const PH = 'PLACEHOLDER';
  SS.isPH = (v) => v === undefined || v === null || v === '' || (typeof v === 'string' && v.trim().startsWith(PH));
  SS.isConfirm = (v) => typeof v === 'string' && v.startsWith('CONFIRM:');
  SS.clean = (v) => {
    if (SS.isConfirm(v)) {
      const s = v.slice(8);
      if (s === 'true') return true;
      if (s === 'false') return false;
      if (/^\d+$/.test(s)) return +s;
      return s;
    }
    return v;
  };

  // ------------------------------------------------------------------
  // Preview mode (admin "Preview as Mamma"): separate DB, simulated date
  // ------------------------------------------------------------------
  const qs = new URLSearchParams(location.search);
  if (qs.has('preview')) sessionStorage.setItem('ss_preview', qs.get('simulate') || '1');
  if (qs.has('endpreview')) sessionStorage.removeItem('ss_preview');
  SS.preview = sessionStorage.getItem('ss_preview');
  SS.now = () => {
    if (SS.preview && /^\d{4}-\d{2}-\d{2}/.test(SS.preview)) {
      const sim = new Date(SS.preview + 'T12:00:00' + (EDITION.timezoneOffset || '+05:30'));
      return sim.getTime();
    }
    return Date.now();
  };
  const NS = SS.preview ? 'ss_prev_' : 'ss_';
  SS.ls = {
    get: (k, d) => { try { const v = localStorage.getItem(NS + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* storage full */ } },
    del: (k) => localStorage.removeItem(NS + k)
  };

  // ------------------------------------------------------------------
  // People & context
  // ------------------------------------------------------------------
  SS.people = {};
  PEOPLE.forEach((p) => (SS.people[p.key] = p));
  SS.recipient = PEOPLE.find((p) => p.role === 'recipient');
  SS.addressWord = () => EDITION.addressWord || 'Maa';

  SS.personField = (p, field) => {
    const v = p[field];
    return SS.isPH(v) ? undefined : SS.clean(v);
  };
  // how kids call someone (default voice of all questions)
  SS.callName = (key) => {
    const p = SS.people[key];
    if (!p) return undefined;
    if (p.role === 'recipient') return SS.addressWord();
    return SS.personField(p, 'callByKids') ?? SS.personField(p, 'name');
  };
  SS.gender = (key) => {
    const p = SS.people[key];
    const g = p && SS.clean(p.gender);
    return g === 'm' || g === 'f' ? g : 'unknown';
  };
  SS.isElder = (key) => {
    const p = SS.people[key];
    if (!p) return false;
    return p.role === 'spouse' || p.role === 'parent' || SS.clean(p.elder) === true;
  };

  function varValue(name, opts) {
    const o = opts || {};
    switch (name) {
      case 'addressWord': return SS.addressWord();
      case 'hometown': return SS.isPH(PLACES.hometown) ? undefined : SS.clean(PLACES.hometown);
      case 'helpLabel': return EDITION.helpContact && EDITION.helpContact.label;
      case 'askerAddress': {
        const a = o.askedBy && o.askedBy.length === 1 && SS.people[o.askedBy[0]];
        const v = a && SS.personField(a, 'callForRecipient');
        return v || SS.addressWord();
      }
      case 'recipient.name': return SS.personField(SS.recipient, 'formalName');
      case 'recipient.nickname': return SS.personField(SS.recipient, 'nickname');
      case 'childrenNames': {
        const kids = PEOPLE.filter((p) => p.role === 'child' || p.role === 'child_in_law').map((p) => SS.callName(p.key));
        return kids.length > 1 ? kids.slice(0, -1).join(', ') + ' aur ' + kids[kids.length - 1] : kids[0];
      }
      case 'occasionDate': return SS.formatDate(EDITION.occasionDate);
    }
    if (o.vars && name in o.vars) return o.vars[name];
    if (name.startsWith('place.')) {
      const v = PLACES[name.slice(6)];
      return SS.isPH(v) ? undefined : SS.clean(v);
    }
    const [key, sub] = name.split('.');
    const p = SS.people[key];
    if (!p) return undefined;
    if (!sub) return SS.callName(key);
    if (sub === 'her') return SS.personField(p, 'callByRecipient');
    if (sub === 'name') return SS.personField(p, 'name');
    if (sub === 'spouse') return SS.personField(p, 'spouseCallByKids');
    return undefined;
  }

  /** resolve(template, {askedBy, vars}) -> {text, missing[]} */
  SS.resolve = function (tpl, opts) {
    const missing = [];
    if (tpl == null) return { text: '', missing };
    let text = String(tpl).replace(/\{\{\s*([gr])\s+(\w+)\s+"([^"]*)"\s+"([^"]*)"(?:\s+"([^"]*)")?\s*\}\}/g, (m, _h, key, masc, fem, neu) => {
      const g = SS.gender(key);
      if (g === 'm') return masc;
      if (g === 'f') return fem;
      if (neu !== undefined) return neu;
      missing.push(key + '.gender');
      return masc + '/' + fem;
    });
    text = text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, name) => {
      const v = varValue(name, opts);
      if (v === undefined || v === null || SS.isPH(v)) { missing.push(name); return '…'; }
      return String(v);
    });
    if (text.includes(PH)) missing.push('PLACEHOLDER');
    return { text, missing };
  };
  SS.r = (tpl, opts) => SS.resolve(tpl, opts).text;

  SS.formatDate = (iso) => {
    if (SS.isPH(iso)) return '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return '';
    return d + ' ' + months[m - 1] + (y ? ' ' + y : '');
  };

  // ------------------------------------------------------------------
  // Condition language: && || ! == != > < ( ) dotted paths, literals
  // ------------------------------------------------------------------
  function pathValue(path) {
    const [key, field] = path.split('.');
    const p = SS.people[key];
    if (!p) return undefined;
    const map = { is_alive: 'alive', gender: 'gender', birth_order: 'birthOrder', is_elder_to_recipient: 'elder' };
    const v = p[map[field] || field];
    return SS.isPH(v) ? undefined : SS.clean(v);
  }
  SS.evalCondition = function (expr) {
    if (!expr) return true;
    const toks = String(expr).match(/\(|\)|&&|\|\||==|!=|>=|<=|>|<|!|"[^"]*"|[\w.]+/g) || [];
    let i = 0;
    const peek = () => toks[i];
    const next = () => toks[i++];
    function primary() {
      const t = next();
      if (t === '(') { const v = or(); next(); return v; }
      if (t === '!') return !primary();
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (t === 'null') return null;
      if (/^\d+$/.test(t)) return +t;
      if (t && t[0] === '"') return t.slice(1, -1);
      return pathValue(t);
    }
    function cmp() {
      const a = primary();
      const op = peek();
      if (['==', '!=', '>', '<', '>=', '<='].includes(op)) {
        next();
        const b = primary();
        if (a === undefined || b === undefined) return false; // unknown -> hide
        switch (op) {
          case '==': return a === b; case '!=': return a !== b;
          case '>': return a > b; case '<': return a < b;
          case '>=': return a >= b; case '<=': return a <= b;
        }
      }
      return !!a;
    }
    function and() { let v = cmp(); while (peek() === '&&') { next(); const b = cmp(); v = v && b; } return v; }
    function or() { let v = and(); while (peek() === '||') { next(); const b = and(); v = v || b; } return v; }
    try { return !!or(); } catch (e) { console.warn('condition error', expr, e); return false; }
  };

  // ------------------------------------------------------------------
  // Chapters & questions
  // ------------------------------------------------------------------
  SS.chapters = () => CHAPTERS.filter((c) => c.enabled !== false);
  SS.chapter = (key) => CHAPTERS.find((c) => c.key === key);
  SS.allQuestions = () => {
    const out = [];
    SS.chapters().forEach((c) => (QUESTIONS[c.key] || []).forEach((q) => out.push(Object.assign({ chapter: c.key }, q))));
    return out;
  };
  SS.questionStatus = (q) => {
    const reasons = [];
    if (q.enabled === false) reasons.push('disabled');
    if (q.condition && !SS.evalCondition(q.condition)) reasons.push('condition: ' + q.condition);
    const avoid = (RECIPIENT_EXTRA.avoidTopics || []);
    if ((q.tags || []).some((t) => avoid.includes(t))) reasons.push('avoid topic');
    const opts = { askedBy: q.askedBy };
    const a = SS.resolve(q.prompt, opts), b = SS.resolve(q.sub, opts);
    const missing = a.missing.concat(b.missing);
    (q.followups || []).forEach((f) => missing.push(...SS.resolve(f, opts).missing));
    if (missing.length) reasons.push('missing: ' + [...new Set(missing)].join(', '));
    return { visible: reasons.length === 0, reasons, prompt: a.text, sub: q.sub ? b.text : '' };
  };
  SS.visibleQuestions = (chapterKey) => (QUESTIONS[chapterKey] || [])
    .map((q) => Object.assign({ chapter: chapterKey }, q))
    .filter((q) => SS.questionStatus(q).visible);
  SS.findQuestion = (key) => SS.allQuestions().find((q) => q.key === key);
  SS.weight = (q) => q.weight || 'light';

  // Apply question overrides saved from admin (prompt/sub/enabled), keyed by
  // question key. content.js remains the fallback: an override only replaces the
  // fields it sets. Called once at boot before the first render.
  SS.applyQuestionOverrides = (map) => {
    if (!map || typeof map !== 'object') return;
    for (const list of Object.values(QUESTIONS)) {
      for (const q of list) {
        const o = map[q.key];
        if (!o) continue;
        if (o.prompt != null) q.prompt = o.prompt;
        if (o.sub != null) q.sub = o.sub;
        if (o.enabled != null) q.enabled = !!o.enabled;
      }
    }
  };
  SS.isSealable = (q) => !!q.sealedDefault || q.chapter === 'chitthiyan';

  SS.askedByLine = function (askedBy) {
    const list = askedBy && askedBy.length ? askedBy : ['hum'];
    if (list.includes('hum')) return 'HUM SAB POOCHH RAHE HAIN';
    const names = list.map((k) => (SS.callName(k) || k).toUpperCase());
    if (list.length > 1) {
      return (names.length > 2 ? names.slice(0, -1).join(', ') + ' AUR ' + names[names.length - 1] : names.join(' AUR ')) + ' POOCHH RAHE HAIN';
    }
    const k = list[0];
    if (SS.isElder(k)) return names[0] + ' POOCHH RAHE HAIN';
    const g = SS.gender(k);
    if (g === 'm') return names[0] + ' POOCHH RAHA HAI';
    if (g === 'f') return names[0] + ' POOCHH RAHI HAI';
    return names[0] + ' KA SAWAAL';
  };

  // ------------------------------------------------------------------
  // Copy & language
  // ------------------------------------------------------------------
  SS.lang = () => SS.ls.get('lang', EDITION.localeDefault || 'hinglish');
  SS.t = function (key, vars) {
    const c = COPY[key];
    if (!c) return key;
    const v = SS.lang() === 'hindi' && c[1] ? c[1] : c[0];
    return SS.resolve(v, { vars: vars || {} }).text;
  };
  SS.photo = (id) => {
    if (!id) return null;
    if (/[./]/.test(id) && !PHOTOS[id]) return { src: id, alt: '' };
    const p = PHOTOS[id];
    if (!p) return null;
    return { src: p.src || '', alt: SS.r(p.alt || ''), id };
  };

  // ------------------------------------------------------------------
  // Misc helpers
  // ------------------------------------------------------------------
  SS.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SS.uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  SS.reducedMotion = () => SS.ls.get('lessMotion', false) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  SS.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  SS.fmtTime = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  SS.unlockAt = () => {
    if (SS.isPH(EDITION.occasionDate)) return 0;
    return new Date(EDITION.occasionDate + 'T00:00:00' + (EDITION.timezoneOffset || '+05:30')).getTime();
  };
  SS.devaNum = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
  SS.bookYear = () => {
    const m = String(SS.isPH(EDITION.occasionDate) ? EDITION.slug : EDITION.occasionDate).match(/\d{4}/);
    return m ? m[0] : String(new Date().getFullYear());
  };
  // Soft page sounds, synthesised (no audio files). On by default (she can turn
  // it off in the menu); only plays after a tap has unlocked audio (phones require that).
  SS.pageSoundOn = () => SS.ls.get('pageSound', true);
  SS.pageSound = (kind) => {
    if (!SS.pageSoundOn()) return;
    try {
      const ac = SS.primeAudio();
      if (ac.state !== 'running') return;
      const close = kind === 'close';
      const dur = close ? 0.28 : 0.42;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter();
      const g = ac.createGain();
      const t0 = ac.currentTime;
      if (close) { f.type = 'lowpass'; f.frequency.value = 380; }
      else { f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(2600, t0); f.frequency.exponentialRampToValueAtTime(700, t0 + dur); }
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(close ? 0.5 : 0.12, t0 + (close ? 0.01 : 0.08));
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(ac.destination);
      src.start(t0); src.stop(t0 + dur);
    } catch (e) { /* sound is optional */ }
  };
  SS.vibrate = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  // ------------------------------------------------------------------
  // IndexedDB (tiny wrapper)
  // ------------------------------------------------------------------
  const DB_NAME = SS.preview ? 'sunao-preview' : 'sunao';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('answers')) d.createObjectStore('answers', { keyPath: 'key' });
        if (!d.objectStoreNames.contains('recordings')) d.createObjectStore('recordings', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks', { keyPath: ['recId', 'idx'] });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return db().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then((v) => (out = v));
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  SS.db = {
    get: (store, key) => db().then((d) => reqP(d.transaction(store).objectStore(store).get(key))),
    all: (store) => db().then((d) => reqP(d.transaction(store).objectStore(store).getAll())),
    put: (store, val) => tx(store, 'readwrite', (s) => { s.put(val); }),
    del: (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); }),
    chunksFor: (recId) => db().then((d) => reqP(d.transaction('chunks').objectStore('chunks')
      .getAll(IDBKeyRange.bound([recId, 0], [recId, Infinity]))))
  };
  // ask the browser not to evict our data
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ------------------------------------------------------------------
  // Answers
  // ------------------------------------------------------------------
  SS.answers = {
    get: (key) => SS.db.get('answers', key),
    all: () => SS.db.all('answers'),
    async save(key, patch) {
      const now = Date.now();
      const cur = (await SS.db.get('answers', key)) || { key, status: 'draft', text: '', takes: [], seal: null, createdAt: now };
      const next = Object.assign(cur, patch, { updatedAt: now });
      await SS.db.put('answers', next);
      // Back up kept answers in the background (best-effort; see SS.backup).
      if (next.status === 'kept' && SS.backup) SS.backup.kick();
      return next;
    }
  };
  // Answer.takes = [{ take: n, active: bool, segments: [recId,...] }]
  SS.activeSegments = (ans) => {
    if (!ans || !ans.takes) return [];
    const t = ans.takes.filter((x) => x.active).pop();
    return t ? t.segments : [];
  };
  SS.hasContent = (ans) => !!ans && ((ans.text && ans.text.trim()) || SS.activeSegments(ans).length > 0);

  SS.recordingBlob = async (recId) => {
    const rec = await SS.db.get('recordings', recId);
    const chunks = await SS.db.chunksFor(recId);
    if (!chunks.length) return null;
    chunks.sort((a, b) => a.idx - b.idx);
    return new Blob(chunks.map((c) => c.blob), { type: (rec && rec.mime) || chunks[0].blob.type || 'audio/webm' });
  };

  // Recordings left in 'recording' state (tab closed mid-way) -> finalize with what exists
  // Permanently remove a recording segment (its row + all audio chunks) from this phone.
  SS.deleteRecording = async (recId) => {
    const chunks = await SS.db.chunksFor(recId);
    for (const c of chunks) await SS.db.del('chunks', [recId, c.idx]);
    await SS.db.del('recordings', recId);
  };
  // Delete one take of an answer. If nothing is left (no other audio, no text) the answer goes back to "not answered".
  SS.deleteTake = async (qKey, takeNo) => {
    const a = await SS.answers.get(qKey);
    if (!a) return null;
    const take = (a.takes || []).find((x) => x.take === takeNo);
    if (take) for (const id of take.segments) {
      const meta = await SS.db.get('recordings', id);
      await SS.deleteRecording(id);
      if (SS.backup) SS.backup.removeSegment(id, meta && meta.mime);
    }
    const takes = (a.takes || []).filter((x) => x.take !== takeNo);
    const patch = { takes };
    const hasText = !!(a.text && a.text.trim());
    if (!hasText && !takes.some((x) => x.active)) Object.assign(patch, { status: 'draft', seal: null, sealAsked: false, followupShown: false });
    return SS.answers.save(qKey, patch);
  };

  // When the active take was recorded (first segment's createdAt), as "YYYY-MM-DD" local date.
  SS.recordedAt = async (ans) => {
    const segs = SS.activeSegments(ans);
    let ms = ans && ans.updatedAt;
    if (segs.length) { const rec = await SS.db.get('recordings', segs[0]); if (rec && rec.createdAt) ms = rec.createdAt; }
    if (!ms) return '';
    const d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  SS.recoverRecordings = async () => {
    const recs = await SS.db.all('recordings');
    const recovered = [];
    for (const r of recs) {
      if (r.status !== 'recording') continue;
      const chunks = await SS.db.chunksFor(r.id);
      r.status = chunks.length ? 'complete' : 'failed';
      r.recovered = true;
      await SS.db.put('recordings', r);
      if (chunks.length) {
        const ans = (await SS.answers.get(r.qKey)) || { key: r.qKey, takes: [], text: '', status: 'draft', createdAt: Date.now() };
        let take = ans.takes.find((t) => t.take === r.take);
        if (!take) { ans.takes.forEach((t) => (t.active = false)); take = { take: r.take, active: true, segments: [] }; ans.takes.push(take); }
        if (!take.segments.includes(r.id)) take.segments.push(r.id);
        ans.recovered = true;
        await SS.answers.save(r.qKey, ans);
        recovered.push(r.qKey);
      }
    }
    return recovered;
  };

  // ------------------------------------------------------------------
  // Microphone
  // ------------------------------------------------------------------
  SS.micSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // raw=true: no noise suppression / echo cancel / auto gain. Needed for blow
  // detection, because phones' noise suppression treats a "phoonk" as noise and removes it.
  SS.getMic = (raw) => navigator.mediaDevices.getUserMedia({ audio: raw
    ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    : { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  SS.micState = async () => {
    try {
      if (!navigator.permissions) return 'prompt';
      const p = await navigator.permissions.query({ name: 'microphone' });
      return p.state;
    } catch (e) { return 'prompt'; }
  };
  // Call synchronously inside a tap handler: creates/resumes one shared AudioContext.
  SS.primeAudio = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!SS._ac || SS._ac.state === 'closed') SS._ac = new AC();
    if (SS._ac.state === 'suspended') SS._ac.resume().catch(() => {});
    return SS._ac;
  };
  SS.pickMime = () => {
    const opts = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];
    for (const m of opts) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
    return '';
  };
  SS.isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /**
   * Recorder: one MediaRecorder session = one "segment" (a recording row).
   * Chunks (every chunkSeconds) are written to IndexedDB immediately.
   * Auto-rolls to a new segment at segmentMaxSeconds (seamless for the user).
   * cb: { onLevel(lvl), onTick(ms), onSilence(bool), onBreath(), onState(s) }
   */
  SS.Recorder = class {
    constructor(qKey, take, cb) {
      this.qKey = qKey; this.take = take; this.cb = cb || {};
      this.segments = []; this.elapsedBefore = 0; this.state = 'idle';
      this.lvl = 0; this.cfg = EDITION.settings.recording;
    }
    async start() {
      // use the AudioContext unlocked during the tap (SS.primeAudio), so iOS doesn't keep it suspended
      this.ac = SS.primeAudio();
      this.stream = await SS.getMic();
      this.mime = SS.pickMime();
      if (this.ac.state === 'suspended') { try { await this.ac.resume(); } catch (e) { /* */ } }
      const src = this.ac.createMediaStreamSource(this.stream);
      this.an = this.ac.createAnalyser();
      this.an.fftSize = 1024; this.an.smoothingTimeConstant = 0.8;
      src.connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
      try { this.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* not supported */ }
      this._onHide = () => { if (document.visibilityState === 'hidden' && this.mr && this.mr.state === 'recording') this.mr.requestData(); };
      document.addEventListener('visibilitychange', this._onHide);
      await this._startSegment();
      this._loop();
    }
    async _startSegment() {
      const id = SS.uid();
      this.recId = id; this.idx = 0; this.segStart = performance.now(); this.pausedMs = 0;
      this.segments.push(id);
      await SS.db.put('recordings', { id, qKey: this.qKey, take: this.take, segment: this.segments.length, active: true, mime: this.mime || 'audio/webm', status: 'recording', durationMs: 0, createdAt: Date.now() });
      const opts = { audioBitsPerSecond: this.cfg.bitrate || 48000 };
      if (this.mime) opts.mimeType = this.mime;
      this.mr = new MediaRecorder(this.stream, opts);
      if (!this.mime) this.mime = this.mr.mimeType;
      const segId = id;
      let n = 0;
      this.pending = [];
      this.mr.ondataavailable = (e) => {
        if (!e.data || !e.data.size) return;
        const idx = n++;
        this.pending.push(SS.db.put('chunks', { recId: segId, idx, blob: e.data }));
      };
      this.mr.start((this.cfg.chunkSeconds || 10) * 1000);
      this._setState('recording');
      this.breathShown = false;
    }
    _segElapsed() {
      if (!this.segStart) return 0;
      const pauseNow = this.pauseAt ? performance.now() - this.pauseAt : 0;
      return performance.now() - this.segStart - this.pausedMs - pauseNow;
    }
    elapsed() { return this.elapsedBefore + this._segElapsed(); }
    _loop() {
      const tick = () => {
        if (this.state === 'stopped') return;
        if (this.state === 'recording') {
          this.an.getFloatTimeDomainData(this.buf);
          let sum = 0;
          for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
          const rms = Math.sqrt(sum / this.buf.length);
          // Map loudness in dB (-58dB quiet room .. -18dB close loud voice) to 0..1,
          // so normal conversational speech visibly moves the flame.
          const db = 20 * Math.log10(rms + 1e-8);
          const target = Math.min(1, Math.max(0, (db + 58) / 40));
          // fast attack, slower release: reacts on each syllable, settles gently
          this.lvl += (target - this.lvl) * (target > this.lvl ? 0.45 : 0.1);
          // silence nudge
          const now = performance.now();
          if (target > 0.3) this.lastVoice = now; // ~ -46dB: actual speech, not room hum
          if (!this.lastVoice) this.lastVoice = now;
          const silent = now - this.lastVoice > (this.cfg.silenceNudgeSeconds || 8) * 1000;
          if (silent !== this.silent) { this.silent = silent; this.cb.onSilence && this.cb.onSilence(silent); if (silent) this.lastVoice = now + 4000; }
          const seg = this._segElapsed();
          const max = (this.cfg.segmentMaxSeconds || 600) * 1000;
          if (!this.breathShown && seg > max - 30000) { this.breathShown = true; this.cb.onBreath && this.cb.onBreath(); }
          if (seg >= max && !this.rolling) this._roll();
        } else {
          this.lvl *= 0.9;
        }
        this.cb.onLevel && this.cb.onLevel(this.lvl);
        this.cb.onTick && this.cb.onTick(this.elapsed());
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    async _finishSegment() {
      const mr = this.mr;
      const segId = this.recId;
      const dur = this._segElapsed();
      await new Promise((res) => { mr.onstop = res; if (mr.state !== 'inactive') mr.stop(); else res(); });
      await Promise.all(this.pending);
      const rec = await SS.db.get('recordings', segId);
      if (rec) { rec.status = 'complete'; rec.durationMs = Math.round(dur); await SS.db.put('recordings', rec); }
      this.elapsedBefore += dur;
      this.segStart = 0;
    }
    async _roll() {
      this.rolling = true;
      await this._finishSegment();
      await this._startSegment();
      this.rolling = false;
    }
    pause() {
      if (this.mr && this.mr.state === 'recording') { this.mr.pause(); this.pauseAt = performance.now(); this._setState('paused'); }
    }
    resume() {
      if (this.mr && this.mr.state === 'paused') {
        this.mr.resume(); this.pausedMs += performance.now() - this.pauseAt; this.pauseAt = 0;
        this.lastVoice = performance.now(); this._setState('recording');
      }
    }
    async stop() {
      if (this.pauseAt) { this.pausedMs += performance.now() - this.pauseAt; this.pauseAt = 0; }
      await this._finishSegment();
      this._setState('stopped');
      cancelAnimationFrame(this.raf);
      this.release();
      return { segments: this.segments.slice(), durationMs: Math.round(this.elapsedBefore) };
    }
    release() {
      try { this.stream && this.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* */ }
      try { this.an && this.an.disconnect(); } catch (e) { /* */ } // shared context stays open for the next take
      try { this.wake && this.wake.release(); } catch (e) { /* */ }
      document.removeEventListener('visibilitychange', this._onHide);
    }
    _setState(s) { this.state = s; this.cb.onState && this.cb.onState(s); }
  };

  // ------------------------------------------------------------------
  // Single audio player (only one thing plays at a time)
  // ------------------------------------------------------------------
  SS.player = {
    el: null, owner: null, url: null, settle: null,
    _releaseUrl(url = this.url) {
      if (!url) return;
      URL.revokeObjectURL(url);
      if (this.url === url) this.url = null;
    },
    stop() {
      const owner = this.owner;
      if (this.el) {
        this.el.pause();
        this.el.onended = null;
        this.el.onerror = null;
        this.el.ontimeupdate = null;
        this.el.removeAttribute('src');
        this.el.load();
      }
      this._releaseUrl();
      if (this.settle) { const settle = this.settle; this.settle = null; settle(); }
      this.owner = null;
      if (owner && owner.onStop) owner.onStop();
    },
    /** play(list of src|Blob, {onStop, onProgress}) */
    async play(list, owner) {
      this.stop();
      if (!this.el) this.el = new Audio();
      this.owner = owner || {};
      const me = this.owner;
      const items = Array.isArray(list) ? list : [list];
      for (const it of items) {
        if (this.owner !== me) return;
        let src = it;
        let objectUrl = null;
        if (it instanceof Blob) { src = URL.createObjectURL(it); objectUrl = src; this.url = src; }
        this.el.src = src;
        try {
          await this.el.play();
          if (this.owner !== me) { this._releaseUrl(objectUrl); return; }
          await new Promise((res) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              this.el.removeEventListener('ended', finish);
              this.el.removeEventListener('error', finish);
              if (this.settle === finish) this.settle = null;
              res();
            };
            this.settle = finish;
            this.el.addEventListener('ended', finish, { once: true });
            this.el.addEventListener('error', finish, { once: true });
            this.el.ontimeupdate = () => me.onProgress && me.onProgress(this.el.currentTime, this.el.duration);
          });
        } catch (e) { console.warn('play failed', e); }
        this._releaseUrl(objectUrl);
        if (this.owner !== me) return;
      }
      if (this.owner === me) {
        this.el.ontimeupdate = null;
        this.owner = null;
        me.onStop && me.onStop();
      }
    }
  };
  SS.segmentBlobs = async (segIds) => (await Promise.all(segIds.map(SS.recordingBlob))).filter(Boolean);

  // ------------------------------------------------------------------
  // Export / import (answers live only on Mamma's phone; this is the bridge)
  // ------------------------------------------------------------------
  const blobToB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
  const b64ToBlob = (b64, type) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };

  SS.buildExport = async function () {
    const answers = (await SS.answers.all()).filter((a) => SS.hasContent(a) || a.status !== 'draft');
    const recs = {};
    for (const a of answers) {
      for (const t of a.takes || []) {
        for (const id of t.segments) {
          const blob = await SS.recordingBlob(id);
          const meta = await SS.db.get('recordings', id);
          if (blob) recs[id] = { mime: blob.type, durationMs: meta ? meta.durationMs : 0, take: t.take, active: t.active, data: await blobToB64(blob) };
        }
      }
    }
    return {
      format: 'sunao-na-export/1',
      edition: EDITION.slug,
      title: SS.r(EDITION.title),
      exportedAt: new Date().toISOString(),
      answers: answers.map((a) => {
        const q = SS.findQuestion(a.key);
        const st = q ? SS.questionStatus(q) : { prompt: a.key, sub: '' };
        return Object.assign({}, a, { chapter: q ? q.chapter : null, prompt: st.prompt, askedBy: q ? SS.askedByLine(q.askedBy) : '', emotions: q ? q.emotions : [] });
      }),
      recordings: recs
    };
  };
  SS.exportFile = async function () {
    const data = await SS.buildExport();
    const day = new Date().toISOString().slice(0, 10);
    const name = SS.r('{{addressWord}}').toLowerCase().replace(/\W+/g, '-') + '-ki-kahani-' + day + '.json';
    return new File([JSON.stringify(data)], name, { type: 'application/json' });
  };
  SS.shareOrDownload = async function (file, title) {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || file.name });
        return 'shared';
      }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  };
  SS.parseExport = function (json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || data.format !== 'sunao-na-export/1') throw new Error('Ye Sunao Na ki file nahi lag rahi.');
    const blobs = {};
    for (const [id, r] of Object.entries(data.recordings || {})) blobs[id] = b64ToBlob(r.data, r.mime);
    data.blobs = blobs;
    return data;
  };

  // ------------------------------------------------------------------
  // Cloud backup (Vercel Blob) — optional, best-effort, never blocks her.
  // IndexedDB stays the source of truth; this just mirrors each kept answer
  // (its JSON + audio segments) up to the family's private Blob store, so the
  // kids receive answers without her having to tap "Send a copy".
  //   - uploads go through /api/upload (token stays server-side); segments over
  //     4 MB use SS.directUpload (client token from /api/upload-token)
  //   - a per-segment "already uploaded" marker avoids re-sending audio
  //   - runs in preview? no. runs offline? queued, retried on reconnect.
  // Disabled automatically when the app is opened from file:// or when the API
  // isn't there (pure static hosting), so nothing breaks without a backend.
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // Direct-to-Blob upload for files too big for a serverless function.
  // Vercel caps a function request body at 4.5 MB, so large files get a
  // short-lived client token from api/upload-token and go straight to Blob
  // (multipart above 8 MB). The Blob client is loaded lazily, only when needed.
  //   SS.directUpload(path, file, { adminKey, onProgress(pct) }) -> { url, pathname }
  // Locally, dev-server.mjs answers GET api/upload-token with a fake Blob API
  // URL so the exact same client code runs against ./.localblob.
  // ------------------------------------------------------------------
  SS.FUNCTION_BODY_LIMIT = 4 * 1024 * 1024; // stay safely under Vercel's 4.5 MB
  let blobClient = null;
  async function loadBlobClient() {
    if (!blobClient) {
      blobClient = (async () => {
        try {
          const cfg = await fetch('api/upload-token', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {}));
          if (cfg && cfg.blobApiUrl) globalThis.__VERCEL_BLOB_API_URL = cfg.blobApiUrl; // must be set before import
        } catch (e) { /* real Vercel Blob */ }
        return import(new URL('assets/vendor/blob-client.js', location.href).href);
      })();
      blobClient.catch(() => { blobClient = null; }); // allow a retry after a failed load
    }
    return blobClient;
  }
  SS.directUpload = async function (path, file, opts) {
    opts = opts || {};
    const { upload } = await loadBlobClient();
    const r = await upload(path, file, {
      access: 'public',
      handleUploadUrl: 'api/upload-token',
      clientPayload: opts.adminKey ? JSON.stringify({ key: opts.adminKey }) : undefined,
      contentType: file.type || undefined,
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: opts.onProgress ? (p) => opts.onProgress(p.percentage) : undefined
    });
    return { url: r.url, pathname: r.pathname };
  };

  SS.backup = (function () {
    const CfG = (EDITION.settings && EDITION.settings.backup) || {};
    const enabled = () => !SS.preview && CfG.enabled !== false && location.protocol.startsWith('http');
    // a stable, unguessable folder for this edition's uploads
    const space = () => CfG.space || EDITION.slug || 'edition';
    const synced = {
      has: (id) => SS.ls.get('up:' + id, false),
      mark: (id) => SS.ls.set('up:' + id, true),
      clear: (id) => SS.ls.del('up:' + id)
    };
    let running = false, pending = false;

    async function putBlob(path, body, contentType) {
      // Small bodies (answer JSON, a normal voice-note segment) go through our
      // route, which writes to Blob with the server-side token. Anything near
      // Vercel's 4.5 MB function limit goes direct with a client token instead.
      if (body instanceof Blob && body.size > SS.FUNCTION_BODY_LIMIT) return SS.directUpload(path, body);
      const res = await fetch('api/upload?path=' + encodeURIComponent(path), {
        method: 'POST',
        headers: { 'content-type': contentType || 'application/octet-stream' },
        body
      });
      if (!res.ok) throw new Error('upload failed ' + res.status);
      return res.json(); // { url, pathname }
    }

    // Upload one answer: every active audio segment, then an answer.json manifest.
    async function syncAnswer(a) {
      if (!SS.hasContent(a) || a.status !== 'kept') return;
      const segs = SS.activeSegments(a);
      const audio = [];
      for (const id of segs) {
        const meta = await SS.db.get('recordings', id);
        const path = space() + '/audio/' + id + (meta && /mp4/.test(meta.mime || '') ? '.m4a' : '.webm');
        if (!synced.has(id)) {
          const blob = await SS.recordingBlob(id);
          if (blob) { const r = await putBlob(path, blob, blob.type); synced.mark(id); audio.push({ id, url: r.url, mime: blob.type, durationMs: meta ? meta.durationMs : 0 }); }
        } else {
          audio.push({ id, url: location.origin + '/' + path, mime: (meta && meta.mime) || 'audio/webm', durationMs: meta ? meta.durationMs : 0 });
        }
      }
      const q = SS.findQuestion(a.key);
      const st = q ? SS.questionStatus(q) : { prompt: a.key };
      const manifest = {
        key: a.key, text: a.text || '', seal: a.seal || null, status: a.status,
        updatedAt: a.updatedAt, recordedAt: await SS.recordedAt(a),
        chapter: q ? q.chapter : a.chapter, prompt: st.prompt,
        askedBy: q ? SS.askedByLine(q.askedBy) : '', emotions: q ? q.emotions : [],
        audio
      };
      await putBlob(space() + '/answers/' + a.key + '.json', JSON.stringify(manifest), 'application/json');
    }

    // Walk all kept answers and push anything not yet uploaded.
    async function run() {
      if (!enabled()) return;
      if (running) { pending = true; return; }
      running = true;
      try {
        const answers = (await SS.answers.all()).filter((a) => a.status === 'kept' && SS.hasContent(a));
        for (const a of answers) {
          const segs = SS.activeSegments(a);
          const needs = !SS.ls.get('ans:' + a.key, 0) || SS.ls.get('ans:' + a.key, 0) < (a.updatedAt || 0) || segs.some((id) => !synced.has(id));
          if (!needs) continue;
          try { await syncAnswer(a); SS.ls.set('ans:' + a.key, a.updatedAt || Date.now()); }
          catch (e) { console.warn('backup: answer failed, will retry', a.key, e); }
        }
      } finally {
        running = false;
        if (pending) { pending = false; run(); }
      }
    }

    // Tell the server a deleted recording can be removed (best-effort).
    async function removeSegment(id, mime) {
      synced.clear(id);
      if (!enabled()) return;
      const path = space() + '/audio/' + id + (/mp4/.test(mime || '') ? '.m4a' : '.webm');
      try { await fetch('api/upload?path=' + encodeURIComponent(path), { method: 'DELETE' }); } catch (e) { /* best-effort */ }
    }

    return {
      enabled,
      // fire-and-forget; callers never await this
      kick: () => { if (enabled()) run().catch((e) => console.warn('backup', e)); },
      removeSegment
    };
  })();
  // retry whenever the network comes back
  if (typeof window !== 'undefined') window.addEventListener('online', () => SS.backup.kick());

  // ------------------------------------------------------------------
  // Seal helpers
  // ------------------------------------------------------------------
  SS.sealLabel = (seal) => {
    if (!seal) return '';
    if (seal.kind === 'date') return SS.formatDate(seal.openOn) + ' ko kholna';
    if (seal.kind === 'event') return seal.eventLabel;
    if (seal.kind === 'person') return 'Sirf ' + (SS.callName(seal.forPerson) || seal.forPerson) + ' ke liye';
    if (seal.kind === 'after_me') return 'Mere baad';
    return '';
  };
  SS.sealIsOpen = (seal, now) => {
    if (!seal) return true;
    if (seal.openedAt) return true;
    if (seal.kind === 'date' && seal.openOn) return (now || Date.now()) >= new Date(seal.openOn + 'T00:00:00').getTime();
    return false;
  };
})();
