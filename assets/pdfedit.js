/* עורך PDF בדפדפן (myluach.org/pdf).
   הקובץ של הגולש לא נשלח לשרת: PDF.js מציג את הדפים, ו-pdf-lib כותב את הקובץ החדש, שניהם בדפדפן.
   בהורדה הרגילה עמודים שלא נמחק בהם טקסט נשמרים כמו שהם (טקסט, תמונות, סימניות), ומעליהם מצוירים הפריטים שנוספו:
   צורות כקווים חדים, תמונות בקובץ המקורי שלהן, וטקסט כתמונה שקופה ברזולוציה גבוהה (כך כל גופן, ניקוד ועברית עם מספרים יוצאים בדיוק כמו על המסך).
   מעל תמונת הטקסט נוספת שכבת טקסט אמיתית בלתי נראית (כמו ב-OCR), כדי שאפשר יהיה לסמן, להעתיק ולחפש.
   עמוד שיש בו מחיקה או החלפה נשמר כתמונה, כדי שהטקסט שנמחק ייעלם מהקובץ לגמרי, ומעליו נוספת שכבת טקסט בלתי נראית לטקסט שנשאר.
   הספריות נטענות קודם מ-jsdelivr, ואם זה נחסם (נטפרי וכו') דרך /cdn של האתר. */
(function(){
'use strict';
var PDFJS_V = '6.2.108', PDFLIB_V = '1.17.1', BASES = ['https://cdn.jsdelivr.net/npm/', '/cdn/npm/'];
var $ = function(i){ return document.getElementById(i) };
var desk = $('desk');
var S = { docs: [], reg: {}, order: [], zoom: 1, tool: 'replace', sel: null, edit: null, drag: null, hist: [], hi: -1, dirty: false, assets: {}, seq: 1, name: 'document' };
var DEF = { font: 'Arial', size: 12, color: '#000000', bold: false, italic: false, align: 'right', ls: 0, lh: 1.2, stroke: '#d0021b', sw: 1.5, hlc: '#ffe600' };
try { var sv = JSON.parse(localStorage.getItem('myluach-pdf-def') || 'null'); if (sv) for (var k in DEF) if (typeof sv[k] === typeof DEF[k]) DEF[k] = sv[k]; } catch (e) {}
function saveDef(){ try { localStorage.setItem('myluach-pdf-def', JSON.stringify(DEF)) } catch (e) {} }

var HINTS = {
  replace: 'לוחצים על מילה במסמך. היא תכוסה, ואפשר להקליד מיד את המילה החדשה.',
  cover: 'גוררים מלבן על מה שרוצים למחוק.',
  text: 'לוחצים במקום שבו רוצים לכתוב, ומקלידים.',
  select: 'לוחצים על פריט כדי לבחור, וגוררים כדי להזיז. מקש Delete מוחק את הפריט.',
  hl: 'גוררים על השורה שרוצים להדגיש.',
  rect: 'גוררים כדי לצייר מלבן.', ell: 'גוררים כדי לצייר עיגול.', line: 'גוררים כדי לצייר קו.', arrow: 'גוררים כדי לצייר חץ.', pen: 'מציירים חופשי עם העכבר או האצבע.'
};
function hint(t){ $('hint').textContent = t || HINTS[S.tool] || '' }
function busy(t){ var b = $('busy'); if (t) { b.textContent = t; b.hidden = false } else b.hidden = true }
function el(tag, cls){ var e = document.createElement(tag); if (cls) e.className = cls; return e }
function clamp(v, a, b){ return v < a ? a : v > b ? b : v }
function r1(v){ return Math.round(v * 10) / 10 }
function clone(o){ return JSON.parse(JSON.stringify(o)) }
function hex(r, g, b){ return '#' + [r, g, b].map(function(v){ return ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2) }).join('') }
function rgbOf(h){ var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || '') ; return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0] }

/* ---------- טעינת הספריות ---------- */
var pdfjs = null, pdfRoot = '';
async function loadPdfjs(){
  if (pdfjs) return pdfjs;
  var err;
  for (var i = 0; i < BASES.length; i++) {
    try {
      var root = BASES[i] + 'pdfjs-dist@' + PDFJS_V + '/';
      var m = await import(root + 'legacy/build/pdf.min.mjs');
      var r = await fetch(root + 'legacy/build/pdf.worker.min.mjs'); if (!r.ok) throw new Error('worker ' + r.status);
      m.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
      pdfRoot = new URL(root, location.href).href; pdfjs = m; return m;
    } catch (e) { err = e }
  }
  throw err || new Error('pdfjs');
}
function loadScript(src){ return new Promise(function(res, rej){ var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function(){ s.remove(); rej(new Error('load ' + src)) }; document.head.appendChild(s) }) }
async function loadPdfLib(){
  for (var i = 0; i < BASES.length && !window.PDFLib; i++) { try { await loadScript(BASES[i] + 'pdf-lib@' + PDFLIB_V + '/dist/pdf-lib.min.js') } catch (e) {} }
  if (!window.PDFLib) throw new Error('pdf-lib'); return window.PDFLib;
}
var FONTKIT_V = '1.1.1', REV_RTL = false; /* אם בהעתקה העברית יוצאת הפוכה, לשנות ל-true */
async function loadFontkit(){
  for (var i = 0; i < BASES.length && !window.fontkit; i++) { try { await loadScript(BASES[i] + '@pdf-lib/fontkit@' + FONTKIT_V + '/dist/fontkit.umd.min.js') } catch (e) {} }
  return window.fontkit || null;
}

