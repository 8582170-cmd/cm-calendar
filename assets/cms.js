/* עריכת טקסטים וצבעים של דפי האתר מדף הניהול.
   השינויים נשמרים בשרת (settings → content) ומוחלים כאן בטעינת הדף.
   כל טקסט מזוהה לפי התוכן המקורי שלו, כך ששינוי במבנה הדף לא "יזיז" עריכות למקום אחר. */
(function(){
  'use strict';
  var PAGE = (document.documentElement.getAttribute('data-cms') || location.pathname.replace(/^\/|\.html$/g, '') || 'index');
  var SEL = 'h1,h2,h3,h4,p,li,summary,a,button,label,small,figcaption,td,th,span.eyebrow,span.k,span.fine,span.tag,.lead,.fine';
  var INLINE = { B:1, STRONG:1, I:1, EM:1, A:1, BR:1, SPAN:1, SMALL:1, S:1, U:1 };
  var KEY = 'myluach-cms-' + PAGE;
  function norm(t){ return String(t || '').replace(/\s+/g, ' ').trim() }
  function hash(s){ var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
  function leaf(el){ for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (!INLINE[c.tagName]) return false; return true }
  function nodes(){ return Array.prototype.filter.call(document.querySelectorAll(SEL), function(el){
    return leaf(el) && norm(el.textContent) && !el.closest('script,style,.mla-p,.mla-btn,[data-cms-skip]') && !(el.parentElement && el.parentElement.closest(SEL) && leaf(el.parentElement.closest(SEL))) }) }
  function keyOf(el){ if (!el.dataset.cmsk) el.dataset.cmsk = el.tagName.toLowerCase() + '-' + hash(norm(el.textContent)); return el.dataset.cmsk }
  /* רק תגיות טקסט בסיסיות */
  function clean(html){
    var d = document.createElement('div'); d.innerHTML = String(html || '');
    (function walk(n){ Array.prototype.slice.call(n.childNodes).forEach(function(c){
      if (c.nodeType === 1) {
        var ok = { B:1, STRONG:1, I:1, EM:1, BR:1, A:1, U:1, S:1 }[c.tagName];
        if (!ok) { walk(c); while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); return }
        Array.prototype.slice.call(c.attributes).forEach(function(a){ if (!(c.tagName === 'A' && a.name === 'href' && /^(https?:|\/|#|[\w.-]+\.html)/.test(a.value))) c.removeAttribute(a.name) });
        walk(c);
      } else if (c.nodeType !== 3) n.removeChild(c);
    }) })(d);
    return d.innerHTML;
  }
  function apply(data){
    if (!data) return;
    var t = data.texts || {};
    nodes().forEach(function(el){ var k = keyOf(el); if (t[k] != null && el.dataset.cmsApplied !== t[k]) { el.innerHTML = clean(t[k]); el.dataset.cmsApplied = t[k] } });
    var v = data.vars || {}, st = document.getElementById('cms-vars');
    var css = Object.keys(v).filter(function(k){ return /^--[\w-]+$/.test(k) && /^#[0-9a-f]{3,8}$/i.test(v[k]) }).map(function(k){ return k + ':' + v[k] }).join(';');
    if (css) { if (!st) { st = document.createElement('style'); st.id = 'cms-vars'; document.head.appendChild(st) } st.textContent = ':root,:root:not([data-theme]){' + css + '}' }
    else if (st) st.remove();
  }
  /* משתני הצבע שהדף מגדיר ב-:root */
  function pageVars(){
    var out = {}, cs = getComputedStyle(document.documentElement);
    Array.prototype.forEach.call(document.styleSheets, function(sh){ var r; try { r = sh.cssRules } catch (e) { return }
      Array.prototype.forEach.call(r || [], function(rule){ if (rule.selectorText === ':root' && rule.style) for (var i = 0; i < rule.style.length; i++) { var n = rule.style[i]; if (n.indexOf('--') === 0) { var val = cs.getPropertyValue(n).trim(); if (/^#[0-9a-f]{3,8}$/i.test(val)) out[n] = val } } }) });
    return out;
  }
  var cached = null; try { cached = JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) {}
  var EDIT = /[?&]cmsedit=1/.test(location.search) && window.parent !== window;
  function start(){
    if (cached && !EDIT) apply(cached);
    if (EDIT) return startEdit();
    fetch('/api/pricing?c=' + encodeURIComponent(PAGE)).then(function(r){ return r.ok ? r.json() : null }).then(function(d){
      var c = d && d.content; if (!c) return; try { localStorage.setItem(KEY, JSON.stringify(c)) } catch (e) {} apply(c) }).catch(function(){});
  }
  /* מצב עריכה (בתוך דף הניהול) */
  function startEdit(){
    var data = { texts: {}, vars: {} };
    var s = document.createElement('style'); s.textContent = '[data-cmsk]{outline:1px dashed rgba(29,78,216,.35);outline-offset:2px;cursor:text}[data-cmsk]:hover{outline:2px solid #1d4ed8}[data-cmsk]:focus{outline:2px solid #f59e0b;background:rgba(245,158,11,.08)}';
    document.head.appendChild(s);
    function arm(){ nodes().forEach(function(el){ keyOf(el); el.contentEditable = 'true'; el.spellcheck = false }) }
    document.addEventListener('click', function(e){ var a = e.target.closest('a,button'); if (a) e.preventDefault() }, true);
    document.addEventListener('submit', function(e){ e.preventDefault() }, true);
    document.addEventListener('input', function(e){ var el = e.target.closest('[data-cmsk]'); if (el) data.texts[el.dataset.cmsk] = clean(el.innerHTML) }, true);
    window.addEventListener('message', function(e){
      if (e.origin !== location.origin) return; var m = e.data || {};
      if (m.type === 'cms-load') { data = { texts: (m.data && m.data.texts) || {}, vars: (m.data && m.data.vars) || {} }; apply(data); arm(); parent.postMessage({ type: 'cms-ready', page: PAGE, vars: pageVars() }, location.origin) }
      if (m.type === 'cms-var') { data.vars[m.name] = m.value; apply(data) }
      if (m.type === 'cms-collect') parent.postMessage({ type: 'cms-data', page: PAGE, data: data }, location.origin);
    });
    parent.postMessage({ type: 'cms-hello', page: PAGE }, location.origin);
    setTimeout(arm, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
