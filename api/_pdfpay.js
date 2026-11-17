/* עורך ה-PDF: עריכה חינמית אחת לכל אימייל, ואחריה תשלום (הורדה בודדת / חבילה / מנוי חודשי או שנתי).
   העריכה עצמה נעשית בדפדפן. השרת רק מחליט, בכל הורדה, אם היא נספרת ממה שיש ללקוח (מנוי > חבילה > בודדת > חינם),
   אם היא תהיה בלי סימן מים, ומה חסום בעריכה החינמית. ההחלטה נרשמת בטבלת ההזמנות (plan = pdf, סכום 0), כמו בברכות.
   הזמנות שנקנו: psingle:one, ppack:<id>, psub:<id>:m|y. הקופה היא plan=sub עם kind (psingle / ppack / psub), דרך _subs.prepare.
   הגדרות בניהול: setting "pdf" (pdfget / pdfset ב-admin.js). נקרא דרך /api/pricing?c=_pdfpay. */
'use strict';
const crypto = require('node:crypto');
const { db, json, readBody, getUser, loadSetting, env } = require('./_lib');
const DAY = 864e5, PER = { m: 31, y: 366 };
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, a, z, d) => { v = Number(v); return isFinite(v) && v >= a && v <= z ? Math.round(v * 100) / 100 : d; };
const id = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);

/* היכולות שאפשר לסגור בעריכה החינמית. המפתח נשלח מהעורך בכל הורדה */
const FEATS = {
  flat: 'מחיקה סופית (PDF של תמונות)',
  replace: 'החלפת מילה',
  sign: 'חתימה',
  csign: 'חתימה דיגיטלית מוצפנת של האתר',
  img: 'הוספת תמונה',
  merge: 'מיזוג קבצים והוספת עמודים',
  big: 'קובץ גדול'
};

function clean(s) {
  s = s && typeof s === 'object' ? s : {};
  const f = s.free && typeof s.free === 'object' ? s.free : {};
  const uniq = L => { const seen = {}; return L.filter(x => x.id && !seen[x.id] && (seen[x.id] = 1)); };
  return {
    on: !!s.on,
    free: {
      n: Math.round(num(f.n, 0, 50, 1)),
      maxPages: Math.round(num(f.maxPages, 0, 5000, 0)),
      blocked: (Array.isArray(f.blocked) ? f.blocked : ['flat']).filter(k => FEATS[k]).filter((k, i, a) => a.indexOf(k) === i),
      after: f.after === 'deny' ? 'deny' : 'watermark',
      mark: str(f.mark === undefined ? 'MyLuach · myluach.org' : f.mark, 60)
    },
    one: { on: !!(s.one && s.one.on), price: num(s.one && s.one.price, 0, 100000, 0) },
    packs: uniq((Array.isArray(s.packs) ? s.packs : []).slice(0, 10).map(x => ({ id: id(x.id), name: str(x.name, 60), desc: str(x.desc, 200), n: Math.round(num(x.n, 1, 10000, 5)), price: num(x.price, 0, 100000, 0), months: Math.round(num(x.months, 0, 120, 12)), on: !!x.on }))),
    subs: uniq((Array.isArray(s.subs) ? s.subs : []).slice(0, 10).map(x => ({ id: id(x.id), name: str(x.name, 60), desc: str(x.desc, 200), quota: Math.round(num(x.quota, 0, 100000, 0)), pm: num(x.pm, 0, 100000, 0), py: num(x.py, 0, 100000, 0), on: !!x.on })))
  };
}
async function cfg() { return clean(await loadSetting('pdf').catch(() => ({}))); }

/* מייל מנורמל: אותיות קטנות, בג'ימייל בלי נקודות ובלי +תווית, כדי שלא יעקפו את העריכה החינמית בכתובות שונות של אותו חשבון */
function norm(e) {
  e = String(e || '').trim().toLowerCase(); const m = /^([^@]+)@(.+)$/.exec(e); if (!m) return e;
  let u = m[1], d = m[2]; if (d === 'googlemail.com') d = 'gmail.com';
  u = u.split('+')[0]; if (d === 'gmail.com') u = u.replace(/\./g, '');
  return u + '@' + d;
}

function nameOf(plan, S) {
  const m = /^(psingle|ppack|psub):([a-z0-9-]+)(?::([my]))?$/.exec(String(plan || '')); if (!m) return null;
  const L = m[1] === 'ppack' ? S && S.packs : m[1] === 'psub' ? S && S.subs : null, x = L && L.find(y => y.id === m[2]);
  const per = m[3] === 'y' ? ' (שנתי)' : m[3] === 'm' ? ' (חודשי)' : '';
  return (m[1] === 'psingle' ? 'עריכת PDF: הורדה אחת' : m[1] === 'ppack' ? 'עריכת PDF: חבילת הורדות' : 'עריכת PDF: מנוי') + (x && x.name ? ': ' + x.name : '') + per;
}