/* ---------- גופנים ---------- */
var mctx = document.createElement('canvas').getContext('2d');
var HAS_LS = 'letterSpacing' in mctx;
var SYS = ['Arial', 'David', 'Miriam', 'Miriam Fixed', 'Narkisim', 'FrankRuehl', 'Rod', 'Gisha', 'Aharoni', 'Levenim MT', 'Guttman Yad-Brush', 'Tahoma', 'Times New Roman', 'Courier New', 'Segoe UI', 'Calibri', 'Arial Hebrew', 'Helvetica', 'Lucida Grande'];
var WEB = ['Assistant', 'Heebo', 'Rubik', 'Noto Sans Hebrew', 'Arimo', 'Alef', 'Varela Round', 'IBM Plex Sans Hebrew', 'Frank Ruhl Libre', 'David Libre', 'Noto Serif Hebrew', 'Tinos', 'Bellefair', 'Miriam Libre', 'Cousine', 'Secular One', 'Suez One', 'Noto Rashi Hebrew'];
var LOCAL = [], webState = { Assistant: 1, 'Frank Ruhl Libre': 1 };
/* אוסף הגופנים של האתר (אותו קטלוג של הברכות): [מזהה, קובץ, תווית, סוג, מוצג, קובץ מודגש, יצרן] */
var MY = {}, MYL = [], catDone = false;
function loadCatalog(){
  return fetch('/assets/greetings/fonts/catalog.json?v=3').then(function(r){ return r.json() }).then(function(list){
    list.forEach(function(c){ MY[c[0]] = { label: c[2] || c[0], url: '/assets/greetings/fonts/' + c[1] + '?v=2', b: c[5] ? '/assets/greetings/fonts/' + c[5] + '?v=2' : null, st: null } });
    MYL = Object.keys(MY).sort(function(a, b){ return MY[a].label.localeCompare(MY[b].label, 'he') });
  }).catch(function(){}).then(function(){ catDone = true; fillFonts(); updateProps() });
}
function hasFont(n){
  var T = 'אבגדהmmwwii10', a, b;
  mctx.font = '72px monospace'; a = mctx.measureText(T).width; mctx.font = '72px "' + n + '",monospace'; b = mctx.measureText(T).width; if (a !== b) return true;
  mctx.font = '72px serif'; a = mctx.measureText(T).width; mctx.font = '72px "' + n + '",serif'; b = mctx.measureText(T).width; return a !== b;
}
var SYS_OK = [];
function fillFonts(){
  var s = $('fFont'), cur = s.value || DEF.font; s.textContent = '';
  function grp(label, list){ if (!list.length) return; var g = document.createElement('optgroup'); g.label = label; list.forEach(function(n){ var o = document.createElement('option'); o.value = n; o.textContent = MY[n] ? MY[n].label : n; g.appendChild(o) }); s.appendChild(g) }
  SYS_OK = SYS.filter(hasFont);
  grp('גופנים מהמחשב', SYS_OK); grp('גופנים נוספים', WEB); grp('הגופנים של האתר', MYL); grp('כל הגופנים שבמחשב', LOCAL);
  if (!allFonts().includes(cur)) cur = allFonts().includes(DEF.font) ? DEF.font : (SYS_OK[0] || WEB[0]);
  s.value = cur; if (catDone && !allFonts().includes(DEF.font)) DEF.font = cur;
}
function allFonts(){ return SYS_OK.concat(WEB, MYL, LOCAL) }
function ensureFont(n){
  var m = MY[n];
  if (m && window.FontFace && document.fonts) {
    if (!m.st) m.st = Promise.all([m.url, m.b].map(function(u, i){ return u ? new FontFace(n, 'url(' + u + ')', { weight: i ? '700' : '400' }).load().then(function(f){ document.fonts.add(f) }) : null })).catch(function(){});
    return m.st;
  }
  if (WEB.indexOf(n) < 0 || !document.fonts) return Promise.resolve();
  if (!webState[n]) { webState[n] = 1; var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':ital,wght@0,400;0,700&display=swap';
    l.onerror = function(){ l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + '&display=swap'; l.onerror = null }; document.head.appendChild(l) }
  var T = 'אבגדה abc 123';
  return new Promise(function(res){ var tries = 0; (function go(){ Promise.all([document.fonts.load('400 16px "' + n + '"', T), document.fonts.load('700 16px "' + n + '"', T)]).then(function(r){ if ((r[0] && r[0].length) || ++tries > 12) res(); else setTimeout(go, 250) }, function(){ res() }) })() });
}
function fam(f){ return '"' + String(f).replace(/["\\]/g, '') + '",Arial,"Noto Sans Hebrew",sans-serif' }
function setFont(c, o, k){ c.font = (o.italic ? 'italic ' : '') + (o.bold ? '700 ' : '400 ') + (o.size * k) + 'px ' + fam(o.font); if (HAS_LS) c.letterSpacing = (o.ls * k) + 'px' }
function lay(o, k){
  setFont(mctx, o, k); var lines = String(o.text).split('\n'), w = 0;
  lines.forEach(function(l){ w = Math.max(w, mctx.measureText(l).width) });
  var m = mctx.measureText('אלqÉ'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, px = o.size * k;
  if (!(asc > 0)) { asc = px * 0.8; desc = px * 0.2 }
  var lh = px * o.lh; return { lines: lines, w: w, lh: lh, h: lh * lines.length, base: (lh - (asc + desc)) / 2 + asc };
}
var RX_RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/, RX_STRONG = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFFA-Za-z\u00C0-\u024F\u0400-\u04FF]/;
function isRtl(s){ var m = RX_STRONG.exec(s); return !!m && RX_RTL.test(m[0]) }
function drawText(c, o, k, X, Y){
  var L = lay(o, k); setFont(c, o, k); c.fillStyle = o.color; c.textBaseline = 'alphabetic';
  L.lines.forEach(function(l, i){
    c.direction = isRtl(l) ? 'rtl' : 'ltr'; var x;
    if (o.align === 'right') { c.textAlign = 'right'; x = X + L.w } else if (o.align === 'center') { c.textAlign = 'center'; x = X + L.w / 2 } else { c.textAlign = 'left'; x = X }
    c.fillText(l, x, Y + i * L.lh + L.base);
  });
}
function tbox(o){ var L = lay(o, 1); return { x: o.align === 'right' ? o.ax - L.w : o.align === 'center' ? o.ax - L.w / 2 : o.ax, y: o.y, w: L.w, h: L.h } }

/* ---------- פתיחת קבצים ---------- */
function askPw(wrong){
  return new Promise(function(res){
    var d = $('pwDlg'), inp = $('pwIn'); $('pwLbl').textContent = wrong ? 'הסיסמה שגויה. נסו שוב:' : 'סיסמת הקובץ'; inp.value = '';
    function done(v){ $('pwOk').onclick = $('pwNo').onclick = d.oncancel = inp.onkeydown = null; if (d.open) d.close(); res(v) }
    $('pwOk').onclick = function(){ done(inp.value) }; $('pwNo').onclick = function(){ done(null) }; d.oncancel = function(){ done(null) };
    inp.onkeydown = function(e){ if (e.key === 'Enter') { e.preventDefault(); done(inp.value) } };
    d.showModal(); inp.focus();
  });
}
function mkPage(o){ o.id = 'p' + (S.seq++); o.rot = 0; o.objs = []; S.reg[o.id] = o; return o }
async function readDoc(file){
  var buf = new Uint8Array(await file.arrayBuffer()), keep = buf.slice(), lib = await loadPdfjs();
  var task = lib.getDocument({ data: buf, cMapUrl: pdfRoot + 'cmaps/', cMapPacked: true, standardFontDataUrl: pdfRoot + 'standard_fonts/', wasmUrl: pdfRoot + 'wasm/', iccUrl: pdfRoot + 'iccs/' });
  task.onPassword = function(update, reason){ askPw(reason === 2).then(function(pw){ if (pw === null) task.destroy(); else update(pw) }) };
  var doc = await task.promise, d = { bytes: keep, doc: doc, name: file.name, enc: null, i: S.docs.length }, out = [];
  S.docs.push(d);
  for (var n = 1; n <= doc.numPages; n++) { var pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }); out.push(mkPage({ kind: 'pdf', di: d.i, n: n, pg: pg, w: vp.width, h: vp.height, vt: vp.transform.slice() })) }
  return out;
}
function showErr(t){ var e = $('err'); e.textContent = t; e.hidden = !t }
async function openFile(file){
  if (!file) return; if (window.__mlGate && !S.docs.length) { try { await window.__mlGate.early() } catch (e) {} } showErr(''); busy('פותח את הקובץ…');
  try {
    var pages = await readDoc(file);
    S.order = pages; S.name = file.name.replace(/\.pdf$/i, '') || 'document';
    $('drop').hidden = true; $('intro').hidden = true; $('ed').hidden = false;
    fitZoom(true); build(); S.hist = []; S.hi = -1; snap(); S.dirty = false; setTool('replace');
  } catch (e) {
    showErr(e && /password|destroy/i.test(String(e.name) + e.message) ? 'הקובץ לא נפתח בלי הסיסמה.' : e && e.name === 'InvalidPDFException' ? 'זה לא קובץ PDF תקין.' : 'לא הצלחנו לפתוח את הקובץ. בדקו שזה קובץ PDF ונסו שוב.');
    if (window.console) console.error(e);
  }
  busy('');
}
async function mkAsset(blob){
  var bytes = new Uint8Array(await blob.arrayBuffer()), url = URL.createObjectURL(blob), img = new Image();
  await new Promise(function(res, rej){ img.onload = res; img.onerror = function(){ rej(new Error('img')) }; img.src = url });
  var key = 'a' + (S.seq++); S.assets[key] = { bytes: bytes, mime: blob.type, url: url, img: img, iw: img.naturalWidth, ih: img.naturalHeight };
  return key;
}
async function addPages(kind, files){
  var add = [];
  try {
    if (kind === 'blank') { var ref = curPage() || { w: 595.28, h: 841.89 }; add.push(mkPage({ kind: 'blank', w: ref.w, h: ref.h, vt: [1, 0, 0, -1, 0, ref.h] })) }
    else { busy('מוסיף עמודים…');
      for (var i = 0; i < files.length; i++) {
        if (kind === 'pdf') add = add.concat(await readDoc(files[i]));
        else { var key = await mkAsset(files[i]), a = S.assets[key], w = a.iw >= a.ih ? 841.89 : 595.28, h = w * a.ih / a.iw; add.push(mkPage({ kind: 'image', key: key, w: w, h: h, vt: [1, 0, 0, -1, 0, h] })) }
      } }
  } catch (e) { hint('לא הצלחנו להוסיף את הקובץ הזה.'); if (window.console) console.error(e) }
  busy('');
  if (!add.length) return;
  S.order = S.order.concat(add); build(); commit();
  add[0].pw.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- תצוגת הדפים ---------- */
var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){ es.forEach(function(e){ var p = e.target.__p; if (!p) return; p.vis = e.isIntersecting; if (p.vis) render(p) }) }, { rootMargin: '900px 0px' }) : null;
function size(p){
  var z = S.zoom, r = p.rot, W = p.w * z, H = p.h * z, ow = r % 180 ? H : W, oh = r % 180 ? W : H;
  p.el.style.width = ow + 'px'; p.el.style.height = oh + 'px'; p.pw.style.width = Math.max(ow, Math.min(330, (desk.clientWidth || 330) - 20)) + 'px';
  p.sheet.style.width = W + 'px'; p.sheet.style.height = H + 'px';
  p.sheet.style.transform = r === 90 ? 'translate(' + H + 'px,0) rotate(90deg)' : r === 180 ? 'translate(' + W + 'px,' + H + 'px) rotate(180deg)' : r === 270 ? 'translate(0,' + W + 'px) rotate(270deg)' : 'none';
}
function build(){
  if (io) io.disconnect(); desk.textContent = ''; var N = S.order.length;
  S.order.forEach(function(p, i){
    var pw = el('div', 'pw'), ph = el('div', 'ph'), pe = el('div', 'pg'), sh = el('div', 'sheet'), ly = el('div', 'ly');
    var lab = el('span'); lab.textContent = 'עמוד ' + (i + 1) + ' מתוך ' + N; ph.appendChild(lab);
    var bs = el('div');
    [['rot', 'סיבוב', true], ['up', 'למעלה', i > 0], ['down', 'למטה', i < N - 1], ['del', 'מחיקת העמוד', N > 1]].forEach(function(b){
      var x = el('button', 'btn sm' + (b[0] === 'del' ? ' bad' : '')); x.type = 'button'; x.textContent = b[1]; x.disabled = !b[2]; x.onclick = function(){ pageOp(p, b[0]) }; bs.appendChild(x) });
    ph.appendChild(bs);
    if (!p.canvas) { p.canvas = document.createElement('canvas'); p.canvas.width = p.canvas.height = 2; p.rscale = 0 }
    sh.appendChild(p.canvas); sh.appendChild(ly); pe.appendChild(sh); pw.appendChild(ph); pw.appendChild(pe); desk.appendChild(pw);
    p.el = pe; p.sheet = sh; p.ly = ly; p.pw = pw; pe.__p = p; p.vis = false;
    size(p); drawObjs(p); if (io) io.observe(pe); else render(p);
  });
  toolClass(); updateProps();
}
function pageOp(p, op){
  endEdit(); var i = S.order.indexOf(p); if (i < 0) return;
  if (op === 'rot') p.rot = (p.rot + 90) % 360;
  else if (op === 'del') { if (S.order.length < 2) return; S.order.splice(i, 1); if (S.sel && S.sel.p === p) S.sel = null }
  else { var j = op === 'up' ? i - 1 : i + 1; if (j < 0 || j >= S.order.length) return; S.order.splice(i, 1); S.order.splice(j, 0, p) }
  build(); commit();
  if (op !== 'del' && p.pw) p.pw.scrollIntoView({ block: 'nearest' });
}
async function render(p){
  var dpr = Math.min(window.devicePixelRatio || 1, 3), sc = S.zoom * dpr, mx = 14e6;
  if (p.w * p.h * sc * sc > mx) sc = Math.sqrt(mx / (p.w * p.h));
  if (p.rscale === sc || p.want === sc) return;
  p.want = sc; if (p.task) { try { p.task.cancel() } catch (e) {} p.task = null }
  var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(p.w * sc)); c.height = Math.max(1, Math.round(p.h * sc));
  var ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  try {
    if (p.kind === 'pdf') { p.task = p.pg.render({ canvasContext: ctx, canvas: c, viewport: p.pg.getViewport({ scale: c.width / p.w }) }); await p.task.promise; p.task = null }
    else if (p.kind === 'image') ctx.drawImage(S.assets[p.key].img, 0, 0, c.width, c.height);
  } catch (e) { if (p.want === sc) p.want = 0; if (e && e.name === 'RenderingCancelledException') return; if (window.console) console.error(e); return }
  if (p.want !== sc) return;
  if (p.canvas.parentNode) p.canvas.parentNode.replaceChild(c, p.canvas);
  p.canvas = c; p.rscale = sc; p.want = 0;
}
var zt = 0;
function setZoom(z){
  S.zoom = clamp(z, 0.25, 6); $('zVal').textContent = Math.round(S.zoom * 100) + '%';
  S.order.forEach(function(p){ if (p.el) { size(p); drawObjs(p) } });
  clearTimeout(zt); zt = setTimeout(function(){ S.order.forEach(function(p){ if (p.vis) render(p) }) }, 160);
}
function fitZoom(first){
  var mw = 0; S.order.forEach(function(p){ mw = Math.max(mw, p.rot % 180 ? p.h : p.w) }); if (!mw) return;
  var avail = ($('ed').clientWidth || document.documentElement.clientWidth - 32) - 24, z = avail / mw;
  if (first) z = Math.min(z, 1.6);
  if (first) { S.zoom = clamp(z, 0.25, 6); $('zVal').textContent = Math.round(S.zoom * 100) + '%' } else setZoom(z);
}
function curPage(){
  var best = null, bo = -1, vh = window.innerHeight;
  S.order.forEach(function(p){ if (!p.el) return; var r = p.el.getBoundingClientRect(), o = Math.min(r.bottom, vh) - Math.max(r.top, 0); if (o > bo) { bo = o; best = p } });
  return best;
}
function pt(p, e){
  var r = p.el.getBoundingClientRect(), z = S.zoom, X = (e.clientX - r.left) / z, Y = (e.clientY - r.top) / z;
  switch (p.rot) { case 90: return [Y, p.h - X]; case 180: return [p.w - X, p.h - Y]; case 270: return [p.w - Y, X]; default: return [X, Y] }
}
function dlt(p, dX, dY){
  dX /= S.zoom; dY /= S.zoom;
  switch (p.rot) { case 90: return [dY, -dX]; case 180: return [-dX, -dY]; case 270: return [-dY, dX]; default: return [dX, dY] }
}

