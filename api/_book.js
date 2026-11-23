/* זימון תורים (myluach.org/book): השרת.
   כתובת: /api/pricing?c=_book, פעולה בשדה a.
   ציבורי:  biz (כל מה שהדף מציג), slots (שעות פנויות), book (קביעת תור), view / cancel / ics (הקישור האישי של הלקוח), wait (רשימת המתנה)
   צוות העסק (בעלים / מנהל / פקידה / עובד, לפי ההרשאה): mine, create, get, save, put, del, appts, apptSet, manual, custs, custGet, custSave, custDel, waits, waitDel
   בעל האתר: site (הגדרות האגף)
   הטבלאות: tools/supabase_book.sql. החישובים: _book_core.js (נבדקים ב-tools/test_book.js). */
'use strict';
const crypto = require('node:crypto');
const { db, json, readBody, getUser, env, loadSetting, saveSetting } = require('./_lib');
const K = require('./_book_core');

const enc = encodeURIComponent;
const SITE = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n || 200);
const num = (v, lo, hi, d) => { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
const phoneN = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0\d{8,9}$/.test(v) ? v : ''; };
const mailN = v => { v = String(v || '').trim().toLowerCase(); return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) && v.length <= 120 ? v : ''; };
const url = v => /^https:\/\/[^\s"<>]+$/.test(String(v || '').trim()) ? String(v).trim().slice(0, 500) : '';
const color = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : '';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
const IL = { lat: 31.778, lng: 35.235, tz: K.TZ, il: true };
const ROLES = ['manager', 'clerk', 'worker'];
const admins = () => [env('OWNER_EMAIL'), ...env('BOOK_ADMINS').split(',')].map(s => s.trim().toLowerCase()).filter(Boolean);
const isAdmin = u => !!u && admins().includes(String(u.email || '').toLowerCase());
const rid = n => crypto.randomBytes(n).toString('hex');

/* מסלולי מחיר של האגף (נקבעים בניהול האתר): כל מסלול = שיטת סליקה + מחיר חודשי + עמלה לכל תור */
const PLAN_MODES = ['none', 'own', 'site'];
function cleanPlans(L) {
  const seen = new Set();
  return (Array.isArray(L) ? L : []).slice(0, 20).map(p => {
    if (!p || typeof p !== 'object') return null; let id = String(p.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || ('p' + rid(3)); while (seen.has(id)) id += 'x'; seen.add(id);
    return { id, name: clean(p.name, 60), mode: PLAN_MODES.includes(p.mode) ? p.mode : 'none', monthly: num(p.monthly, 0, 100000, 0), perBooking: num(p.perBooking, 0, 10000, 0), pct: num(p.pct, 0, 100, 0), pub: p.pub !== false, on: p.on !== false, note: clean(p.note, 300) };
  }).filter(p => p && p.name);
}
async function site() { const s = (await loadSetting('book').catch(() => ({}))) || {}; return { open: s.open === true, sms: s.sms === true, note: clean(s.note, 600), max: num(s.max, 1, 200, 5), sitePay: s.sitePay === true, plans: cleanPlans(s.plans) }; }

/* ===== ניקוי הגדרות ===== */
function cleanHours(h) {
  const o = {}; for (let d = 0; d < 7; d++) {
    const L = (h && (h[d] || h[String(d)])) || []; o[d] = (Array.isArray(L) ? L : []).slice(0, 4).map(w => [clean(w && w[0], 5), clean(w && w[1], 5)]).filter(w => K.toMin(w[0]) != null && K.toMin(w[1]) != null && K.toMin(w[1]) > K.toMin(w[0]));
  } return o;
}
function cleanExc(e) {
  const o = {}; Object.keys(e && typeof e === 'object' ? e : {}).slice(0, 400).forEach(d => { if (!K.isDate(d)) return; const x = e[d] || {};
    o[d] = x.closed ? { closed: true, note: clean(x.note, 80) } : { hours: cleanHours({ 0: x.hours, 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] })[0], note: clean(x.note, 80) }; }); return o;
}
const cleanAdj = a => a && ['pct', 'add', 'set'].includes(a.t) && a.v !== '' && a.v != null && isFinite(+a.v) ? { t: a.t, v: num(a.v, -100000, 100000, 0) } : {};
function cleanRules(r) {
  return (Array.isArray(r) ? r : []).slice(0, 30).map(x => x && typeof x === 'object' ? ({
    on: x.on !== false, label: clean(x.label, 60), days: (Array.isArray(x.days) ? x.days : []).map(Number).filter(d => d >= 0 && d <= 6),
    from: K.toMin(x.from) != null ? x.from : '', to: K.toMin(x.to) != null ? x.to : '', date: K.isDate(x.date) ? x.date : '',
    t: ['pct', 'add', 'set'].includes(x.t) ? x.t : 'set', v: num(x.v, -100000, 100000, 0) }) : null).filter(Boolean);
}
const cleanBlocks = L => (Array.isArray(L) ? L : []).slice(0, 60).map(b => ({ from: clean(b && b.from, 16), to: clean(b && b.to, 16), note: clean(b && b.note, 80) })).filter(b => /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(b.from) && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(b.to)).map(b => ({ ...b, from: b.from.length === 10 ? b.from + ' 00:00' : b.from, to: b.to.length === 10 ? b.to + ' 23:59' : b.to }));
const cleanIds = L => [...new Set((Array.isArray(L) ? L : []).map(Number).filter(n => n > 0))].slice(0, 200);

function cleanBizCfg(c, old) {
  c = c && typeof c === 'object' ? c : {}; old = old || {};
  const th = c.theme || {}, tx = c.texts || {}, sh = c.shabbat || {}, py = c.pay || {}, nt = c.notify || {}, pl = c.place || {};
  return {
    hours: cleanHours(c.hours), exc: cleanExc(c.exc), step: [5, 10, 15, 20, 30, 45, 60].includes(+c.step) ? +c.step : 30, minNotice: num(c.minNotice, 0, 20160, 120), maxAhead: num(c.maxAhead, 1, 365, 60),
    shabbat: { on: sh.on !== false, yt: sh.yt !== false, before: num(sh.before, 0, 180, 20), after: num(sh.after, 0, 180, 0) },
    place: pl.lat != null && pl.lng != null && isFinite(+pl.lat) && isFinite(+pl.lng) ? { lat: num(pl.lat, -90, 90, IL.lat), lng: num(pl.lng, -180, 180, IL.lng), il: pl.il !== false, tz: K.TZ } : {},
    consents: (Array.isArray(c.consents) ? c.consents : []).slice(0, 6).map((x, i) => ({ id: 'c' + (i + 1), text: clean(x && x.text, 400), link: url(x && x.link), req: !x || x.req !== false, mkt: !!(x && x.mkt) })).filter(x => x.text),
    pay: { mode: ['none', 'link', 'site'].includes(py.mode) ? py.mode : 'none', url: url(py.url), text: clean(py.text, 400), require: ['none', 'deposit', 'full'].includes(py.require) ? py.require : 'none', holdMin: num(py.holdMin, 0, 1440, 0) },
    notify: { email: nt.email !== false, owner: nt.owner !== false, sms: nt.sms === true, remind: nt.remind !== false },
    cancelH: num(c.cancelH, 0, 720, 24), maxFuture: num(c.maxFuture, 1, 50, 6),
    theme: { color: color(th.color) || '#1e5a63', color2: color(th.color2) || '#c9a24b', mode: th.mode === 'dark' ? 'dark' : 'light', logo: url(th.logo), banner: url(th.banner), radius: [0, 8, 14, 22].includes(+th.radius) ? +th.radius : 14 },
    texts: { intro: clean(tx.intro, 800), thanks: clean(tx.thanks, 600), address: clean(tx.address, 200), phone: clean(tx.phone, 30), mail: mailN(tx.mail), wa: clean(tx.wa, 30), terms: clean(tx.terms, 4000) },
    staff: (Array.isArray(c.staff) ? c.staff : (old.staff || [])).slice(0, 30).map(x => ({ email: mailN(x && x.email), role: ROLES.includes(x && x.role) ? x.role : 'clerk' })).filter(x => x.email)
  };
}
function cleanSvcCfg(c) {
  c = c && typeof c === 'object' ? c : {}; const a = c.adj || {}, p = c.price || {}, d = c.deposit || {};
  const price = p.fixed != null && p.fixed !== '' ? { fixed: num(p.fixed, 0, 1e6, 0) } : { unit: num(p.unit, 5, 600, 15), per: num(p.per, 0, 1e6, 0) };
  const dur = num(c.dur, 5, 720, 30), min = num(a.min, 5, 720, dur), max = num(a.max, 5, 720, dur);
  return {
    dur, adj: { on: a.on === true, min: Math.min(min, max), max: Math.max(min, max), step: num(a.step, 5, 240, 15) }, bb: num(c.bb, 0, 240, 0), ba: num(c.ba, 0, 240, 0), price, rules: cleanRules(c.rules),
    alloc: ['auto', 'pick', 'group'].includes(c.alloc) ? c.alloc : 'auto', autoRule: c.autoRule === 'least' ? 'least' : 'order', showRes: c.showRes !== false, showLeft: c.showLeft !== false,
    groups: cleanIds(c.groups), res: cleanIds(c.res), addons: cleanIds(c.addons), form: +c.form > 0 ? +c.form : null, approval: c.approval === true,
    deposit: +d.v > 0 ? { t: d.t === 'abs' ? 'abs' : 'pct', v: num(d.v, 0, 1e6, 0) } : null, note: clean(c.note, 400)
  };
}
const cleanResCfg = c => { c = c && typeof c === 'object' ? c : {}; return { hours: c.hours ? cleanHours(c.hours) : null, adj: cleanAdj(c.adj), blocks: cleanBlocks(c.blocks) }; };
const cleanAddonCfg = c => { c = c && typeof c === 'object' ? c : {}; return { price: num(c.price, 0, 1e6, 0), per: c.per === 'unit' ? 'unit' : 'fixed', unit: num(c.unit, 5, 600, 15), max: Math.floor(num(c.max, 1, 50, 1)), addMin: Math.floor(num(c.addMin, 0, 240, 0)), req: c.req === true, def: c.def === true }; };
const FT = ['text', 'long', 'num', 'select', 'multi', 'date', 'yn', 'check', 'phone', 'email'];
function cleanFields(L) {
  const seen = new Set();
  return (Array.isArray(L) ? L : []).slice(0, 40).map((f, i) => {
    if (!f || !FT.includes(f.type)) return null; let id = String(f.id || '').replace(/[^a-z0-9_]/gi, '').slice(0, 20) || ('q' + (i + 1)); while (seen.has(id)) id += 'x'; seen.add(id);
    return { id, type: f.type, label: clean(f.label, 200), help: clean(f.help, 300), req: f.req === true, opts: ['select', 'multi'].includes(f.type) ? (Array.isArray(f.opts) ? f.opts : []).map(o => clean(o, 80)).filter(Boolean).slice(0, 40) : [], perm: f.perm === true, sens: f.sens === true };
  }).filter(f => f && f.label);
}

/* ===== טעינה ===== */
const CACHE = new Map();
async function load(slugOrId, fresh) {
  const key = String(slugOrId); const c = CACHE.get(key); if (!fresh && c && Date.now() - c.at < 6000) return c.v;
  let L;
  if (/^\d+$/.test(key)) L = await db('book_biz?id=eq.' + key + '&select=*&limit=1');
  else { if (!SLUG.test(key)) return null; L = await db('book_biz?slug=eq.' + enc(key) + '&select=*&limit=1'); }
  const biz = L && L[0]; if (!biz) return null;
  const q = x => db('book_' + x + '?biz_id=eq.' + biz.id + '&select=*&order=sort.asc,id.asc&limit=1000');
  const [groups, res, svcs, addons, forms] = await Promise.all([q('group'), q('res'), q('svc'), q('addon'), db('book_form?biz_id=eq.' + biz.id + '&select=*&order=id.asc&limit=200')]);
  const v = { biz, groups: groups || [], res: res || [], svcs: svcs || [], addons: addons || [], forms: forms || [] };
  CACHE.set(key, { at: Date.now(), v }); CACHE.set(String(biz.id), { at: Date.now(), v }); CACHE.set(biz.slug, { at: Date.now(), v });
  if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value);
  return v;
}
const drop = B => { if (B && B.biz) { CACHE.delete(String(B.biz.id)); CACHE.delete(B.biz.slug); } };

