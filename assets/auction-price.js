/* מכירה סינית: חישוב המחיר לפי המוצרים, הכמויות והחבילה. מקור אחד לדפדפן (window.AuctionPrice) ולשרת (api/_auction_core.js) */
(function (root) {
'use strict';
const r2 = n => Math.round(n * 100) / 100;
const MAXQ = 5000;

/* אילו מוצרים החבילה מכסה: רשימת מזהים, או הכול */
const covers = (pkg, id) => !Array.isArray(pkg.products) || !pkg.products.length || pkg.products.map(String).includes(String(id));

/* products: [{id, price, active, cfg}], pkg: שורת חבילה או null, items: [{p, n}]
   מחזיר { amount, count, lines: [{p, n, pkg}], left, pkgPrice, extra } או { error } */
function price(products, pkg, items) {
  const P = new Map((products || []).filter(p => p.active !== false).map(p => [String(p.id), p]));
  const want = new Map();
  for (const it of items || []) {
    const id = String(it && it.p), n = Math.floor(Number(it && it.n));
    if (!(n > 0)) continue;
    if (!P.has(id)) return { error: 'product', message: 'אחד המוצרים לא קיים במכירה' };
    want.set(id, (want.get(id) || 0) + n);
    if (want.get(id) > MAXQ) return { error: 'qty', message: 'כמות הכרטיסים גדולה מדי' };
  }
  for (const [id, n] of want) { const mx = +((P.get(id).cfg || {}).maxPer) || 0; if (mx && n > mx) return { error: 'max', message: 'אפשר לקנות עד ' + mx + ' כרטיסים למוצר "' + P.get(id).name + '"', p: id }; }
  const lines = new Map(); /* id → { n, pkg } */
  const add = (id, n, fromPkg) => { const L = lines.get(id) || { n: 0, pkg: 0 }; L.n += n; if (fromPkg) L.pkg += n; lines.set(id, L); };
  let extra = 0, left = null;
  const kind = pkg ? pkg.kind : '';
  if (!pkg) { for (const [id, n] of want) { add(id, n, false); extra += n * +P.get(id).price; } }
  else if (kind === 'free') {
    /* החבילה מכסה קודם את הכרטיסים היקרים (לטובת הרוכש). מה שמעבר לכמות, או מוצר שהחבילה לא חלה עליו: במחיר רגיל */
    let q = Math.max(0, Math.floor(+pkg.qty || 0));
    const order = [...want].sort((a, b) => +P.get(b[0]).price - +P.get(a[0]).price);
    for (const [id, n] of order) {
      const c = covers(pkg, id) ? Math.min(n, q) : 0;
      if (c) { add(id, c, true); q -= c; }
      if (n - c) { add(id, n - c, false); extra += (n - c) * +P.get(id).price; }
    }
    left = { tickets: q };
  } else if (kind === 'fixed') {
    /* הרכב קבוע: מה שהוגדר בחבילה (או כרטיס אחד בכל מוצר שהחבילה חלה עליו). כל מה שנבחר בנוסף: במחיר רגיל */
    const comp = Array.isArray(pkg.comp) && pkg.comp.length ? pkg.comp : [...P.keys()].filter(id => covers(pkg, id)).map(id => ({ p: id, n: 1 }));
    for (const c of comp) { const id = String(c.p), n = Math.floor(+c.n || 0); if (P.has(id) && n > 0) add(id, n, true); }
    for (const [id, n] of want) { add(id, n, false); extra += n * +P.get(id).price; }
  } else if (kind === 'credit') {
    /* לפי שווי: הכרטיסים של המוצרים שהחבילה חלה עליהם יורדים מהשווי. מה שמעבר: בתשלום רגיל */
    let cr = Math.max(0, +pkg.credit || 0);
    const order = [...want].sort((a, b) => +P.get(b[0]).price - +P.get(a[0]).price);
    for (const [id, n] of order) {
      const pr = +P.get(id).price, c = covers(pkg, id) && pr > 0 ? Math.min(n, Math.floor(cr / pr + 1e-9)) : (covers(pkg, id) && !pr ? n : 0);
      if (c) { add(id, c, true); cr = r2(cr - c * pr); }
      if (n - c) { add(id, n - c, false); extra += (n - c) * pr; }
    }
    left = { credit: cr };
  } else return { error: 'pkg', message: 'החבילה לא תקינה' };
  const out = [...lines].map(([p, L]) => ({ p, n: L.n, pkg: L.pkg }));
  const count = out.reduce((s, L) => s + L.n, 0);
  if (!count) return { error: 'empty', message: 'לא נבחרו כרטיסים' };
  const pkgPrice = pkg ? +pkg.price || 0 : 0;
  return { amount: r2(pkgPrice + extra), count, lines: out, left, pkgPrice, extra: r2(extra) };
}

var api = { price: price, covers: covers };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AuctionPrice = api;
})(typeof window !== 'undefined' ? window : this);
