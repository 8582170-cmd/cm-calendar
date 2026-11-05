/* שעוני ספירה לאחור עם כתובת קבועה: www.myluach.org/t/<כתובת>
   נשמרים ב-Cloudflare R2 (הדלי הפרטי) בנתיב timers/<כתובת>.json. מי שיצר מקבל קוד עריכה (נשמר אצלו בדפדפן), ורק איתו אפשר לעדכן.
   GET  ?c=_timer&s=<כתובת>           → ההגדרות (בלי קוד העריכה), או 404
   GET  ?c=_timer&s=<כתובת>&check=1   → {free}
   POST {slug, cfg, token?}            → יצירה (אם פנוי) או עדכון (עם קוד העריכה) */
'use strict';
const crypto = require('node:crypto');
const { readBody, json } = require('./_lib');

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['admin', 'api', 'new', 'edit', 'test', 'timer', 'myluach', 'www', 'login', 'null', 'undefined']);
const key = s => 'timers/' + s + '.json';
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
/* תמונה מותרת רק מהדלי הציבורי שלנו (שהועלתה דרך הבונה) */
function okImg(u) { u = String(u || ''); const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })();
  return u.length < 300 && /\/timers\/img\/[0-9]{6}\/[a-f0-9]{24}\.jpg$/.test(u) && (u.startsWith('https://media.myluach.org/') || (M && u.startsWith(M.url + '/'))); }
/* העלאת תמונה: עד 20 לשעה מכל כתובת IP, עד 400KB, רק JPEG (הדפדפן מקטין וממיר לפני ההעלאה) */
async function upload(req, res, b) {
  const R2 = require('./_r2'); if (!R2.media()) return json(res, 503, { error: 'storage' });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'type' });
  const buf = Buffer.from(m[1], 'base64'); if (buf.length > 400000) return json(res, 413, { error: 'size' });
  if (!(buf[0] === 0xFF && buf[1] === 0xD8)) return json(res, 400, { error: 'type' });
  const ip = ((require('./_lib').reqMeta(req) || {}).ip || 'x').replace(/[^0-9a-f.:]/gi, '').slice(0, 45), hr = new Date().toISOString().slice(0, 13).replace(/\D/g, '');
  const rk = 'timers/rl/' + hr + '/' + ip.replace(/:/g, '_') + '.json';
  let n = 0; try { const r = await fetch(R2.presign('GET', rk, 60)); if (r.ok) n = (await r.json()).n || 0; } catch (e) {}
  if (n >= 20) return json(res, 429, { error: 'rate' });
  const path = 'timers/img/' + new Date().toISOString().slice(0, 7).replace('-', '') + '/' + crypto.randomBytes(12).toString('hex') + '.jpg';
  const P = R2.mediaPut(path); const r = await fetch(P.upload, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf });
  if (!r.ok) throw new Error('r2 put ' + r.status);
  try { await fetch(R2.presign('PUT', rk, 60), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n: n + 1 }) }); } catch (e) {}
  return json(res, 200, { ok: true, url: P.url });
}
function clean(c) {
  c = c || {};
  return {
    t: str(c.t, 90), d: /^\d{4}-\d{2}-\d{2}$/.test(c.d) ? c.d : '', h: /^\d{1,2}:\d{2}$/.test(c.h || '') ? c.h : '',
    z: /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(c.z || '') ? c.z : 'Asia/Jerusalem', u: ['d', 'w', 'm'].includes(c.u) ? c.u : 'd',
    th: /^[a-z]{2,16}$/.test(c.th || '') ? c.th : 'classic', c: /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : '', b: /^([0-9a-f]{6}|none)$/i.test(c.b || '') ? c.b : '',
    lang: c.lang === 'en' ? 'en' : 'he', l: c.l === 'stack' ? 'stack' : 'row', fr: ['1', '2'].includes(String(c.fr)) ? String(c.fr) : '0',
    wp: ['bottom', 'none'].includes(c.wp) ? c.wp : 'top', wd: ['h', 'b'].includes(c.wd) ? c.wd : 'g', wh: ['o', 'c'].includes(c.wh) ? c.wh : 's', ww: String(c.ww) === '0' ? '0' : '1', wt: String(c.wt) === '0' ? '0' : '1', ns: String(c.ns) === '1' ? '1' : '0',
    p: okImg(c.p) ? c.p : '', ps: ['rect', 'wide'].includes(c.ps) ? c.ps : 'circle'
  };
}
async function get(s) {
  const R2 = require('./_r2'); if (!R2.on()) throw new Error('storage');
  const r = await fetch(R2.presign('GET', key(s), 120)); if (r.status === 404) return null; if (!r.ok) throw new Error('r2 ' + r.status);
  return r.json();
}
async function put(s, obj) {
  const R2 = require('./_r2');
  const r = await fetch(R2.presign('PUT', key(s), 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
  if (!r.ok) throw new Error('r2 put ' + r.status);
}
module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    if (req.method === 'GET') {
      const s = str(q.s, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
      const o = RESERVED.has(s) ? { reserved: true } : await get(s);
      if (q.check) return json(res, 200, { free: !o });
      if (!o || o.reserved) return json(res, 404, { error: 'not found' });
      res.setHeader('Cache-Control', 'public, max-age=60');
      return json(res, 200, { cfg: o.cfg });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const b = readBody(req) || {};
    if (b.img) return upload(req, res, b);
    const s = str(b.slug, 40).toLowerCase();
    if (!SLUG.test(s) || RESERVED.has(s)) return json(res, 400, { error: 'slug' });
    const cfg = clean(b.cfg); if (!cfg.d) return json(res, 400, { error: 'date' });
    const cur = await get(s);
    if (cur) {
      const tok = str(b.token, 64);
      if (!tok || tok.length !== cur.token.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cur.token))) return json(res, 409, { error: 'taken' });
      await put(s, { ...cur, cfg, updated: new Date().toISOString() });
      return json(res, 200, { ok: true, slug: s, token: tok, updated: true });
    }
    const token = crypto.randomBytes(16).toString('hex');
    await put(s, { cfg, token, created: new Date().toISOString(), ip: (require('./_lib').reqMeta(req) || {}).ip || null });
    return json(res, 200, { ok: true, slug: s, token });
  } catch (e) { console.error('timer', e.message); return json(res, 500, { error: e.message === 'storage' ? 'storage' : 'server' }); }
};