/* ---------- ציור הפריטים על הדף ---------- */
var BOX = { cover: 1, hl: 1, rect: 1, ell: 1, img: 1 };
function pathOf(o, z){
  if (o.t === 'pen') return o.pts.map(function(q, i){ return (i ? 'L' : 'M') + r1(q[0] * z) + ' ' + r1(q[1] * z) }).join('') + (o.pts.length === 1 ? 'l0.01 0' : '');
  var d = 'M' + o.x1 * z + ' ' + o.y1 * z + 'L' + o.x2 * z + ' ' + o.y2 * z;
  if (o.t === 'arrow') arrowPts(o).forEach(function(s){ d += 'M' + s[0] * z + ' ' + s[1] * z + 'L' + o.x2 * z + ' ' + o.y2 * z });
  return d;
}
function arrowPts(o){
  var a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), L = Math.max(7, o.sw * 4.5), t = 0.45;
  return [[o.x2 - L * Math.cos(a - t), o.y2 - L * Math.sin(a - t)], [o.x2 - L * Math.cos(a + t), o.y2 - L * Math.sin(a + t)]];
}
function styleText(e, o, p){
  var z = S.zoom, t = e.firstChild; e.style.top = o.y * z + 'px';
  if (o.align === 'right') { e.style.right = (p.w - o.ax) * z + 'px'; e.style.left = 'auto'; e.style.transform = '' }
  else { e.style.left = o.ax * z + 'px'; e.style.right = 'auto'; e.style.transform = o.align === 'center' ? 'translateX(-50%)' : '' }
  t.style.fontFamily = fam(o.font); t.style.fontSize = o.size * z + 'px'; t.style.fontWeight = o.bold ? '700' : '400'; t.style.fontStyle = o.italic ? 'italic' : 'normal';
  t.style.lineHeight = String(o.lh); t.style.color = o.color; t.style.letterSpacing = o.ls * z + 'px'; t.style.textAlign = o.align; t.style.minHeight = o.size * o.lh * z + 'px';
  e.classList.toggle('empty', !o.text);
}
function mkEl(p, o){
  var z = S.zoom, e;
  if (o.t === 'text') { e = el('div', 'ob tx'); var t = el('div', 't'); t.dir = 'auto'; t.spellcheck = false; e.appendChild(t); styleText(e, o, p); t.textContent = o.text }
  else if (o.t === 'line' || o.t === 'arrow' || o.t === 'pen') {
    e = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); e.setAttribute('class', 'ob'); e.style.left = '0'; e.style.top = '0'; e.style.width = '100%'; e.style.height = '100%';
    var d = pathOf(o, z);
    ['vis', 'hit'].forEach(function(c){ var q = document.createElementNS('http://www.w3.org/2000/svg', 'path'); q.setAttribute('class', c); q.setAttribute('d', d); q.setAttribute('fill', 'none'); q.setAttribute('stroke-linecap', 'round'); q.setAttribute('stroke-linejoin', 'round');
      if (c === 'vis') { q.setAttribute('stroke', o.stroke); q.setAttribute('stroke-width', o.sw * z) } else q.setAttribute('stroke-width', Math.max(14, o.sw * z + 10)); e.appendChild(q) });
  }
  else {
    e = el('div', 'ob ' + ({ cover: 'cv', hl: 'hl', rect: 'bx', ell: 'el', img: 'im' })[o.t]);
    var g = (o.t === 'rect' || o.t === 'ell') ? o.sw / 2 : 0;
    e.style.left = (o.x - g) * z + 'px'; e.style.top = (o.y - g) * z + 'px'; e.style.width = (o.w + 2 * g) * z + 'px'; e.style.height = (o.h + 2 * g) * z + 'px';
    if (o.t === 'cover' || o.t === 'hl') e.style.background = o.fill;
    else if (o.t === 'img') { var im = el('img'); im.alt = ''; im.draggable = false; im.src = S.assets[o.key].url; e.appendChild(im) }
    else { e.style.borderColor = o.stroke; e.style.borderWidth = o.sw * z + 'px' }
  }
  e.__o = o; return e;
}
function drawObjs(p){
  if (!p.ly) return;
  var keep = S.edit && S.edit.p === p ? S.edit.el : null, z = S.zoom;
  Array.prototype.slice.call(p.ly.children).forEach(function(c){ if (c !== keep && !c.classList.contains('rub')) c.remove() });
  p.objs.forEach(function(o, i){
    var e; if (keep && keep.__o === o) { e = keep; styleText(e, o, p) } else { e = mkEl(p, o); p.ly.appendChild(e) }
    e.style.zIndex = String(i + 1);
    if (S.sel && S.sel.o === o) { e.classList.add('sel'); if (!keep) handles(p, o, z) } else e.classList.remove('sel');
  });
}
function handles(p, o, z){
  var pts = [];
  if (BOX[o.t]) [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]].forEach(function(h){ pts.push([h[0], o.x + o.w * h[1], o.y + o.h * h[2]]) });
  else if (o.t === 'line' || o.t === 'arrow') pts = [['a', o.x1, o.y1], ['b', o.x2, o.y2]];
  pts.forEach(function(h){ var d = el('div', 'hd'); d.dataset.h = h[0]; d.style.left = h[1] * z + 'px'; d.style.top = h[2] * z + 'px'; d.style.zIndex = '9999';
    d.style.cursor = h[0].length === 2 && h[0] !== 'ne' && h[0] !== 'sw' ? 'nwse-resize' : (h[0] === 'ne' || h[0] === 'sw') ? 'nesw-resize' : (h[0] === 'n' || h[0] === 's') ? 'ns-resize' : (h[0] === 'e' || h[0] === 'w') ? 'ew-resize' : 'move'; p.ly.appendChild(d) });
}

/* ---------- היסטוריה ---------- */
function snap(){
  S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(S.order.map(function(p){ return { id: p.id, rot: p.rot, objs: clone(p.objs) } })); if (S.hist.length > 120) S.hist.shift(); S.hi = S.hist.length - 1;
  $('bUndo').disabled = S.hi < 1; $('bRedo').disabled = true;
}
function commit(){ snap(); S.dirty = true }
function restore(i){
  if (i < 0 || i >= S.hist.length) return; endEdit(true); S.hi = i;
  S.order = S.hist[i].map(function(s){ var p = S.reg[s.id]; p.rot = s.rot; p.objs = clone(s.objs); return p });
  S.sel = null; build(); S.dirty = true; $('bUndo').disabled = S.hi < 1; $('bRedo').disabled = S.hi >= S.hist.length - 1;
}

/* ---------- בחירה, כלים ומאפיינים ---------- */
var DRAW = { cover: 1, hl: 1, rect: 1, ell: 1, line: 1, arrow: 1, pen: 1 };
function toolClass(){ S.order.forEach(function(p){ if (p.ly) p.ly.className = 'ly t-' + S.tool + (DRAW[S.tool] ? ' draw' : '') }) }
function setTool(t){
  endEdit(); S.tool = t;
  Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function(b){ b.setAttribute('aria-pressed', b.dataset.tool === t ? 'true' : 'false') });
  if (DRAW[t]) select(null);
  toolClass(); updateProps(); hint();
}
function select(p, o){
  var old = S.sel; S.sel = o ? { p: p, o: o } : null;
  if (old && old.p.ly && (!o || old.p !== p)) drawObjs(old.p);
  if (o) drawObjs(p);
  updateProps();
}
function updateProps(){
  var o = S.sel && S.sel.o, t = o ? o.t : null;
  var strokeT = t === 'rect' || t === 'ell' || t === 'line' || t === 'arrow' || t === 'pen' || (!o && (S.tool === 'rect' || S.tool === 'ell' || S.tool === 'line' || S.tool === 'arrow' || S.tool === 'pen'));
  var fillT = t === 'cover' || t === 'hl';
  $('pText').hidden = !!(o && t !== 'text') || (!o && DRAW[S.tool]);
  $('pFill').hidden = !fillT; $('pStroke').hidden = !strokeT; $('pObj').hidden = !o;
  var s = t === 'text' ? o : DEF;
  if (catDone && allFonts().indexOf(s.font) < 0 && s.font) { LOCAL.push(s.font); fillFonts() }
  $('fFont').value = s.font; $('fSize').value = r1(s.size); $('fColor').value = s.color; $('fAlign').value = s.align; $('fLs').value = r1(s.ls);
  $('fB').setAttribute('aria-pressed', s.bold ? 'true' : 'false'); $('fI').setAttribute('aria-pressed', s.italic ? 'true' : 'false');
  if (fillT) $('cFill').value = o.fill;
  if (strokeT) { $('cStroke').value = o ? o.stroke : DEF.stroke; $('cSw').value = o ? o.sw : DEF.sw }
}
var ct = 0;
function commitSoon(){ clearTimeout(ct); ct = setTimeout(commit, 500) }
function setProp(k, v){
  var o = S.sel && S.sel.o;
  if (k in DEF && !(o && o.t !== 'text' && k !== 'stroke' && k !== 'sw')) { DEF[k] = v; saveDef() }
  if (o && k in o) {
    if (o.t === 'text' && o.align !== v && k === 'align') { var b = tbox(o); o.ax = v === 'right' ? b.x + b.w : v === 'center' ? b.x + b.w / 2 : b.x }
    o[k] = v; drawObjs(S.sel.p); commitSoon();
    if (k === 'font') { var p = S.sel.p; ensureFont(v).then(function(){ drawObjs(p) }) }
  }
  updateProps();
}

/* ---------- עריכת טקסט ---------- */
function norm(s){ return String(s).replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/\n$/, '') }
function newText(){ return { t: 'text', ax: 0, y: 0, text: '', font: DEF.font, size: DEF.size, color: DEF.color, bold: DEF.bold, italic: DEF.italic, align: DEF.align, ls: DEF.ls, lh: DEF.lh } }
function startEdit(p, o){
  endEdit(); select(p, o);
  var e = null; Array.prototype.forEach.call(p.ly.children, function(c){ if (c.__o === o) e = c }); if (!e) return;
  Array.prototype.slice.call(p.ly.querySelectorAll('.hd')).forEach(function(h){ h.remove() });
  var t = e.firstChild; e.classList.add('edit'); S.edit = { p: p, o: o, el: e, before: o.text };
  t.contentEditable = 'plaintext-only'; if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
  t.oninput = function(){ o.text = norm(t.innerText); e.classList.toggle('empty', !o.text) };
  t.onpaste = function(ev){ if (t.contentEditable === 'true') { ev.preventDefault(); document.execCommand('insertText', false, (ev.clipboardData || window.clipboardData).getData('text')) } };
  t.focus({ preventScroll: true });
  try { var r = document.createRange(); r.selectNodeContents(t); r.collapse(false); var s = getSelection(); s.removeAllRanges(); s.addRange(r) } catch (x) {}
  hint('מקלידים את הטקסט. לסיום לוחצים מחוץ לתיבה או על Esc.');
}
function endEdit(silent){
  var E = S.edit; if (!E) return false; S.edit = null;
  var t = E.el.firstChild, o = E.o, p = E.p; o.text = norm(t.innerText); t.contentEditable = 'false'; t.oninput = t.onpaste = null; E.el.classList.remove('edit');
  try { getSelection().removeAllRanges() } catch (x) {}
  if (!o.text.trim()) { var i = p.objs.indexOf(o); if (i >= 0) p.objs.splice(i, 1); if (S.sel && S.sel.o === o) S.sel = null }
  if (!silent) { drawObjs(p); if (o.text !== E.before || E.fresh) commit(); updateProps(); hint() }
  return true;
}
function addText(p, x, y, pre){
  var o = newText(); if (pre) for (var k in pre) if (k !== 'fresh') o[k] = pre[k];
  var L = lay({ text: 'א', font: o.font, size: o.size, bold: o.bold, italic: o.italic, ls: o.ls, lh: o.lh }, 1);
  if (!pre || pre.ax == null) o.ax = x; if (!pre || pre.y == null) o.y = y - L.h / 2;
  p.objs.push(o);
  ensureFont(o.font).then(function(){ if (p.ly) drawObjs(p) });
  drawObjs(p); startEdit(p, o); if (S.edit) S.edit.fresh = !!(pre && pre.fresh);
  return o;
}