/* ההרשאה של המשתמש בעסק: owner / manager / clerk / worker, או '' */
function roleOf(u, B) {
  if (!u) return ''; const em = String(u.email || '').toLowerCase();
  if (isAdmin(u)) return 'owner';
  if (B.biz.user_id && B.biz.user_id === u.id) return 'owner';
  if (B.biz.email && B.biz.email === em) return 'owner';
  const s = ((B.biz.cfg || {}).staff || []).find(x => x.email === em); return s ? s.role : '';
}
const canEdit = r => r === 'owner' || r === 'manager';
const canWork = r => canEdit(r) || r === 'clerk';

/* ===== תצוגה ציבורית ===== */
function pubView(B, S) {
  const c = B.biz.cfg || {}, byId = new Map(B.forms.map(f => [f.id, f]));
  const svcs = B.svcs.filter(s => s.active !== false).map(s => {
    const x = s.cfg || {}, f = x.form && byId.get(x.form);
    return { id: s.id, name: s.name, descr: s.descr || '', img: s.img || '', dur: x.dur, adj: x.adj && x.adj.on ? x.adj : null, price: x.price, rules: (x.rules || []).filter(r => r.on !== false).length > 0, alloc: x.alloc, showRes: x.showRes !== false,
      groups: x.groups || [], res: x.res || [], addons: x.addons || [], deposit: x.deposit || null, approval: !!x.approval, note: x.note || '', form: f ? { id: f.id, name: f.name, fields: (f.fields || []).map(q => ({ id: q.id, type: q.type, label: q.label, help: q.help, req: q.req, opts: q.opts })) } : null };
  });
  const usedRes = new Set(), usedGr = new Set(); svcs.forEach(s => { if (s.alloc === 'pick') B.res.forEach(r => { if (!s.res.length || s.res.includes(r.id)) usedRes.add(r.id); }); if (s.alloc === 'group') (s.groups.length ? s.groups : B.groups.map(g => g.id)).forEach(g => usedGr.add(g)); });
  return {
    biz: { slug: B.biz.slug, name: B.biz.name, open: B.biz.status === 'open' }, theme: c.theme || {}, texts: { ...(c.texts || {}), terms: undefined, hasTerms: !!(c.texts && c.texts.terms) },
    svcs, groups: B.groups.filter(g => g.active !== false && usedGr.has(g.id)).map(g => ({ id: g.id, name: g.name, descr: g.descr || '', img: g.img || '' })),
    res: B.res.filter(r => r.active !== false && usedRes.has(r.id)).map(r => ({ id: r.id, name: r.name, descr: r.descr || '', img: r.img || '', group_id: r.group_id })),
    addons: B.addons.filter(a => a.active !== false).map(a => ({ id: a.id, name: a.name, descr: a.descr || '', img: a.img || '', price: a.cfg.price, per: a.cfg.per, unit: a.cfg.unit, max: a.cfg.max, addMin: a.cfg.addMin, req: !!a.cfg.req, def: !!a.cfg.def })),
    consents: c.consents || [], pay: { mode: (c.pay || {}).mode, require: (c.pay || {}).require, text: (c.pay || {}).text, ready: (c.pay || {}).mode !== 'site' || !!(S && S.sitePay && (require('./_auction_pay').siteNed() || require('./_sumit').ready() || require('./_paypal').ready())) }, cancelH: c.cancelH, maxAhead: c.maxAhead, sms: !!(S && S.sms && (c.notify || {}).sms)
  };
}

/* ===== שעות פנויות ===== */
const HB = new Map();
async function holyBlocks(B, fromMs, toMs) {
  const sc = (B.biz.cfg || {}).shabbat || {}; if (sc.on === false) return [];
  const key = B.biz.id + '|' + new Date(fromMs).toISOString().slice(0, 10) + '|' + new Date(toMs).toISOString().slice(0, 10) + '|' + JSON.stringify(sc), h = HB.get(key); if (h && Date.now() - h.at < 600e3) return h.v;
  const out = [];
  try {
    const S = require('./_shabbat'), P = { ...IL, ...(((B.biz.cfg || {}).place) || {}) }, conf = { shabbat: { on: true, yt: sc.yt !== false, before: sc.before == null ? 20 : sc.before, after: sc.after == null ? 0 : sc.after, deg: 8.5 } };
    let t = fromMs - 36 * 3600e3;
    for (let i = 0; i < 40 && t < toMs; i++) {
      const s = await S.status(t, P, conf); if (!s.on) break;
      if (s.closed) { out.push([t, s.end]); t = s.end + 1000; } else if (s.next && s.next < toMs) { out.push([s.next, s.nextEnd]); t = s.nextEnd + 1000; } else break;
    }
  } catch (e) { console.error('book holy', e.message); }
  HB.set(key, { at: Date.now(), v: out }); if (HB.size > 100) HB.delete(HB.keys().next().value); return out;
}
/* תורים שתופסים משאב בטווח (בלי החזקות שפג תוקפן) */
async function busyIn(bizId, fromMs, toMs) {
  const L = await db('book_appt?biz_id=eq.' + bizId + '&status=in.(held,pending,confirmed)&busy_end=gt.' + enc(new Date(fromMs).toISOString()) + '&busy_start=lt.' + enc(new Date(toMs).toISOString()) + '&select=id,res_id,busy_start,busy_end,status,hold_until&limit=5000');
  const now = Date.now();
  return (L || []).filter(a => !(a.status === 'held' && a.hold_until && Date.parse(a.hold_until) < now)).map(a => ({ id: a.id, res_id: a.res_id, s: Date.parse(a.busy_start), e: Date.parse(a.busy_end) }));
}
async function expireHolds(bizId) { try { await db('book_appt?biz_id=eq.' + bizId + '&status=eq.held&hold_until=lt.' + enc(new Date().toISOString()), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'expired', updated_at: new Date().toISOString() }) }); } catch (e) { console.error('book expire', e.message); } }

