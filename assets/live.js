/* סגנון "חי" אופציונלי לדף המכירה: כותרת שמתמלאת, צורות צפות, פס מוצרים נע, הופעה בגלילה, תג צף מסתובב.
   הכול CSS קל ו-JS קטן. מכבד "הפחת תנועה" ומשאיר את הדף שמיש גם בלי JS. */
(function () {
  var CSS = ''
    + '.live header.top{position:relative;overflow:hidden;background:linear-gradient(120deg,var(--navy),#0b1226 60%,var(--navy));background-size:200% 200%;animation:lvbg 16s ease-in-out infinite alternate}'
    + '.live header.top>*{position:relative;z-index:1}'
    + '.lv-orb{position:absolute!important;z-index:0!important;border-radius:50%;filter:blur(40px);opacity:.35;pointer-events:none}'
    + '.lv-o1{width:280px;height:280px;background:var(--gold);top:-90px;inset-inline-start:-60px;animation:lvfloat 11s ease-in-out infinite alternate}'
    + '.lv-o2{width:220px;height:220px;background:#4d6bff;bottom:-90px;inset-inline-end:12%;animation:lvfloat 14s ease-in-out infinite alternate-reverse}'
    + '.live header.top h1{font-size:clamp(38px,7vw,72px);line-height:1.05}'
    + '.lw{display:inline-block;white-space:nowrap;margin-inline-end:.28em}'
    + '.lc{display:inline-block;color:transparent;-webkit-text-stroke:1.5px var(--gold2);animation:lvdrop .95s cubic-bezier(.2,1.25,.4,1) both,lvfill .6s ease forwards;animation-delay:var(--d),calc(var(--d) + .8s)}'
    + '.lv-strip{background:var(--gold);color:var(--navy);overflow:hidden;white-space:nowrap;padding:10px 0;font-weight:700;font-size:17px}'
    + '.lv-strip .lv-tr{display:inline-block;padding-inline-start:100%;animation:lvmq 38s linear infinite}'
    + '.lv-strip:hover .lv-tr{animation-play-state:paused}'
    + '.lv-strip span{margin:0 22px}.lv-strip i{font-style:normal;opacity:.55}'
    + '.live .prod{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease;animation:lvbob 7s ease-in-out infinite;animation-delay:calc(var(--d,0)*-1.4s)}'
    + '.live .prod:hover{transform:translateY(-10px) rotate(-.4deg);box-shadow:8px 10px 0 var(--gold);animation-play-state:paused;z-index:2}'
    + '.live .prod .im{overflow:hidden}.live .prod .im img{transition:transform .7s cubic-bezier(.2,.8,.2,1),filter .5s ease}'
    + '.live .prod:hover .im img{transform:scale(1.14) translateY(-2%);filter:saturate(1.2) contrast(1.04)}'
    + '.live .prod .im::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.38) 50%,transparent 65%);transform:translateX(120%);pointer-events:none}'
    + '.live .prod:hover .im::after{transform:translateX(-120%);transition:transform .9s ease}'
    + '.lv-want{display:none}'
    + '@media (hover:hover){.lv-want{display:flex;position:absolute;inset:auto 0 0 0;z-index:3;border:0;cursor:pointer;justify-content:center;align-items:flex-end;padding:34px 12px 12px;background:linear-gradient(transparent,rgba(10,16,36,.86));color:var(--gold2);font:700 22px "Frank Ruhl Libre",Heebo,serif;letter-spacing:.3px;opacity:0;transform:translateY(40%);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.8,.2,1)}'
    + '.live .prod:hover .lv-want,.lv-want:focus-visible{opacity:1;transform:none}.lv-want:disabled{display:none}.lv-want em{font-style:normal;display:inline-block;transition:transform .3s}.lv-want:hover em{transform:scale(1.08)}}'
    + '.live .pkg{transition:transform .2s ease,box-shadow .2s ease}.live .pkg:hover{transform:translateY(-3px);box-shadow:4px 5px 0 var(--gold)}'
    + '.lv-rv{opacity:0;transform:translateY(26px);transition:opacity .6s ease,transform .6s ease;transition-delay:calc(var(--d,0)*60ms)}'
    + '.lv-rv.lv-in{opacity:1;transform:none}.lv-rv.lv-now{transition:none}'
    + '.live .sec>h2{display:inline-block;align-self:flex-start;background:linear-gradient(transparent 62%,var(--gold2) 62%);padding:0 6px}'
    + '.lv-badge{position:fixed;inset-inline-start:18px;bottom:18px;z-index:50;width:104px;height:104px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.28);border:2px solid var(--gold)}'
    + '.lv-badge svg{position:absolute;inset:0;width:100%;height:100%;animation:lvspin 14s linear infinite}'
    + '.lv-badge svg{direction:ltr}.lv-badge svg text{fill:var(--gold2);font:700 11.5px Heebo,Arial,sans-serif;letter-spacing:1.6px}'
    + '.lv-badge b{font-size:15px;color:var(--gold2);position:relative}'
    + '.lv-badge:hover{transform:scale(1.07)}'
    + '@keyframes lvbob{0%,100%{translate:0 0}50%{translate:0 -5px}}@keyframes lvbg{to{background-position:100% 100%}}@keyframes lvfloat{to{transform:translate(60px,40px) scale(1.15)}}'
    + '@keyframes lvdrop{0%{opacity:0;transform:translate(var(--dx),-260px) rotate(var(--r))}55%{opacity:1}100%{opacity:1;transform:none}}@keyframes lvfill{to{color:#fff;-webkit-text-stroke-color:transparent}}@keyframes lvmq{to{transform:translateX(100%)}}@keyframes lvspin{to{transform:rotate(360deg)}}'
    + '@media (prefers-reduced-motion:reduce){.live header.top,.lv-orb,.lv-strip .lv-tr,.lv-badge svg{animation:none!important}.lc{animation:none!important;color:#fff;-webkit-text-stroke-color:transparent}.lv-rv{opacity:1;transform:none;transition:none}.live .prod{animation:none!important}.live .prod,.live .pkg,.live .prod .im img,.lv-want{transition:none}.live .prod:hover,.live .pkg:hover{transform:none}}'
    + '@media print{.lv-badge,.lv-strip,.lv-orb{display:none!important}}';
  var seen = {}, io = null, mo = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() { if (!document.getElementById('lv-css')) { var st = document.createElement('style'); st.id = 'lv-css'; st.textContent = CSS; document.head.appendChild(st); } }
  /* כל אות יורדת מלמעלה: אותיות החצי הראשון נכנסות מצד אחד, ואותיות החצי השני מהצד השני, בו זמנית, וההרכבה נסגרת באמצע */
  function words(h1) {
    if (!h1 || h1.getAttribute('data-lv')) return; var t = h1.textContent.trim(); h1.setAttribute('data-lv', '1'); h1.setAttribute('aria-label', t);
    var ws = t.split(/\s+/).filter(Boolean), L = ws.map(function (w) { return w.match(/[^\u0591-\u05C7][\u0591-\u05C7]*/g) || [w]; }), n = L.reduce(function (a, x) { return a + x.length; }, 0), k = 0;
    h1.innerHTML = L.map(function (let) {
      return '<span class="lw" aria-hidden="true">' + let.map(function (ch) {
        var i = k++, side = i < n / 2 ? 1 : -1, rank = Math.min(i, n - 1 - i), dx = side * (150 + (i % 3) * 45), r = side * (28 + (i % 4) * 14);
        return '<span class="lc" style="--d:' + (0.15 + rank * 0.085).toFixed(3) + 's;--dx:' + dx + 'px;--r:' + r + 'deg">' + esc(ch) + '</span>';
      }).join('') + '</span>';
    }).join(' ');
  }
  var WANT = ['אני רוצה את זה!', 'זה שלי!', 'תנו לי כרטיס!', 'אני בפנים!'];
  function want(root, open) {
    if (!open) return;
    [].forEach.call((root || document).querySelectorAll('.prod .im:not([data-lw])'), function (im, i) {
      im.setAttribute('data-lw', '1'); var card = im.closest('.prod'), plus = card && card.querySelector('.qty .plus');
      if (!plus) return; var b = document.createElement('button'); b.type = 'button'; b.className = 'lv-want'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
      b.innerHTML = '<em>' + esc(WANT[i % WANT.length]) + '</em>'; b.disabled = !!plus.disabled;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (!plus.disabled) plus.click(); }); im.appendChild(b);
    });
  }
  function reveal(root) {
    [].forEach.call((root || document).querySelectorAll('.prod:not(.lv-rv),.pkg:not(.lv-rv)'), function (el, i) {
      el.classList.add('lv-rv'); el.style.setProperty('--d', String(i % 6));
      var key = (el.className.indexOf('pkg') >= 0 ? 'k' : 'p') + (el.getAttribute('data-k') || (el.querySelector('.nm') || {}).textContent || i);
      if (seen[key]) { el.classList.add('lv-in', 'lv-now'); return; }
      seen[key] = 1; if (io) io.observe(el); else el.classList.add('lv-in');
    });
  }
  function start(o) {
    o = o || {}; css(); document.documentElement.classList.add('live'); document.body.classList.add('live');
    var hd = document.querySelector('header.top'); if (!hd) return;
    if (!hd.querySelector('.lv-orb')) { hd.insertAdjacentHTML('afterbegin', '<i class="lv-orb lv-o1"></i><i class="lv-orb lv-o2"></i>'); }
    words(hd.querySelector('h1'));
    var names = (o.names || []).filter(Boolean).slice(0, 40);
    if (names.length && !document.querySelector('.lv-strip')) {
      var items = names.map(function (n) { return '<span>' + esc(n) + '</span><i>✦</i>'; }).join('');
      hd.insertAdjacentHTML('afterend', '<div class="lv-strip" aria-hidden="true"><div class="lv-tr">' + items + items + '</div></div>');
    }
    if ('IntersectionObserver' in window && !io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('lv-in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    reveal(document); want(document, o.open);
    if (!mo && 'MutationObserver' in window) { mo = new MutationObserver(function () { reveal(document); want(document, o.open); }); var g = document.getElementById('main') || document.body; mo.observe(g, { childList: true, subtree: true }); }
    if (o.open && !document.querySelector('.lv-badge')) {
      var t = (o.badge || 'לרכישה') + ' ✦ ', txt = t + t + t;
      document.body.insertAdjacentHTML('beforeend', '<a class="lv-badge" href="#main" aria-label="' + esc(o.badge || 'לרכישה') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="lvc" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs><text><textPath href="#lvc">' + esc(txt) + '</textPath></text></svg><b>' + esc(o.badge || 'לרכישה') + '</b></a>');
      document.querySelector('.lv-badge').addEventListener('click', function (e) { var t2 = document.querySelector('.cols') || document.getElementById('main'); if (t2) { e.preventDefault(); t2.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }); } });
    }
  }
  window.MLLive = { start: start };
})();
