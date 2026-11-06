/* מנויים וחבילות (הגדרה subs בניהול):
   - מנוי לברכות והזמנות (gsubs): חודשי / שנתי, עם מכסת עיצובים לחודש (0 = ללא הגבלה).
   - חבילה חד־פעמית (gpacks): כמות עיצובים, עם תוקף בחודשים (0 = בלי תוקף).
   - תזכורות בלוח (rem): כמות חינם, ואפשרויות (opts) עם מכסת מייל ושיחות, שניתנות בקניית מסלול בלוח ו/או במנוי חודשי / שנתי.
   התשלום הוא מראש לתקופה (בלי חיוב אוטומטי, בשלב זה), ולפני הסוף נשלח מייל חידוש.
   הכל מחושב מתוך טבלת ההזמנות: plan = gsub:<id>:m|y, gpack:<id>, rsub:<id>:m|y. עיצוב שנוצל ממנוי / חבילה = הזמנת greet בסכום 0 עם coupon SUB / PACK.
   החזר תשלום מלא (status refunded) מבטל את ההטבה מעצמו. */
'use strict';
const { db, loadSetting, PAID, PLAN_NAMES, LP } = require('./_lib');
const DAY = 864e5, PER = { m: 31, y: 366 };
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, a, z, d) => { v = Number(v); return isFinite(v) && v >= a && v <= z ? Math.round(v * 100) / 100 : d; };
const id = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);

function clean(s) {
  s = s && typeof s === 'object' ? s : {};
  const uniq = L => { const seen = {}; return L.filter(x => x.id && !seen[x.id] && (seen[x.id] = 1)); };
  const out = { on: !!s.on, renewDays: num(s.renewDays, 0, 30, 5) };
  out.gsubs = uniq((Array.isArray(s.gsubs) ? s.gsubs : []).slice(0, 10).map(x => ({ id: id(x.id), name: str(x.name, 60), desc: str(x.desc, 200), quota: Math.round(num(x.quota, 0, 10000, 10)), pm: num(x.pm, 0, 100000, 0), py: num(x.py, 0, 100000, 0), on: x.on !== false, best: !!x.best })));
  out.gpacks = uniq((Array.isArray(s.gpacks) ? s.gpacks : []).slice(0, 10).map(x => ({ id: id(x.id), name: str(x.name, 60), desc: str(x.desc, 200), n: Math.round(num(x.n, 1, 10000, 5)), price: num(x.price, 0, 100000, 0), months: Math.round(num(x.months, 0, 120, 12)), on: x.on !== false })));
  const r = s.rem && typeof s.rem === 'object' ? s.rem : {};
  /* null = ללא הגבלה */
  const lim = v => v === null || v === '' || v === undefined || +v < 0 ? null : Math.round(num(v, 0, 100000, 0));
  out.rem = { on: !!r.on, freeMail: lim(r.freeMail === undefined ? 15 : r.freeMail), freeVoice: lim(r.freeVoice === undefined ? 0 : r.freeVoice),
    opts: uniq((Array.isArray(r.opts) ? r.opts : []).slice(0, 10).map(x => ({ id: id(x.id), name: str(x.name, 60), desc: str(x.desc, 200), mail: lim(x.mail), voice: lim(x.voice), plans: (Array.isArray(x.plans) ? x.plans : []).filter(p => PAID.indexOf(p) >= 0), pm: num(x.pm, 0, 100000, 0), py: num(x.py, 0, 100000, 0), on: x.on !== false }))) };
  return out;
}
async function cfg() { return clean(await loadSetting('subs').catch(() => ({}))); }

/* שם להזמנה (במיילים, בדוחות ובכרטיס הלקוח) */
function nameOf(plan, S) {
  const m = /^(gsub|gpack|rsub):([a-z0-9-]+)(?::([my]))?$/.exec(String(plan || '')); if (!m) return null;
  const L = m[1] === 'gsub' ? (S && S.gsubs) : m[1] === 'gpack' ? (S && S.gpacks) : (S && S.rem && S.rem.opts), x = (L || []).find(y => y.id === m[2]);
  const per = m[3] === 'y' ? ' (שנתי)' : m[3] === 'm' ? ' (חודשי)' : '';
  return (m[1] === 'gsub' ? 'מנוי ברכות והזמנות' : m[1] === 'gpack' ? 'חבילת עיצובים' : 'מנוי תזכורות') + (x && x.name ? ': ' + x.name : '') + per;
}

