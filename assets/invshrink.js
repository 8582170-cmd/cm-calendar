/* הקטנת קובץ הזמנה לפני צירוף למייל, כולה בדפדפן (הקובץ המקורי לא נשלח לשרת).
   תמונה: נשמרת כ-JPEG באיכות גבוהה, ומוקטנת רק כמה שצריך.
   PDF: כל עמוד מצויר ברזולוציה גבוהה (PDF.js) ונבנה מחדש כ-PDF קל (pdf-lib). הטקסט נשאר חד לקריאה ולהדפסה ביתית, אבל כבר אינו ניתן לסימון.
   הספריות נטענות קודם מ-jsdelivr, ואם זה נחסם (נטפרי וכו') דרך /cdn של האתר, כמו בעורך ה-PDF.
   שימוש: invShrink(file, limitBytes) → Promise<File> (אם הקובץ כבר קטן מהמגבלה הוא חוזר כמו שהוא). */
(function(){
'use strict';
var PDFJS_V = '6.2.108', PDFLIB_V = '1.17.1', BASES = ['https://cdn.jsdelivr.net/npm/', '/cdn/npm/'], MAXPAGES = 12;
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
function jpegBlob(cv, q){ return new Promise(function(res, rej){ cv.toBlob(function(b){ b ? res(b) : rej(new Error('blob')) }, 'image/jpeg', q) }) }
function canvasOf(w, h){ var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }
function baseName(n){ return String(n || 'invitation').replace(/\.[a-z0-9]{2,5}$/i, '') || 'invitation' }

/* תמונה: קודם מורידים מעט איכות (0.92 → 0.74), ורק אחר כך מקטינים את המידות בצעדים קטנים */
async function shrinkImage(file, limit){
  var url = URL.createObjectURL(file), im = new Image();
  try { await new Promise(function(res, rej){ im.onload = res; im.onerror = function(){ rej(new Error('image')) }; im.src = url }) } finally { URL.revokeObjectURL(url) }
  var W = im.naturalWidth, H = im.naturalHeight, side = Math.min(Math.max(W, H), 3000), best = null;
  for (var round = 0; round < 8; round++) {
    var k = side / Math.max(W, H), cv = canvasOf(W * k, H * k), ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, 0, 0, cv.width, cv.height);
    for (var q = 0.92; q >= 0.73; q -= 0.06) { best = await jpegBlob(cv, q); if (best.size <= limit) return new File([best], baseName(file.name) + '.jpg', { type: 'image/jpeg' }) }
    side = Math.round(side * 0.85); if (side < 900) break;
  }
  if (best && best.size <= limit * 1.25) return new File([best], baseName(file.name) + '.jpg', { type: 'image/jpeg' });
  throw new Error('still-big');
}

/* PDF: מציירים כל עמוד ובונים PDF חדש. מתחילים מרזולוציה גבוהה ויורדים רק אם הקובץ עדיין כבד */
async function shrinkPdf(file, limit){
  var lib = await loadPdfjs(), L = await loadPdfLib(), buf = new Uint8Array(await file.arrayBuffer());
  var doc = await lib.getDocument({ data: buf, cMapUrl: pdfRoot + 'cmaps/', cMapPacked: true, standardFontDataUrl: pdfRoot + 'standard_fonts/', wasmUrl: pdfRoot + 'wasm/', iccUrl: pdfRoot + 'iccs/' }).promise;
  if (doc.numPages > MAXPAGES) throw new Error('pages');
  var pages = []; for (var n = 1; n <= doc.numPages; n++) { var pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }); pages.push({ pg: pg, w: vp.width, h: vp.height }) }
  var per = limit / pages.length * 0.97;
  /* צד ארוך בפיקסלים ואיכות: מהגבוה לנמוך. 2200 פיקסלים לעמוד A5 הם כ-270 נקודות לאינץ' */
  var TRY = [[2200, 0.9], [2200, 0.82], [1900, 0.84], [1600, 0.84], [1600, 0.76], [1300, 0.8], [1100, 0.78]], out = null;
  for (var t = 0; t < TRY.length; t++) {
    var blobs = [], total = 0, ok = true;
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i], k = TRY[t][0] / Math.max(p.w, p.h), cv = canvasOf(p.w * k, p.h * k), ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await p.pg.render({ canvasContext: ctx, canvas: cv, viewport: p.pg.getViewport({ scale: cv.width / p.w }) }).promise;
      var b = await jpegBlob(cv, TRY[t][1]); blobs.push(b); total += b.size;
      if (total > limit * 0.97 && t < TRY.length - 1) { ok = false; break }
    }
    if (!ok) continue;
    var pdf = await L.PDFDocument.create();
    for (var j = 0; j < pages.length; j++) { var im = await pdf.embedJpg(new Uint8Array(await blobs[j].arrayBuffer())), pp = pdf.addPage([pages[j].w, pages[j].h]); pp.drawImage(im, { x: 0, y: 0, width: pages[j].w, height: pages[j].h }) }
    out = await pdf.save();
    if (out.length <= limit || t === TRY.length - 1) break;
  }
  try { doc.destroy() } catch (e) {}
  if (!out || out.length > limit * 1.25) throw new Error('still-big');
  return new File([out], baseName(file.name) + '.pdf', { type: 'application/pdf' });
}

window.invShrink = async function(file, limit){
  limit = limit || 2e6;
  if (!file || file.size <= limit) return file;
  if (/^image\/(jpeg|png)$/.test(file.type)) return shrinkImage(file, limit);
  if (file.type === 'application/pdf') return shrinkPdf(file, limit);
  throw new Error('type');
};
})();