/* המשאבים שמתאימים לשירות (ולקבוצה שנבחרה) */
function eligible(B, svc, group) {
  const c = svc.cfg || {}; let L = B.res.filter(r => r.active !== false);
  if ((c.res || []).length) L = L.filter(r => c.res.includes(r.id)); else if ((c.groups || []).length) L = L.filter(r => c.groups.includes(r.group_id));
  if (group) L = L.filter(r => r.group_id === group);
  return L;
}
const grp = (B, id) => B.groups.find(g => g.id === id) || null;
/* תכנון ההזמנה: אורך, תוספות, משאבים מתאימים */
function plan(B, svc, want) {
  const dur = K.pickDur(svc, want.dur); if (dur == null) return { error: 'dur' };
  const A = K.pickAddons(B.addons, svc, want.addons); if (A.error) return { error: A.error };
  return { dur, addons: A.list, addMin: A.addMin, total: dur + A.addMin };
}
const priceOf = (B, svc, r, startMs, P) => K.quote({ svc, group: r ? grp(B, r.group_id) : null, res: r, startMs, dur: P.total, addons: P.addons, tz: K.TZ });

async function slotsAction(b) {
  const B = await load(b.s); if (!B || B.biz.status !== 'open') return [404, { error: 'closed' }];
  const svc = B.svcs.find(s => s.id === +b.svc && s.active !== false); if (!svc) return [400, { error: 'svc' }];
  const P = plan(B, svc, b); if (P.error) return [400, { error: P.error }];
  const c = B.biz.cfg || {}, sc = svc.cfg || {}, R = eligible(B, svc, +b.group || 0); if (!R.length) return [200, { days: {}, empty: 'res' }];
  const today = K.msToLocal(Date.now(), K.TZ).date; let from = K.isDate(b.from) && b.from >= today ? b.from : today;
  const n = Math.min(21, Math.max(1, +b.days || 7)), dates = Array.from({ length: n }, (_, i) => K.addDays(from, i));
  const fromMs = K.localToMs(from, 0, K.TZ) - 86400e3, toMs = K.localToMs(K.addDays(from, n), 0, K.TZ) + 86400e3;
  const [busy, blocks] = await Promise.all([busyIn(B.biz.id, fromMs, toMs), holyBlocks(B, fromMs, toMs)]);
  const S = K.slots({ now: Date.now(), tz: K.TZ, biz: c, dates, dur: P.total, bb: sc.bb, ba: sc.ba, res: R, busy, blocks });
  const byId = new Map(R.map(r => [r.id, r])), out = {};
  for (const d of dates) {
    out[d] = (S[d] || []).map(x => {
      const o = { t: x.t, n: sc.showLeft === false ? null : x.res.length }, prices = x.res.map(id => priceOf(B, svc, byId.get(id), x.ms, P).total);
      o.p = Math.min(...prices); o.P = Math.max(...prices);
      if (sc.alloc === 'group') { o.g = {}; o.gp = {}; x.res.forEach((id, i) => { const g = byId.get(id).group_id || 0; o.g[g] = (o.g[g] || 0) + 1; o.gp[g] = o.gp[g] == null ? prices[i] : Math.min(o.gp[g], prices[i]); }); }
      if (sc.alloc === 'pick') { o.r = x.res; o.rp = {}; x.res.forEach((id, i) => { o.rp[id] = prices[i]; }); }
      return o;
    });
  }
  return [200, { days: out, dur: P.total, from, to: dates[dates.length - 1] }];
}

/* ===== קביעת תור ===== */
const RL = new Map();
function limited(req, n, kind) { const ip = String((req.headers || {})['cf-connecting-ip'] || (req.headers || {})['x-forwarded-for'] || '').split(',')[0].trim() || 'x', k = (kind || '') + ip + '|' + Math.floor(Date.now() / 600e3), c = (RL.get(k) || 0) + 1; RL.set(k, c); if (RL.size > 2000) RL.delete(RL.keys().next().value); return c > n; }
const conflict = e => /23P01|exclusion|409/.test(String(e && e.message));
const when = (ms) => { const L = K.msToLocal(ms, K.TZ); try { return new Date(K.localToMs(L.date, 12 * 60, K.TZ)).toLocaleDateString('he-IL', { timeZone: K.TZ, weekday: 'long', day: 'numeric', month: 'long' }) + ' בשעה ' + K.fmtMin(L.min); } catch (e) { return L.date + ' ' + K.fmtMin(L.min); } };
const linkOf = (B, a) => SITE() + '/book/' + B.biz.slug + '?m=' + a.id + '&k=' + a.token;

/* שדות השאלון: בודקים חובה וסוג, ומחזירים את התשובות בנוסח שהוצג */
function readAnswers(form, raw) {
  const A = [], fields = (form && form.fields) || [], R = raw && typeof raw === 'object' ? raw : {};
  for (const f of fields) {
    let v = R[f.id];
    if (f.type === 'multi') v = (Array.isArray(v) ? v : []).map(x => clean(x, 80)).filter(x => f.opts.includes(x));
    else if (f.type === 'select') v = f.opts.includes(String(v)) ? String(v) : '';
    else if (f.type === 'yn') v = v === true || v === 'yes' || v === 'כן' ? 'כן' : v === false || v === 'no' || v === 'לא' ? 'לא' : '';
    else if (f.type === 'check') v = v === true || v === 'true' || v === 'כן' ? 'כן' : '';
    else if (f.type === 'num') v = v === '' || v == null || !isFinite(+v) ? '' : String(+v);
    else if (f.type === 'date') v = K.isDate(v) ? v : '';
    else if (f.type === 'phone') v = phoneN(v);
    else if (f.type === 'email') v = mailN(v);
    else v = clean(v, f.type === 'long' ? 2000 : 300);
    const empty = Array.isArray(v) ? !v.length : v === '';
    if (f.req && empty) return { error: 'answer', field: f.label };
    if (!empty) A.push({ id: f.id, label: f.label, type: f.type, v: Array.isArray(v) ? v.join(', ') : v, perm: !!f.perm, sens: !!f.sens });
  }
  return { list: A };
}

async function upsertCust(biz, o) {
  const L = await db('book_cust?biz_id=eq.' + biz.id + '&phone=eq.' + enc(o.phone) + '&select=*&limit=1'), now = new Date().toISOString();
  const fields = { ...((L && L[0] && L[0].fields) || {}) }; (o.answers || []).filter(a => a.perm).forEach(a => { fields[a.id] = { label: a.label, v: a.v, at: now.slice(0, 10), sens: a.sens }; });
  if (L && L[0]) {
    const c = L[0], patch = { fields, updated_at: now }; if (o.name && !c.name) patch.name = o.name; if (o.email && !c.email) patch.email = o.email; if (o.marketing && !c.marketing) patch.marketing = true;
    await db('book_cust?id=eq.' + c.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }); return c.id;
  }
  const r = await db('book_cust', { method: 'POST', body: JSON.stringify({ biz_id: biz.id, phone: o.phone, email: o.email || null, name: o.name, fields, marketing: !!o.marketing }) }); return r && r[0] && r[0].id;
}