/* ---------- זיהוי המילה שנלחצה ---------- */
function strip(p, y0, y1){
  var c = p.canvas; if (!p.rscale || !c || c.width < 8) return null;
  var sc = c.width / p.w, Y0 = clamp(Math.floor(y0 * sc), 0, c.height - 1), Y1 = clamp(Math.ceil(y1 * sc), 1, c.height); if (Y1 <= Y0) return null;
  try { return { d: c.getContext('2d').getImageData(0, Y0, c.width, Y1 - Y0).data, W: c.width, H: Y1 - Y0, Y0: Y0, sc: sc } } catch (e) { return null }
}
function bgOf(st, x0, x1){
  var h = {}, best = 0, bk = 0, d = st.d, W = st.W; x0 = clamp(x0 | 0, 0, W - 1); x1 = clamp(x1 | 0, x0 + 1, W);
  for (var y = 0; y < st.H; y += 2) for (var x = x0; x < x1; x += 2) { var i = (y * W + x) * 4, k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); var n = h[k] = (h[k] || 0) + 1; if (n > best) { best = n; bk = k } }
  return [((bk >> 10) & 31) * 8 + 4, ((bk >> 5) & 31) * 8 + 4, (bk & 31) * 8 + 4];
}
async function hitItem(p, x, y){
  if (p.kind !== 'pdf') return null;
  try {
    if (!p.tc) p.tc = await p.pg.getTextContent();
    var U = pdfjs.Util, best = null;
    p.tc.items.forEach(function(it){
      if (!it.str || !it.str.trim()) return;
      var m = U.transform(p.vt, it.transform); if (Math.abs(m[1]) > 0.05 * Math.abs(m[0]) || m[0] <= 0) return;
      var fh = Math.hypot(m[2], m[3]), w = it.width, l = m[4], base = m[5];
      if (x >= l - 2 && x <= l + w + 2 && y >= base - fh * 1.05 && y <= base + fh * 0.4) best = { fh: fh, base: base, top: base - fh * 0.95, bot: base + fh * 0.32, ltr: it.dir !== 'rtl' && !RX_RTL.test(it.str), fontName: it.fontName };
    });
    if (best) { try { var f = p.pg.commonObjs.get(best.fontName); best.name = f && f.name; } catch (e) {} var st = p.tc.styles && p.tc.styles[best.fontName]; best.generic = st && st.fontFamily }
    return best;
  } catch (e) { return null }
}
async function smart(p, x, y){
  var it = await hitItem(p, x, y), fh = it ? it.fh : 14;
  var st = strip(p, y - fh * 2.4, y + fh * 2.4); if (!st) return { it: it };
  var sc = st.sc, W = st.W, H = st.H, d = st.d, cx = clamp(Math.round(x * sc), 0, W - 1), cy = clamp(Math.round(y * sc) - st.Y0, 0, H - 1);
  var bg = bgOf(st, cx - 300 * sc, cx + 300 * sc);
  function dist(px, py){ var i = (py * W + px) * 4; return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) }
  var top, bot;
  if (it) { top = clamp(Math.round(it.top * sc) - st.Y0, 0, H - 1); bot = clamp(Math.round(it.bot * sc) - st.Y0, top, H - 1) }
  else {
    var hw = Math.round(22 * sc), xa = Math.max(0, cx - hw), xb = Math.min(W - 1, cx + hw);
    var rowInk = function(py){ for (var px = xa; px <= xb; px++) if (dist(px, py) > 90) return true; return false };
    var r0 = -1; for (var q = 0; q <= Math.round(5 * sc) && r0 < 0; q++) { if (cy - q >= 0 && rowInk(cy - q)) r0 = cy - q; else if (cy + q < H && rowInk(cy + q)) r0 = cy + q }
    if (r0 < 0) return { it: null };
    var gap = Math.max(2, Math.round(0.9 * sc)), b = 0, r; top = bot = r0;
    for (r = r0 - 1, b = 0; r >= 0; r--) { if (rowInk(r)) { top = r; b = 0 } else if (++b >= gap) break }
    for (r = r0 + 1, b = 0; r < H; r++) { if (rowInk(r)) { bot = r; b = 0 } else if (++b >= gap) break }
  }
  var bandH = bot - top + 1, em = it ? it.fh * sc : bandH / 0.72;
  var col = new Uint8Array(W), px, py;
  for (px = 0; px < W; px++) for (py = top; py <= bot; py++) if (dist(px, py) > 90) { col[px] = 1; break }
  /* מרווח בין מילים מול מרווח בין אותיות: לפי הקפיצה הגדולה ברוחבי המרווחים שבשורה */
  var gaps = [], run = 0, seen = false, lim = Math.round(em * 40);
  for (px = Math.max(0, cx - lim); px < Math.min(W, cx + lim); px++) { if (col[px]) { if (seen && run) gaps.push(run); run = 0; seen = true } else run++ }
  gaps = gaps.filter(function(g){ return g < em * 3 }).sort(function(a, b){ return a - b });
  var G = em * 0.22, bestR = 1.7;
  for (var gi = 1; gi < gaps.length; gi++) { var lo = gaps[gi - 1], hi = gaps[gi]; if (hi >= em * 0.14 && hi / Math.max(lo, 1) >= bestR) { bestR = hi / Math.max(lo, 1); G = (lo + hi) / 2 } }
  G = Math.max(3, Math.round(G));
  var c0 = -1; for (var q2 = 0; q2 <= G * 2 && c0 < 0; q2++) { if (cx - q2 >= 0 && col[cx - q2]) c0 = cx - q2; else if (cx + q2 < W && col[cx + q2]) c0 = cx + q2 }
  if (c0 < 0) return { it: it };
  var l = c0, rr = c0, bl;
  for (px = c0 - 1, bl = 0; px >= 0; px--) { if (col[px]) { l = px; bl = 0 } else if (++bl >= G) break }
  for (px = c0 + 1, bl = 0; px < W; px++) { if (col[px]) { rr = px; bl = 0 } else if (++bl >= G) break }
  /* גובה מדויק לפי הדיו של המילה עצמה, וצבע הטקסט */
  var t2 = bot, b2 = top, mxd = 0;
  for (py = top; py <= bot; py++) for (px = l; px <= rr; px++) { var dd = dist(px, py); if (dd > 90) { if (py < t2) t2 = py; if (py > b2) b2 = py; if (dd > mxd) mxd = dd } }
  if (b2 < t2) { t2 = top; b2 = bot }
  var sr = 0, sg = 0, sb = 0, sn = 0;
  for (py = t2; py <= b2; py++) for (px = l; px <= rr; px++) { if (dist(px, py) >= mxd * 0.85) { var i = (py * W + px) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sn++ } }
  var pad = 1.3;
  if (bg[0] > 243 && bg[1] > 243 && bg[2] > 243) bg = [255, 255, 255];
  if (sn && sr / sn < 28 && sg / sn < 28 && sb / sn < 28) sr = sg = sb = 0;
  return { it: it, x: l / sc - pad, y: (t2 + st.Y0) / sc - pad, w: (rr - l + 1) / sc + pad * 2, h: (b2 - t2 + 1) / sc + pad * 2, bg: hex(bg[0], bg[1], bg[2]), fg: sn ? hex(sr / sn, sg / sn, sb / sn) : '#000000', em: em / sc };
}
function edgeColor(p, o){
  var st = strip(p, o.y - 3, o.y + o.h + 3); if (!st) return '#ffffff';
  var sc = st.sc, x0 = Math.round((o.x - 3) * sc), x1 = Math.round((o.x + o.w + 3) * sc), W = st.W, d = st.d, h = {}, best = 0, bk = 0;
  function add(px, py){ if (px < 0 || px >= W || py < 0 || py >= st.H) return; var i = (py * W + px) * 4, k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3), n = h[k] = (h[k] || 0) + 1; if (n > best) { best = n; bk = k } }
  for (var px = x0; px <= x1; px++) { add(px, 0); add(px, 1); add(px, st.H - 1); add(px, st.H - 2) }
  for (var py = 0; py < st.H; py++) { add(x0, py); add(x0 + 1, py); add(x1, py); add(x1 - 1, py) }
  if (!best) return '#ffffff';
  var c = [((bk >> 10) & 31) * 8 + 4, ((bk >> 5) & 31) * 8 + 4, (bk & 31) * 8 + 4]; if (c[0] > 243 && c[1] > 243 && c[2] > 243) return '#ffffff';
  return hex(c[0], c[1], c[2]);
}
function guessFont(it){
  var all = allFonts(), key = function(s){ return s.toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]/g, '') }, res = {};
  var n = String(it.name || '').replace(/^[A-Z]{6}\+/, '');
  if (/bold|black|heavy/i.test(n)) res.bold = true; if (/italic|oblique/i.test(n)) res.italic = true;
  var base = key(n.split(/[-,]/)[0].replace(/(PS)?MT$|PS$/, ''));
  if (base) { var f = all.filter(function(a){ return key(a) === base })[0] || all.filter(function(a){ return base.indexOf(key(a)) === 0 && key(a).length > 3 }).sort(function(a, b){ return b.length - a.length })[0]; if (f) { res.font = f; return res } }
  var pick = function(list){ return list.filter(function(a){ return all.indexOf(a) >= 0 })[0] };
  if (/mono|courier|fixed/i.test(n) || it.generic === 'monospace') res.font = pick(['Miriam Fixed', 'Courier New', 'Cousine']);
  else if (it.generic === 'serif' || /times|david|frank|narkis|serif/i.test(n)) res.font = pick(['David', 'Times New Roman', 'David Libre', 'Frank Ruhl Libre']);
  if (!res.font) delete res.font; return res;
}
async function doReplace(p, x, y){
  var r = await smart(p, x, y); if (!p.ly) return;
  if (!r || !r.w) { addText(p, x, y); hint('לא זוהה כאן טקסט, אז נוספה תיבת טקסט רגילה. אפשר לכסות קודם את האזור עם הכלי "מחיקה".'); return }
  var pre = { color: r.fg, fresh: true };
  if (r.it) { pre.size = r1(r.it.fh); var g = guessFont(r.it); for (var k in g) pre[k] = g[k]; if (!('bold' in g)) pre.bold = false; if (!('italic' in g)) pre.italic = false }
  else pre.size = r1(clamp(r.em, 5, 200));
  pre.align = r.it && r.it.ltr ? 'left' : 'right';
  pre.ax = pre.align === 'right' ? r.x + r.w - 1.3 : r.x + 1.3;
  var probe = newText(); for (var k2 in pre) probe[k2] = pre[k2]; probe.text = 'א';
  await ensureFont(probe.font);
  var L = lay(probe, 1); pre.y = r.it ? r.it.base - L.base : r.y + r.h / 2 - L.h / 2;
  p.objs.push({ t: 'cover', x: r.x, y: r.y, w: r.w, h: r.h, fill: r.bg, rp: 1 });
  addText(p, x, y, pre);
}