/* ההזמנות ששולמו של הלקוח (לפי חשבון או מייל), כולל שורות השימוש (plan = pdf) */
async function orders(who) {
  const em = String(who.email || '').toLowerCase(), W = [who.id ? 'user_id.eq.' + who.id : '', em ? 'email.eq.' + encodeURIComponent(em) : ''].filter(Boolean);
  if (!W.length) return [];
  return (await db('orders?select=id,plan,amount,status,coupon,paid_at,created_at,auto:callback->auto&status=eq.paid&and=(or(plan.like.psingle*,plan.like.ppack*,plan.like.psub*,plan.eq.pdf),or(' + W.join(',') + '))&order=paid_at.asc&limit=3000').catch(() => [])) || [];
}
async function freeUsed(email) {
  const n = norm(email); if (!n) return 0;
  const L = await db('orders?select=id&plan=eq.pdf&coupon=eq.FREE&status=eq.paid&callback->>norm=eq.' + encodeURIComponent(n) + '&limit=1000').catch(() => []);
  return (L || []).length;
}

/* מה יש ללקוח: מנוי פעיל (מכסה בכל חודש), חבילות (יתרה), הורדות בודדות, ועריכה חינמית */
async function entitlement(who, S) {
  S = S || await cfg(); const now = Date.now(), O = await orders(who), use = c => O.filter(o => o.plan === 'pdf' && o.coupon === c);
  let sub = null; const packs = [];
  O.forEach(o => {
    const m = /^psub:([a-z0-9-]+):([my])$/.exec(o.plan), t = Date.parse(o.paid_at || o.created_at);
    if (m) { const end = o.auto && o.auto.until ? +o.auto.until : t + PER[m[2]] * DAY, x = S.subs.find(y => y.id === m[1]); if (end > now && (!sub || end > sub.end)) sub = { order: o.id, id: m[1], per: m[2], name: (x && x.name) || m[1], quota: x ? x.quota : 0, start: t, end }; }
    const p = /^ppack:([a-z0-9-]+)$/.exec(o.plan);
    if (p) { const x = S.packs.find(y => y.id === p[1]), n = x ? x.n : 0, end = x && x.months ? t + x.months * 30.5 * DAY : null; if (!end || end > now) packs.push({ order: o.id, id: p[1], name: (x && x.name) || p[1], n, used: 0, end }); }
  });
  if (sub) { const k = Math.floor((now - sub.start) / (30.5 * DAY)); sub.cycleStart = sub.start + k * 30.5 * DAY; sub.used = use('SUB').filter(o => Date.parse(o.paid_at || o.created_at) >= sub.cycleStart).length; sub.left = sub.quota ? Math.max(0, sub.quota - sub.used) : null; }
  let usedP = use('PACK').length; packs.forEach(p => { const u = Math.min(p.n, usedP); p.used = u; usedP -= u; });
  const packLeft = packs.reduce((a, p) => a + Math.max(0, p.n - p.used), 0);
  const ones = O.filter(o => /^psingle:/.test(o.plan)).length, oneLeft = Math.max(0, ones - use('ONE').length);
  const fu = await freeUsed(who.email), freeLeft = Math.max(0, S.free.n - fu);
  return { sub, packs, packLeft, oneLeft, freeLeft, canSub: !!(sub && (sub.left === null || sub.left > 0)), paid: !!(sub && (sub.left === null || sub.left > 0)) || packLeft > 0 || oneLeft > 0 };
}

/* מה שמוצג לגולשים: מחירים, מה חסום בחינם */
async function pub() {
  const S = await cfg(), E = {};
  return {
    on: S.on, free: { n: S.free.n, maxPages: S.free.maxPages, blocked: S.free.blocked.map(k => [k, FEATS[k]]), after: S.free.after },
    one: S.on && S.one.on && S.one.price >= 1 ? { price: S.one.price } : null,
    packs: S.on ? S.packs.filter(x => x.on && x.price >= 1).map(({ id, name, desc, n, price, months }) => ({ id, name, desc, n, price, months })) : [],
    subs: S.on ? S.subs.filter(x => x.on && (x.pm >= 1 || x.py >= 1)).map(({ id, name, desc, quota, pm, py }) => ({ id, name, desc, quota, pm, py })) : [], _: E
  };
}