/* force = תור ידני של צוות העסק: בלי התראה מראש מינימלית ובלי שעות פעילות, אבל בלי חפיפה */
async function createAppt(B, b, opt) {
  opt = opt || {}; const c = B.biz.cfg || {}, svc = B.svcs.find(s => s.id === +b.svc && s.active !== false); if (!svc) return [400, { error: 'svc' }];
  const sc = svc.cfg || {}, name = clean(b.name, 80), phone = phoneN(b.phone), email = mailN(b.email);
  if (name.length < 2) return [400, { error: 'name' }]; if (!phone) return [400, { error: 'phone' }]; if (b.email && !email) return [400, { error: 'email' }];
  const P = plan(B, svc, b); if (P.error) return [400, { error: P.error }];
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})$/.exec(String(b.start || '')); if (!m || !K.isDate(m[1]) || K.toMin(m[2]) == null) return [400, { error: 'start' }];
  const startMs = K.localToMs(m[1], K.toMin(m[2]), K.TZ), endMs = startMs + P.total * 60000;
  if (!opt.force) { for (const x of c.consents || []) if (x.req && !(Array.isArray(b.consent) ? b.consent : []).includes(x.id)) return [400, { error: 'consent' }]; }
  const form = sc.form && B.forms.find(f => f.id === sc.form), AN = opt.force && !b.answers ? { list: [] } : readAnswers(form, b.answers); if (AN.error) return [400, AN];
  await expireHolds(B.biz.id);
  const fromMs = startMs - 86400e3, toMs = endMs + 86400e3, R = eligible(B, svc, +b.group || 0);
  if (!R.length) return [409, { error: 'taken' }];
  const [busy, blocks] = await Promise.all([busyIn(B.biz.id, fromMs, toMs), opt.force ? [] : holyBlocks(B, fromMs, toMs)]);
  let free;
  if (opt.force) { const bm = K.busyBy(busy); free = R.filter(r => K.resFree(r, bm, [], startMs, endMs, sc.bb || 0, sc.ba || 0, K.TZ)).map(r => r.id); }
  else { const S = K.slots({ now: Date.now(), tz: K.TZ, biz: c, dates: [m[1]], dur: P.total, bb: sc.bb, ba: sc.ba, res: R, busy, blocks }), e = (S[m[1]] || []).find(x => x.ms === startMs); free = e ? e.res : []; }
  if (!free.length) return [409, { error: 'taken' }];
  /* מי מועמד: בחירת הלקוח (משאב מסוים, או קבוצה), או הקצאה אוטומטית */
  let cand;
  if (opt.force && +b.res > 0) cand = free.includes(+b.res) ? [+b.res] : [];
  else if (opt.force) cand = free.slice();
  else if (sc.alloc === 'pick') { if (!(+b.res > 0)) return [400, { error: 'res' }]; cand = free.includes(+b.res) ? [+b.res] : []; }
  else if (sc.alloc === 'group') { const g = +b.group || 0; if (!g) return [400, { error: 'group' }]; cand = free.filter(id => (R.find(r => r.id === id) || {}).group_id === g); }
  else cand = free.slice();
  if (!cand.length) return [409, { error: 'taken' }];
  let load = null; if (sc.autoRule === 'least') { load = new Map(); const day = await db('book_appt?biz_id=eq.' + B.biz.id + '&status=in.(held,pending,confirmed)&start_at=gte.' + enc(new Date(K.localToMs(m[1], 0, K.TZ)).toISOString()) + '&start_at=lt.' + enc(new Date(K.localToMs(K.addDays(m[1], 1), 0, K.TZ)).toISOString()) + '&select=res_id&limit=2000'); (day || []).forEach(a => load.set(String(a.res_id), (load.get(String(a.res_id)) || 0) + 1)); }
  const order = (!opt.force && sc.alloc === 'pick') || +b.res > 0 ? cand : K.pick(cand, R, sc.autoRule, load);
  /* מקסימום תורים עתידיים לאותו טלפון */
  if (!opt.force) { const f = await db('book_appt?biz_id=eq.' + B.biz.id + '&phone=eq.' + enc(phone) + '&status=in.(held,pending,confirmed)&start_at=gte.' + enc(new Date().toISOString()) + '&select=id&limit=60'); if ((f || []).length >= (c.maxFuture || 6)) return [429, { error: 'max' }]; }
  const py = c.pay || {}, linkPay = py.mode === 'link' && py.require && py.require !== 'none', sitePay = py.mode === 'site' && py.require && py.require !== 'none';
  if (sitePay && !opt.force) { const SS = await site(); if (!SS.sitePay || !(await payProvs()).length) return [503, { error: 'payoff' }]; }
  let status = opt.force ? (['pending', 'confirmed'].includes(b.status) ? b.status : 'confirmed') : (sitePay ? 'held' : sc.approval || linkPay ? 'pending' : 'confirmed'), hold = null;
  if (!opt.force && sitePay) hold = new Date(Date.now() + (py.holdMin > 0 ? py.holdMin : 15) * 60000).toISOString();
  else if (!opt.force && linkPay && !sc.approval && py.holdMin > 0) { status = 'held'; hold = new Date(Date.now() + py.holdMin * 60000).toISOString(); }
  const meta = require('./_lib').reqMeta(opt.req), at = new Date().toISOString();
  const consent = (c.consents || []).filter(x => (Array.isArray(b.consent) ? b.consent : []).includes(x.id)).map(x => ({ id: x.id, text: x.text, link: x.link || '', v: true, at, ip: meta ? meta.ip : '' }));
  const marketing = (c.consents || []).some(x => x.mkt && (Array.isArray(b.consent) ? b.consent : []).includes(x.id));
  let appt = null;
  for (const rid0 of order) {
    const r = R.find(x => x.id === rid0), q = priceOf(B, svc, r, startMs, P), id = 'bk' + rid(9);
    const row = { id, biz_id: B.biz.id, svc_id: svc.id, res_id: r.id, group_id: r.group_id || null, start_at: new Date(startMs).toISOString(), end_at: new Date(endMs).toISOString(),
      busy_start: new Date(startMs - (sc.bb || 0) * 60000).toISOString(), busy_end: new Date(endMs + (sc.ba || 0) * 60000).toISOString(), status, hold_until: hold, dur: P.total,
      price: opt.force && b.price != null && b.price !== '' ? num(b.price, 0, 1e6, q.total) : q.total, detail: q, addons: q.lines.filter(l => l.k === 'addon').map(l => ({ id: l.id, name: l.label, n: l.n, amt: l.amt })),
      answers: AN.list.map(a => ({ id: a.id, label: a.label, v: a.v })), consent, pay: { mode: py.mode || 'none', due: linkPay || sitePay ? (py.require === 'full' ? q.total : q.deposit || q.total) : (q.deposit || 0), paid: 0 },
      source: opt.force ? 'manual' : (b.source === 'phone' ? 'phone' : 'web'), name, phone, email: email || null, note: opt.force ? clean(b.note, 600) : '', token: rid(12), remind: {} };
    try { const out = await db('book_appt', { method: 'POST', body: JSON.stringify(row) }); appt = (out && out[0]) || row; appt._q = q; appt._res = r; break; }
    catch (e) { if (!conflict(e)) throw e; }
  }
  if (!appt) return [409, { error: 'taken' }];
  try { const cid = await upsertCust(B.biz, { name, phone, email, answers: AN.list, marketing }); if (cid) { await db('book_appt?id=eq.' + appt.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cust_id: cid }) }); appt.cust_id = cid; } } catch (e) { console.error('book cust', e.message); }
  if (!(sitePay && !opt.force)) notifyBooked(B, svc, appt).catch(e => console.error('book notify', e.message));
  const showRes = sc.showRes !== false || opt.force;
  const out = { id: appt.id, k: appt.token, status, start: when(startMs), svc: svc.name, res: showRes ? appt._res.name : '', price: appt.price, due: appt.pay.due, pay: linkPay ? { url: py.url, text: py.text } : null, link: linkOf(B, appt), hold: hold };
  if (sitePay && !opt.force) { Object.assign(out, await payInfo(B, svc, appt)); out.payNow = true; }
  return [200, out];
}

/* ===== תשלום דרך האתר: אותם אמצעי תשלום שפעילים באתר (נדרים פלוס, SUMIT, פייפל), לפי ההגדרה בניהול הראשי.
   הכסף נכנס לחשבון האתר. אין העברה אוטומטית לעסק: ההעברה ידנית ונרשמת בספר החשבונות ===== */