/* הזמנות של הלקוח (לפי חשבון או מייל) */
async function orders(who, q) {
  const em = String(who.email || '').toLowerCase(), W = [who.id ? 'user_id.eq.' + who.id : '', em ? 'email.eq.' + encodeURIComponent(em) : ''].filter(Boolean);
  if (!W.length) return [];
  /* כל ההזמנות ששולמו של הלקוח, והסינון כאן בקוד (פשוט ובטוח יותר מסינון מורכב בשאילתה) */
  const L = (await db('orders?select=id,plan,amount,status,coupon,paid_at,created_at&status=eq.paid&or=(' + W.join(',') + ')&order=paid_at.asc&limit=2000').catch(() => [])) || [];
  return L.filter(q);
}

/* זכאות לברכות: מנוי פעיל (מכסה בחודש הנוכחי של המנוי) וחבילות (יתרה) */
async function greetEnt(who, S) {
  S = S || await cfg(); const now = Date.now();
  const O = await orders(who, o => /^(gsub|gpack):/.test(o.plan) || (o.plan === 'greet' && /^(SUB|PACK)$/.test(o.coupon || '')));
  let sub = null; const packs = [];
  O.forEach(o => {
    const m = /^gsub:([a-z0-9-]+):([my])$/.exec(o.plan); const t = Date.parse(o.paid_at || o.created_at);
    if (m) { const end = t + PER[m[2]] * DAY, x = S.gsubs.find(y => y.id === m[1]); if (end > now && (!sub || end > sub.end)) sub = { order: o.id, id: m[1], per: m[2], name: (x && x.name) || m[1], quota: x ? x.quota : 0, start: t, end }; }
    const p = /^gpack:([a-z0-9-]+)$/.exec(o.plan);
    if (p) { const x = S.gpacks.find(y => y.id === p[1]); const n = x ? x.n : 0, end = x && x.months ? t + x.months * 30.5 * DAY : null; if (!end || end > now) packs.push({ order: o.id, id: p[1], name: (x && x.name) || p[1], n, used: 0, start: t, end }); }
  });
  /* מנוי: מכסה לכל חודש של המנוי (מתחיל מיום הקנייה) */
  if (sub) { const k = Math.floor((now - sub.start) / (30.5 * DAY)); sub.cycleStart = sub.start + k * 30.5 * DAY; sub.cycleEnd = Math.min(sub.end, sub.cycleStart + 30.5 * DAY);
    sub.used = O.filter(o => o.plan === 'greet' && o.coupon === 'SUB' && Date.parse(o.paid_at || o.created_at) >= sub.cycleStart).length; sub.left = sub.quota ? Math.max(0, sub.quota - sub.used) : null; }
  /* חבילות: ניצול לפי סדר (הישנה קודם) */
  let usedP = O.filter(o => o.plan === 'greet' && o.coupon === 'PACK').length;
  O.filter(o => /^gpack:/.test(o.plan)).forEach(o => { const p = packs.find(x => x.order === o.id); const x = S.gpacks.find(y => 'gpack:' + y.id === o.plan); const n = p ? p.n : x ? x.n : 0; const u = Math.min(n, usedP); usedP -= u; if (p) p.used = u; });
  const packLeft = packs.reduce((a, p) => a + Math.max(0, p.n - p.used), 0);
  return { sub, packs, packLeft, canSub: !!(sub && (sub.left === null || sub.left > 0)), can: !!(sub && (sub.left === null || sub.left > 0)) || packLeft > 0 };
}

/* זכאות לתזכורות: הכמות הגבוהה מבין החינם, מסלול שנקנה בלוח, ומנוי תזכורות פעיל. null = ללא הגבלה */
async function remEnt(who, S) {
  S = S || await cfg(); const R = S.rem;
  if (!R.on) return { off: true, mail: null, voice: null, via: [] };
  const best = (a, b) => a === null || b === null ? null : Math.max(a, b);
  let mail = R.freeMail, voice = R.freeVoice; const via = [{ k: 'free', name: 'חינם', mail: R.freeMail, voice: R.freeVoice }];
  const now = Date.now(), O = await orders(who, o => /^rsub:/.test(o.plan) || PAID.indexOf(o.plan) >= 0);
  R.opts.forEach(x => {
    const byPlan = O.find(o => x.plans.indexOf(o.plan) >= 0 && now - Date.parse(o.paid_at || o.created_at) < 400 * DAY);
    const bySub = O.find(o => { const m = /^rsub:([a-z0-9-]+):([my])$/.exec(o.plan); return m && m[1] === x.id && Date.parse(o.paid_at || o.created_at) + PER[m[2]] * DAY > now; });
    if (byPlan || bySub) { mail = best(mail, x.mail); voice = best(voice, x.voice); via.push({ k: x.id, name: x.name, mail: x.mail, voice: x.voice, by: bySub ? 'sub' : 'plan', until: bySub ? Date.parse(bySub.paid_at) + PER[/:([my])$/.exec(bySub.plan)[1]] * DAY : null }); }
  });
  return { mail, voice, via };
}

