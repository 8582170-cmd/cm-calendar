/* כפתור נגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא ועצירת אנימציות. נשמר בדפדפן. */
(function(){
  'use strict';
  if (window.__mlA11y) return; window.__mlA11y = true;
  var KEY = 'myluach-a11y', st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch (e) {}
  var css = '' +
    '.mla-btn{position:fixed;inset-block-end:16px;inset-inline-end:16px;z-index:2147483000;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1d4ed8;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);display:grid;place-items:center;padding:0}' +
    '.mla-btn svg{width:28px;height:28px}' +
    '.mla-btn:focus-visible,.mla-p button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}' +
    '.mla-p{position:fixed;inset-block-end:72px;inset-inline-end:16px;z-index:2147483000;width:min(290px,calc(100vw - 32px));background:#fff;color:#111;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:12px;font:15px/1.4 Arial,sans-serif;direction:rtl;text-align:right}' +
    '.mla-p h2{font-size:17px;margin:0 0 8px}' +
    '.mla-p .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
    '.mla-p button{font:inherit;font-size:14px;padding:9px 6px;border:1px solid #94a3b8;border-radius:8px;background:#f8fafc;color:#111;cursor:pointer;min-height:44px}' +
    '.mla-p button[aria-pressed="true"]{background:#1d4ed8;color:#fff;border-color:#1d4ed8}' +
    '.mla-p .r{display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px}' +
    '.mla-p a{color:#1d4ed8;font-size:13px}' +
    'html.mla-big{font-size:118%}html.mla-big body{zoom:1.12}html.mla-bigger body{zoom:1.25}' +
    'html.mla-contrast body{filter:contrast(1.35)}html.mla-contrast .mla-btn,html.mla-contrast .mla-p{filter:none}' +
    'html.mla-links a{text-decoration:underline!important;outline:2px dashed #f59e0b;outline-offset:1px}' +
    'html.mla-font body,html.mla-font body *:not(svg):not(svg *){font-family:Arial,"Assistant",sans-serif!important;letter-spacing:.01em}' +
    'html.mla-still *,html.mla-still *::before,html.mla-still *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' +
    '@media print{.mla-btn,.mla-p{display:none!important}}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  var OPTS = [['size','הגדלת טקסט'],['contrast','ניגודיות גבוהה'],['links','הדגשת קישורים'],['font','גופן קריא'],['still','עצירת אנימציות']];
  function apply(){
    var h = document.documentElement;
    h.classList.toggle('mla-big', st.size === 1); h.classList.toggle('mla-bigger', st.size === 2);
    ['contrast','links','font','still'].forEach(function(k){ h.classList.toggle('mla-' + k, !!st[k]) });
    try { localStorage.setItem(KEY, JSON.stringify(st)) } catch (e) {}
  }
  apply();
  function build(){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mla-btn'; b.setAttribute('aria-label','נגישות'); b.setAttribute('aria-expanded','false'); b.setAttribute('aria-controls','mlaPanel');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="4" r="2"/><path d="M19 8.5c-2.3.6-4.6.9-7 .9s-4.7-.3-7-.9l-.5 1.9c1.9.5 3.8.8 5.8 1v3.2L8.6 21l1.9.7 1.5-4.6 1.5 4.6 1.9-.7-1.7-6.4v-3.2c2-.2 3.9-.5 5.8-1z"/></svg>';
    var p = document.createElement('div'); p.className = 'mla-p'; p.id = 'mlaPanel'; p.hidden = true; p.setAttribute('role','dialog'); p.setAttribute('aria-label','הגדרות נגישות');
    function render(){
      p.innerHTML = '<h2>נגישות</h2><div class="g">' + OPTS.map(function(o){
        var on = o[0] === 'size' ? (st.size || 0) > 0 : !!st[o[0]];
        var lab = o[0] === 'size' ? (st.size === 2 ? 'טקסט גדול מאוד' : st.size === 1 ? 'טקסט גדול' : o[1]) : o[1];
        return '<button type="button" data-k="' + o[0] + '" aria-pressed="' + on + '">' + lab + '</button>' }).join('') +
        '<button type="button" data-k="reset">איפוס</button></div><div class="r"><a href="/accessibility.html">הצהרת נגישות</a><button type="button" data-k="close">סגירה</button></div>';
    }
    render();
    p.addEventListener('click', function(e){
      var t = e.target.closest('button'); if (!t) return; var k = t.dataset.k;
      if (k === 'close') { p.hidden = true; b.setAttribute('aria-expanded','false'); b.focus(); return }
      if (k === 'reset') st = {}; else if (k === 'size') st.size = ((st.size || 0) + 1) % 3; else st[k] = !st[k];
      apply(); render(); var n = p.querySelector('[data-k="' + k + '"]'); if (n) n.focus();
    });
    p.addEventListener('keydown', function(e){ if (e.key === 'Escape') { p.hidden = true; b.setAttribute('aria-expanded','false'); b.focus() } });
    b.addEventListener('click', function(){ p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) { var f = p.querySelector('button'); if (f) f.focus() } });
    document.body.appendChild(b); document.body.appendChild(p);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