/* ---------- עכבר ומגע ---------- */
function down(e){
  if (e.button || $('busy').hidden === false) return;
  var pe = e.target.closest && e.target.closest('.pg'); if (!pe) { if (!e.target.closest('.bar')) { endEdit(); select(null) } return }
  var p = pe.__p, hd = e.target.closest('.hd'), oe = e.target.closest('.ob'), xy = pt(p, e);
  if (S.edit && oe && S.edit.el === oe) return;
  var was = endEdit();
  if (hd && S.sel) { startDrag(e, { kind: 'size', p: p, o: S.sel.o, h: hd.dataset.h }); return }
  if (oe && oe.__o) {
    var o = oe.__o, wasSel = !!(S.sel && S.sel.o === o); select(p, o);
    startDrag(e, { kind: 'move', p: p, o: o, wasSel: wasSel }); return;
  }
  var t = S.tool;
  if (t === 'select') { select(null); return }
  if (t === 'replace') { e.preventDefault(); select(null); doReplace(p, xy[0], xy[1]); return }
  if (t === 'text') { e.preventDefault(); select(null); addText(p, xy[0], xy[1]); return }
  if (t === 'line' || t === 'arrow') { var ln = { t: t, x1: xy[0], y1: xy[1], x2: xy[0], y2: xy[1], stroke: DEF.stroke, sw: DEF.sw }; p.objs.push(ln); startDrag(e, { kind: 'newline', p: p, o: ln }); return }
  if (t === 'pen') { var pn = { t: 'pen', pts: [[r1(xy[0]), r1(xy[1])]], stroke: DEF.stroke, sw: DEF.sw }; p.objs.push(pn); drawObjs(p); startDrag(e, { kind: 'pen', p: p, o: pn }); return }
  var rub = el('div', 'rub'); p.ly.appendChild(rub); startDrag(e, { kind: 'rub', p: p, x0: xy[0], y0: xy[1], rub: rub });
}
function startDrag(e, d){
  e.preventDefault(); d.sx = e.clientX; d.sy = e.clientY; d.orig = d.o ? clone(d.o) : null; d.moved = false; d.id = e.pointerId; S.drag = d;
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
function move(e){
  var d = S.drag; if (!d || e.pointerId !== d.id) return;
  var p = d.p, o = d.o, g = d.orig, dv = dlt(p, e.clientX - d.sx, e.clientY - d.sy), dx = dv[0], dy = dv[1], z = S.zoom;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3 && d.kind !== 'pen') return; d.moved = true;
  if (d.kind === 'move') {
    if (o.t === 'text') { o.ax = g.ax + dx; o.y = g.y + dy }
    else if (o.t === 'pen') o.pts = g.pts.map(function(q){ return [q[0] + dx, q[1] + dy] });
    else if (o.t === 'line' || o.t === 'arrow') { o.x1 = g.x1 + dx; o.y1 = g.y1 + dy; o.x2 = g.x2 + dx; o.y2 = g.y2 + dy }
    else { o.x = g.x + dx; o.y = g.y + dy }
    drawObjs(p);
  } else if (d.kind === 'size') {
    var h = d.h;
    if (h === 'a') { o.x1 = g.x1 + dx; o.y1 = g.y1 + dy } else if (h === 'b') { o.x2 = g.x2 + dx; o.y2 = g.y2 + dy }
    else {
      var x = g.x, y = g.y, w = g.w, hh = g.h;
      if (h.indexOf('w') >= 0) { x += dx; w -= dx } if (h.indexOf('e') >= 0) w += dx;
      if (h.indexOf('n') >= 0) { y += dy; hh -= dy } if (h.indexOf('s') >= 0) hh += dy;
      if (o.t === 'img' && h.length === 2 && !e.shiftKey) { var ar = g.w / g.h, nw = Math.max(w, hh * ar), nh = nw / ar; if (h.indexOf('w') >= 0) x = g.x + g.w - nw; if (h.indexOf('n') >= 0) y = g.y + g.h - nh; w = nw; hh = nh }
      if (w < 2) { if (h.indexOf('w') >= 0) x = g.x + g.w - 2; w = 2 } if (hh < 2) { if (h.indexOf('n') >= 0) y = g.y + g.h - 2; hh = 2 }
      o.x = x; o.y = y; o.w = w; o.h = hh;
    }
    drawObjs(p);
  } else if (d.kind === 'newline') { var q = pt(p, e); o.x2 = q[0]; o.y2 = q[1]; drawObjs(p) }
  else if (d.kind === 'pen') { var q2 = pt(p, e), last = o.pts[o.pts.length - 1]; if (Math.hypot(q2[0] - last[0], q2[1] - last[1]) > 0.6) { o.pts.push([r1(q2[0]), r1(q2[1])]); drawObjs(p) } }
  else if (d.kind === 'rub') { var c = pt(p, e); d.x1 = c[0]; d.y1 = c[1]; var rx = Math.min(d.x0, c[0]), ry = Math.min(d.y0, c[1]);
    d.rub.style.left = rx * z + 'px'; d.rub.style.top = ry * z + 'px'; d.rub.style.width = Math.abs(c[0] - d.x0) * z + 'px'; d.rub.style.height = Math.abs(c[1] - d.y0) * z + 'px' }
}
function up(e){
  var d = S.drag; if (!d || (e.pointerId !== d.id)) return; S.drag = null;
  window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
  var p = d.p, o = d.o;
  if (d.kind === 'move') { if (d.moved) commit(); else if (o.t === 'text' && (d.wasSel || S.tool === 'text' || S.tool === 'replace')) startEdit(p, o) }
  else if (d.kind === 'size') { if (d.moved) commit() }
  else if (d.kind === 'newline') { if (Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 3) { p.objs.pop(); drawObjs(p) } else { commit(); select(p, o) } }
  else if (d.kind === 'pen') { commit(); drawObjs(p) }
  else if (d.kind === 'rub') {
    d.rub.remove(); if (!d.moved || d.x1 == null) return;
    var x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0); if (w < 2 || h < 2) return;
    var t = S.tool, n = { t: t, x: x, y: y, w: w, h: h };
    if (t === 'cover') n.fill = edgeColor(p, n); else if (t === 'hl') n.fill = DEF.hlc; else { n.stroke = DEF.stroke; n.sw = DEF.sw }
    p.objs.push(n); commit(); select(p, n);
  }
}
function removeSel(){ if (!S.sel) return; var p = S.sel.p, i = p.objs.indexOf(S.sel.o); if (i >= 0) p.objs.splice(i, 1); S.sel = null; drawObjs(p); updateProps(); commit() }
function order(front){ if (!S.sel) return; var p = S.sel.p, o = S.sel.o, i = p.objs.indexOf(o); if (i < 0) return; p.objs.splice(i, 1); if (front) p.objs.push(o); else p.objs.unshift(o); drawObjs(p); commit() }
function dup(){
  if (!S.sel) return; endEdit(); var p = S.sel.p, n = clone(S.sel.o), s = 8;
  if (n.t === 'text') { n.ax += s; n.y += s } else if (n.t === 'pen') n.pts = n.pts.map(function(q){ return [q[0] + s, q[1] + s] }); else if ('x1' in n) { n.x1 += s; n.x2 += s; n.y1 += s; n.y2 += s } else { n.x += s; n.y += s }
  p.objs.push(n); commit(); select(p, n);
}
function nudge(dx, dy){
  var o = S.sel.o, p = S.sel.p, v = dlt(p, dx * S.zoom, dy * S.zoom); dx = v[0]; dy = v[1];
  if (o.t === 'text') { o.ax += dx; o.y += dy } else if (o.t === 'pen') o.pts = o.pts.map(function(q){ return [q[0] + dx, q[1] + dy] }); else if ('x1' in o) { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy } else { o.x += dx; o.y += dy }
  drawObjs(p); commitSoon();
}
function key(e){
  if (document.querySelector('dialog[open]') || $('ed').hidden) return;
  if (S.edit) { if (e.key === 'Escape') { e.preventDefault(); endEdit() } return }
  var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA') return;
  var mod = e.ctrlKey || e.metaKey, k = e.key;
  if (mod && (k === 'z' || k === 'Z' || e.code === 'KeyZ')) { e.preventDefault(); restore(e.shiftKey ? S.hi + 1 : S.hi - 1); return }
  if (mod && (k === 'y' || e.code === 'KeyY')) { e.preventDefault(); restore(S.hi + 1); return }
  if (!S.sel) return;
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); removeSel() }
  else if (k === 'Escape') select(null)
  else if (k === 'Enter' && S.sel.o.t === 'text') { e.preventDefault(); startEdit(S.sel.p, S.sel.o) }
  else if (mod && (k === 'd' || e.code === 'KeyD')) { e.preventDefault(); dup() }
  else if (k.indexOf('Arrow') === 0) { e.preventDefault(); var s = e.shiftKey ? 5 : 0.5; nudge(k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0) }
}

/* ---------- תמונה וחתימה ---------- */
async function placeImage(blob, maxW, isSig){
  var p = curPage(); if (!p) return; endEdit();
  var key; try { key = await mkAsset(blob) } catch (e) { hint('לא הצלחנו לקרוא את התמונה.'); return }
  var a = S.assets[key], w = Math.min(maxW || 220, p.w * 0.6), h = w * a.ih / a.iw; if (h > p.h * 0.6) { h = p.h * 0.6; w = h * a.iw / a.ih }
  var r = p.el.getBoundingClientRect(), c = pt(p, { clientX: clamp(window.innerWidth / 2, r.left + 20, r.right - 20), clientY: clamp(window.innerHeight / 2, r.top + 20, r.bottom - 20) });
  var o = { t: 'img', x: clamp(c[0] - w / 2, 0, Math.max(0, p.w - w)), y: clamp(c[1] - h / 2, 0, Math.max(0, p.h - h)), w: w, h: h, key: key }; if (isSig) o.sig = 1;
  p.objs.push(o); commit(); setTool('select'); select(p, o); hint('גוררים את התמונה למקום, ומשנים גודל מהפינות.');
}
function sigInit(){
  var c = $('sigPad'), x = c.getContext('2d'), on = false, lp = null, used = false;
  function pos(e){ var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height] }
  function clear(){ x.clearRect(0, 0, c.width, c.height); used = false }
  c.addEventListener('pointerdown', function(e){ e.preventDefault(); on = true; lp = pos(e); try { c.setPointerCapture(e.pointerId) } catch (z) {} x.strokeStyle = $('sigColor').value; x.lineWidth = 5; x.lineCap = x.lineJoin = 'round'; x.beginPath(); x.moveTo(lp[0], lp[1]); x.lineTo(lp[0] + 0.1, lp[1]); x.stroke(); used = true });
  c.addEventListener('pointermove', function(e){ if (!on) return; var q = pos(e); x.beginPath(); x.moveTo(lp[0], lp[1]); x.lineTo(q[0], q[1]); x.stroke(); lp = q });
  ['pointerup', 'pointercancel'].forEach(function(n){ c.addEventListener(n, function(){ on = false }) });
  $('sigClear').onclick = clear;
  $('bSign').onclick = function(){ endEdit(); clear(); $('sigDlg').showModal() };
  $('sigOk').onclick = function(){
    if (!used) { $('sigDlg').close(); return }
    var d = x.getImageData(0, 0, c.width, c.height).data, x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (var yy = 0; yy < c.height; yy++) for (var xx = 0; xx < c.width; xx++) if (d[(yy * c.width + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy }
    x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(c.width - 1, x1 + 6); y1 = Math.min(c.height - 1, y1 + 6);
    var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0);
    o.toBlob(function(b){ $('sigDlg').close(); placeImage(b, 150, true) }, 'image/png');
  };
}

/* ---------- יצירת הקובץ ---------- */
function toBytes(c, type, q){ return new Promise(function(res, rej){ c.toBlob(function(b){ if (!b) return rej(new Error('blob')); b.arrayBuffer().then(function(a){ res(new Uint8Array(a)) }, rej) }, type, q) }) }
function canvasObjs(ctx, p, sc){
  p.objs.forEach(function(o){
    ctx.save();
    if (o.t === 'cover') { ctx.fillStyle = o.fill; ctx.fillRect(o.x * sc, o.y * sc, o.w * sc, o.h * sc) }
    else if (o.t === 'hl') { ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.fill; ctx.fillRect(o.x * sc, o.y * sc, o.w * sc, o.h * sc) }
    else if (o.t === 'img') ctx.drawImage(S.assets[o.key].img, o.x * sc, o.y * sc, o.w * sc, o.h * sc);
    else if (o.t === 'text') { if (o.text.trim()) { var b = tbox(o); drawText(ctx, o, sc, b.x * sc, b.y * sc) } }
    else {
      ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw * sc; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
      if (o.t === 'rect') { ctx.lineJoin = 'miter'; ctx.rect(o.x * sc, o.y * sc, o.w * sc, o.h * sc) }
      else if (o.t === 'ell') ctx.ellipse((o.x + o.w / 2) * sc, (o.y + o.h / 2) * sc, o.w / 2 * sc, o.h / 2 * sc, 0, 0, Math.PI * 2);
      else if (o.t === 'pen') { o.pts.forEach(function(q, i){ if (i) ctx.lineTo(q[0] * sc, q[1] * sc); else ctx.moveTo(q[0] * sc, q[1] * sc) }); if (o.pts.length === 1) ctx.lineTo(o.pts[0][0] * sc + 0.01, o.pts[0][1] * sc) }
      else { ctx.moveTo(o.x1 * sc, o.y1 * sc); ctx.lineTo(o.x2 * sc, o.y2 * sc); if (o.t === 'arrow') arrowPts(o).forEach(function(s){ ctx.moveTo(s[0] * sc, s[1] * sc); ctx.lineTo(o.x2 * sc, o.y2 * sc) }) }
      ctx.stroke();
    }
    ctx.restore();
  });
}
async function rasterCanvas(p, dpi){
  /* עד 60 מיליון פיקסלים לעמוד, ובבחירת 1200 עד 145 מיליון. אם הדפדפן לא מצליח להקצות כזה קנבס, מנסים רזולוציה נמוכה יותר */
  var sc = dpi / 72, mx = dpi >= 1200 ? 145e6 : 60e6, c, ctx;
  for (var tries = 0; tries < 6; tries++) {
    if (p.w * p.h * sc * sc > mx) sc = Math.sqrt(mx / (p.w * p.h));
    c = document.createElement('canvas'); c.width = Math.round(p.w * sc); c.height = Math.round(p.h * sc); ctx = c.getContext('2d');
    if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); try { if (ctx.getImageData(0, 0, 1, 1).data[3] === 255) break } catch (e) { break } }
    c.width = c.height = 1; ctx = null; mx = p.w * p.h * sc * sc * 0.5;
  }
  if (!ctx) throw new Error('canvas');
  if (p.kind === 'pdf') await p.pg.render({ canvasContext: ctx, canvas: c, viewport: p.pg.getViewport({ scale: c.width / p.w }) }).promise;
  else if (p.kind === 'image') ctx.drawImage(S.assets[p.key].img, 0, 0, c.width, c.height);
  canvasObjs(ctx, p, c.width / p.w);
  return c;
}
async function raster(p, dpi){
  var c = await rasterCanvas(p, dpi), b = await toBytes(c, 'image/jpeg', 0.95); c.width = c.height = 1; return b;
}
function rotCanvas(c, rot){
  if (!rot) return c;
  var o = document.createElement('canvas'), sw = rot % 180 !== 0; o.width = sw ? c.height : c.width; o.height = sw ? c.width : c.height;
  var x = o.getContext('2d'); x.translate(o.width / 2, o.height / 2); x.rotate(rot * Math.PI / 180); x.drawImage(c, -c.width / 2, -c.height / 2); c.width = c.height = 1; return o;
}
/* ZIP בלי דחיסה (store), מספיק לקובצי תמונה שכבר דחוסים */
var CRC_T = null;
function crc32(b){
  if (!CRC_T) { CRC_T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0 } }
  var c2 = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c2 = CRC_T[(c2 ^ b[i]) & 255] ^ (c2 >>> 8); return (c2 ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files){
  var enc = new TextEncoder(), now = new Date(), dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF, dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  var parts = [], cen = [], off = 0;
  files.forEach(function(f){
    var nm = enc.encode(f.name), crc = crc32(f.bytes), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, f.bytes.length, true); h.setUint32(22, f.bytes.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.bytes.length, true); c.setUint32(24, f.bytes.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), nm, f.bytes); cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + f.bytes.length;
  });
  var cs = 0; cen.forEach(function(a){ cs += a.length });
  var e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}