/* מהקופה: plan=sub עם kind (gsub / gpack / rsub), id ו-per (m / y) */
async function prepare(b) {
  const S = await cfg(); if (!S.on) return { error: 'המנויים לא פעילים כרגע' };
  const kind = String(b.kind || ''), x = id(b.id), per = b.per === 'y' ? 'y' : 'm';
  if (kind === 'gsub') { const o = S.gsubs.find(y => y.id === x && y.on); if (!o) return { error: 'המנוי לא נמצא' }; const amount = per === 'y' ? o.py : o.pm; if (!(amount >= 1)) return { error: 'המחיר לא מוגדר' }; return { amount, plan: 'gsub:' + o.id + ':' + per, title: nameOf('gsub:' + o.id + ':' + per, S) }; }
  if (kind === 'gpack') { const o = S.gpacks.find(y => y.id === x && y.on); if (!o) return { error: 'החבילה לא נמצאה' }; if (!(o.price >= 1)) return { error: 'המחיר לא מוגדר' }; return { amount: o.price, plan: 'gpack:' + o.id, title: nameOf('gpack:' + o.id, S) }; }
  if (kind === 'rsub') { if (!S.rem.on) return { error: 'לא פעיל' }; const o = S.rem.opts.find(y => y.id === x && y.on); if (!o) return { error: 'האפשרות לא נמצאה' }; const amount = per === 'y' ? o.py : o.pm; if (!(amount >= 1)) return { error: 'אפשרות זו לא נמכרת כמנוי' }; return { amount, plan: 'rsub:' + o.id + ':' + per, title: nameOf('rsub:' + o.id + ':' + per, S) }; }
  return { error: 'סוג לא מוכר' };
}

/* מה מוצג לגולשים (בדף הברכות ובלוח) */
async function pub() {
  const S = await cfg(), PN = PLAN_NAMES;
  return { on: S.on, gsubs: S.on ? S.gsubs.filter(x => x.on && (x.pm >= 1 || x.py >= 1)) : [], gpacks: S.on ? S.gpacks.filter(x => x.on && x.price >= 1) : [],
    rem: S.rem.on ? { freeMail: S.rem.freeMail, freeVoice: S.rem.freeVoice, opts: S.rem.opts.filter(x => x.on).map(x => ({ ...x, planNames: x.plans.map(p => PN[p] || p) })) } : null };
}

/* ממשימת הבוקר: מייל חידוש לפני סוף מנוי (פעם אחת לכל הזמנה), אם הלקוח עוד לא חידש */
async function renewMails() {
  const S = await cfg(); if (!S.renewDays) return { sent: 0 };
  const now = Date.now(), since = new Date(now - 370 * DAY).toISOString();
  const O = (await db('orders?select=id,plan,email,user_id,paid_at&status=eq.paid&or=(plan.like.gsub*,plan.like.rsub*)&paid_at=gte.' + encodeURIComponent(since) + '&limit=5000').catch(() => [])) || [];
  const { loadSetting: ls, saveSetting } = require('./_lib'), done = (await ls('subrenew').catch(() => ({}))) || {}, site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  let sent = 0;
  for (const o of O) {
    if (!o.email || done[o.id]) continue;
    const m = /^(gsub|rsub):([a-z0-9-]+):([my])$/.exec(o.plan); if (!m) continue;
    const end = Date.parse(o.paid_at) + PER[m[3]] * DAY, left = (end - now) / DAY;
    if (left < 0 || left > S.renewDays) continue;
    /* כבר חידש: יש הזמנה מאוחרת יותר מאותו סוג */
    if (O.some(x => x.email === o.email && x.plan.split(':')[0] === m[1] && Date.parse(x.paid_at) > Date.parse(o.paid_at))) { done[o.id] = 1; continue; }
    try {
      await require('./_paid').send('renew', o.email, { 'מנוי': nameOf(o.plan, S), 'תאריך': new Date(end).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }), 'ימים': String(Math.max(1, Math.round(left))) }, { url: site + (m[1] === 'gsub' ? '/brachot/my.html#subs' : '/online/') }, 'renew');
      done[o.id] = 1; sent++;
    } catch (e) { console.error('renew mail', e.message); }
  }
  await saveSetting('subrenew', done).catch(() => {});
  return { sent };
}

module.exports = { clean, cfg, nameOf, greetEnt, remEnt, prepare, pub, renewMails, PER };