function siteTx(B, svc, a) {
  const AP = require('./_auction_pay'), acc = AP.siteNed(); if (!acc) return null;
  return AP.nedTx(acc, { slug: 'book-' + B.biz.slug }, { id: a.id, amount: Math.round((+a.pay.due - (+a.pay.paid || 0)) * 100) / 100, email: a.email || '' }, B.biz.name + ' · ' + (svc ? svc.name : ''), { p2: 'book:' + B.biz.slug });
}
async function payProvs() {
  const ok = { nedarim: !!require('./_auction_pay').siteNed(), sumit: require('./_sumit').ready(), paypal: require('./_paypal').ready() };
  let cfg = {}; try { cfg = (await require('./_lib').loadConfig()) || {}; } catch (e) { cfg = {}; }
  const ALL = ['nedarim', 'sumit', 'paypal'], first = ALL.includes(cfg.pay) ? cfg.pay : 'nedarim';
  const list = [first, ...(Array.isArray(cfg.payAlso) ? cfg.payAlso : []), ...ALL].filter((x, i, a) => ALL.includes(x) && a.indexOf(x) === i);
  return list.filter(x => ok[x]);
}
async function payInfo(B, svc, a) {
  const provs = await payProvs(), o = { provs, due: r2m(+a.pay.due - (+a.pay.paid || 0)), name: a.name, phone: a.phone, email: a.email || '' };
  if (provs.includes('nedarim')) o.tx = siteTx(B, svc, a);
  if (provs.includes('sumit')) o.sumit = require('./_sumit').pub();
  if (provs.includes('paypal')) o.ppc = require('./_lib').env('PAYPAL_CLIENT_ID');
  return o;
}
const r2m = v => Math.round(+v * 100) / 100;
/* העמלה לפי המסלול של העסק: קבועה לתור + אחוזים מהסכום ששולם */
async function feeFor(B, paid) { const pl = (await site()).plans.find(p => p.id === (B.biz.cfg || {}).plan); return pl && pl.mode === 'site' ? r2m(pl.perBooking + paid * pl.pct / 100) : 0; }
async function nedPaid(p) {
  const id = String(p.Param1 || p.param1 || ''); if (!/^bk[0-9a-f]{18}$/.test(id)) return { skipped: 'id' };
  const L = await db('book_appt?id=eq.' + id + '&select=*&limit=1'), a = L && L[0]; if (!a) return { error: 'no appt' };
  const ok = /^(ok|1|true|success)$/i.test(String(p.Status || p.status || '')), txn = String(p.TransactionId || p.TransactionID || p.Id || p.ID || '');
  if (!ok) return { ok: true, failed: true };
  return settle(a, Number(p.Amount || p.amount || 0), txn);
}
/* תשלום שהתקבל (מכל ספק): רושם בספר, מעדכן את התור ומאשר אותו */
async function settle(a, amount, txn) {
  const pay = a.pay || {}; if (txn && pay.txns && pay.txns.includes(txn)) return { already: true };
  const B = await load(String(a.biz_id), true); if (!B) return { error: 'no biz' };
  const amt = r2m(amount || ((+pay.due || 0) - (+pay.paid || 0))), paid = r2m((+pay.paid || 0) + amt);
  const fee = pay.feeDone ? 0 : await feeFor(B, amt), svc = B.svcs.find(s => s.id === a.svc_id), full = paid + 0.001 >= (+pay.due || 0);
  const np = { ...pay, paid, at: new Date().toISOString(), txns: [...(pay.txns || []), txn].filter(Boolean), feeDone: true, fee: r2m((+pay.fee || 0) + fee), site: true };
  await db('book_pay', { method: 'POST', body: JSON.stringify({ biz_id: a.biz_id, appt_id: a.id, kind: 'payment', amount: amt, fee, txn, note: (a.name || '') + ' · ' + (svc ? svc.name : '') }) });
  let status = a.status, conflictErr = false;
  if (full && ['held', 'expired'].includes(a.status)) status = svc && svc.cfg.approval ? 'pending' : 'confirmed';
  try { await db('book_appt?id=eq.' + enc(a.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, hold_until: null, pay: np, updated_at: new Date().toISOString() }) }); }
  catch (e) { if (!conflict(e)) throw e; conflictErr = true; np.conflict = true; await db('book_appt?id=eq.' + enc(a.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ pay: np }) }); }
  if (conflictErr) { await notifyOwner(B, 'תשלום על תור שכבר נתפס: ' + a.name, 'התקבל תשלום של ' + amt + ' ₪ מ' + a.name + ' (' + a.phone + ') אבל זמן השמירה פג והשעה נתפסה. צריך להחזיר ללקוח את הכסף או לתאם איתו תור אחר.'); return { ok: true, conflict: true }; }
  if (status !== a.status) notifyBooked(B, svc, { ...a, status, pay: np }).catch(e => console.error('book notify', e.message));
  return { ok: true };
}
async function notifyOwner(B, subject, text) {
  try { const { sendMail, frame, escH } = require('./_mail'), to = [B.biz.email, ...(((B.biz.cfg || {}).staff || []).filter(x => x.role === 'manager').map(x => x.email))].filter(Boolean); if (to.length) await sendMail({ to: to[0], ...(to.length > 1 ? { cc: to.slice(1) } : {}), subject, html: frame({ title: escH(subject), body: escH(text), foot: '' }), text }, 'book'); } catch (e) { console.error('book owner mail', e.message); }
}
/* החזר ללקוח: מנהל העסק (או בעל האתר) קובע. בפייפל ההחזר מתבצע אוטומטית, ובשאר הספקים הוא נרשם לביצוע ידני אצל בעל האתר */
async function doRefund(B, b) {
  const amount = r2m(num(b.amount, 0, 1e7, 0)); if (!(amount > 0)) return [400, { error: 'amount' }];
  const pr = ((await db('book_pay?id=eq.' + (+b.id) + '&biz_id=eq.' + B.biz.id + '&kind=eq.payment&select=*&limit=1')) || [])[0]; if (!pr) return [404, { error: 'none' }];
  const done = (await db('book_pay?biz_id=eq.' + B.biz.id + '&appt_id=eq.' + enc(String(pr.appt_id)) + '&kind=eq.refund&select=amount&limit=100')) || [], was = r2m(done.reduce((x, r) => x + +r.amount, 0));
  if (amount + was > +pr.amount + 0.001) return [400, { error: 'over' }];
  const fee = b.refundFee === true ? r2m(Math.min(+pr.fee, +pr.fee * amount / +pr.amount)) : 0; let txn = '', note = clean(b.note, 200), auto = false;
  if (String(pr.txn || '').startsWith('paypal:')) {
    try { const r = await require('./_paypal').refund(String(pr.txn).slice(7), amount, 'bkrf' + pr.id + '-' + Math.round(amount * 100) + '-' + Math.round(was * 100), 'החזר: ' + B.biz.name); txn = 'paypal:' + r.id; auto = true; }
    catch (e) { return [502, { error: 'provider', message: e.issue || e.message }]; }
  } else note = ('לביצוע ידני אצל חברת הסליקה. ' + note).trim();
  await db('book_pay', { method: 'POST', body: JSON.stringify({ biz_id: B.biz.id, appt_id: pr.appt_id, kind: 'refund', amount, fee, txn, note }) });
  return [200, { ok: true, auto }];
}
function ledgerSum(rows) {
  const t = { gross: 0, fees: 0, refunded: 0, refundFees: 0, payouts: 0 };
  (rows || []).forEach(r => { const a = +r.amount || 0, f = +r.fee || 0; if (r.kind === 'payment') { t.gross += a; t.fees += f; } else if (r.kind === 'refund') { t.refunded += a; t.refundFees += f; } else if (r.kind === 'payout') t.payouts += a; });
  Object.keys(t).forEach(k => { t[k] = r2m(t[k]); }); t.net = r2m(t.gross - t.fees - (t.refunded - t.refundFees)); t.balance = r2m(t.net - t.payouts); return t;
}

/* ===== הודעות ===== */
async function notifyBooked(B, svc, a) {
  const c = B.biz.cfg || {}, N = c.notify || {}, S = await site(), st = Date.parse(a.start_at), txt = c.texts || {};
  const msg = B.biz.name + ': התור נקבע, ' + svc.name + ', ' + when(st) + ((svc.cfg || {}).showRes !== false && a.res_id ? ' (' + ((B.res.find(r => r.id === a.res_id) || {}).name || '') + ')' : '') + (a.status === 'pending' ? '. התור ממתין לאישור' : '') + '. לצפייה, שינוי וביטול: ' + linkOf(B, a);
  if (N.sms && S.sms && a.phone) { try { await require('./_sms').send(a.phone, msg); } catch (e) { console.error('book sms', e.message); } }
  const { sendMail, frame, escH } = require('./_mail');
  if (N.email !== false && a.email) {
    try { await sendMail({ to: a.email, subject: B.biz.name + ': התור נקבע', html: frame({ title: 'התור נקבע', body: escH(svc.name) + '<br>' + escH(when(st)) + (a.price > 0 ? '<br>סכום: ' + a.price + ' ₪' : '') + (txt.address ? '<br>' + escH(txt.address) : '') + (a.status === 'pending' ? '<br><b>התור ממתין לאישור.</b>' : '') + (txt.thanks ? '<br><br>' + escH(txt.thanks) : ''), button: 'צפייה, שינוי וביטול', url: linkOf(B, a), foot: escH(B.biz.name), accent: (c.theme || {}).color }), text: msg, ...(txt.mail ? { replyTo: txt.mail } : {}) }, 'book'); } catch (e) { console.error('book mail', e.message); }
  }
  if (N.owner !== false) {
    const to = [B.biz.email, ...((c.staff || []).filter(x => x.role === 'manager').map(x => x.email))].filter(Boolean);
    if (to.length) { try { await sendMail({ to: to[0], ...(to.length > 1 ? { cc: to.slice(1) } : {}), subject: 'תור חדש: ' + a.name + ' · ' + svc.name, html: frame({ title: 'תור חדש', body: escH(a.name) + ' · ' + escH(a.phone) + '<br>' + escH(svc.name) + '<br>' + escH(when(st)) + (a.res_id ? '<br>' + escH((B.res.find(r => r.id === a.res_id) || {}).name || '') : '') + (a.status === 'pending' ? '<br><b>ממתין לאישור</b>' : ''), button: 'לניהול', url: SITE() + '/book-manage?s=' + B.biz.slug, foot: '' }), text: 'תור חדש: ' + a.name + ' ' + when(st) }, 'book'); } catch (e) { console.error('book owner mail', e.message); } }
  }
}
async function notifyCust(B, a, text) {
  const c = B.biz.cfg || {}, S = await site(); if ((c.notify || {}).sms && S.sms && a.phone) { try { await require('./_sms').send(a.phone, B.biz.name + ': ' + text); } catch (e) { console.error('book sms2', e.message); } }
  if (a.email && (c.notify || {}).email !== false) { try { const { sendMail, frame, escH } = require('./_mail'); await sendMail({ to: a.email, subject: B.biz.name, html: frame({ title: escH(B.biz.name), body: escH(text), foot: '', accent: (c.theme || {}).color }), text }, 'book'); } catch (e) { console.error('book mail2', e.message); } }
}
/* התפנה תור: מי שנרשם להמתנה באותו יום מקבל הודעה */
async function notifyWait(B, a) {
  const day = K.msToLocal(Date.parse(a.start_at), K.TZ).date, L = await db('book_wait?biz_id=eq.' + B.biz.id + '&day=eq.' + day + '&notified_at=is.null&order=id.asc&limit=20').catch(() => []);
  for (const w of (L || []).filter(x => !x.svc_id || x.svc_id === a.svc_id)) {
    await notifyCust(B, { phone: w.phone, email: w.email }, 'התפנה תור ב' + when(Date.parse(a.start_at)) + '. לקביעה: ' + SITE() + '/book/' + B.biz.slug);
    await db('book_wait?id=eq.' + w.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notified_at: new Date().toISOString() }) }).catch(() => {});
  }
}
/* תזכורת יום לפני: נקראת מהמשימה היומית. extraDays = ימי שבת/חג בהמשך (שבהם לא שולחים) */
async function remind(extraDays) {
  const now = Date.now(), to = now + (30 + 24 * (extraDays || 0)) * 3600e3, S = await site(); let sent = 0;
  const L = await db('book_appt?status=eq.confirmed&start_at=gt.' + enc(new Date(now).toISOString()) + '&start_at=lt.' + enc(new Date(to).toISOString()) + '&select=*&order=start_at.asc&limit=300').catch(() => []);
  const cache = new Map();
  for (const a of L || []) {
    if ((a.remind || {}).d1) continue;
    let B = cache.get(a.biz_id); if (!B) { B = await load(String(a.biz_id)); cache.set(a.biz_id, B); } if (!B || B.biz.status !== 'open' || (B.biz.cfg.notify || {}).remind === false) continue;
    const svc = B.svcs.find(s => s.id === a.svc_id), st = Date.parse(a.start_at);
    await notifyCust(B, a, 'תזכורת: ' + (svc ? svc.name + ', ' : '') + when(st) + '. לשינוי או ביטול: ' + linkOf(B, a));
    await db('book_appt?id=eq.' + a.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ remind: { ...(a.remind || {}), d1: true } }) }).catch(() => {}); sent++;
  }
  return { sent };
}

