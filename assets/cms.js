/* עריכת טקסטים וצבעים של דפי האתר מדף הניהול.
   השינויים נשמרים בשרת (settings → content) ומוחלים כאן בטעינת הדף.
   כל טקסט מזוהה לפי התוכן המקורי שלו, כך ששינוי במבנה הדף לא "יזיז" עריכות למקום אחר. */
(function(){
  'use strict';
  if (window.__mlCms) return; window.__mlCms = true;
  /* שם הדף: מהתגית data-cms, ואם אין, מהכתובת (online/zmanim/afula → online-zmanim-afula) */
  var PAGE = (document.documentElement.getAttribute('data-cms') || location.pathname.replace(/^\/+|\/+$|\.html$/g, '').replace(/\/+/g, '-').replace(/[^\w-]/g, '').slice(0, 40) || 'index');
  /* אזורים שלא עורכים: הלוח עצמו בבונה, תוכן שהמשתמש כותב, תפריט הנגישות */
  var SKIP = 'script,style,noscript,template,textarea,select,option,svg,code,pre,iframe,canvas,.mla-p,.mla-btn,[data-cms-skip],.sheet-wrap,[contenteditable]:not([data-cmsk]):not([data-cmstx])';
  var SEL = 'h1,h2,h3,h4,p,li,summary,a,button,label,small,figcaption,td,th,span.eyebrow,span.k,span.fine,span.tag,.lead,.fine,[data-cms-t]';
  var INLINE = { B:1, STRONG:1, I:1, EM:1, A:1, BR:1, SPAN:1, SMALL:1, S:1, U:1 };
  var KEY = 'myluach-cms-' + PAGE;
  function norm(t){ return String(t || '').replace(/\s+/g, ' ').trim() }
  function hash(s){ var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
  function leaf(el){ for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (!INLINE[c.tagName]) return false; return true }
  function nodes(){ return Array.prototype.filter.call(document.querySelectorAll(SEL), function(el){
    return leaf(el) && norm(el.textContent) && !el.closest(SKIP) && !(el.parentElement && el.parentElement.closest(SEL) && leaf(el.parentElement.closest(SEL))) }) }
  /* טקסט שבתוך שדה (placeholder): "מה היה חסר?" וכדומה. המפתח לפי הטקסט המקורי */
  function phNodes(){ return Array.prototype.filter.call(document.querySelectorAll('input[placeholder],textarea[placeholder]'), function(el){
    return norm(el.getAttribute('data-cmsph') || el.placeholder) && !el.closest(SKIP) && !/^(password|hidden|number|date|time|datetime-local|range|color)$/.test(el.type || '') }) }
  function phKey(el){ if (!el.dataset.cmsph) el.dataset.cmsph = el.placeholder; return 'ph-' + hash(norm(el.dataset.cmsph)) }
  function keyOf(el){ if (!el.dataset.cmsk) el.dataset.cmsk = el.tagName.toLowerCase() + '-' + hash(norm(el.textContent)); return el.dataset.cmsk }
  /* כל שאר הטקסטים בדף (טקסט שלא נמצא בכותרת/פסקה/כפתור רגילים): לפי צומת הטקסט עצמו */
  var ORIG = new WeakMap(), LAST = new WeakMap(), LETTER = /[A-Za-z\u0590-\u05FF\u00C0-\u024F0-9]/;
  function txNodes(root){
    var out = [], r = root || document.body; if (!r) return out;
    if (r.nodeType === 3) r = r.parentNode; if (!r || r.nodeType !== 1) return out;
    if (r !== document.body && r.closest && r.closest(SKIP + ',[data-cmsk],[data-cmstx]')) return out;
    var w = document.createTreeWalker(r, 5, { acceptNode: function(n){
      if (n.nodeType === 1) return (n.matches(SKIP) || n.hasAttribute('data-cmsk') || n.hasAttribute('data-cmstx')) ? 2 : 3;
      return LETTER.test(n.nodeValue) ? 1 : 3 } });
    for (var n; (n = w.nextNode());) if (n.nodeType === 3) out.push(n);
    return out;
  }
  function txOrig(n){ var o = ORIG.get(n); if (o != null && LAST.get(n) === n.nodeValue) return o; ORIG.delete(n); return n.nodeValue }
  function txKey(n){ return 'tx-' + hash(norm(txOrig(n))) }
  function txSet(n, v){ var o = txOrig(n), m = /^(\s*)[\s\S]*?(\s*)$/.exec(o), nv = m[1] + String(v).replace(/<[^>]*>/g, '') + m[2];
    if (n.nodeValue !== nv) { ORIG.set(n, o); n.nodeValue = nv; LAST.set(n, nv) } }
  function txApply(t, root){ if (!Object.keys(t).some(function(k){ return k.indexOf('tx-') === 0 })) return;
    txNodes(root).forEach(function(n){ var k = txKey(n); if (t[k] != null) txSet(n, t[k]) }) }
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
  function apply(data, roots){
    if (!data) return;
    var t = data.texts || {};
    if (roots) { nodes().forEach(function(el){ var k = keyOf(el); if (t[k] != null && el.dataset.cmsApplied !== t[k]) { el.innerHTML = clean(t[k]); el.dataset.cmsApplied = t[k] } });
      phNodes().forEach(function(el){ var k = phKey(el); if (t[k] != null && el.placeholder !== t[k]) el.placeholder = String(t[k]).replace(/<[^>]*>/g, '') });
      roots.forEach(function(r){ txApply(t, r) }); return }
    nodes().forEach(function(el){ var k = keyOf(el); if (t[k] != null && el.dataset.cmsApplied !== t[k]) { el.innerHTML = clean(t[k]); el.dataset.cmsApplied = t[k] } });
    phNodes().forEach(function(el){ var k = phKey(el); if (t[k] != null && el.placeholder !== t[k]) el.placeholder = String(t[k]).replace(/<[^>]*>/g, '') });
    txApply(t);
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
    /* רשימת הדפים שנערכו (נשמרת בדפדפן ל-10 דקות), כדי לא לפנות לשרת מכל דף באתר */
    function load(){ fetch('/api/pricing?c=' + encodeURIComponent(PAGE)).then(function(r){ return r.ok ? r.json() : null }).then(function(d){
      var c = d && d.content; if (!c) { if (cached) { cached = null; try { localStorage.removeItem(KEY) } catch (e) {} } return }
      try { localStorage.setItem(KEY, JSON.stringify(c)) } catch (e) {} cached = c; apply(c) }).catch(function(){}) }
    var IX = 'myluach-cms-ix', ix = null; try { ix = JSON.parse(localStorage.getItem(IX) || 'null') } catch (e) {}
    if (ix && ix.t > Date.now() - 600e3 && ix.p) { if (ix.p.indexOf(PAGE) >= 0 || cached) load() }
    else fetch('/api/pricing?c=_cmsix').then(function(r){ return r.ok ? r.json() : null }).then(function(d){
      if (!d || !d.pages) return load(); try { localStorage.setItem(IX, JSON.stringify({ t: Date.now(), p: d.pages })) } catch (e) {}
      if (d.pages.indexOf(PAGE) >= 0 || cached) load() }).catch(load);
    /* חלקים שנוספים לדף אחר כך (למשל טופס המשוב): מחילים גם עליהם. שינויים בתוך הלוח עצמו לא מעניינים */
    try { var mt, R = []; new MutationObserver(function(ms){ if (!cached) return;
      ms.forEach(function(m){ var t = m.target; if (t.nodeType === 1 && !t.closest(SKIP)) R.push(t) });
      if (!R.length) return; clearTimeout(mt); mt = setTimeout(function(){ if (R.length > 200) R = [document.body]; var rs = R.filter(function(a, i){ return !R.some(function(b, j){ return j !== i && b !== a && b.contains(a) }) && R.indexOf(a) === i }); R = []; apply(cached, rs) }, 150) }).observe(document.body, { childList: true, subtree: true }) } catch (e) {}
  }
  /* מצב עריכה (בתוך דף הניהול) */
  function startEdit(){
    var data = { texts: {}, vars: {} };
    var s = document.createElement('style'); s.textContent = '[data-cmsk],[data-cmstx]{outline:1px dashed rgba(29,78,216,.35);outline-offset:2px;cursor:text}[data-cmsk]:hover,[data-cmstx]:hover{outline:2px solid #1d4ed8}[data-cmsk]:focus,[data-cmstx]:focus{outline:2px solid #f59e0b;background:rgba(245,158,11,.08)}';
    document.head.appendChild(s);
    function arm(){ nodes().forEach(function(el){ keyOf(el); el.contentEditable = 'true'; el.spellcheck = false });
      /* שאר הטקסטים: עוטפים כל קטע טקסט בתיבה שאפשר לערוך */
      txApply(data.texts || {});
      txNodes().forEach(function(n){ if (!n.parentNode) return; var sp = document.createElement('span'); sp.setAttribute('data-cmstx', txKey(n)); sp.contentEditable = 'true'; sp.spellcheck = false;
        n.parentNode.insertBefore(sp, n); sp.appendChild(n) });
      /* שדות: לוחצים, והטקסט האפור נהיה ניתן לעריכה. ביציאה מהשדה הוא חוזר להיות טקסט אפור */
      phNodes().forEach(function(el){ if (el.dataset.cmsArmed) return; el.dataset.cmsArmed = 1; phKey(el); el.style.outline = '1px dashed rgba(29,78,216,.5)'; el.title = 'לחצו כדי לערוך את הטקסט האפור';
        el.addEventListener('focus', function(){ el.value = el.placeholder; el.style.background = 'rgba(245,158,11,.08)' });
        el.addEventListener('input', function(){ data.texts[phKey(el)] = el.value.replace(/[<>]/g, '') });
        el.addEventListener('blur', function(){ el.placeholder = el.value; el.value = ''; el.style.background = '' }) }) }
    document.addEventListener('click', function(e){ var a = e.target.closest('a,button'); if (a) e.preventDefault() }, true);
    document.addEventListener('submit', function(e){ e.preventDefault() }, true);
    document.addEventListener('input', function(e){ var x = e.target.closest && e.target.closest('[data-cmstx]'); if (x) { data.texts[x.getAttribute('data-cmstx')] = x.textContent.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); return }
      var el = e.target.closest && e.target.closest('[data-cmsk]'); if (el) data.texts[el.dataset.cmsk] = clean(el.innerHTML) }, true);
    /* בתיבת טקסט פשוט: Enter לא מוסיף שורה */
    document.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-cmstx]')) e.preventDefault() }, true);
    /* לחיצה על תווית לא תסמן/תפתח את השדה שלה */
    document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('label')) e.preventDefault() }, true);
    window.addEventListener('message', function(e){
      if (e.origin !== location.origin) return; var m = e.data || {};
      if (m.type === 'cms-load') { data = { texts: (m.data && m.data.texts) || {}, vars: (m.data && m.data.vars) || {} }; apply(data); arm(); parent.postMessage({ type: 'cms-ready', page: PAGE, vars: pageVars() }, location.origin) }
      if (m.type === 'cms-var') { data.vars[m.name] = m.value; apply(data) }
      if (m.type === 'cms-collect') parent.postMessage({ type: 'cms-data', page: PAGE, data: data }, location.origin);
    });
    parent.postMessage({ type: 'cms-hello', page: PAGE }, location.origin);
    setTimeout(arm, 800); setTimeout(arm, 2500); setTimeout(arm, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