/* ---------- חותמת עם לוגו, ושדה חתימה לאדובי ---------- */
var ST_KEY = 'ml-pdf-stamp';
function stGet(){ try { return JSON.parse(localStorage.getItem(ST_KEY) || '{}') || {} } catch (e) { return {} } }
function stSave(o){ try { localStorage.setItem(ST_KEY, JSON.stringify(o)) } catch (e) {} }
function stToday(){ try { return new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }) } catch (e) { return '' } }
function stImg(src){ return new Promise(function(ok){ var im = new Image(); im.onload = function(){ ok(im) }; im.onerror = function(){ ok(null) }; im.src = src }) }
async function stDraw(cv, o){
  var W = 900, H = 300, x = cv.getContext('2d'); cv.width = W; cv.height = H;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.strokeStyle = '#1a3a8f'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6);
  var lx = 24, tw = W - 48;
  if (o.logo) { var im = await stImg(o.logo); if (im) { var s = Math.min(240 / im.width, 240 / im.height); x.drawImage(im, 30, (H - im.height * s) / 2, im.width * s, im.height * s); tw = W - 30 - 240 - 40; } }
  var right = W - 30; x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.fillStyle = '#1a3a8f';
  var F = 'Arial, "Noto Sans Hebrew", sans-serif', lines = [];
  lines.push([(o.line || 'נחתם על ידי'), '600 34px ' + F, '#555']);
  if (o.name) lines.push([o.name, '800 56px ' + F, '#111']);
  if (o.title) lines.push([o.title, '500 36px ' + F, '#333']);
  if (o.date) lines.push([stToday(), '500 32px ' + F, '#555']);
  var tot = lines.length * 62, y = (H - tot) / 2 + 46;
  lines.forEach(function(l){ x.font = l[1]; x.fillStyle = l[2]; while (x.measureText(l[0]).width > tw && /\d/.test(l[1])) { l[1] = l[1].replace(/(\d+)px/, function(m, n){ return (n - 2) + 'px' }); x.font = l[1] } x.fillText(l[0], right, y); y += 62 });
}
function stRead(){ var o = stGet(); return { logo: o.logo || '', name: $('stName').value.trim(), title: $('stTitle').value.trim(), line: $('stLine').value.trim(), date: $('stDate').checked } }
function stPrev(){ stDraw($('stPrev'), stRead()) }
function stOpen(){
  var o = stGet(); $('stName').value = o.name || ''; $('stTitle').value = o.title || ''; $('stLine').value = o.line || ''; $('stDate').checked = o.date !== false; stPrev(); $('stDlg').showModal();
}
function stInit(){
  $('bStamp').onclick = function(){ endEdit(); stOpen() };
  ['stName', 'stTitle', 'stLine'].forEach(function(id){ $(id).oninput = stPrev }); $('stDate').onchange = stPrev;
  $('stLogo').onchange = function(){
    var f = this.files[0]; this.value = ''; if (!f) return;
    var fr = new FileReader(); fr.onload = async function(){
      var im = await stImg(fr.result); if (!im) { hint('לא הצלחנו לקרוא את התמונה.'); return }
      var k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); var o = stGet(); o.logo = c.toDataURL('image/png'); stSave(o); stPrev();
    }; fr.readAsDataURL(f);
  };
  $('stClearLogo').onclick = function(){ var o = stGet(); delete o.logo; stSave(o); stPrev() };
  $('stOk').onclick = async function(){
    var v = stRead(); stSave(Object.assign(stGet(), { name: v.name, title: v.title, line: v.line, date: v.date }));
    var c = document.createElement('canvas'); await stDraw(c, v); $('stDlg').close();
    c.toBlob(function(b){ placeImage(b, 230, true) }, 'image/png');
  };
}
/* שדה חתימה ריק בעמוד האחרון (AcroForm), עם החותמת כרקע. את החתימה עצמה מוסיפים באדובי עם תעודה דיגיטלית */
async function addSigField(L, out, o){
  var page = out.getPages()[out.getPageCount() - 1], sz = page.getSize(), w = 220, h = 73, m = 36;
  var x = o.pos === 'left' ? m : o.pos === 'center' ? (sz.width - w) / 2 : sz.width - w - m, y = m + (o.lift || 0);
  try { var c = document.createElement('canvas'); await stDraw(c, Object.assign({}, stGet(), { date: false })); var png = await out.embedPng(await toBytes(c, 'image/png')); page.drawImage(png, { x: x, y: y, width: w, height: h }) } catch (e) { if (window.console) console.error(e) }
  var N = L.PDFName, ctx = out.context;
  var widget = ctx.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: L.PDFString.of('MyLuachSignature1'), Rect: [x, y, x + w, y + h], F: 4, P: page.ref });
  var ref = ctx.register(widget); page.node.addAnnot(ref);
  var form = out.catalog.lookupMaybe(N.of('AcroForm'), L.PDFDict);
  if (!form) { form = ctx.obj({ Fields: [] }); out.catalog.set(N.of('AcroForm'), form) }
  var fields = form.lookupMaybe(N.of('Fields'), L.PDFArray); if (!fields) { fields = ctx.obj([]); form.set(N.of('Fields'), fields) }
  fields.push(ref);
}

/* ---------- חתימה מוצפנת של האתר, עם חותמת זמן ---------- */
var SIGAPI = '/api/pricing?c=_sign';
function sgPost(t, b){ return fetch(SIGAPI, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(b) }).then(function(r){ return r.json().catch(function(){ return {} }).then(function(j){ j._st = r.status; return j }) }) }
function findBytes(buf, str, from){
  var n = str.length, c0 = str.charCodeAt(0);
  for (var i = from || 0, e = buf.length - n; i <= e; i++) { if (buf[i] !== c0) continue; var k = 1; while (k < n && buf[i + k] === str.charCodeAt(k)) k++; if (k === n) return i }
  return -1;
}
/* מוסיף לעמוד האחרון שדה חתימה חתום-בהמתנה (V) עם חותמת גלויה, ומחזיר את המזהה. את ה-hash מחשבים אחרי השמירה */
async function addSiteSig(L, out, id, sigBytes, pos){
  var pages = out.getPages(), page = pages[pages.length - 1], sz = page.getSize(), w = 220, h = 73, m = 36;
  var x = pos === 'left' ? m : pos === 'center' ? (sz.width - w) / 2 : sz.width - w - m, y = m, st = stGet();
  var c = document.createElement('canvas'); await stDraw(c, { logo: st.logo, name: st.name, title: st.title, line: st.line || 'נחתם דיגיטלית', date: true });
  var png = await out.embedPng(await toBytes(c, 'image/png')); page.drawImage(png, { x: x, y: y, width: w, height: h });
  try { var f = await out.embedFont(L.StandardFonts.Helvetica); page.drawText('Digitally signed via MyLuach  |  ID ' + id + '  |  myluach.org/verify', { x: x, y: y - 9, size: 6.5, font: f, color: L.rgb(.25, .25, .25) }) } catch (e) {}
  var ctx = out.context, N = L.PDFName;
  var br = ctx.obj([L.PDFNumber.of(0), L.PDFNumber.of(9999999999), L.PDFNumber.of(9999999999), L.PDFNumber.of(9999999999)]);
  var sig = ctx.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite', SubFilter: 'adbe.pkcs7.detached', ByteRange: br, Contents: L.PDFHexString.of(new Array(sigBytes * 2 + 1).join('0')), M: L.PDFString.fromDate(new Date()), Name: L.PDFHexString.fromText(st.name || 'MyLuach'), Reason: L.PDFString.of('Signed via MyLuach. ID: ' + id), Location: L.PDFString.of('myluach.org/verify') });
  var sref = ctx.register(sig);
  var widget = ctx.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: L.PDFString.of('MyLuachSiteSignature'), V: sref, Rect: [x, y, x + w, y + h], F: 132, P: page.ref });
  var ref = ctx.register(widget); page.node.addAnnot(ref);
  var form = out.catalog.lookupMaybe(N.of('AcroForm'), L.PDFDict);
  if (!form) { form = ctx.obj({ Fields: [] }); out.catalog.set(N.of('AcroForm'), form) }
  var fields = form.lookupMaybe(N.of('Fields'), L.PDFArray); if (!fields) { fields = ctx.obj([]); form.set(N.of('Fields'), fields) }
  fields.push(ref); form.set(N.of('SigFlags'), L.PDFNumber.of(3));
}
/* אחרי השמירה: מחשב את ה-SHA-256 של הקובץ בלי שדה החתימה, מבקש מהשרת חתימה ומחזיר את הקובץ החתום */
async function siteSign(bytes, t, id, sigBytes, pages){
  var zeros = '<' + new Array(sigBytes * 2 + 1).join('0') + '>', cs = findBytes(bytes, zeros);
  if (cs < 0) throw new Error('placeholder');
  var ce = cs + zeros.length, brk = findBytes(bytes, '/ByteRange'); if (brk < 0) throw new Error('byterange');
  var b0 = bytes.indexOf(91, brk), b1 = bytes.indexOf(93, brk), old = b1 - b0 + 1;
  var rng = '[0 ' + cs + ' ' + ce + ' ' + (bytes.length - ce) + ']'; if (rng.length > old) throw new Error('byterange size');
  while (rng.length < old) rng = rng.slice(0, -1) + ' ]';
  for (var i = 0; i < old; i++) bytes[b0 + i] = rng.charCodeAt(i);
  var all = new Uint8Array(cs + bytes.length - ce); all.set(bytes.subarray(0, cs), 0); all.set(bytes.subarray(ce), cs);
  var dg = Array.prototype.map.call(new Uint8Array(await crypto.subtle.digest('SHA-256', all)), function(x){ return ('0' + x.toString(16)).slice(-2) }).join('');
  var st = stGet(), r = await sgPost(t, { a: 'sign', id: id, digest: dg, name: st.name || '', org: st.title || '', pages: pages });
  if (!r.ok) throw new Error(r.message || 'sign');
  var hx = r.sig; if (hx.length > sigBytes * 2) throw new Error('size');
  for (var j = 0; j < hx.length; j++) bytes[cs + 1 + j] = hx.charCodeAt(j);
  return { bytes: bytes, ts: !!r.ts };
}
/* ---------- סימן מים והגבלות (העריכה החינמית) ---------- */
function wmarkCanvas(c, text){
  var x = c.getContext('2d'), s = Math.max(24, Math.round(Math.min(c.width, c.height) / 12));
  x.save(); x.globalAlpha = 0.22; x.fillStyle = '#444'; x.font = 'bold ' + s + 'px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 4); x.fillText(text, 0, 0); x.fillText(text, 0, s * 3); x.fillText(text, 0, -s * 3); x.restore();
}
async function wmarkPdf(L, out, pg, text, cache){
  if (!cache.wmFont) cache.wmFont = await out.embedFont(L.StandardFonts.HelveticaBold);
  var sz = pg.getSize(), size = Math.max(18, Math.round(Math.min(sz.width, sz.height) / 14)), t = /^[\x20-\x7e·]+$/.test(text) ? text : 'myluach.org';
  var w = cache.wmFont.widthOfTextAtSize(t, size), a = Math.PI / 4;
  [-2, 0, 2].forEach(function(k){
    pg.drawText(t, { x: sz.width / 2 - (w / 2) * Math.cos(a) + k * size * 1.6 * Math.sin(a), y: sz.height / 2 - (w / 2) * Math.sin(a) - k * size * 1.6 * Math.cos(a), size: size, font: cache.wmFont, color: L.rgb(0.3, 0.3, 0.3), opacity: 0.22, rotate: L.degrees(45) });
  });
}
/* אילו יכולות שמורות לתשלום בשימוש בקובץ הנוכחי (נשלח לשרת בהורדה) */
function usedFeats(mode){
  var f = {}, N = S.order.length;
  if (mode === 'flat') f.flat = 1;
  if (S.docs.length > 1) f.merge = 1;
  S.order.forEach(function(p){
    if (p.kind !== 'pdf') f.merge = 1;
    p.objs.forEach(function(o){ if (o.t === 'cover' && o.rp) f.replace = 1; if (o.t === 'img') { if (o.sig) f.sign = 1; else f.img = 1 } });
  });
  return { feats: Object.keys(f), pages: N };
}
async function exportImages(opt){
  var out = [], N = S.order.length, ext = opt.imgFmt === 'png' ? 'png' : 'jpg', mime = ext === 'png' ? 'image/png' : 'image/jpeg', pad = String(N).length;
  for (var n = 0; n < N; n++) {
    busy('מכין תמונה… עמוד ' + (n + 1) + ' מתוך ' + N);
    var p = S.order[n], c = rotCanvas(await rasterCanvas(p, opt.imgDpi), p.rot); if (opt.watermark) wmarkCanvas(c, opt.watermark);
    out.push({ name: ('0000' + (n + 1)).slice(-Math.max(2, pad)) + '.' + ext, bytes: await toBytes(c, mime, 0.95) }); c.width = c.height = 1;
    await new Promise(function(r){ setTimeout(r, 0) });
  }
  return { files: out, mime: mime, ext: ext };
}
function saveBlob(blob, name){
  var a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url) }, 60000);
}
async function embedAsset(L, out, cache, key){
  if (cache[key]) return cache[key]; var a = S.assets[key], im;
  try { im = /png/i.test(a.mime) ? await out.embedPng(a.bytes) : /jpe?g/i.test(a.mime) ? await out.embedJpg(a.bytes) : null } catch (e) { im = null }
  if (!im) { var c = document.createElement('canvas'); c.width = a.iw; c.height = a.ih; c.getContext('2d').drawImage(a.img, 0, 0); im = await out.embedPng(await toBytes(c, 'image/png')) }
  return cache[key] = im;
}

