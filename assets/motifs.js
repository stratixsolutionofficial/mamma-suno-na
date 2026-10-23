/* =====================================================================
   Mamma, Sunao Na · motifs.js
   Thin line-art SVG motifs (stroke only, aria-hidden). Returned as strings.
   ===================================================================== */
(function () {
  'use strict';
  const M = (window.MOTIF = {});
  const svg = (vb, body, cls) => `<svg class="motif ${cls || ''}" viewBox="${vb}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  // ---- Diya (clay lamp). Flame is separately animatable via CSS vars.
  // Built from 3 stacked layers so every animation is transform/opacity on
  // its own GPU layer (no SVG repaints per frame):
  //   .dg  glow  (CSS radial gradient)
  //   .df  flame (small SVG; voice level scales this wrapper, the inner svg flickers)
  //   .db  bowl + wick (static SVG)
  M.diya = (cls) => `
  <span class="diya ${cls || ''}" aria-hidden="true">
    <span class="dg"></span>
    <span class="df"><svg viewBox="46 20 28 48" focusable="false">
      <path d="M60 22 C67 34 72 44 70 54 C68 62 63 66 60 66 C57 66 52 62 50 54 C48 44 53 34 60 22Z" fill="#F2A93B"/>
      <path d="M60 36 C64 44 66 50 65 56 C64 61 62 63 60 63 C58 63 56 61 55 56 C54 50 56 44 60 36Z" fill="#FFF4C2"/>
    </svg></span>
    <svg class="db" viewBox="0 0 120 120" focusable="false">
      <line x1="60" y1="66" x2="60" y2="72" stroke="#3a2a1c" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 72 C22 72 30 70 60 70 C90 70 98 72 108 70 C104 90 86 100 60 100 C34 100 18 90 14 72Z" fill="#A9552B"/>
      <path d="M14 72 C24 84 34 98 60 100 C86 98 96 84 108 70 C104 90 86 100 60 100 C34 100 18 90 14 72Z" fill="#8E4422" fill-opacity=".55"/>
      <path d="M14 72 C30 78 90 78 108 70" fill="none" stroke="#F6EFE3" stroke-opacity=".35" stroke-width="1.5"/>
      <path d="M36 88 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0" fill="none" stroke="#F6EFE3" stroke-opacity=".3" stroke-width="1.4"/>
    </svg>
  </span>`;

  M.ember = () => `<svg class="ember" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="#E5822A"/><circle cx="12" cy="12" r="3" fill="#FFF4C2"/></svg>`;

  // ---- Rangoli lotus (drawn with stroke-dash on chapter open)
  M['rangoli-lotus'] = (cls) => {
    let petals = '';
    for (let i = 0; i < 8; i++) petals += `<path pathLength="1" transform="rotate(${i * 45} 100 100)" d="M100 100 C88 78 90 52 100 34 C110 52 112 78 100 100Z"/>`;
    for (let i = 0; i < 8; i++) petals += `<path pathLength="1" transform="rotate(${i * 45 + 22.5} 100 100)" d="M100 100 C94 86 94 70 100 60 C106 70 106 86 100 100Z"/>`;
    return svg('0 0 200 200', `${petals}<circle pathLength="1" cx="100" cy="100" r="10"/><circle pathLength="1" cx="100" cy="100" r="78"/><circle pathLength="1" cx="100" cy="100" r="90" stroke-dasharray=".01 .03"/>`, 'draw ' + (cls || ''));
  };
  M['rangoli-star'] = (cls) => {
    let s = '';
    for (let i = 0; i < 2; i++) s += `<rect pathLength="1" x="45" y="45" width="110" height="110" transform="rotate(${i * 45} 100 100)"/>`;
    for (let i = 0; i < 8; i++) s += `<circle pathLength="1" cx="100" cy="22" r="6" transform="rotate(${i * 45} 100 100)"/>`;
    return svg('0 0 200 200', `${s}<circle pathLength="1" cx="100" cy="100" r="34"/><circle pathLength="1" cx="100" cy="100" r="16"/>`, 'draw ' + (cls || ''));
  };
  M.jaali = (cls) => {
    let s = '';
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s += `<path pathLength="1" d="M${20 + x * 40} ${y * 40} l20 20 l-20 20 l-20 -20Z"/><circle pathLength="1" cx="${20 + x * 40}" cy="${20 + y * 40}" r="5"/>`;
    return svg('0 0 200 200', `<rect pathLength="1" x="2" y="2" width="196" height="196" rx="98"/>${s}`, 'draw ' + (cls || ''));
  };
  M.paisley = (cls) => svg('0 0 200 200', `
    <path pathLength="1" d="M110 30 C160 40 175 110 135 150 C100 185 45 170 40 125 C36 90 70 75 92 92 C110 106 100 128 84 124"/>
    <path pathLength="1" d="M108 46 C146 56 158 108 128 138 C102 164 60 154 56 124"/>
    <path pathLength="1" d="M110 30 C100 22 98 12 104 6"/>
    <circle pathLength="1" cx="84" cy="112" r="6"/><circle pathLength="1" cx="120" cy="80" r="3"/><circle pathLength="1" cx="132" cy="102" r="3"/><circle pathLength="1" cx="126" cy="124" r="3"/>`, 'draw ' + (cls || ''));
  M.kite = (cls) => svg('0 0 200 200', `
    <path pathLength="1" d="M100 20 L160 90 L100 160 L40 90Z"/><path pathLength="1" d="M100 20 L100 160 M40 90 L160 90"/>
    <path pathLength="1" d="M40 90 C70 60 130 60 160 90"/>
    <path pathLength="1" d="M100 160 C90 175 110 182 98 196"/>`, 'draw ' + (cls || ''));
  M.mango = (cls) => svg('0 0 200 200', `
    <path pathLength="1" d="M100 50 C150 50 165 110 140 145 C118 176 70 172 56 140 C42 108 60 50 100 50Z"/>
    <path pathLength="1" d="M100 50 C102 38 108 30 116 26"/><path pathLength="1" d="M108 34 C130 20 150 26 158 38 C140 44 122 42 108 34Z"/>`, 'draw ' + (cls || ''));
  M.diyaLine = (cls) => svg('0 0 200 200', `
    <path pathLength="1" d="M30 110 C60 116 140 116 170 108 C164 146 136 162 100 162 C64 162 38 146 30 110Z"/>
    <path pathLength="1" d="M100 100 C90 84 92 66 100 46 C108 66 110 84 100 100Z"/>
    <circle pathLength="1" cx="100" cy="90" r="64" stroke-dasharray=".01 .04"/>`, 'draw ' + (cls || ''));
  M.toran = (cls) => {
    let s = '<path d="M0 8 C100 26 300 26 400 8" stroke-width="1.5"/>';
    for (let i = 0; i < 13; i++) {
      const x = 15 + i * 30, y = 8 + Math.sin((i / 12) * Math.PI) * 16;
      if (i % 2 === 0) s += `<path d="M${x} ${y} c-7 10 -7 22 0 30 c7 -8 7 -20 0 -30Z" fill="#5E7D4F" fill-opacity=".85" stroke="none"/>`;
      else s += `<circle cx="${x}" cy="${y + 8}" r="7" fill="#E5822A" stroke="none"/><circle cx="${x}" cy="${y + 8}" r="3" fill="#E0A526" stroke="none"/>`;
    }
    return `<svg class="toran ${cls || ''}" viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="#B48C3A">${s}</svg>`;
  };
  M['inland-letter'] = (cls) => svg('0 0 200 200', `
    <rect pathLength="1" x="30" y="40" width="140" height="120" rx="4"/>
    <path pathLength="1" d="M30 40 L100 100 L170 40"/><path pathLength="1" d="M30 160 L80 110 M170 160 L120 110"/>
    <rect pathLength="1" x="140" y="48" width="22" height="26"/>`, 'draw ' + (cls || ''));

  M.feather = () => svg('0 0 48 48', `<path d="M38 6 C22 8 12 20 10 38 L8 42"/><path d="M38 6 C36 22 26 34 10 38"/><path d="M18 30 L28 20 M14 34 L22 26 M22 24 L32 14"/>`, 'feather');
  M.petal = (color) => `<svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 0 C18 8 18 20 10 28 C2 20 2 8 10 0Z" fill="${color || '#E5822A'}"/><path d="M10 4 L10 24" stroke="#C4621A" stroke-opacity=".4" stroke-width="1"/></svg>`;
  M.marigold = (filled) => `<svg viewBox="0 0 20 20" aria-hidden="true" class="marigold ${filled ? 'on' : ''}"><circle cx="10" cy="10" r="8" /><circle cx="10" cy="10" r="3.5"/></svg>`;
  M.waxSeal = () => `<svg class="wax-seal" viewBox="0 0 80 80" aria-hidden="true">
    <path d="M40 4 C50 6 54 2 60 8 C66 14 74 14 74 24 C74 32 80 36 76 46 C72 54 76 62 66 68 C58 74 54 78 44 76 C36 74 28 80 20 72 C14 66 6 64 6 54 C6 46 2 40 6 30 C10 22 8 14 18 10 C26 6 30 2 40 4Z" fill="#A8261C"/>
    <circle cx="40" cy="40" r="22" fill="none" stroke="#F6EFE3" stroke-opacity=".5" stroke-width="1.5"/>
    <path d="M40 26 C34 34 34 40 40 52 C46 40 46 34 40 26Z" fill="#F6EFE3" fill-opacity=".55"/></svg>`;
  M.mauli = () => `<svg class="mauli" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M0 10 C40 2 60 18 100 10 C140 2 160 18 200 10 C240 2 260 18 300 10" stroke="#A8261C" stroke-width="3" fill="none"/><path pathLength="1" d="M0 12 C40 4 60 20 100 12 C140 4 160 20 200 12 C240 4 260 20 300 12" stroke="#E0A526" stroke-width="1.5" fill="none"/></svg>`;
  M.play = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 L19 12 L8 19Z" fill="currentColor"/></svg>`;
  M.pause = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>`;
  M.stop = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`;
  M.redo = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  M.plus = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  M.trash = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  M.tick = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  M.back = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  M.fwd = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // contents (list with dotted leaders)
  M.contents = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h9M4 12h9M4 18h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 6h1M18 6h2M15 12h1M18 12h2M15 18h1M18 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  // closed book
  M.bookShut = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M8 3v18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 8h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  // ---- Mauli tied across the cover: a twisted red-and-haldi thread
  // (red core, alternating haldi / deep-red dashes = the twist), knotted,
  // two frayed tassel ends hanging. Class names are what the untie animates.
  const twist = (d, w) => `<path d="${d}" stroke="#4A0E0A" stroke-opacity=".35" stroke-width="${w + 1.6}" fill="none" vector-effect="non-scaling-stroke" transform="translate(0 1.2)"/>
    <path d="${d}" stroke="#B3271D" stroke-width="${w}" fill="none" vector-effect="non-scaling-stroke"/>
    <path d="${d}" stroke="#F0B43A" stroke-width="${w * 0.42}" stroke-dasharray="3.2 3.6" fill="none" vector-effect="non-scaling-stroke"/>
    <path d="${d}" stroke="#7E1510" stroke-width="${w * 0.36}" stroke-dasharray="3.2 3.6" stroke-dashoffset="3.4" fill="none" vector-effect="non-scaling-stroke"/>
    <path d="${d}" stroke="#FFE2A8" stroke-opacity=".35" stroke-width=".7" fill="none" vector-effect="non-scaling-stroke" transform="translate(0 -1)"/>`;
  const fray = (x, y, dir) => [-5, -2, 1, 4].map((o) => `<path d="M${x} ${y} q${o * 0.4} 4 ${o + dir} 8" stroke="${o % 2 ? '#F0B43A' : '#B3271D'}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`).join('');
  M.mauliTie = () => `<span class="mauli-tie" aria-hidden="true">
    <svg class="mt-l" viewBox="0 0 200 20" preserveAspectRatio="none">${twist('M-2 9 C40 13 90 13 140 11 C170 10 190 9 202 9.5', 3.6)}</svg>
    <svg class="mt-r" viewBox="0 0 100 20" preserveAspectRatio="none">${twist('M-2 9.5 C30 10 70 11 102 8.5', 3.6)}</svg>
    <svg class="mt-bow" viewBox="0 0 60 80">
      <g stroke-linecap="round">${twist('M28 16 C26 30 20 44 17 64', 3)}${twist('M32 16 C34 32 40 46 44 68', 3)}</g>
      ${fray(17, 64, -1)}${fray(44, 68, 1)}
      <ellipse cx="30" cy="16" rx="9" ry="6.5" fill="#B3271D"/>
      <path d="M22 13 C26 19 34 19 38 13 M21.5 17 C26 23 34 23 38.5 17" stroke="#F0B43A" stroke-width="1.3" fill="none"/>
      <path d="M24 11 C28 9 33 9 36 11" stroke="#FFE2A8" stroke-opacity=".5" stroke-width="1" fill="none"/>
    </svg>
  </span>`;
  // the jharokha arch on the cover (stretched to its box; strokes stay crisp)
  M.arch = () => `<svg class="cv-arch" viewBox="0 0 150 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M11 196 V78 C11 50 44 36 75 12 C106 36 139 50 139 78 V196 Z" fill="rgba(4,24,23,.26)" stroke="none"/>
    <path d="M4 200 V74 C4 44 40 28 75 3 C110 28 146 44 146 74 V200" fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <path d="M11 196 V78 C11 50 44 36 75 12 C106 36 139 50 139 78 V196 Z" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width=".8" vector-effect="non-scaling-stroke"/>
  </svg>`;
  M.menu = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  M.mic = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  M.pen = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L5 15 L16 4 L20 8 L9 19Z M14 6 L18 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>`;
  M.speakerOn = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="M16 9a3 3 0 0 1 0 6M18.5 6.5a6.5 6.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  M.speakerOff = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="M16 9l5 5M21 9l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ---- Cake with named candles
  M.cake = (names) => {
    const n = names.length;
    const w = 300, left = 70, right = 230;
    // Candle bodies stay in the (static) cake SVG. Flames + smoke are small
    // HTML overlays positioned in % of the viewBox, so lean/flicker/smoke are
    // pure GPU transforms and the big cake SVG never repaints.
    let candles = '', flames = '';
    names.forEach((name, i) => {
      const x = n === 1 ? 150 : left + ((right - left) * i) / (n - 1);
      candles += `
      <g transform="translate(${x} 0)">
        <rect x="-5" y="72" width="10" height="40" rx="2" fill="${i % 2 ? '#F6EFE3' : '#F3D9A0'}" stroke="#B48C3A" stroke-width="1"/>
        <path d="M-5 80 l10 -4 M-5 92 l10 -4 M-5 104 l10 -4" stroke="#E5822A" stroke-width="1.2"/>
        <line x1="0" y1="72" x2="0" y2="66" stroke="#3a2a1c" stroke-width="1.5"/>
      </g>`;
      // flame box: x-7..x+7, y 44..68  (viewBox 300 x 250)
      flames += `<span class="candle" data-i="${i}" style="left:${(((x - 7) / w) * 100).toFixed(3)}%;top:17.6%;width:${((14 / w) * 100).toFixed(3)}%;height:9.6%">
        <span class="lean"><span class="fl"><svg viewBox="-7 44 14 24"><ellipse cx="0" cy="56" rx="6" ry="11" fill="#F2A93B"/><ellipse cx="0" cy="59" rx="3" ry="6" fill="#FFF4C2"/></svg></span></span>
        <svg class="smoke" viewBox="-7 4 14 62"><path d="M0 64 C-6 52 6 44 0 32 C-5 22 4 16 0 6" stroke="#8A7764" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </span>`;
    });
    let piping = '';
    for (let i = 0; i < 14; i++) piping += `<circle cx="${40 + i * 17.0}" cy="118" r="6" fill="#E5822A"/><circle cx="${40 + i * 17.0}" cy="118" r="2.5" fill="#E0A526"/>`;
    let piping2 = '';
    for (let i = 0; i < 16; i++) piping2 += `<circle cx="${22 + i * 17.0}" cy="196" r="6.5" fill="#E5822A"/>`;
    return `<span class="cake-wrap" role="img" aria-label="Cake">${flames}<svg class="cake" viewBox="0 0 ${w} 250" aria-hidden="true">
      <ellipse cx="150" cy="238" rx="140" ry="10" fill="#2A2018" fill-opacity=".12"/>
      <rect x="18" y="160" width="264" height="74" rx="10" fill="#FBF3E4" stroke="#E2D3B8"/>
      <path d="M18 172 C40 186 60 170 84 182 C110 194 130 172 150 184 C174 196 196 172 220 184 C244 196 262 176 282 180 L282 172 L18 172Z" fill="#F3D9A0"/>
      ${piping2}
      <rect x="36" y="112" width="228" height="56" rx="10" fill="#FFF9EE" stroke="#E2D3B8"/>
      <path d="M36 124 C60 136 78 120 100 132 C122 144 140 122 160 134 C184 146 204 122 226 134 C244 142 256 130 264 128 L264 120 L36 120Z" fill="#F3D9A0"/>
      ${piping}
      ${candles}
    </svg></span>`;
  };
})();
