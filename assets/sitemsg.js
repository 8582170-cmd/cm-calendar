/* הודעות לגולשים שנכתבות בדף הניהול ("הודעות לגולשים").
   כל הודעה מוצגת בראש הדף רק באזורים שנבחרו לה: דף הבית, בוני הלוח, הלוח המקוון, הברכות. אפשר לסגור, ואז היא לא חוזרת (עד שמשנים אותה). */
(function () {
  'use strict';
  var p = location.pathname;
  var area = /^\/online(\/|$)/.test(p) ? 'online' : /^\/brachot(\/|$)/.test(p) ? 'brachot' :
    /\/(app|simple|countdown)(-en)?(\.html)?$/.test(p) ? 'builder' : /^\/(index\.html|new\.html|en\.html)?$/.test(p) ? 'home' : 'other';
  if (area === 'other') return;
  var EN = document.documentElement.lang === 'en';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* קישורים: [טקסט](https://...) או כתובת רגילה */
  function fmt(t) {
    return esc(t).replace(/\[([^\]]{1,80})\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2">$2</a>').replace(/\n/g, '<br>');
  }
  var COL = { info: ['#e8f1f2', '#1d4f57', '#9cc3c8'], ok: ['#e7f4ea', '#225b32', '#9fd0ab'], warn: ['#fff4dd', '#6b4a00', '#ecc66b'], sale: ['#fbe8ee', '#7a1f3d', '#e6a3b8'] };
  function show(L) {
    if (!L.length) return;
    var css = document.createElement('style');
    css.textContent = '.smsg-w{position:relative;z-index:50;display:flex;flex-direction:column}.smsg{display:flex;align-items:flex-start;justify-content:center;gap:10px;padding:9px 44px 9px 16px;font:500 15px/1.5 Assistant,Heebo,Arial,sans-serif;border-bottom:1px solid;text-align:center;position:relative}' +
      '.smsg a{color:inherit;font-weight:700;text-decoration:underline}.smsg b{font-weight:800}.smsg-x{position:absolute;inset-inline-end:10px;top:6px;border:0;background:none;color:inherit;font-size:20px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}.smsg-x:hover{background:rgb(0 0 0 / .06)}' +
      '[dir=rtl] .smsg{padding:9px 16px 9px 44px}@media print{.smsg-w{display:none!important}}';
    document.head.appendChild(css);
    var w = document.createElement('div'); w.className = 'smsg-w'; w.setAttribute('role', 'region'); w.setAttribute('aria-label', EN ? 'Announcements' : 'הודעות');
    L.forEach(function (m) {
      var c = COL[m.style] || COL.info, d = document.createElement('div');
      d.className = 'smsg'; d.style.background = c[0]; d.style.color = c[1]; d.style.borderColor = c[2];
      d.innerHTML = '<span>' + (m.title ? '<b>' + esc(m.title) + '</b> ' : '') + fmt(m.text) + '</span>' + (m.close !== false ? '<button type="button" class="smsg-x" aria-label="' + (EN ? 'Close' : 'סגירה') + '">×</button>' : '');
      var x = d.querySelector('.smsg-x'); if (x) x.onclick = function () { ls('smsg-' + m.id, m.v || '1'); d.remove(); if (!w.children.length) w.remove(); };
      w.appendChild(d);
    });
    document.body.insertBefore(w, document.body.firstChild);
  }
  function go() {
    fetch('/api/pricing?c=_msgs').then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (j) {
      var L = ((j && j.items) || []).filter(function (m) { return (m.areas || []).indexOf(area) >= 0 && ls('smsg-' + m.id) !== String(m.v || '1') && (!m.lang || m.lang === (EN ? 'en' : 'he')); });
      show(L);
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
