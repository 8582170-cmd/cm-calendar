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
  /* העלאת תמונה רק למשתמש רשום (חינם) */
  const user = await require('./_lib').getUser(req).catch(() => null); if (!user) return json(res, 401, { error: 'login' });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'type' });
  const buf = Buffer.from(m[1], 'base64'); if (buf.length > (b.big ? 900000 : 400000)) return json(res, 413, { error: 'size' });
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
    p: okImg(c.p) ? c.p : '', ps: ['rect', 'wide'].includes(c.ps) ? c.ps : 'circle',
    /* דף הזמנה */
    inv: okImg(c.inv) ? c.inv : '', it: str(c.it, 1500), pt: str(c.pt, 300), venue: str(c.venue, 120), addr: str(c.addr, 200),
    tr: /^\d{1,2}:\d{2}$/.test(c.tr || '') ? c.tr : '', tl: str(c.tl, 40), rv: c.rv ? 1 : 0, rm: c.rm ? 1 : 0, wl: c.wl ? 1 : 0, tp: c.tp ? 1 : 0, tpt: str(c.tpt, 120),
    gift: /^https:\/\/[^\s<>"']{6,300}$/.test(String(c.gift || '')) ? String(c.gift) : '', gl: str(c.gl, 40)
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
/* אורחים: אישור הגעה וברכה. בעל האירוע (עם קוד העריכה): רשימות, הסתרה ומחיקה */
const { db } = require('./_lib');
async function recent(table, s, ip) { if (!ip) return 0; const L = await db(table + '?slug=eq.' + s + '&ip=eq.' + encodeURIComponent(ip) + '&created_at=gte.' + encodeURIComponent(new Date(Date.now() - 3600e3).toISOString()) + '&select=id&limit=30').catch(() => []); return (L || []).length; }
const own = (cur, tok) => { tok = str(tok, 64); return !!(cur && tok && tok.length === cur.token.length && crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cur.token))); };
async function tehState(s) {
  const L = await db('timer_teh?slug=eq.' + s + '&select=round,chapter,name&order=round.desc&limit=3000').catch(() => null);
  if (L === null) return { setup: true, round: 1, taken: [] };
  const max = L.length ? L[0].round : 1, cur = L.filter(x => x.round === max), round = cur.length >= 150 ? max + 1 : max;
  return { round, done: round - 1, taken: round === max ? cur.map(x => ({ c: x.chapter, n: x.name })) : [] };
}
async function guest(req, res, b) {
  const s = str(b.slug, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
  const cur = await get(s); if (!cur) return json(res, 404, { error: 'not found' });
  const c = cur.cfg || {}, meta = require('./_lib').reqMeta(req) || {}, clean1 = (v, n) => str(v, n).replace(/[<>]/g, '').trim();
  try {
    if (b.act === 'rsvp') {
      if (!c.rv) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80); if (!name) return json(res, 400, { error: 'name' });
      if (await recent('timer_rsvp', s, meta.ip) >= 15) return json(res, 429, { error: 'rate' });
      const st = ['yes', 'no', 'maybe'].includes(b.status) ? b.status : 'yes', n = v => Math.max(0, Math.min(50, parseInt(v, 10) || 0));
      await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, name, phone: clean1(b.phone, 30), status: st, adults: st === 'no' ? 0 : n(b.adults) || 1, kids: st === 'no' ? 0 : n(b.kids), note: clean1(b.note, 300) }) });
      return json(res, 200, { ok: true });
    }
    if (b.act === 'wish') {
      if (!c.wl) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80), text = clean1(b.text, 1000); if (!name || !text) return json(res, 400, { error: 'text' });
      if (await recent('timer_wall', s, meta.ip) >= 10) return json(res, 429, { error: 'rate' });
      await db('timer_wall', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, name, text, public: b.pub !== false }) });
      return json(res, 200, { ok: true });
    }
    if (b.act === 'teh') {
      if (!c.tp) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80); if (!name) return json(res, 400, { error: 'name' });
      const want = [...new Set((Array.isArray(b.chapters) ? b.chapters : []).map(x => parseInt(x, 10)).filter(x => x >= 1 && x <= 150))].slice(0, 10); if (!want.length) return json(res, 400, { error: 'chapters' });
      if (await recent('timer_teh', s, meta.ip) >= 30) return json(res, 429, { error: 'rate' });
      const st = await tehState(s), taken = new Set(st.taken.map(x => x.c)), free = want.filter(x => !taken.has(x));
      if (!free.length) return json(res, 409, { error: 'taken', state: st });
      const got = [];
      for (const ch of free) { try { await db('timer_teh', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, round: st.round, chapter: ch, name }) }); got.push(ch); } catch (e) { if (!/duplicate|23505|409/.test(e.message)) throw e; } }
      return json(res, 200, { ok: true, got, round: st.round, state: await tehState(s) });
    }
    /* בעל האירוע */
    if (!own(cur, b.token)) return json(res, 403, { error: 'token' });
    if (b.act === 'owner') {
      const [t, r, w] = await Promise.all([db('timer_teh?slug=eq.' + s + '&select=round,chapter,name,created_at&order=round.asc,chapter.asc&limit=3000').catch(() => null),db('timer_rsvp?slug=eq.' + s + '&select=id,name,phone,status,adults,kids,note,created_at&order=created_at.desc&limit=2000').catch(() => null),
        db('timer_wall?slug=eq.' + s + '&select=id,name,text,public,hidden,created_at&order=created_at.desc&limit=1000').catch(() => null)]);
      return json(res, 200, { rsvp: r, wall: w, teh: t, setup: r === null || w === null });
    }
    const id = parseInt(b.id, 10); if (!id) return json(res, 400, { error: 'id' });
    if (b.act === 'whide') { await db('timer_wall?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ hidden: !!b.hidden }) }); return json(res, 200, { ok: true }); }
    if (b.act === 'wdel') { await db('timer_wall?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
    if (b.act === 'rdel') { await db('timer_rsvp?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
  } catch (e) { console.error('timer guest', e.message); return json(res, 500, { error: /relation|does not exist|42P01/.test(e.message) ? 'setup' : 'server' }); }
  return json(res, 400, { error: 'act' });
}
module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    if (req.method === 'GET') {
      const s = str(q.s, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
      /* קיר הברכות הציבורי */
      /* חלוקת תהילים: הסבב הנוכחי ומי לקח כל פרק */
      if (q.teh) { res.setHeader('Cache-Control', 'no-store'); return json(res, 200, await tehState(s)); }
      if (q.wall) { const L = await db('timer_wall?slug=eq.' + s + '&public=is.true&hidden=is.false&select=id,name,text,created_at&order=created_at.desc&limit=300').catch(() => []);
        res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { wall: L || [] }); }
      const o = RESERVED.has(s) ? { reserved: true } : await get(s);
      if (q.check) return json(res, 200, { free: !o });
      if (!o || o.reserved) return json(res, 404, { error: 'not found' });
      res.setHeader('Cache-Control', 'public, max-age=60');
      return json(res, 200, { cfg: o.cfg });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const b = readBody(req) || {};
    if (b.img) return upload(req, res, b);
    if (b.act) return guest(req, res, b);
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