/* מהקופה (plan=sub): kind = psingle | ppack | psub, id, per */
async function prepare(b) {
  const S = await cfg(); if (!S.on) return { error: 'מכירת עריכות ה-PDF לא פעילה כרגע' };
  const kind = String(b.kind || ''), x = id(b.id), per = b.per === 'y' ? 'y' : 'm';
  if (kind === 'psingle') { if (!S.one.on || !(S.one.price >= 1)) return { error: 'ההורדה הבודדת לא נמכרת כרגע' }; return { amount: S.one.price, plan: 'psingle:one', title: 'עריכת PDF: הורדה אחת' }; }
  if (kind === 'ppack') { const o = S.packs.find(y => y.id === x && y.on); if (!o || !(o.price >= 1)) return { error: 'החבילה לא נמצאה' }; return { amount: o.price, plan: 'ppack:' + o.id, title: 'עריכת PDF: ' + o.name }; }
  if (kind === 'psub') { const o = S.subs.find(y => y.id === x && y.on); if (!o) return { error: 'המנוי לא נמצא' }; const amount = per === 'y' ? o.py : o.pm; if (!(amount >= 1)) return { error: 'המחיר לא מוגדר לתקופה הזאת' }; return { amount, plan: 'psub:' + o.id + ':' + per, title: 'עריכת PDF: ' + o.name + (per === 'y' ? ' (שנתי)' : ' (חודשי)') }; }
  return { error: 'סוג לא מוכר' };
}

/* החלטה על הורדה. feats: מפתחות היכולות שבשימוש בקובץ, pages: מספר העמודים. מחזיר { ok, mode: clean | watermark, via } או { ok:false, need } */
function decide(S, E, feats, pages) {
  const F = (Array.isArray(feats) ? feats : []).filter(k => FEATS[k]);
  if (S.free.maxPages && pages > S.free.maxPages && F.indexOf('big') < 0) F.push('big');
  const lockedUsed = F.filter(k => S.free.blocked.indexOf(k) >= 0);
  if (E.canSub) return { ok: true, mode: 'clean', via: 'SUB' };
  if (E.packLeft > 0) return { ok: true, mode: 'clean', via: 'PACK' };
  if (E.oneLeft > 0) return { ok: true, mode: 'clean', via: 'ONE' };
  if (lockedUsed.length) return { ok: false, need: 'pay', locked: lockedUsed.map(k => FEATS[k]) };
  if (E.freeLeft > 0) return { ok: true, mode: 'clean', via: 'FREE' };
  if (S.free.after === 'watermark') return { ok: true, mode: 'watermark', via: 'WM' };
  return { ok: false, need: 'pay', locked: [] };
}

const left = E => ({ free: E.freeLeft, pack: E.packLeft, one: E.oneLeft, sub: E.sub ? { name: E.sub.name, left: E.sub.left, end: E.sub.end } : null });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const b = req.method === 'POST' ? (readBody(req) || {}) : (req.query || {}), a = String(b.a || '');
    if (a === 'pub') return json(res, 200, await pub());
    const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' });
    const S = await cfg();
    if (a === 'me') { const E = await entitlement(u, S); return json(res, 200, { ...(await pub()), email: u.email || '', left: left(E) }); }
    if (a === 'dl') {
      if (req.method !== 'POST') return json(res, 405, {});
      if (!S.on) return json(res, 200, { ok: true, mode: 'clean', via: 'OFF' });
      const key = str(b.key, 40).replace(/[^\w-]/g, '') || crypto.randomBytes(8).toString('hex');
      /* אותה הורדה שנשלחה שוב (אותו key): אותה תשובה, בלי לספור פעמיים */
      const prev = await db('orders?select=id,coupon,callback&plan=eq.pdf&user_id=eq.' + u.id + '&callback->>key=eq.' + encodeURIComponent(key) + '&limit=1').catch(() => []);
      const E = await entitlement(u, S);
      if (prev && prev[0]) { const c = prev[0].coupon; return json(res, 200, { ok: true, mode: 'clean', via: c, again: true, left: left(E) }); }
      const D = decide(S, E, b.feats, Math.max(0, +b.pages || 0));
      if (!D.ok) return json(res, 200, { ...D, left: left(E) });
      if (D.via !== 'WM') {
        await db('orders', { method: 'POST', body: JSON.stringify({ id: crypto.randomBytes(12).toString('hex'), plan: 'pdf', amount: 0, status: 'paid', email: String(u.email || '').toLowerCase() || null, user_id: u.id, coupon: D.via, paid_at: new Date().toISOString(), callback: { key, norm: norm(u.email), feats: Array.isArray(b.feats) ? b.feats.filter(k => FEATS[k]) : [], pages: Math.max(0, +b.pages || 0) } }) });
        const E2 = await entitlement(u, S); return json(res, 200, { ok: true, mode: D.mode, via: D.via, mark: S.free.mark, left: left(E2) });
      }
      return json(res, 200, { ok: true, mode: 'watermark', via: 'WM', mark: S.free.mark, left: left(E) });
    }
    return json(res, 400, { error: 'unknown' });
  } catch (e) { console.error('pdfpay', e.message); return json(res, 500, { error: 'server', message: 'תקלה זמנית. נסו שוב.' }); }
};
module.exports.clean = clean; module.exports.cfg = cfg; module.exports.nameOf = nameOf; module.exports.prepare = prepare; module.exports.pub = pub; module.exports.norm = norm; module.exports.FEATS = FEATS; module.exports.decide = decide;