/* ===== הקישור האישי של הלקוח ===== */
async function getByToken(B, id, k) {
  const L = await db('book_appt?id=eq.' + enc(String(id)) + '&biz_id=eq.' + B.biz.id + '&select=*&limit=1'), a = L && L[0];
  const ok = a && a.token && String(k || '').length === a.token.length && crypto.timingSafeEqual(Buffer.from(a.token), Buffer.from(String(k))); return ok ? a : null;
}
function apptPub(B, a) {
  const svc = B.svcs.find(s => s.id === a.svc_id), res = B.res.find(r => r.id === a.res_id), st = Date.parse(a.start_at), cH = (B.biz.cfg || {}).cancelH || 0;
  return { id: a.id, status: a.status, svc: svc ? svc.name : '', res: res && !(svc && (svc.cfg || {}).showRes === false) ? res.name : '', when: when(st), start: a.start_at, dur: a.dur, price: a.price, addons: a.addons || [], name: a.name, canCancel: ['pending', 'confirmed', 'held'].includes(a.status) && Date.now() < st - cH * 3600e3, cancelH: cH, pay: a.pay || {}, payMode: (a.pay || {}).mode || 'none', payUrl: ((B.biz.cfg || {}).pay || {}).url || '', address: ((B.biz.cfg || {}).texts || {}).address || '' };
}
function ics(B, a) {
  const f = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), svc = B.svcs.find(s => s.id === a.svc_id), esc = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyLuach//Book//HE', 'BEGIN:VEVENT', 'UID:' + a.id + '@myluach.org', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(Date.parse(a.start_at)), 'DTEND:' + f(Date.parse(a.end_at)), 'SUMMARY:' + esc(B.biz.name + (svc ? ' - ' + svc.name : '')), 'LOCATION:' + esc(((B.biz.cfg || {}).texts || {}).address), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

