/* אפקטים להגרלה החיה: מסך ערבוב, חשיפת הזוכה עם "מזל טוב ל…" וקונפטי (חתיכות נייר צבעוניות).
   משמש גם את מסך ההגרלה של המנהל וגם את דף הצפייה החיה. מכבד prefers-reduced-motion.
   MLDrawFX.shuffle(host, {product, ms}) -> {stop()}   MLDrawFX.reveal(host, d, {onClose}) -> {close()}   MLDrawFX.confetti(ms) */
(function () {
  'use strict';
  var CSS = '.dfx{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;color:#fff;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#2b3a66 0%,#10182f 70%)}' +
    '.dfx.in{position:relative;inset:auto;z-index:1;min-height:420px;border-radius:20px}' +
    '.dfx:before{content:"";position:absolute;inset:-50%;background:conic-gradient(from 0deg,rgb(255 255 255 / .0),rgb(255 214 120 / .16),rgb(255 255 255 / 0),rgb(255 214 120 / .16),rgb(255 255 255 / 0),rgb(255 214 120 / .16),rgb(255 255 255 / 0));animation:dfxspin 24s linear infinite;pointer-events:none}' +
    '.dfx>*{position:relative}.dfx .dp{font-size:clamp(18px,3vw,30px);color:#E8D49A;font-weight:600}' +
    '.dfx .dn{font-size:clamp(18px,2.6vw,26px);color:#D5DAE6}.dfx .ds{font-family:"Frank Ruhl Libre",serif;font-weight:900;font-size:clamp(70px,16vw,190px);line-height:1;letter-spacing:2px;color:#FFD879;text-shadow:0 0 30px rgb(255 200 80 / .55);font-variant-numeric:tabular-nums}' +
    '.dfx .ds.roll{animation:dfxpulse .5s ease-in-out infinite alternate}' +
    '.dfx .dm{font-family:"Frank Ruhl Libre",serif;font-weight:900;font-size:clamp(30px,6.4vw,78px);line-height:1.15;background:linear-gradient(90deg,#FFE9A6,#fff,#FFD879,#fff,#FFE9A6);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:dfxshine 3s linear infinite}' +
    '.dfx .dw{font-family:"Frank Ruhl Libre",serif;font-weight:700;font-size:clamp(30px,6vw,72px);color:#fff}.dfx .dc{font-size:clamp(18px,3vw,30px);color:#D5DAE6}' +
    '.dfx .dpop{animation:dfxpop .7s cubic-bezier(.2,1.5,.4,1) both}.dfx .dpop2{animation:dfxpop .7s .25s cubic-bezier(.2,1.5,.4,1) both}.dfx .dpop3{animation:dfxpop .7s .5s cubic-bezier(.2,1.5,.4,1) both}' +
    '.dfx button{font:inherit;font-weight:700;font-size:18px;min-height:52px;padding:0 30px;border:0;border-radius:14px;background:#FFD879;color:#10182f;cursor:pointer}' +
    '.dfc{position:fixed;inset:0;z-index:9500;pointer-events:none}' +
    '@keyframes dfxspin{to{transform:rotate(360deg)}}@keyframes dfxpulse{from{transform:scale(1)}to{transform:scale(1.05)}}@keyframes dfxshine{to{background-position:-300% 0}}@keyframes dfxpop{from{opacity:0;transform:scale(.3) translateY(30px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.dfx:before,.dfx .dm,.dfx .ds.roll,.dfx .dpop,.dfx .dpop2,.dfx .dpop3{animation:none!important}}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() { if (!document.getElementById('dfx-css')) { var st = document.createElement('style'); st.id = 'dfx-css'; st.textContent = CSS; document.head.appendChild(st); } }
  var reduce = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var COLORS = ['#FF4D6D', '#FFD23F', '#3BCEAC', '#4D9DE0', '#B565D8', '#FF9F1C', '#7BDC65', '#fff'];
  /* קונפטי: חתיכות נייר נופלות משני צדי המסך וממרכז למעלה, כ-ms אלפיות שנייה */
  function confetti(ms) {
    if (reduce()) return; var cv = document.createElement('canvas'); cv.className = 'dfc'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    var x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, P = [], t0 = Date.now(), end = t0 + (ms || 6000), cnt = Math.min(260, Math.round(W / 5));
    function add(n, fx, fy, spread) { for (var i = 0; i < n; i++) { var a = (-90 + (Math.random() - .5) * spread) * Math.PI / 180, v = 7 + Math.random() * 11; P.push({ x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 8, h: 10 + Math.random() * 12, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: COLORS[Math.floor(Math.random() * COLORS.length)], s: Math.random() * 6 }); } }
    add(cnt / 2, 0, H * .85, 70); add(cnt / 2, W, H * .85, 70); setTimeout(function () { add(cnt / 2, W / 2, H * .9, 100); }, 450); setTimeout(function () { add(cnt / 3, 0, H * .7, 60); add(cnt / 3, W, H * .7, 60); }, 1100);
    (function f() {
      x.clearRect(0, 0, W, H); var now = Date.now(); P = P.filter(function (p) { return p.y < H + 40; });
      P.forEach(function (p) { p.vy += .22; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.s += .12; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(1, Math.cos(p.s)); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
      if (now < end || P.length) requestAnimationFrame(f); else cv.remove();
    })();
  }
  /* "מזל טוב ל…": ל צמודה לשם בעברית, ובמקף לשם בלועזית */
  function lucky(n) { n = String(n || '').trim(); if (!n) return 'מזל טוב!'; return 'מזל טוב ל' + (/^[֐-׿]/.test(n) ? '' : '-') + n + '!'; }
  /* ערבוב: מספרים מתחלפים, ומשפט שמתעדכן. ms = משך הערבוב */
  function shuffle(host, o) {
    css(); o = o || {}; var ms = o.ms || 4000, el = document.createElement('div'); el.className = 'dfx' + (host !== document.body ? ' in' : ''); el.setAttribute('role', 'status');
    el.innerHTML = '<div class="dp">' + esc(o.product || '') + '</div><div class="dn" id="dfph">ערבוב ראשון…</div><div class="ds roll" id="dfsh" aria-hidden="true">0000</div>';
    host.appendChild(el); var t = Date.now(), ph = el.querySelector('#dfph'), sh = el.querySelector('#dfsh');
    var iv = setInterval(function () { var p = (Date.now() - t) / ms; sh.textContent = String(Math.floor(Math.random() * 9000 + 1)).padStart(4, '0'); ph.textContent = p < .33 ? 'ערבוב ראשון…' : p < .66 ? 'ערבוב שני…' : p < .95 ? 'ערבוב שלישי…' : 'מגרילים…'; }, 70);
    return { el: el, stop: function () { clearInterval(iv); el.remove(); } };
  }
  /* חשיפת זוכה. d = {product, round, draws, kind, serial, name, city}. onClose: אם קיים, יש כפתור סגירה */
  function reveal(host, d, o) {
    css(); o = o || {}; var el = document.createElement('div'); el.className = 'dfx' + (host !== document.body ? ' in' : ''); el.setAttribute('role', 'alert');
    var lab = d.kind === 'reserve' ? 'זוכה חלופי' : (d.draws > 1 ? 'זוכה בהגרלה ' + d.round + ' מתוך ' + d.draws : 'הכרטיס הזוכה');
    el.innerHTML = '<div class="dp dpop">' + esc(d.product || '') + '</div><div class="dn dpop">' + esc(lab) + '</div><div class="ds dpop">' + esc(d.serial) + '</div><div class="dm dpop2">' + esc(lucky(d.name)) + '</div>' + (d.city ? '<div class="dc dpop3">' + esc(d.city) + '</div>' : '') + (o.onClose ? '<button type="button" class="dpop3" id="dfcx">סגירה</button>' : '');
    host.appendChild(el); if (o.conf !== false) confetti(6500);
    function close() { el.remove(); if (o.onClose) o.onClose(); }
    var b = el.querySelector('#dfcx'); if (b) { b.onclick = close; b.focus(); }
    return { el: el, close: function () { el.remove(); } };
  }
  window.MLDrawFX = { shuffle: shuffle, reveal: reveal, confetti: confetti, lucky: lucky, css: css };
})();
