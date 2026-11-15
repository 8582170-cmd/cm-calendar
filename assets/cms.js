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
    return norm(el.getAttribute('data-cmsph') || el.placeholder) && !(el.parentElement && el.parentElement.closest(SKIP)) && !/^(password|hidden|number|date|time|datetime-local|range|color)$/.test(el.type || '') }) }
  function phKey(el){ if (!el.dataset.cmsph) el.dataset.cmsph = el.placeholder; return 'ph-' + hash(norm(el.dataset.cmsph)) }
  function keyOf(el){ if (!el.dataset.cmsk) el.dataset.cmsk = el.tagName.toLowerCase() + '-' + hash(norm(el.textContent)); return el.dataset.cmsk }
  /* כל שאר הטקסטים בדף (טקסט שלא נמצא בכותרת/פסקה/כפתור רגילים): לפי צומת הטקסט עצמו */
  var ORIG = new WeakMap(), LAST = new WeakMap(), LETTER = /[A-Za-z\u0590-\u05FF\u00C0-\u024F0-9]/;
  function txNodes(root){
    var out = [], r = root || document.body; if (!r) return out;
    if (r.nodeType === 3) r = r.parentNode; if (!r || r.nodeType !== 1) return out;
    if (r !== document.body && r.closest && r.closest(SKIP + ',[data-cmsk],[data-cmstx]')) return out;
    var w = document.createTreeWalker(r, 5, { acceptNode: function(n){
      if (n.nodeType === 1) return (n.matches(SKIP) || n.hasAttribute('data-cmsk') || n.hasAttribute('data-cmstx') || n.hasAttribute('data-cmsh')) ? 2 : 3;
      return LETTER.test(n.nodeValue) ? 1 : 3 } });
    for (var n; (n = w.nextNode());) if (n.nodeType === 3) out.push(n);
    return out;
  }
  function txOrig(n){ var o = ORIG.get(n); if (o != null && LAST.get(n) === n.nodeValue) return o; ORIG.delete(n); return n.nodeValue }
  function txKey(n){ return 'tx-' + hash(norm(txOrig(n))) }
  function txSet(n, v, k){ var o = txOrig(n), m = /^(\s*)[\s\S]*?(\s*)$/.exec(o);
    /* טקסט עם עיצוב לחלק ממנו (למשל מילה מוקטנת): מחליפים את הקטע בתיבה עם העיצוב */
    if (/<[a-z]/i.test(v) && n.parentNode) { var p = n.parentNode, sp = document.createElement('span');
      if (EDIT) { sp.setAttribute('data-cmstx', k); sp.contentEditable = 'true'; sp.spellcheck = false } else { sp.setAttribute('data-cmsh', k); sp.setAttribute('data-cmss', k) }
      sp.innerHTML = clean(v); if (m[1]) p.insertBefore(document.createTextNode(m[1]), n); p.insertBefore(sp, n); if (m[2]) p.insertBefore(document.createTextNode(m[2]), n); p.removeChild(n); return }
    var nv = m[1] + String(v).replace(/<[^>]*>/g, '') + m[2];
    if (n.nodeValue !== nv) { ORIG.set(n, o); n.nodeValue = nv; LAST.set(n, nv) } }
  function txApply(t, root){ if (!Object.keys(t).some(function(k){ return k.indexOf('tx-') === 0 })) return;
    txNodes(root).forEach(function(n){ var k = txKey(n); if (t[k] != null) txSet(n, t[k], k) }) }
  /* רק תגיות טקסט בסיסיות */
  function clean(html){
    var d = document.createElement('div'); d.innerHTML = String(html || '');
    (function walk(n){ Array.prototype.slice.call(n.childNodes).forEach(function(c){
      if (c.nodeType === 1) {
        var ok = { B:1, STRONG:1, I:1, EM:1, BR:1, A:1, U:1, S:1, SPAN:1 }[c.tagName];
        if (c.tagName === 'SPAN') { var st = c.style, keep = [];
          if (/^\d+(\.\d+)?px$/.test(st.fontSize) && parseFloat(st.fontSize) >= 6 && parseFloat(st.fontSize) <= 120) keep.push('font-size:' + Math.round(parseFloat(st.fontSize)) + 'px');
          var ff = FONTS.filter(function(f){ return st.fontFamily.indexOf(f) >= 0 })[0]; if (ff) { keep.push('font-family:' + fam(ff)); font(ff) }
          if (/^(400|700|normal|bold)$/.test(st.fontWeight)) keep.push('font-weight:' + st.fontWeight);
          if (/^(italic|normal)$/.test(st.fontStyle)) keep.push('font-style:' + st.fontStyle);
          if (/^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\))$/i.test(st.color)) keep.push('color:' + st.color);
          if (!keep.length) ok = 0; else { Array.prototype.slice.call(c.attributes).forEach(function(a){ c.removeAttribute(a.name) }); c.setAttribute('style', keep.join(';')); walk(c); return } }
        if (!ok) { walk(c); while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); return }
        Array.prototype.slice.call(c.attributes).forEach(function(a){ if (!(c.tagName === 'A' && a.name === 'href' && /^(https?:|\/|#|[\w.-]+\.html)/.test(a.value))) c.removeAttribute(a.name) });
        walk(c);
      } else if (c.nodeType !== 3) n.removeChild(c);
    }) })(d);
    return d.innerHTML;
  }
  /* גופן, גודל, הדגשה, צבע ויישור לכל טקסט, וגופן לכל הדף */
  var FONTS = ['Assistant','Heebo','Rubik','Varela Round','Alef','Secular One','Suez One','Frank Ruhl Libre','David Libre','Noto Serif Hebrew','Bellefair','Miriam Libre','Karantina','Amatic SC'];
  var SERIF = { 'Frank Ruhl Libre':1, 'David Libre':1, 'Noto Serif Hebrew':1, 'Bellefair':1 };
  function fam(f){ return "'" + f + "'," + (SERIF[f] ? 'serif' : 'sans-serif') }
  function font(f){ if (FONTS.indexOf(f) < 0) return; var id = 'cmsf-' + f.replace(/\W/g, ''); if (document.getElementById(id)) return;
    var l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;700&display=swap'; document.head.appendChild(l) }
  function css(o){ o = o || {}; var r = [];
    if (FONTS.indexOf(o.ff) >= 0) { font(o.ff); r.push('font-family:' + fam(o.ff)) }
    if (+o.fs >= 8 && +o.fs <= 120) r.push('font-size:' + Math.round(+o.fs) + 'px');
    if (o.fw === 'b' || o.fw === 'n') r.push('font-weight:' + (o.fw === 'b' ? 700 : 400));
    if (o.fi === 'i' || o.fi === 'n') r.push('font-style:' + (o.fi === 'i' ? 'italic' : 'normal'));
    if (/^#[0-9a-f]{3,8}$/i.test(o.c || '')) r.push('color:' + o.c);
    if (/^(right|center|left)$/.test(o.al || '')) r.push('text-align:' + o.al + (o.al === 'center' ? '' : ''));
    return r.join(';') }
  function setSt(el, o){ var c = css(o); if (el.dataset.cmsStyle === c) return;
    if (el.dataset.cmsBase == null) el.dataset.cmsBase = el.getAttribute('style') || '';
    el.setAttribute('style', el.dataset.cmsBase + (el.dataset.cmsBase && c ? ';' : '') + c); el.dataset.cmsStyle = c;
    if (/text-align/.test(c) && getComputedStyle(el).display === 'inline') el.style.display = 'inline-block' }
  function stApply(data, roots){ var S = data.styles || {}, ks = Object.keys(S); if (!ks.length) return;
    nodes().forEach(function(el){ if (S[el.dataset.cmsk]) setSt(el, S[el.dataset.cmsk]) });
    document.querySelectorAll('[data-cmstx]').forEach(function(el){ var k = el.getAttribute('data-cmstx'); if (S[k]) setSt(el, S[k]) });
    if (EDIT || !ks.some(function(k){ return k.indexOf('tx-') === 0 })) return;
    (roots || [document.body]).forEach(function(r){ txNodes(r).forEach(function(n){ var k = txKey(n), p = n.parentNode; if (!S[k] || !p) return;
      if (!(p.getAttribute && p.getAttribute('data-cmss') === k)) { var sp = document.createElement('span'); sp.setAttribute('data-cmss', k); p.insertBefore(sp, n); sp.appendChild(n); p = sp }
      setSt(p, S[k]) }) }) }
  function pgApply(data){ var g = data.page || {}, st = document.getElementById('cms-font'), c = '', NOT = ':not(.mla-p *):not(.mla-p):not(.sheet-wrap *):not([data-cms-skip] *)';
    function sel(L){ return L.map(function(t){ return 'body ' + t + NOT }).join(',') }
    if (FONTS.indexOf(g.ff) >= 0) { font(g.ff); c += 'body{font-family:' + fam(g.ff) + '}' + sel(['p','li','label','button','input','textarea','select','td','th','a','span','small','div','summary','figcaption','strong','b']) + '{font-family:' + fam(g.ff) + '}' }
    if (FONTS.indexOf(g.hf) >= 0) { font(g.hf); c += sel(['h1','h2','h3','h4','h1 *','h2 *','h3 *','h4 *']) + '{font-family:' + fam(g.hf) + '}' }
    if (c) { if (!st) { st = document.createElement('style'); st.id = 'cms-font'; document.head.appendChild(st) } st.textContent = c }
    else if (st) st.remove() }
  function apply(data, roots){
    if (!data) return;
    var t = data.texts || {};
    if (roots) { nodes().forEach(function(el){ var k = keyOf(el); if (t[k] != null && el.dataset.cmsApplied !== t[k]) { el.innerHTML = clean(t[k]); el.dataset.cmsApplied = t[k] } });
      phNodes().forEach(function(el){ var k = phKey(el); if (t[k] != null && el.placeholder !== t[k]) el.placeholder = String(t[k]).replace(/<[^>]*>/g, '') });
      roots.forEach(function(r){ txApply(t, r) }); stApply(data, roots); return }
    nodes().forEach(function(el){ var k = keyOf(el); if (t[k] != null && el.dataset.cmsApplied !== t[k]) { el.innerHTML = clean(t[k]); el.dataset.cmsApplied = t[k] } });
    phNodes().forEach(function(el){ var k = phKey(el); if (t[k] != null && el.placeholder !== t[k]) el.placeholder = String(t[k]).replace(/<[^>]*>/g, '') });
    txApply(t); stApply(data); pgApply(data);
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
    var data = { texts: {}, vars: {}, styles: {}, page: {} };
    var s = document.createElement('style'); s.textContent = '[data-cmsk],[data-cmstx]{outline:1px dashed rgba(29,78,216,.35);outline-offset:2px;cursor:text}[data-cmsk]:hover,[data-cmstx]:hover{outline:2px solid #1d4ed8}[data-cmsk]:focus,[data-cmstx]:focus{outline:2px solid #f59e0b;background:rgba(245,158,11,.08)}';
    document.head.appendChild(s);
    function arm(){ nodes().forEach(function(el){ keyOf(el); el.contentEditable = 'true'; el.spellcheck = false });
      /* שאר הטקסטים: עוטפים כל קטע טקסט בתיבה שאפשר לערוך */
      txApply(data.texts || {});
      txNodes().forEach(function(n){ if (!n.parentNode) return; var sp = document.createElement('span'); sp.setAttribute('data-cmstx', txKey(n)); sp.contentEditable = 'true'; sp.spellcheck = false;
        n.parentNode.insertBefore(sp, n); sp.appendChild(n) });
      stApply(data);
      /* שדות: לוחצים, והטקסט האפור נהיה ניתן לעריכה. ביציאה מהשדה הוא חוזר להיות טקסט אפור */
      phNodes().forEach(function(el){ if (el.dataset.cmsArmed) return; el.dataset.cmsArmed = 1; phKey(el); el.style.outline = '1px dashed rgba(29,78,216,.5)'; el.title = 'לחצו כדי לערוך את הטקסט האפור';
        el.addEventListener('focus', function(){ el.value = el.placeholder; el.style.background = 'rgba(245,158,11,.08)' });
        el.addEventListener('input', function(){ data.texts[phKey(el)] = el.value.replace(/[<>]/g, '') });
        el.addEventListener('blur', function(){ el.placeholder = el.value; el.value = ''; el.style.background = '' }) }) }
    document.addEventListener('click', function(e){ var a = e.target.closest('a,button'); if (a) e.preventDefault() }, true);
    document.addEventListener('submit', function(e){ e.preventDefault() }, true);
    function save(el){ if (el.hasAttribute('data-cmsk')) { data.texts[el.dataset.cmsk] = clean(el.innerHTML); return }
      var k = el.getAttribute('data-cmstx'); data.texts[k] = el.querySelector('span,b,i,strong,em') ? clean(el.innerHTML).replace(/^\s+|\s+$/g, '') : el.textContent.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim() }
    document.addEventListener('input', function(e){ var x = e.target.closest && e.target.closest('[data-cmstx],[data-cmsk]'); if (x) save(x) }, true);
    /* בתיבת טקסט פשוט: Enter לא מוסיף שורה */
    document.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-cmstx]')) e.preventDefault() }, true);
    /* לחיצה על תווית לא תסמן/תפתח את השדה שלה */
    document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('label')) e.preventDefault() }, true);
    window.addEventListener('message', function(e){
      if (e.origin !== location.origin) return; var m = e.data || {};
      if (m.type === 'cms-load') { data = { texts: (m.data && m.data.texts) || {}, vars: (m.data && m.data.vars) || {}, styles: (m.data && m.data.styles) || {}, page: (m.data && m.data.page) || {} }; apply(data); arm(); parent.postMessage({ type: 'cms-ready', page: PAGE, vars: pageVars(), fonts: FONTS, pg: data.page }, location.origin) }
      if (m.type === 'cms-page') { data.page[m.name] = m.value; pgApply(data) }
      if (m.type === 'cms-var') { data.vars[m.name] = m.value; apply(data) }
      if (m.type === 'cms-collect') parent.postMessage({ type: 'cms-data', page: PAGE, data: data }, location.origin);
    });
    /* סרגל עיצוב: מופיע מעל הטקסט שעורכים */
    var tb = document.createElement('div'), cur = null; tb.setAttribute('data-cms-skip', ''); tb.dir = 'rtl';
    tb.style.cssText = 'position:fixed;z-index:2147483647;display:none;gap:4px;align-items:center;background:#1f2937;color:#fff;padding:5px 6px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.3);font:13px Assistant,Arial,sans-serif;flex-wrap:wrap;max-width:96vw';
    var bs = 'background:#374151;color:#fff;border:0;border-radius:6px;padding:4px 8px;font:inherit;cursor:pointer;min-width:28px';
    tb.innerHTML = '<select data-a="ff" title="גופן" style="' + bs + ';max-width:130px"><option value="">גופן רגיל</option>' + FONTS.map(function(f){ return '<option value="' + f + '" style="font-family:' + fam(f).replace(/'/g, '&quot;') + '">' + f + '</option>' }).join('') + '</select>' +
      '<button data-a="dn" title="הקטנה" style="' + bs + '">A-</button><span data-a="sz" style="min-width:34px;text-align:center"></span><button data-a="up" title="הגדלה" style="' + bs + '">A+</button>' +
      '<button data-a="b" title="מודגש" style="' + bs + ';font-weight:700">B</button><button data-a="i" title="נטוי" style="' + bs + ';font-style:italic">I</button>' +
      '<input data-a="c" type="color" title="צבע" style="width:30px;height:26px;border:0;padding:0;background:none;cursor:pointer">' +
      '<button data-a="right" title="יישור לימין" style="' + bs + '">⇥</button><button data-a="center" title="מרכוז" style="' + bs + '">≡</button><button data-a="left" title="יישור לשמאל" style="' + bs + '">⇤</button>' +
      '<button data-a="x" title="החזרת העיצוב למקור" style="' + bs + '">↺ מקור</button>';
    document.body.appendChild(tb);
    function kOf(el){ return el.getAttribute('data-cmsk') || el.getAttribute('data-cmstx') }
    function hex(c){ var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(function(x){ return ('0' + (+x).toString(16)).slice(-2) }).join('') : '#000000' }
    function place(){ if (!cur) return; var r = cur.getBoundingClientRect(); tb.style.display = 'flex';
      var top = r.top - tb.offsetHeight - 6; if (top < 4) top = r.bottom + 6; tb.style.top = top + 'px';
      tb.style.left = Math.max(4, Math.min(innerWidth - tb.offsetWidth - 4, r.right - tb.offsetWidth)) + 'px';
      var rf = cur; if (LR && !LR.collapsed && cur.contains(LR.commonAncestorContainer)) { rf = LR.commonAncestorContainer; if (rf.nodeType === 3) rf = rf.parentNode }
      var o = data.styles[kOf(cur)] || {}, cs = getComputedStyle(rf);
      tb.querySelector('[data-a=ff]').value = o.ff || ''; tb.querySelector('[data-a=sz]').textContent = Math.round(parseFloat(cs.fontSize)) + 'px';
      tb.querySelector('[data-a=c]').value = o.c || hex(cs.color);
      /* יישור רק לשורה שלמה (כותרת, פסקה, כפתור), לא לקטע בתוך שורה */
      var tx = cur.hasAttribute('data-cmstx'); ['right','center','left'].forEach(function(a){ tb.querySelector('[data-a=' + a + ']').style.display = tx ? 'none' : '' }) }
    function upd(fn){ if (!cur) return; var k = kOf(cur), o = data.styles[k] || {}; fn(o, getComputedStyle(cur));
      Object.keys(o).forEach(function(x){ if (o[x] === '' || o[x] == null) delete o[x] });
      if (Object.keys(o).length) data.styles[k] = o; else delete data.styles[k];
      document.querySelectorAll('[data-cmsk="' + k + '"],[data-cmstx="' + k + '"]').forEach(function(el){ setSt(el, o) }); place() }
    tb.addEventListener('mousedown', function(e){ if (!/SELECT|INPUT/.test(e.target.tagName)) e.preventDefault() });
    /* עיצוב לחלק מסומן בלבד */
    var LR = null;
    document.addEventListener('selectionchange', function(){ var sl = getSelection(); if (!cur || !sl.rangeCount) return; var r = sl.getRangeAt(0); if (cur.contains(r.commonAncestorContainer)) LR = r.cloneRange() });
    function fmt(fn){ var r = LR; if (!cur || !r || r.collapsed || !cur.contains(r.commonAncestorContainer)) return false;
      var t = r.toString(); if (!t.trim() || norm(t) === norm(cur.textContent)) return false;
      var anc = r.commonAncestorContainer; if (anc.nodeType === 3) anc = anc.parentNode;
      var sp = (anc !== cur && anc.tagName === 'SPAN' && !anc.hasAttribute('data-cmstx') && norm(anc.textContent) === norm(t)) ? anc : null;
      if (!sp) { sp = document.createElement('span'); sp.appendChild(r.extractContents()); r.insertNode(sp) }
      fn(sp.style, getComputedStyle(sp));
      if (!sp.getAttribute('style')) { var pp = sp.parentNode; while (sp.firstChild) pp.insertBefore(sp.firstChild, sp); pp.removeChild(sp); sp = null }
      if (sp) { var nr = document.createRange(); nr.selectNodeContents(sp); var sl = getSelection(); sl.removeAllRanges(); sl.addRange(nr); LR = nr.cloneRange() } else LR = null;
      save(cur); place(); return true }
    function step(cs, d){ var fs = parseFloat(cs.fontSize) || 16; return Math.max(6, Math.min(120, Math.round(fs + d * (fs < 20 ? 1 : 2)))) + 'px' }
    tb.addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (fmt(function(st, cs){
        if (a === 'up' || a === 'dn') st.fontSize = step(cs, a === 'up' ? 1 : -1);
        else if (a === 'b') st.fontWeight = (+cs.fontWeight >= 600) ? '400' : '700';
        else if (a === 'i') st.fontStyle = cs.fontStyle === 'italic' ? 'normal' : 'italic';
        else if (a === 'x') st.cssText = '' })) return;
      upd(function(o, cs){ var fs = parseFloat(cs.fontSize) || 16;
        if (a === 'up') o.fs = Math.min(120, Math.round(fs + (fs < 20 ? 1 : 2)));
        if (a === 'dn') o.fs = Math.max(8, Math.round(fs - (fs <= 20 ? 1 : 2)));
        if (a === 'b') o.fw = (+cs.fontWeight >= 600) ? 'n' : 'b';
        if (a === 'i') o.fi = cs.fontStyle === 'italic' ? 'n' : 'i';
        if (/^(right|center|left)$/.test(a)) o.al = o.al === a ? '' : a;
        if (a === 'x') Object.keys(o).forEach(function(x){ delete o[x] }) }) });
    tb.querySelector('[data-a=ff]').addEventListener('change', function(e){ var v = e.target.value; if (fmt(function(st){ if (v) { font(v); st.fontFamily = fam(v) } else st.fontFamily = '' })) return; upd(function(o){ o.ff = v }) });
    tb.querySelector('[data-a=c]').addEventListener('input', function(e){ var v = e.target.value; if (fmt(function(st){ st.color = v })) return; upd(function(o){ o.c = v }) });
    document.addEventListener('focusin', function(e){ if (tb.contains(e.target)) return; var el = e.target.closest && e.target.closest('[data-cmsk],[data-cmstx]'); if (el !== cur) LR = null; cur = el || null; if (cur) place(); else tb.style.display = 'none' });
    addEventListener('scroll', function(){ if (cur) place() }, true); addEventListener('resize', function(){ if (cur) place() });
    parent.postMessage({ type: 'cms-hello', page: PAGE }, location.origin);
    setTimeout(arm, 800); setTimeout(arm, 2500); setTimeout(arm, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