/* ===== צוות העסק ===== */
async function mine(u, onlyMine) {
  const em = u.email ? '(user_id.eq.' + u.id + ',email.eq.' + enc(u.email) + ')' : '(user_id.eq.' + u.id + ')';
  const [own, staff, all] = await Promise.all([db('book_biz?or=' + em + '&select=id,slug,name,status,cfg,created_at&order=id.desc&limit=100'),
    u.email ? db('book_biz?cfg=cs.' + enc(JSON.stringify({ staff: [{ email: u.email }] })) + '&select=id,slug,name,status,cfg,created_at&limit=100').catch(() => []) : [], isAdmin(u) && !onlyMine ? db('book_biz?select=id,slug,name,status,email,created_at,cfg&order=id.desc&limit=300') : []]);
  const seen = new Set(), L = [];
  [...(own || []).map(x => ({ ...x, role: 'owner' })), ...(staff || []).map(x => ({ ...x, role: ((x.cfg.staff || []).find(s => s.email === u.email) || {}).role || 'clerk' })), ...(all || []).map(x => ({ ...x, role: 'owner', all: true }))].forEach(x => { if (!seen.has(x.id)) { seen.add(x.id); L.push({ id: x.id, slug: x.slug, name: x.name, status: x.status, role: x.role, all: !!x.all, email: x.email || '', plan: (x.cfg || {}).plan || '' }); } });
  return L;
}
const SEED_HOURS = { 0: [['09:00', '17:00']], 1: [['09:00', '17:00']], 2: [['09:00', '17:00']], 3: [['09:00', '17:00']], 4: [['09:00', '17:00']], 5: [], 6: [] };
async function create(u, b) {
  const S = await site(); if (!S.open && !isAdmin(u)) return [403, { error: 'closed', note: S.note }];
  const mineN = (await db('book_biz?user_id=eq.' + u.id + '&select=id&limit=300')).length; if (!isAdmin(u) && mineN >= S.max) return [429, { error: 'max' }];
  const name = clean(b.name, 80), slug = String(b.slug || '').toLowerCase().trim(); if (name.length < 2) return [400, { error: 'name' }]; if (!SLUG.test(slug)) return [400, { error: 'slug' }];
  if (['admin', 'manage', 'api', 'new', 'demo', 'test'].includes(slug)) return [400, { error: 'slug' }];
  if ((await db('book_biz?slug=eq.' + enc(slug) + '&select=id&limit=1')).length) return [409, { error: 'slug_taken' }];
  const cfg = cleanBizCfg({ hours: SEED_HOURS, shabbat: { on: true }, consents: [{ text: 'קראתי ואני מאשר/ת את תנאי השימוש וביטול התור', req: true }] });
  const r = await db('book_biz', { method: 'POST', body: JSON.stringify({ slug, user_id: u.id, email: u.email, name, status: 'draft', cfg }) }), biz = r[0];
  const g = await db('book_res', { method: 'POST', body: JSON.stringify({ biz_id: biz.id, name: 'משאב 1', cfg: cleanResCfg({}), sort: 1 }) });
  await db('book_svc', { method: 'POST', body: JSON.stringify({ biz_id: biz.id, name: 'תור', descr: '', cfg: cleanSvcCfg({ dur: 30, price: { unit: 30, per: 0 } }), sort: 1 }) });
  return [200, { slug, id: biz.id, res: g && g[0] && g[0].id }];
}
const KIND = { group: 'book_group', res: 'book_res', svc: 'book_svc', addon: 'book_addon', form: 'book_form' };
function cleanItem(kind, it, B) {
  const base = { name: clean(it.name, 80), descr: clean(it.descr, 600), img: url(it.img), sort: Math.floor(num(it.sort, 0, 9999, 0)), active: it.active !== false };
  if (kind === 'group') return { ...base, adj: cleanAdj(it.adj) };
  if (kind === 'res') { const g = +it.group_id > 0 && B.groups.some(x => x.id === +it.group_id) ? +it.group_id : null; return { ...base, group_id: g, cfg: cleanResCfg(it.cfg) }; }
  if (kind === 'svc') return { ...base, cfg: cleanSvcCfg(it.cfg) };
  if (kind === 'addon') return { ...base, cfg: cleanAddonCfg(it.cfg) };
  if (kind === 'form') return { name: base.name, fields: cleanFields(it.fields) };
}
/* מסלול בלי סליקה: לא ניתן להפעיל תשלום באתר */
async function enforcePlan(cfg) {
  const pl = (await site()).plans.find(p => p.id === cfg.plan); if (!pl || !cfg.pay) return;
  const off = () => { cfg.pay = { ...cfg.pay, mode: 'none', require: 'none' }; };
  if (pl.mode === 'none') off(); else if (pl.mode === 'own' && cfg.pay.mode === 'site') off(); else if (pl.mode === 'site' && cfg.pay.mode === 'link') off();
}
function fullView(B, role) {
  const c = B.biz.cfg || {}; return { biz: { id: B.biz.id, slug: B.biz.slug, name: B.biz.name, status: B.biz.status, email: B.biz.email, cfg: canEdit(role) ? c : { ...c, staff: undefined }, created_at: B.biz.created_at }, groups: B.groups, res: B.res, svcs: B.svcs, addons: B.addons, forms: B.forms, role };
}
const apptCols = '*';
async function apptList(B, b, role) {
  let q = 'book_appt?biz_id=eq.' + B.biz.id + '&order=start_at.asc&limit=1500&select=' + apptCols;
  const f = K.isDate(b.from) ? b.from : K.msToLocal(Date.now(), K.TZ).date, t = K.isDate(b.to) ? b.to : K.addDays(f, 1);
  q += '&start_at=gte.' + enc(new Date(K.localToMs(f, 0, K.TZ)).toISOString()) + '&start_at=lt.' + enc(new Date(K.localToMs(t, 0, K.TZ)).toISOString());
  if (b.status && /^[a-z,]+$/.test(b.status)) q += '&status=in.(' + b.status + ')';
  if (+b.cust > 0) q += '&cust_id=eq.' + (+b.cust);
  const L = await db(q); return (L || []).map(a => ({ ...a, token: undefined, answers: role === 'worker' ? undefined : a.answers }));
}
const MAN = async (u, B, b) => {
  const role = roleOf(u, B); if (!role) return [403, { error: 'forbidden' }];
  switch (b.a) {
    case 'get': return [200, { ...fullView(B, role), plans: canEdit(role) ? (await site()).plans.filter(p => p.on && p.pub) : [] }];
    case 'pickPlan': {
      if (role !== 'owner') return [403, { error: 'forbidden' }]; const pl = (await site()).plans.find(p => p.id === String(b.plan) && p.on && p.pub); if (!pl) return [400, { error: 'plan' }];
      const n = { ...(B.biz.cfg || {}), plan: pl.id }; await enforcePlan(n); await db('book_biz?id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg: n, updated_at: new Date().toISOString() }) }); drop(B); return [200, { ok: true }];
    }
    case 'save': {
      if (!canEdit(role)) return [403, { error: 'forbidden' }];
      const patch = { updated_at: new Date().toISOString() };
      if (b.name != null) { const n = clean(b.name, 80); if (n.length < 2) return [400, { error: 'name' }]; patch.name = n; }
      if (b.status != null) patch.status = ['draft', 'open', 'closed'].includes(b.status) ? b.status : B.biz.status;
      if (b.cfg) { const old = B.biz.cfg || {}, n = cleanBizCfg(b.cfg, old); if (role !== 'owner') n.staff = old.staff || []; n.plan = old.plan || ''; await enforcePlan(n); patch.cfg = n; }
      await db('book_biz?id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }); drop(B); return [200, { ok: true }];
    }
    case 'put': {
      if (!canEdit(role) || !KIND[b.kind]) return [403, { error: 'forbidden' }];
      const it = b.item || {}, row = cleanItem(b.kind, it, B); if (!row.name || row.name.length < 1) return [400, { error: 'name' }];
      let out; if (+it.id > 0) { out = await db(KIND[b.kind] + '?id=eq.' + (+it.id) + '&biz_id=eq.' + B.biz.id, { method: 'PATCH', body: JSON.stringify(row) }); } else out = await db(KIND[b.kind], { method: 'POST', body: JSON.stringify({ ...row, biz_id: B.biz.id }) });
      drop(B); return [200, { item: out && out[0] }];
    }
    case 'del': {
      if (!canEdit(role) || !KIND[b.kind]) return [403, { error: 'forbidden' }];
      const id = +b.id; if (!(id > 0)) return [400, { error: 'bad' }];
      if (b.kind === 'form') { await db('book_form?id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); drop(B); return [200, { ok: true }]; }
      /* לא מוחקים מה שיש עליו היסטוריה: מעבירים לארכיון (active=false). בלי היסטוריה: מוחקים */
      const col = b.kind === 'svc' ? 'svc_id' : b.kind === 'res' ? 'res_id' : b.kind === 'group' ? 'group_id' : null;
      const used = col ? (await db('book_appt?' + col + '=eq.' + id + '&biz_id=eq.' + B.biz.id + '&select=id&limit=1')).length : 0;
      if (b.kind === 'group') await db('book_res?group_id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ group_id: null }) });
      if (used || b.archive === true) await db(KIND[b.kind] + '?id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: b.restore === true }) });
      else await db(KIND[b.kind] + '?id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      drop(B); return [200, { ok: true, archived: !!used }];
    }
    case 'appts': return [200, { items: await apptList(B, b, role) }];
    case 'apptSet': {
      if (!canWork(role)) return [403, { error: 'forbidden' }];
      const L = await db('book_appt?id=eq.' + enc(String(b.id)) + '&biz_id=eq.' + B.biz.id + '&select=*&limit=1'), a = L && L[0]; if (!a) return [404, { error: 'none' }];
      const p = b.patch || {}, patch = { updated_at: new Date().toISOString() };
      if (p.status != null) { if (!['pending', 'confirmed', 'done', 'cancelled', 'noshow'].includes(p.status)) return [400, { error: 'status' }]; patch.status = p.status; patch.hold_until = null; }
      if (p.note != null) patch.note = clean(p.note, 600);
      if (p.price != null && p.price !== '') patch.price = num(p.price, 0, 1e6, a.price);
      if (p.paid != null) patch.pay = { ...(a.pay || {}), paid: num(p.paid, 0, 1e6, 0), at: new Date().toISOString() };
      if (p.res_id != null) { const r = B.res.find(x => x.id === +p.res_id); if (!r) return [400, { error: 'res' }]; patch.res_id = r.id; patch.group_id = r.group_id || null; }
      if (p.name != null) patch.name = clean(p.name, 80);
      if (p.phone != null) { const ph = phoneN(p.phone); if (!ph) return [400, { error: 'phone' }]; patch.phone = ph; }
      if (p.email != null) patch.email = mailN(p.email) || null;
      try { await db('book_appt?id=eq.' + enc(a.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }); } catch (e) { if (conflict(e)) return [409, { error: 'taken' }]; throw e; }
      if (patch.status && patch.status !== a.status) {
        if (patch.status === 'cancelled') notifyWait(B, a).catch(() => {});
        if (b.notify !== false && ['cancelled', 'confirmed'].includes(patch.status)) notifyCust(B, a, patch.status === 'cancelled' ? 'התור ב' + when(Date.parse(a.start_at)) + ' בוטל.' : 'התור ב' + when(Date.parse(a.start_at)) + ' אושר.').catch(() => {});
      }
      return [200, { ok: true }];
    }
    case 'manual': { if (!canWork(role)) return [403, { error: 'forbidden' }]; return createAppt(B, b, { force: true, req: b._req }); }
    case 'custs': {
      if (!canWork(role)) return [403, { error: 'forbidden' }]; const q = clean(b.q, 60).replace(/[,()*]/g, ' ');
      let path = 'book_cust?biz_id=eq.' + B.biz.id + '&order=updated_at.desc&limit=500&select=id,name,phone,email,tags,note,marketing,created_at,updated_at,fields';
      if (q) path += '&or=(name.ilike.*' + enc(q) + '*,phone.ilike.*' + enc(q) + '*,email.ilike.*' + enc(q) + '*)';
      const L = await db(path); return [200, { items: (L || []).map(c => ({ ...c, fields: Object.fromEntries(Object.entries(c.fields || {}).filter(([, f]) => !f.sens || canEdit(role))) })) }];
    }
    case 'custSave': {
      if (!canWork(role)) return [403, { error: 'forbidden' }]; const cu = b.cust || {}, f = {};
      Object.entries(cu.fields && typeof cu.fields === 'object' ? cu.fields : {}).slice(0, 60).forEach(([k, v]) => { if (v && typeof v === 'object') f[clean(k, 20)] = { label: clean(v.label, 120), v: clean(v.v, 600), at: clean(v.at, 10), sens: !!v.sens }; });
      const patch = { name: clean(cu.name, 80), email: mailN(cu.email) || null, note: clean(cu.note, 2000), tags: (Array.isArray(cu.tags) ? cu.tags : []).map(x => clean(x, 30)).filter(Boolean).slice(0, 20), marketing: !!cu.marketing, fields: f, updated_at: new Date().toISOString() };
      if (+cu.id > 0) { if (cu.phone) { const ph = phoneN(cu.phone); if (!ph) return [400, { error: 'phone' }]; patch.phone = ph; } await db('book_cust?id=eq.' + (+cu.id) + '&biz_id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }); return [200, { ok: true }]; }
      const ph = phoneN(cu.phone); if (!ph || !patch.name) return [400, { error: 'bad' }];
      try { const r = await db('book_cust', { method: 'POST', body: JSON.stringify({ ...patch, phone: ph, biz_id: B.biz.id }) }); return [200, { id: r[0].id }]; } catch (e) { if (/23505|duplicate/.test(e.message)) return [409, { error: 'exists' }]; throw e; }
    }
    case 'custDel': {
      if (!canEdit(role)) return [403, { error: 'forbidden' }]; const id = +b.id; if (!(id > 0)) return [400, { error: 'bad' }];
      await db('book_appt?cust_id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cust_id: null }) });
      await db('book_cust?id=eq.' + id + '&biz_id=eq.' + B.biz.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return [200, { ok: true }];
    }
    case 'ledger': {
      if (!canEdit(role)) return [403, { error: 'forbidden' }];
      const rows = (await db('book_pay?biz_id=eq.' + B.biz.id + '&order=id.desc&limit=2000')) || [], pl = (await site()).plans.find(p => p.id === (B.biz.cfg || {}).plan);
      return [200, { totals: ledgerSum(rows), items: rows, plan: pl ? { name: pl.name, mode: pl.mode, perBooking: pl.perBooking, pct: pl.pct, monthly: pl.monthly } : null }];
    }
    case 'refund': return canEdit(role) ? doRefund(B, b) : [403, { error: 'forbidden' }];
    case 'waits': { if (!canWork(role)) return [403, { error: 'forbidden' }]; return [200, { items: await db('book_wait?biz_id=eq.' + B.biz.id + '&order=day.asc,id.asc&limit=300') }]; }
    case 'waitDel': { if (!canWork(role)) return [403, { error: 'forbidden' }]; await db('book_wait?id=eq.' + (+b.id) + '&biz_id=eq.' + B.biz.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return [200, { ok: true }]; }
  }
  return [400, { error: 'action' }];
};

/* ===== הכניסה ===== */
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const b = readBody(req) || {}, a = String(b.a || '');
  const out = ([st, o]) => json(res, st, o);
  try {
    /* ציבורי */
    if (a === 'biz') { const B = await load(b.s); if (!B) return json(res, 404, { error: 'none' }); const S = await site(); return json(res, 200, pubView(B, S)); }
    if (a === 'slots') return out(await slotsAction(b));
    if (a === 'book') {
      if (b.hp) return json(res, 200, { ok: true }); if (limited(req, 20, 'b')) return json(res, 429, { error: 'rate' });
      const B = await load(b.s); if (!B || B.biz.status !== 'open') return json(res, 404, { error: 'closed' }); return out(await createAppt(B, b, { req }));
    }
    if (a === 'view' || a === 'cancel' || a === 'ics') {
      const B = await load(b.s); if (!B) return json(res, 404, { error: 'none' }); const ap = await getByToken(B, b.m, b.k); if (!ap) return json(res, 404, { error: 'none' });
      if (a === 'ics') { res.statusCode = 200; res.setHeader('Content-Type', 'text/calendar; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="appointment.ics"'); return res.end(ics(B, ap)); }
      if (a === 'view') return json(res, 200, apptPub(B, ap));
      const v = apptPub(B, ap); if (!v.canCancel) return json(res, 400, { error: 'late', cancelH: v.cancelH });
      await db('book_appt?id=eq.' + enc(ap.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }) });
      notifyWait(B, ap).catch(() => {}); return json(res, 200, { ok: true });
    }
    if (a === 'paytx') {
      const B = await load(b.s); if (!B) return json(res, 404, { error: 'none' }); const ap = await getByToken(B, b.m, b.k); if (!ap) return json(res, 404, { error: 'none' });
      const SS = await site(); if ((ap.pay || {}).mode !== 'site' || !SS.sitePay || !['held', 'pending', 'confirmed'].includes(ap.status)) return json(res, 400, { error: 'nopay' });
      if ((+ap.pay.due || 0) - (+ap.pay.paid || 0) <= 0.001) return json(res, 400, { error: 'paid' });
      if (ap.status === 'held' && ap.hold_until && Date.parse(ap.hold_until) < Date.now()) return json(res, 400, { error: 'expired' });
      return json(res, 200, await payInfo(B, B.svcs.find(x => x.id === ap.svc_id), ap));
    }
    if (a === 'paysumit' || a === 'ppcreate' || a === 'ppcapture') {
      const B = await load(b.s); if (!B) return json(res, 404, { error: 'none' }); const ap = await getByToken(B, b.m, b.k); if (!ap) return json(res, 404, { error: 'none' });
      const SS = await site(), pv = await payProvs(), prov = a === 'paysumit' ? 'sumit' : 'paypal', due = r2m((+(ap.pay || {}).due || 0) - (+(ap.pay || {}).paid || 0));
      if ((ap.pay || {}).mode !== 'site' || !SS.sitePay || !pv.includes(prov) || !['held', 'pending', 'confirmed'].includes(ap.status)) return json(res, 400, { error: 'nopay' });
      if (due <= 0.001) return json(res, 400, { error: 'paid' });
      if (ap.status === 'held' && ap.hold_until && Date.parse(ap.hold_until) < Date.now()) return json(res, 400, { error: 'expired' });
      const svc = B.svcs.find(x => x.id === ap.svc_id), desc = B.biz.name + ' · ' + (svc ? svc.name : '');
      try {
        if (a === 'paysumit') {
          const token = String(b.token || ''); if (!token || token.length > 400) return json(res, 400, { error: 'bad' });
          const c = await require('./_sumit').charge({ token, amount: due, name: clean(b.name || ap.name, 80), email: ap.email || clean(b.email, 120), ref: ap.id, desc });
          if (!c.ok) return json(res, c.system ? 503 : 402, { error: c.system ? 'provider' : 'payment', message: c.message || '' });
          const r = await settle(ap, c.amount || due, 'sumit:' + c.paymentId); return json(res, 200, { ok: true, ...r });
        }
        const PP = require('./_paypal');
        if (a === 'ppcreate') { const ppid = await PP.create(due, ap.id, desc, ap.email || ''); return json(res, 200, { ppid }); }
        const c = await PP.capture(String(b.ppid || '')); if (!c.ok) return json(res, 402, { error: 'payment' });
        const r = await settle(ap, c.amount || due, 'paypal:' + c.txn); return json(res, 200, { ok: true, ...r });
      } catch (e) { console.error('book pay', e.message); return json(res, 502, { error: 'provider' }); }
    }
    if (a === 'wait') {
      if (b.hp) return json(res, 200, { ok: true }); if (limited(req, 10, 'w')) return json(res, 429, { error: 'rate' });
      const B = await load(b.s); if (!B || B.biz.status !== 'open') return json(res, 404, { error: 'closed' });
      const phone = phoneN(b.phone), email = mailN(b.email), name = clean(b.name, 80); if (!phone || name.length < 2 || !K.isDate(b.day)) return json(res, 400, { error: 'bad' });
      const svc = B.svcs.find(s => s.id === +b.svc);
      await db('book_wait', { method: 'POST', body: JSON.stringify({ biz_id: B.biz.id, svc_id: svc ? svc.id : null, day: b.day, name, phone, email: email || null }) }); return json(res, 200, { ok: true });
    }
    /* בעל האתר */
    if (a === 'site') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, { error: 'forbidden' });
      if (b.set) { const o = b.set; await saveSetting('book', { open: o.open === true, sms: o.sms === true, note: clean(o.note, 600), max: num(o.max, 1, 200, 5), plans: Array.isArray(o.plans) ? cleanPlans(o.plans) : (await site()).plans, sitePay: o.sitePay === undefined ? (await site()).sitePay : o.sitePay === true }); }
      return json(res, 200, { ...(await site()), sitePayReady: !!(require('./_auction_pay').siteNed() || require('./_sumit').ready() || require('./_paypal').ready()), payProvs: await payProvs(), admin: true });
    }
    /* צוות העסק */
    const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' });
    if (a === 'plan') { if (!isAdmin(u)) return json(res, 403, { error: 'forbidden' }); const B0 = await load(b.s, true); if (!B0) return json(res, 404, { error: 'none' }); const pid = String(b.plan || ''); if (pid && !(await site()).plans.some(p => p.id === pid)) return json(res, 400, { error: 'plan' }); const n = { ...(B0.biz.cfg || {}), plan: pid }; await enforcePlan(n); await db('book_biz?id=eq.' + B0.biz.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg: n, updated_at: new Date().toISOString() }) }); drop(B0); return json(res, 200, { ok: true }); }
    if (a === 'mine') { const S = await site(); return json(res, 200, { items: await mine(u, b.own === true), canCreate: S.open || isAdmin(u), note: S.note, admin: isAdmin(u) }); }
    if (a === 'create') return out(await create(u, b));
    if (a === 'ledger' && !b.s) {
      if (!isAdmin(u)) return json(res, 403, { error: 'forbidden' });
      const [rows, bl] = await Promise.all([db('book_pay?select=biz_id,kind,amount,fee&limit=50000'), db('book_biz?select=id,slug,name,cfg&limit=500')]), by = new Map();
      (rows || []).forEach(r => { if (!by.has(r.biz_id)) by.set(r.biz_id, []); by.get(r.biz_id).push(r); });
      return json(res, 200, { items: (bl || []).filter(x => by.has(x.id)).map(x => ({ slug: x.slug, name: x.name, plan: (x.cfg || {}).plan || '', ...ledgerSum(by.get(x.id)) })) });
    }
    if (a === 'payout') {
      if (!isAdmin(u)) return json(res, 403, { error: 'forbidden' }); const B1 = await load(b.s, true); if (!B1) return json(res, 404, { error: 'none' });
      const amount = r2m(num(b.amount, 0, 1e7, 0)); if (!(amount > 0)) return json(res, 400, { error: 'amount' });
      if (a === 'payout') { await db('book_pay', { method: 'POST', body: JSON.stringify({ biz_id: B1.biz.id, kind: 'payout', amount, note: clean(b.note, 200) }) }); return json(res, 200, { ok: true }); }
    }
    const B = await load(b.s, true); if (!B) return json(res, 404, { error: 'none' });
    return out(await MAN(u, B, { ...b, _req: req }));
  } catch (e) { console.error('book', e); json(res, 500, { error: 'server error' }); }
};
module.exports.remind = remind;
module.exports.nedPaid = nedPaid;
module.exports.doRefund = doRefund;
module.exports.ledgerSum = ledgerSum;
module.exports.cleanBizCfg = cleanBizCfg;
module.exports.cleanSvcCfg = cleanSvcCfg;
module.exports.readAnswers = readAnswers;