/* ---------- שכבת טקסט בלתי נראית (לסימון, העתקה וחיפוש) ---------- */
/* בוחר גופן עם כיסוי לכל התווים: קודם הגופן שנבחר (אם הוא מגופני האתר), ואז גופני האתר האחרים */
async function getTextFont(out, o, cache){
  var tc = cache.tf = cache.tf || {};
  var cps = Array.from(String(o.text)).filter(function(ch){ return /\S/.test(ch) }).map(function(ch){ return ch.codePointAt(0) });
  var names = [o.font].concat(MYL).filter(function(n, i, a){ return MY[n] && a.indexOf(n) === i }).slice(0, 8);
  for (var i = 0; i < names.length; i++) {
    var m = MY[names[i]], url = (o.bold && m.b) ? m.b : m.url;
    if (!(url in tc)) {
      try { var r = await fetch(url); if (!r.ok) throw 0; var bytes = new Uint8Array(await r.arrayBuffer()); tc[url] = { bytes: bytes, set: window.fontkit.create(bytes).characterSet, pdf: null } }
      catch (e) { tc[url] = null }
    }
    var f = tc[url]; if (!f) continue;
    var ok = cps.every(function(c){ return f.set.indexOf(c) >= 0 });
    if (!ok && i < names.length - 1) continue;
    if (!f.pdf) { try { f.pdf = await out.embedFont(f.bytes, { subset: true }) } catch (e) { tc[url] = null; continue } }
    return f;
  }
  return null;
}
/* שכבת טקסט בלתי נראית מעל תמונת הטקסט, באותו מיקום ובאותו רוחב */
async function textLayer(L, out, pg, o, b, cache){
  var f = await getTextFont(out, o, cache); if (!f) return;
  var font = f.pdf, key = pg.node.newFontDictionary(font.name, font.ref), L1 = lay(o, 1);
  var ops = [L.pushGraphicsState(), L.beginText(), L.setFontAndSize(key, o.size), L.setTextRenderingMode(L.TextRenderingMode.Invisible)];
  L1.lines.forEach(function(line, i){
    var txt = Array.from(line).map(function(ch){ return f.set.indexOf(ch.codePointAt(0)) >= 0 ? ch : ' ' }).join('');
    if (!txt.trim()) return;
    if (REV_RTL && isRtl(txt)) txt = Array.from(txt).reverse().join('');
    setFont(mctx, o, 1);
    var target = mctx.measureText(line).width, meas = font.widthOfTextAtSize(txt, o.size);
    var tz = meas > 0 ? clamp(target / meas * 100, 20, 500) : 100;
    var x = o.align === 'right' ? b.x + L1.w - target : o.align === 'center' ? b.x + (L1.w - target) / 2 : b.x;
    ops.push(L.setTextMatrix(1, 0, 0, -1, x, b.y + i * L1.lh + L1.base), L.setCharacterSqueeze(tz), L.showText(font.encodeText(txt)));
  });
  ops.push(L.endText(), L.popGraphicsState());
  pg.pushOperators.apply(pg, ops);
}
function coverRects(p){ return p.objs.filter(function(o){ return o.t === 'cover' }) }
function hitsCover(rects, x0, y0, x1, y1){
  return rects.some(function(r){ return x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y });
}
function invisibleRuns(L, pg, f, runs){
  var font = f.pdf, key = pg.node.newFontDictionary(font.name, font.ref), ops = [L.pushGraphicsState(), L.beginText(), L.setTextRenderingMode(L.TextRenderingMode.Invisible)];
  runs.forEach(function(r){
    var txt = Array.from(r.s).map(function(ch){ return f.set.indexOf(ch.codePointAt(0)) >= 0 ? ch : ' ' }).join('');
    if (!txt.trim()) return;
    var meas = font.widthOfTextAtSize(txt, r.size), tz = meas > 0 ? clamp(r.w / meas * 100, 20, 500) : 100;
    ops.push(L.setFontAndSize(key, r.size), L.setTextMatrix(1, 0, 0, -1, r.x, r.base), L.setCharacterSqueeze(tz), L.showText(font.encodeText(txt)));
  });
  ops.push(L.endText(), L.popGraphicsState()); pg.pushOperators.apply(pg, ops);
}
/* שכבת טקסט בלתי נראית לטקסט המקורי שנשאר, בלי האותיות שנמצאות מתחת לכיסויים */
async function origTextLayer(L, out, pg, p, cache){
  if (p.kind !== 'pdf') return;
  var rects = coverRects(p);
  if (!p.tc) p.tc = await p.pg.getTextContent();
  var U = pdfjs.Util, runs = [], all = '';
  p.tc.items.forEach(function(it){
    if (!it.str || !it.str.trim() || !(it.width > 0)) return;
    var m = U.transform(p.vt, it.transform); if (Math.abs(m[1]) > 0.05 * Math.abs(m[0]) || m[0] <= 0) return;
    var chars = Array.from(it.str), n = chars.length, fh = Math.hypot(m[2], m[3]), cw = it.width / n, seg = null;
    for (var i = 0; i <= n; i++) {
      var cut = i === n;
      if (!cut) { var cx = m[4] + cw * (i + 0.5); cut = hitsCover(rects, cx, m[5] - fh, cx, m[5] + fh * 0.3) }
      if (!cut) { if (!seg) seg = { s: '', x: m[4] + cw * i, base: m[5], size: fh, w: 0 }; seg.s += chars[i]; seg.w += cw }
      else if (seg) { runs.push(seg); all += seg.s; seg = null }
    }
  });
  if (!runs.length) return;
  var f = await getTextFont(out, { text: all, font: DEF.font, bold: false }, cache); if (!f) return;
  invisibleRuns(L, pg, f, runs);
}

