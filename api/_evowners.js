/* קישור בין אירועים (דפי הזמנה) לחשבון משתמש (מייל), כדי שבעל אירוע יראה את כל האירועים שלו מכל מכשיר.
   נשמר בהגדרה אחת (settings.evowners): { כתובת-האירוע: מייל }. */
const { loadSetting, saveSetting } = require('./_lib');
const norm = e => String(e || '').trim().toLowerCase();
async function all() { return (await loadSetting('evowners').catch(() => null)) || {}; }
async function set(slug, email) {
  email = norm(email); if (!slug || !email) return;
  const O = await all(); if (O[slug] === email) return;
  O[slug] = email; await saveSetting('evowners', O);
}
async function of(email) { email = norm(email); const O = await all(); return Object.keys(O).filter(s => O[s] === email); }
module.exports = { set, of, all, norm };

/* ===== מאגר אנשי קשר לכל חשבון (נשמר ב-R2: timers/contacts/<hash>.json) =====
   איש קשר: { id, n: שם, e: מייל, p: טלפון, g: קבוצה }. מזהים כפולים לפי מייל או טלפון. */
const crypto = require('crypto');
const ckey = email => 'timers/contacts/' + crypto.createHash('sha256').update(norm(email)).digest('hex').slice(0, 40) + '.json';
async function cget(email) {
  const R2 = require('./_r2'); const r = await fetch(R2.presign('GET', ckey(email), 120));
  if (r.status === 404) return { c: [] }; if (!r.ok) throw new Error('r2 ' + r.status);
  const d = await r.json(); d.c = d.c || []; return d;
}
async function cput(email, doc) {
  const R2 = require('./_r2'); const r = await fetch(R2.presign('PUT', ckey(email), 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
  if (!r.ok) throw new Error('r2 put ' + r.status);
}
const phn = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0(5\d{8}|[2-9]\d{7})$/.test(v) ? v : ''; };
const mailn = v => { v = String(v || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && !/@phone\.invalid$/.test(v) ? v : ''; };
function upsert(doc, list) {
  const idx = {}; doc.c.forEach(x => { if (x.e) idx['e:' + x.e] = x; if (x.p) idx['p:' + x.p] = x; });
  let add = 0, upd = 0;
  (list || []).forEach(x => {
    const e = mailn(x.email || x.e), p = phn(x.phone || x.p), n = String(x.name || x.n || '').trim().slice(0, 80), g = String(x.grp || x.g || '').trim().slice(0, 40);
    if (!e && !p) return;
    let c = (e && idx['e:' + e]) || (p && idx['p:' + p]);
    if (c) { let ch = false; if (!c.n && n) { c.n = n; ch = true; } if (!c.e && e) { c.e = e; ch = true; } if (!c.p && p) { c.p = p; ch = true; } if (!c.g && g) { c.g = g; ch = true; } if (ch) upd++; }
    else { c = { id: crypto.randomBytes(5).toString('hex'), n, e, p, g }; doc.c.push(c); if (e) idx['e:' + e] = c; if (p) idx['p:' + p] = c; add++; }
  });
  return { add, upd };
}
module.exports.cget = cget; module.exports.cput = cput; module.exports.upsert = upsert;
