/* הטמעת זימון תורים באתר אחר.
   כפתור צף:      <script src="https://www.myluach.org/assets/book-embed.js" data-slug="העסק-שלי" async></script>
   בתוך הדף:      <div data-myluach-book="העסק-שלי"></div> ואחריו אותו סקריפט
   אפשר גם קישור שפותח את החלון: <a href="#" data-myluach-open="העסק-שלי">קביעת תור</a>
   מאפיינים: data-text (טקסט הכפתור), data-color (צבע), data-pos="left|right" */
(function () {
  'use strict';
  var S = document.currentScript, origin = (function () { try { return new URL(S.src).origin; } catch (e) { return 'https://www.myluach.org'; } })();
  var slug = S && S.getAttribute('data-slug');
  function url(s) { return origin + '/book/' + encodeURIComponent(s) + '?embed=1'; }
  function modal(s) {
    var o = document.createElement('div'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'קביעת תור');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:10px';
    var b = document.createElement('div'); b.style.cssText = 'position:relative;width:100%;max-width:560px;height:min(92vh,820px);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4)';
    var f = document.createElement('iframe'); f.src = url(s); f.title = 'קביעת תור'; f.style.cssText = 'border:0;width:100%;height:100%'; f.allow = 'clipboard-write';
    var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'סגירה'); x.textContent = '×'; x.style.cssText = 'position:absolute;top:8px;left:8px;width:38px;height:38px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:1;cursor:pointer;z-index:2';
    var close = function () { o.remove(); document.removeEventListener('keydown', esc); }, esc = function (e) { if (e.key === 'Escape') close(); };
    x.onclick = close; o.onclick = function (e) { if (e.target === o) close(); }; document.addEventListener('keydown', esc);
    b.appendChild(f); b.appendChild(x); o.appendChild(b); document.body.appendChild(o); x.focus();
  }
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    if (slug && !document.querySelector('[data-myluach-book="' + slug + '"]')) {
      var c = S.getAttribute('data-color') || '#1e5a63', left = S.getAttribute('data-pos') !== 'right';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = S.getAttribute('data-text') || 'קביעת תור';
      b.style.cssText = 'position:fixed;bottom:18px;' + (left ? 'left' : 'right') + ':18px;z-index:2147483645;min-height:52px;padding:0 24px;border:0;border-radius:999px;background:' + c + ';color:#fff;font:700 17px/1 Heebo,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28)';
      b.onclick = function () { modal(slug); }; document.body.appendChild(b);
    }
    [].forEach.call(document.querySelectorAll('[data-myluach-book]'), function (d) {
      var s = d.getAttribute('data-myluach-book'), f = document.createElement('iframe'); f.src = url(s); f.title = 'קביעת תור'; f.style.cssText = 'border:0;width:100%;min-height:640px;display:block'; d.appendChild(f);
      window.addEventListener('message', function (e) { if (e.source === f.contentWindow && e.data && e.data.myluachBook) f.style.height = Math.max(520, e.data.h) + 'px'; });
    });
    [].forEach.call(document.querySelectorAll('[data-myluach-open]'), function (a) { a.addEventListener('click', function (e) { e.preventDefault(); modal(a.getAttribute('data-myluach-open')); }); });
  });
})();