async function overlay(L, out, pg, p, dpi, cache){
  if (!p.objs.length) return;
  pg.node.normalize();
  var v = p.vt, det = v[0] * v[3] - v[1] * v[2], col = function(h){ var c = rgbOf(h); return L.rgb(c[0] / 255, c[1] / 255, c[2] / 255) };
  pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(v[3] / det, -v[1] / det, -v[2] / det, v[0] / det, (v[2] * v[5] - v[3] * v[4]) / det, (v[1] * v[4] - v[0] * v[5]) / det));
  function image(im, x, y, w, h){ var nm = pg.node.newXObject('MlIm', im.ref); pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(w, 0, 0, -h, x, y + h), L.drawObject(nm), L.popGraphicsState()) }
  for (var i = 0; i < p.objs.length; i++) {
    var o = p.objs[i];
    if (o.t === 'cover') pg.pushOperators(L.pushGraphicsState(), L.setFillingColor(col(o.fill)), L.rectangle(o.x, o.y, o.w, o.h), L.fill(), L.popGraphicsState());
    else if (o.t === 'hl') pg.drawRectangle({ x: o.x, y: o.y, width: o.w, height: o.h, color: col(o.fill), opacity: 0.45, blendMode: L.BlendMode.Multiply });
    else if (o.t === 'rect') pg.drawRectangle({ x: o.x, y: o.y, width: o.w, height: o.h, borderColor: col(o.stroke), borderWidth: o.sw });
    else if (o.t === 'ell') pg.drawEllipse({ x: o.x + o.w / 2, y: o.y + o.h / 2, xScale: o.w / 2, yScale: o.h / 2, borderColor: col(o.stroke), borderWidth: o.sw });
    else if (o.t === 'img') image(await embedAsset(L, out, cache, o.key), o.x, o.y, o.w, o.h);
    else if (o.t === 'text') {
      if (!o.text.trim()) continue;
      var b = tbox(o), pad = o.size * 0.4 + Math.abs(o.ls), k = dpi / 72, mx = 40e6, W = b.w + pad * 2, H = b.h + pad * 2;
      if (W * H * k * k > mx) k = Math.sqrt(mx / (W * H));
      var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(W * k)); c.height = Math.max(1, Math.ceil(H * k));
      drawText(c.getContext('2d'), o, k, pad * k, pad * k);
      image(await out.embedPng(await toBytes(c, 'image/png')), b.x - pad, b.y - pad, c.width / k, c.height / k); c.width = c.height = 1;
      if (cache.fk) { try { await textLayer(L, out, pg, o, b, cache) } catch (e) { if (window.console) console.error(e) } }
    } else {
      var ops = [L.pushGraphicsState(), L.setStrokingColor(col(o.stroke)), L.setLineWidth(o.sw), L.setLineCap(L.LineCapStyle.Round), L.setLineJoin(L.LineJoinStyle.Round)];
      if (o.t === 'pen') { o.pts.forEach(function(q, j){ ops.push(j ? L.lineTo(q[0], q[1]) : L.moveTo(q[0], q[1])) }); if (o.pts.length === 1) ops.push(L.lineTo(o.pts[0][0] + 0.01, o.pts[0][1])) }
      else { ops.push(L.moveTo(o.x1, o.y1), L.lineTo(o.x2, o.y2)); if (o.t === 'arrow') arrowPts(o).forEach(function(s){ ops.push(L.moveTo(s[0], s[1]), L.lineTo(o.x2, o.y2)) }) }
      ops.push(L.stroke(), L.popGraphicsState()); pg.pushOperators.apply(pg, ops);
    }
  }
  pg.pushOperators(L.popGraphicsState());
}
async function checkEnc(L){
  for (var i = 0; i < S.docs.length; i++) { var d = S.docs[i]; if (d.enc === null) { try { await L.PDFDocument.load(d.bytes, { updateMetadata: false }); d.enc = false } catch (e) { d.enc = true } } }
}
async function exportPdf(opt){
  var L = await loadPdfLib(); await checkEnc(L);
  var fonts = {}; S.order.forEach(function(p){ p.objs.forEach(function(o){ if (o.t === 'text') fonts[o.font] = 1 }) });
  await Promise.all(Object.keys(fonts).map(ensureFont));
  var used = {}; S.order.forEach(function(p){ if (p.kind === 'pdf' && !S.docs[p.di].enc) (used[p.di] = used[p.di] || []).push(p.n - 1) });
  var baseI = used[0] ? 0 : -1, out, orig = [], libs = {}, copies = {}, cache = {};
  if (baseI === 0) { out = await L.PDFDocument.load(S.docs[0].bytes, { updateMetadata: false }); orig = out.getPages().slice(); for (var i = out.getPageCount() - 1; i >= 0; i--) out.removePage(i) }
  else out = await L.PDFDocument.create();
  var fk = opt.legacy ? null : await loadFontkit(); if (fk) { out.registerFontkit(fk); cache.fk = true }
  for (var di in used) { if (+di === baseI) continue; libs[di] = await L.PDFDocument.load(S.docs[di].bytes, { updateMetadata: false }); var idx = used[di].filter(function(v, j, a){ return a.indexOf(v) === j }), cp = await out.copyPages(libs[di], idx); copies[di] = {}; idx.forEach(function(v, j){ copies[di][v] = cp[j] }) }
  for (var n = 0; n < S.order.length; n++) {
    var p = S.order[n], pg; busy('מכין את הקובץ… עמוד ' + (n + 1) + ' מתוך ' + S.order.length);
    var enc = p.kind === 'pdf' && S.docs[p.di].enc, cov = !opt.legacy && p.kind !== 'blank' && coverRects(p).length > 0;
    var flat = enc || (opt.flat && p.objs.length > 0) || cov;
    if (flat) {
      pg = out.addPage([p.w, p.h]);
      var im = await out.embedJpg(await raster(p, (opt.flat || enc) ? opt.flatDpi : opt.dpi));
      pg.drawImage(im, { x: 0, y: 0, width: p.w, height: p.h });
      if (cache.fk && !opt.flat && !enc) {
        pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(1, 0, 0, -1, 0, p.h));
        try {
          await origTextLayer(L, out, pg, p, cache);
          for (var ti = 0; ti < p.objs.length; ti++) { var to = p.objs[ti]; if (to.t === 'text' && to.text.trim()) await textLayer(L, out, pg, to, tbox(to), cache) }
        } catch (e) { if (window.console) console.error(e) }
        pg.pushOperators(L.popGraphicsState());
      }
      if (p.rot) pg.setRotation(L.degrees(p.rot));
    }
    else {
      if (p.kind === 'pdf') { pg = +p.di === baseI ? orig[p.n - 1] : copies[p.di][p.n - 1]; out.addPage(pg) }
      else { pg = out.addPage([p.w, p.h]); if (p.kind === 'image') pg.drawImage(await embedAsset(L, out, cache, p.key), { x: 0, y: 0, width: p.w, height: p.h }) }
      await overlay(L, out, pg, p, opt.dpi, cache);
      if (p.rot) pg.setRotation(L.degrees((pg.getRotation().angle + p.rot) % 360));
    }
    if (opt.watermark) { try { await wmarkPdf(L, out, pg, opt.watermark, cache) } catch (e) { if (window.console) console.error(e) } }
    await new Promise(function(r){ setTimeout(r, 0) });
  }
  if (opt.sigField) { try { await addSigField(L, out, Object.assign({}, opt.sigField, { lift: opt.csig ? 100 : 0 })) } catch (e) { if (window.console) console.error(e) } }
  if (opt.csig) {
    await addSiteSig(L, out, opt.csig.id, opt.csig.sigBytes, opt.csig.pos);
    var raw = await out.save({ useObjectStreams: false }), res = await siteSign(raw, opt.csig.t, opt.csig.id, opt.csig.sigBytes, S.order.length);
    window.__mlSigTs = res.ts; return res.bytes;
  }
  return await out.save();
}
async function openDl(){
  endEdit(); busy('רגע…');
  try { await checkEnc(await loadPdfLib()) } catch (e) { busy(''); hint('לא הצלחנו לטעון את רכיב השמירה. בדקו את החיבור לאינטרנט ונסו שוב.'); return }
  busy('');
  var enc = S.docs.some(function(d){ return d.enc }), note = $('dlNote');
  note.hidden = !enc; note.textContent = enc ? 'הקובץ המקורי מוגן, ולכן העמודים שלו יישמרו כתמונה באיכות שנבחרה ב"מחיקה סופית".' : '';
  $('dlName').value = S.name + '-ערוך'; if ($('dlCSig')) { if (!window.__mlSigPub) fetch('/api/pricing?c=_sign&a=pub').then(function(r){ return r.json() }).then(function(j){ window.__mlSigPub = j || {}; $('dlCSigW').hidden = !j.on }).catch(function(){}); else $('dlCSigW').hidden = !window.__mlSigPub.on }
  $('dlDlg').showModal();
}
async function doDl(){
  var mode = document.querySelector('input[name=dlMode]:checked').value;
  var opt = { dpi: +$('dlQ').value || 600, mode: mode, flat: mode === 'flat', legacy: mode === 'legacy', flatDpi: +$('dlFlatQ').value || 300, imgFmt: $('dlImgFmt').value, imgDpi: +$('dlImgQ').value || 200, sigField: (mode !== 'img' && $('dlSig').checked) ? { pos: $('dlSigPos').value } : null };
  var base = ($('dlName').value.trim() || 'document').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\.(pdf|zip|png|jpe?g)$/i, '');
  $('dlDlg').close();
  if (window.__mlGate) {
    var uf = usedFeats(mode); if (opt.sigField && uf.feats.indexOf('sign') < 0) uf.feats.push('sign'); if (mode !== 'img' && $('dlCSig') && $('dlCSig').checked) uf.feats.push('csign'); var g = await window.__mlGate.check(uf.feats, uf.pages, String(S.hi) + ':' + S.order.length + ':' + mode);
    if (!g.ok) { if (g.msg) hint(g.msg); return }
    if (g.mode === 'watermark') opt.watermark = g.mark || 'MyLuach · myluach.org';
    if (g.note) setTimeout(function(){ hint(g.note) }, 50);
  }
  if (mode !== 'img' && $('dlCSig') && $('dlCSig').checked) {
    var tk = window.__mlGate ? await window.__mlGate.token() : ''; if (!tk) { hint('כדי לחתום בחתימה מוצפנת צריך להיכנס.'); return }
    var pr = await sgPost(tk, { a: 'prepare' });
    if (!pr.ok) { hint(pr.message || 'לא הצלחנו להתחיל חתימה. נסו שוב.'); return }
    opt.csig = { id: pr.id, sigBytes: pr.sigBytes, t: tk, pos: $('dlSigPos').value };
  }
  busy('מכין את הקובץ…');
  try {
    if (mode === 'img') {
      var r = await exportImages(opt), nm;
      if (r.files.length === 1) { nm = base + '.' + r.ext; saveBlob(new Blob([r.files[0].bytes], { type: r.mime }), nm) }
      else { nm = base + '.zip'; r.files.forEach(function(f){ f.name = base + '-' + f.name }); saveBlob(makeZip(r.files), nm) }
      S.dirty = false; hint('הקובץ ירד למחשב: ' + nm);
    } else {
      var bytes = await exportPdf(opt), name = base + '.pdf';
      saveBlob(new Blob([bytes], { type: 'application/pdf' }), name);
      S.dirty = false; window.__mlPdfLast = bytes; hint('הקובץ ירד למחשב: ' + name + (opt.csig ? (window.__mlSigTs ? '. נחתם בחתימה מוצפנת, עם חותמת זמן.' : '. נחתם בחתימה מוצפנת, אבל חותמת הזמן לא הצטרפה (שרת חותמות הזמן לא ענה).') : ''));
    }
  } catch (e) { if (window.console) console.error(e); hint('משהו השתבש בהכנת הקובץ. נסו שוב, ואם זה חוזר בחרו באיכות נמוכה יותר.') }
  busy('');
}

/* ---------- חיבור הכפתורים ---------- */
function init(){
  fillFonts(); loadCatalog();
  if (!HAS_LS) $('lsWrap').hidden = true;
  $('pick').onclick = function(){ $('file').click() };
  $('file').onchange = function(){ openFile(this.files[0]); this.value = '' };
  var dz = $('drop');
  ['dragenter', 'dragover'].forEach(function(n){ document.addEventListener(n, function(e){ if (!$('ed').hidden) return; e.preventDefault(); dz.classList.add('over') }) });
  ['dragleave', 'drop'].forEach(function(n){ document.addEventListener(n, function(e){ if (!$('ed').hidden) return; e.preventDefault(); dz.classList.remove('over'); if (n === 'drop' && e.dataTransfer && e.dataTransfer.files[0]) openFile(e.dataTransfer.files[0]) }) });
  Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function(b){ b.onclick = function(){ setTool(b.dataset.tool) } });
  desk.addEventListener('pointerdown', down); document.addEventListener('keydown', key);
  $('fFont').onchange = function(){ setProp('font', this.value); ensureFont(this.value) };
  $('fSize').oninput = function(){ var v = parseFloat(this.value); if (v >= 3 && v <= 400) setPropQuiet('size', v) };
  $('fColor').oninput = function(){ setPropQuiet('color', this.value) };
  $('fB').onclick = function(){ setProp('bold', this.getAttribute('aria-pressed') !== 'true') };
  $('fI').onclick = function(){ setProp('italic', this.getAttribute('aria-pressed') !== 'true') };
  $('fAlign').onchange = function(){ setProp('align', this.value) };
  $('fLs').oninput = function(){ var v = parseFloat(this.value); if (v >= -5 && v <= 60) setPropQuiet('ls', v) };
  $('cFill').oninput = function(){ if (S.sel) { if (S.sel.o.t === 'hl') { DEF.hlc = this.value; saveDef() } setPropQuiet('fill', this.value) } };
  $('cStroke').oninput = function(){ DEF.stroke = this.value; saveDef(); setPropQuiet('stroke', this.value) };
  $('cSw').oninput = function(){ var v = parseFloat(this.value); if (v > 0 && v <= 40) { DEF.sw = v; saveDef(); setPropQuiet('sw', v) } };
  function setPropQuiet(k, v){ var o = S.sel && S.sel.o; if (k in DEF && (!o || o.t === 'text')) { DEF[k] = v; saveDef() } if (o && k in o) { o[k] = v; drawObjs(S.sel.p); commitSoon() } }
  if (window.EyeDropper) { $('bDrop').hidden = false; $('bDrop').onclick = function(){ new window.EyeDropper().open().then(function(r){ if (S.sel && r && r.sRGBHex) { $('cFill').value = r.sRGBHex; setPropQuiet('fill', r.sRGBHex) } }, function(){}) } }
  if (window.queryLocalFonts) { $('bLocal').hidden = false; $('bLocal').onclick = function(){ window.queryLocalFonts().then(function(fs){ var seen = {}; allFonts().forEach(function(n){ seen[n] = 1 }); fs.forEach(function(f){ if (!seen[f.family]) { seen[f.family] = 1; LOCAL.push(f.family) } }); LOCAL.sort(); fillFonts(); updateProps(); $('bLocal').hidden = true; hint('נוספו ' + LOCAL.length + ' גופנים מהמחשב לרשימת הגופנים.') }, function(){ hint('כדי להציג את הגופנים שבמחשב צריך לאשר את הבקשה של הדפדפן.') }) } }
  $('bFront').onclick = function(){ order(true) }; $('bBack').onclick = function(){ order(false) }; $('bDup').onclick = dup; $('bDel').onclick = function(){ endEdit(true); removeSel() };
  $('bUndo').onclick = function(){ restore(S.hi - 1) }; $('bRedo').onclick = function(){ restore(S.hi + 1) };
  $('zIn').onclick = function(){ setZoom(S.zoom * 1.25) }; $('zOut').onclick = function(){ setZoom(S.zoom / 1.25) }; $('zFit').onclick = function(){ fitZoom(false) };
  var mAdd = $('mAdd'), bAdd = $('bAdd');
  bAdd.onclick = function(e){ e.stopPropagation(); mAdd.hidden = !mAdd.hidden; bAdd.setAttribute('aria-expanded', String(!mAdd.hidden)) };
  document.addEventListener('click', function(){ if (!mAdd.hidden) { mAdd.hidden = true; bAdd.setAttribute('aria-expanded', 'false') } });
  mAdd.onclick = function(e){ var k = e.target.dataset && e.target.dataset.add; if (!k) return; endEdit(); if (k === 'blank') addPages('blank'); else $(k === 'pdf' ? 'fileAdd' : 'fileImgPg').click() };
  $('fileAdd').onchange = function(){ addPages('pdf', Array.prototype.slice.call(this.files)); this.value = '' };
  $('fileImgPg').onchange = function(){ addPages('img', Array.prototype.slice.call(this.files)); this.value = '' };
  $('bImg').onclick = function(){ $('fileImg').click() };
  $('fileImg').onchange = function(){ if (this.files[0]) placeImage(this.files[0]); this.value = '' };
  $('bNew').onclick = function(){ if (!S.dirty || window.confirm('השינויים שלא הורדתם יימחקו. להמשיך?')) { S.dirty = false; location.reload() } };
  $('bSave').onclick = openDl; $('dlGo').onclick = doDl;
  Array.prototype.forEach.call(document.querySelectorAll('dialog [data-close]'), function(b){ b.onclick = function(){ b.closest('dialog').close() } });
  sigInit(); stInit();
  window.addEventListener('beforeunload', function(e){ if (S.dirty) { e.preventDefault(); e.returnValue = '' } });
  /* טעינה מוקדמת של הספריות, כדי שהפתיחה תהיה מיידית */
  setTimeout(function(){ loadPdfjs().catch(function(){}) }, 600);
  window.__mlPdf = { S: S, openFile: openFile, exportPdf: exportPdf, smart: smart };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
