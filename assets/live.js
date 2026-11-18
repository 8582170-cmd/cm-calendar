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
    + '.lw{display:inline-block;margin-inline-end:.28em;color:transparent;-webkit-text-stroke:1.5px var(--gold2);animation:lvfill .9s ease forwards;animation-delay:calc(var(--i)*.18s + .15s)}'
    + '.lv-strip{background:var(--gold);color:var(--navy);overflow:hidden;white-space:nowrap;padding:10px 0;font-weight:700;font-size:17px}'
    + '.lv-strip .lv-tr{display:inline-block;padding-inline-start:100%;animation:lvmq 38s linear infinite}'
    + '.lv-strip:hover .lv-tr{animation-play-state:paused}'
    + '.lv-strip span{margin:0 22px}.lv-strip i{font-style:normal;opacity:.55}'
    + '.live .prod{transition:transform .25s ease,box-shadow .25s ease}'
    + '.live .prod:hover{transform:translateY(-6px);box-shadow:6px 8px 0 var(--gold)}'
    + '.live .prod .im img{transition:transform .6s ease}.live .prod:hover .im img{transform:scale(1.07)}'
    + '.live .pkg{transition:transform .2s ease,box-shadow .2s ease}.live .pkg:hover{transform:translateY(-3px);box-shadow:4px 5px 0 var(--gold)}'
    + '.lv-rv{opacity:0;transform:translateY(26px);transition:opacity .6s ease,transform .6s ease;transition-delay:calc(var(--d,0)*60ms)}'
    + '.lv-rv.lv-in{opacity:1;transform:none}.lv-rv.lv-now{transition:none}'
    + '.live .sec>h2{display:inline-block;align-self:flex-start;background:linear-gradient(transparent 62%,var(--gold2) 62%);padding:0 6px}'
    + '.lv-badge{position:fixed;inset-inline-start:18px;bottom:18px;z-index:50;width:104px;height:104px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.28);border:2px solid var(--gold)}'
    + '.lv-badge svg{position:absolute;inset:0;width:100%;height:100%;animation:lvspin 14s linear infinite}'
    + '.lv-badge svg{direction:ltr}.lv-badge svg text{fill:var(--gold2);font:700 11.5px Heebo,Arial,sans-serif;letter-spacing:1.6px}'
    + '.lv-badge b{font-size:15px;color:var(--gold2);position:relative}'
    + '.lv-badge:hover{transform:scale(1.07)}'
    + '@keyframes lvbg{to{background-position:100% 100%}}@keyframes lvfloat{to{transform:translate(60px,40px) scale(1.15)}}'
    + '@keyframes lvfill{to{color:#fff;-webkit-text-stroke-color:transparent}}@keyframes lvmq{to{transform:translateX(100%)}}@keyframes lvspin{to{transform:rotate(360deg)}}'
    + '@media (prefers-reduced-motion:reduce){.live header.top,.lv-orb,.lv-strip .lv-tr,.lv-badge svg{animation:none!important}.lw{animation:none!important;color:#fff;-webkit-text-stroke-color:transparent}.lv-rv{opacity:1;transform:none;transition:none}.live .prod,.live .pkg,.live .prod .im img{transition:none}.live .prod:hover,.live .pkg:hover{transform:none}}'
    + '@media print{.lv-badge,.lv-strip,.lv-orb{display:none!important}}';
  var seen = {}, io = null, mo = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() { if (!document.getElementById('lv-css')) { var st = document.createElement('style'); st.id = 'lv-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function words(h1) { if (!h1 || h1.getAttribute('data-lv')) return; var t = h1.textContent; h1.setAttribute('data-lv', '1'); h1.setAttribute('aria-label', t); h1.innerHTML = t.split(/\s+/).filter(Boolean).map(function (w, i) { return '<span class="lw" aria-hidden="true" style="--i:' + i + '">' + esc(w) + '</span>'; }).join(' '); }
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
    reveal(document);
    if (!mo && 'MutationObserver' in window) { mo = new MutationObserver(function () { reveal(document); }); var g = document.getElementById('main') || document.body; mo.observe(g, { childList: true, subtree: true }); }
    if (o.open && !document.querySelector('.lv-badge')) {
      var t = (o.badge || 'לרכישה') + ' ✦ ', txt = t + t + t;
      document.body.insertAdjacentHTML('beforeend', '<a class="lv-badge" href="#main" aria-label="' + esc(o.badge || 'לרכישה') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="lvc" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs><text><textPath href="#lvc">' + esc(txt) + '</textPath></text></svg><b>' + esc(o.badge || 'לרכישה') + '</b></a>');
      document.querySelector('.lv-badge').addEventListener('click', function (e) { var t2 = document.querySelector('.cols') || document.getElementById('main'); if (t2) { e.preventDefault(); t2.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }); } });
    }
  }
  window.MLLive = { start: start };
})();
