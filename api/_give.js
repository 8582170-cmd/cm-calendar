/* אתר התרמה (myluach.org/give): השרת.
   כתובת: /api/pricing?c=_give, פעולה בשדה a.
   ציבורי: camp (כל מה שהדף מציג), feed (רשימת תורמים בעמודים), donate, status, kcheck (חזרה מקשר)
   מנהל הקמפיין (בעלים / מנהלים / בעלי האתר): mine, create, get, save, state, teams, teamsSave, reps, repsSave,
             donations, manual, donUpdate, report, mediaUrl
   בעל האתר: site (הגדרות האגף)
   הטבלאות: tools/supabase_give.sql. הסליקה: _auction_pay.js (נדרים פלוס / קשר של הארגון). */
'use strict';
const crypto = require('node:crypto');
const { db, json, readBody, getUser, env, loadSetting, saveSetting, reqMeta, loadConfig } = require('./_lib');
const PAY = require('./_auction_pay');

const r2 = n => Math.round(n * 100) / 100;
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n || 200);
const phoneN = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0\d{8,9}$/.test(v) ? v : ''; };
const mailN = v => { v = String(v || '').trim().toLowerCase(); return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) && v.length <= 120 ? v : ''; };
const url = v => /^https:\/\/[^\s"<>]+$/.test(String(v || '').trim()) ? String(v).trim().slice(0, 400) : '';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
const SITE = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const enc = encodeURIComponent;
const IL = { lat: 31.778, lng: 35.235, tz: 'Asia/Jerusalem', il: true };

async function all(path) {
  const out = []; for (let off = 0; off < 200000; off += 1000) { const L = await db(path + (path.includes('?') ? '&' : '?') + 'limit=1000&offset=' + off); out.push(...(L || [])); if (!L || L.length < 1000) break; }
  return out;
}
const FEE = require('./_fee');
async function site() { const s = await loadSetting('give').catch(() => ({})) || {}; return { open: s.open === true, reqPay: s.reqPay === true, sitePay: s.sitePay === true, kehilot: s.kehilotOff !== true, note: String(s.note || ''), fee: FEE.feeOf(s.fee), reqOn: s.reqOff !== true, listPub: s.listOff !== true, intro: String(s.intro || ''), infoText: String(s.infoText || '') }; }
const admins = () => [env('OWNER_EMAIL'), ...env('AUCTION_ADMINS').split(','), ...env('GIVE_ADMINS').split(',')].map(s => s.trim().toLowerCase()).filter(Boolean);
const isAdmin = u => !!u && admins().includes(String(u.email || '').toLowerCase());

/* ===== יום נתינה: דף משותף לכמה קמפיינים, עם שעון משותף, סכום מצטבר ולוח תוצאות (setting giveDays) ===== */
const dayId = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 40);
function cleanDay(x) {
  x = x && typeof x === 'object' ? x : {}; const m = x.match && typeof x.match === 'object' ? x.match : {}, ts = v => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : '');
  const seen = {}, camps = (Array.isArray(x.campaigns) ? x.campaigns : []).map(v => String(v || '').trim().toLowerCase()).filter(v => /^[a-z0-9][a-z0-9-]{2,39}$/.test(v) && !seen[v] && (seen[v] = 1)).slice(0, 200);
  return { id: dayId(x.id), title: clean(x.title, 120), sub: clean(x.sub, 600), note: clean(x.note, 800), start: ts(x.start), end: ts(x.end), goal: Math.max(0, Math.min(1e10, +x.goal || 0)), on: x.on === true, listed: x.listed === true, joinOpen: x.joinOpen === true,
    match: { on: m.on === true, ratio: Math.max(1.1, Math.min(10, +m.ratio || 2)), cap: Math.max(0, Math.min(1e10, +m.cap || 0)), text: clean(m.text, 300) }, campaigns: camps };
}
async function daysOf() { const raw = await loadSetting('giveDays').catch(() => ({})) || {}; return (Array.isArray(raw.list) ? raw.list : []).map(cleanDay).filter(d => d.id); }
const DAYC = new Map();
async function dayView(d) {
  const k = d.id, hit = DAYC.get(k); if (hit && Date.now() - hit.at < 8000 && hit.sig === JSON.stringify(d)) return hit.v;
  const from = d.start ? Date.parse(d.start) : 0, to = d.end ? Date.parse(d.end) : Infinity, now = Date.now(), list = [];
  for (const slug of d.campaigns) {
    try {
      const s = await load(slug); if (!s) continue; const c = cfgOf(s); if (s.status === 'draft') continue;
      const A = await all('give_donation?campaign_id=eq.' + s.id + '&status=eq.paid&select=total,paid_at,created_at');
      let raised = 0, count = 0; A.forEach(r => { const t = Date.parse(r.paid_at || r.created_at); if (t >= from && t <= to) { raised += +r.total; count++; } });
      list.push({ slug, title: c.title, logo: c.logo || '', goal: c.goal || 0, raised: r2(raised), count, url: SITE() + '/give/' + slug });
    } catch (e) { console.error('day camp', slug, e.message); }
  }
  list.sort((a, b) => b.raised - a.raised);
  const raised = r2(list.reduce((t, x) => t + x.raised, 0)), count = list.reduce((t, x) => t + x.count, 0);
  const bonus = d.match.on ? r2(Math.min(d.match.cap || Infinity, raised * (d.match.ratio - 1))) : 0;
  const v = { day: { id: d.id, title: d.title, sub: d.sub, note: d.note, start: d.start, end: d.end, goal: d.goal, match: d.match.on ? { ratio: d.match.ratio, cap: d.match.cap, text: d.match.text } : null },
    time: { started: !d.start || now >= from, ended: !!d.end && now > to, now: new Date().toISOString() }, totals: { raised, count, campaigns: list.length, goal: d.goal, bonus }, list };
  DAYC.set(k, { at: Date.now(), sig: JSON.stringify(d), v }); return v;
}
/* ===== ההגדרות ===== */
const THEMES = ['classic', 'modern', 'festive', 'warm', 'minimal', 'night', 'royal', 'nature'];
const FEAT = { match: true, bonus: true, dedic: true, message: true, anon: true, monthly: true, offline: true, feed: true, popups: true, teams: true, reps: true, chart: true, countdown: true, screen: true, share: true, amounts: true, donors: true, auction: true, repSelect: true, teamSelect: true };
const DEDIC = ['לעילוי נשמת', 'לרפואת', 'לזכות', 'להצלחת', 'לזיווג הגון'];
function cfgOf(s) {
  const c = s.cfg || {}, f = { ...FEAT, ...(c.f || {}) }, m = c.match || {}, mo = c.monthly || {};
  const amounts = Array.isArray(c.amounts) && c.amounts.length ? c.amounts : [{ v: 180 }, { v: 360 }, { v: 500 }, { v: 1000 }, { v: 1800 }, { v: 3600 }];
  const matchers = Array.isArray(m.matchers) ? m.matchers : [];
  return {
    title: c.title || s.name || '', sub: c.sub || '', story: c.story || '', logo: c.logo || '', banner: c.banner || '', video: c.video || '', gallery: Array.isArray(c.gallery) ? c.gallery : [],
    listed: c.listed === true, theme: THEMES.includes(c.theme) ? c.theme : 'classic', color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '', color2: /^#[0-9a-f]{6}$/i.test(c.color2 || '') ? c.color2 : '', heroLayout: ['banner', 'split', 'center'].includes(c.heroLayout) ? c.heroLayout : 'banner',
    goal: +c.goal || 0, bonus: (Array.isArray(c.bonus) ? c.bonus : []).filter(x => +x.goal > 0).sort((a, b) => a.goal - b.goal),
    startAt: c.startAt || '', endAt: c.endAt || '', shabbat: ['pause', 'block', 'full'].includes(c.shabbat) ? c.shabbat : 'pause',
    endMode: ['close', 'open', 'extend'].includes(c.endMode) ? c.endMode : 'close', extHours: Math.max(1, Math.min(168, +c.extHours || 6)), extTimes: Math.max(1, Math.min(10, +c.extTimes || 1)),
    amounts: amounts.map(a => ({ v: +a.v, label: String(a.label || '') })).filter(a => a.v > 0).slice(0, 12), min: Math.max(1, +c.min || 18), dedicTypes: Array.isArray(c.dedicTypes) && c.dedicTypes.length ? c.dedicTypes : DEDIC,
    match: { on: !!m.on && f.match, ratio: Math.max(1.1, Math.min(10, +m.ratio || 2)), cap: +m.cap || matchers.reduce((t, x) => t + (+x.amount || 0), 0), matchers, auction: !!m.auction, repsX: !!m.repsX, title: m.title || '' },
    monthly: { on: !!mo.on && f.monthly, def: Math.max(0, Math.min(60, mo.def != null ? +mo.def : 12)), max: Math.max(2, Math.min(60, +mo.max || 36)), unlimited: mo.unlimited !== false, count: mo.count === 'first' ? 'first' : 'months', countUnl: Math.max(1, Math.min(60, +mo.countUnl || 12)) },
    f, auction: /^[a-z0-9][a-z0-9-]{2,39}$/.test(c.auction || '') ? c.auction : '', auctionCount: c.auctionCount !== false,
    rcp: { mail: !(c.rcp && c.rcp.mail === false), org: (c.rcp && c.rcp.org) || '', num: (c.rcp && c.rcp.num) || '', note: (c.rcp && c.rcp.note) || '' },
    thanks: c.thanks || '', terms: c.terms || '', faq: Array.isArray(c.faq) ? c.faq : [], phoneLine: c.phoneLine || '', screenNote: c.screenNote || '', feedSort: c.feedSort === 'big' ? 'big' : 'new'
  };
}

/* ===== טעינה ומטמון ===== */
const CACHE = new Map(), STATS = new Map();
async function load(slug, fresh) {
  slug = String(slug || '').toLowerCase(); if (!SLUG.test(slug)) return null;
  const c = CACHE.get(slug); if (!fresh && c && Date.now() - c.at < 15000) return c.v;
  const L = await db('give_campaign?slug=eq.' + enc(slug) + '&select=*&limit=1'); const s = L && L[0]; if (!s) { CACHE.delete(slug); return null; }
  const [T, R] = await Promise.all([db('give_team?campaign_id=eq.' + s.id + '&select=*&order=sort.asc,id.asc&limit=1000'), all('give_rep?campaign_id=eq.' + s.id + '&select=*&order=code.asc')]);
  const v = { ...s, teams: T || [], reps: R || [] }; CACHE.set(slug, { at: Date.now(), v }); if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value);
  return v;
}
const drop = slug => { CACHE.delete(String(slug || '').toLowerCase()); STATS.delete(String(slug || '').toLowerCase()); };

/* הסכומים: תרומות ששולמו + המכירה הסינית המקושרת + ההכפלה */
async function stats(s, fresh) {
  const k = s.slug, x = STATS.get(k); if (!fresh && x && Date.now() - x.at < 8000) return x.v;
  const c = cfgOf(s);
  const D = await all('give_donation?campaign_id=eq.' + s.id + '&status=eq.paid&select=id,rep_id,team_id,amount,months,total,channel,name,show_name,anon,dedic_type,dedic_name,message,hidden,pinned,created_at,paid_at&order=paid_at.desc');
  const rep = {}, team = {}; let raised = 0;
  s.reps.forEach(r => { rep[r.id] = { amount: 0, count: 0 }; }); s.teams.forEach(t => { team[t.id] = { amount: 0, count: 0 }; });
  D.forEach(d => { const v = +d.total || 0; raised += v; if (d.rep_id && rep[d.rep_id]) { rep[d.rep_id].amount += v; rep[d.rep_id].count++; } if (d.team_id && team[d.team_id]) { team[d.team_id].amount += v; team[d.team_id].count++; } });
  let auction = 0, aCount = 0;
  if (c.auction && c.f.auction && c.auctionCount) {
    try {
      const A = await db('auction_sale?slug=eq.' + enc(c.auction) + '&select=id&limit=1'), aid = A && A[0] && A[0].id;
      if (aid) {
        const [O, AR] = await Promise.all([all('auction_order?sale_id=eq.' + aid + '&status=eq.paid&select=amount,rep_id'), db('auction_rep?sale_id=eq.' + aid + '&select=id,code&limit=5000')]);
        const code = new Map((AR || []).map(r => [r.id, r.code])), byCode = new Map(s.reps.map(r => [r.code, r]));
        O.forEach(o => { const v = +o.amount || 0; auction += v; aCount++; const g = o.rep_id && byCode.get(code.get(o.rep_id)); if (g) { rep[g.id].amount += v; rep[g.id].count++; if (g.team_id && team[g.team_id]) { team[g.team_id].amount += v; team[g.team_id].count++; } } });
      }
    } catch (e) { console.error('give auction', e.message); }
  }
  const base = raised + (c.match.auction ? auction : 0);
  const matched = c.match.on ? r2(Math.min(c.match.cap > 0 ? c.match.cap : Infinity, base * (c.match.ratio - 1))) : 0;
  const v = { raised: r2(raised), auction: r2(auction), auctionCount: aCount, matched, total: r2(raised + auction + matched), donors: D.length + aCount, rep, team, D };
  STATS.set(k, { at: Date.now(), v }); if (STATS.size > 200) STATS.delete(STATS.keys().next().value);
  return v;
}

/* ===== זמנים: התחלה, סיום, עצירה בשבת, הארכה ===== */
let SH = null; const SHC = { at: 0 };
async function shabbatNow() {
  if (Date.now() - SHC.at < 60000) return SHC.v;
  const S = require('./_shabbat'), conf = await loadConfig().catch(() => ({}));
  const st = await S.status(Date.now(), IL, conf).catch(() => ({ closed: false }));
  SHC.at = Date.now(); SHC.v = { closed: !!st.closed, end: st.end || null, next: st.next || null, conf }; return SHC.v;
}
async function timing(s, c, st) {
  const now = Date.now(), sh = await shabbatNow(), start = Date.parse(c.startAt) || Date.parse(s.created_at) || now, end0 = Date.parse(c.endAt) || 0;
  let end = end0;
  if (end0 && c.shabbat === 'pause') {
    const S = require('./_shabbat');
    for (let i = 0; i < 6; i++) { const B = await S.blocksBetween(start, end, IL, sh.conf).catch(() => []); const add = B.reduce((t, b) => t + Math.max(0, Math.min(b.end, end) - Math.max(b.start, start)), 0); const n2 = end0 + add; if (Math.abs(n2 - end) < 1000) break; end = n2; }
  }
  let ext = 0;
  if (end && c.endMode === 'extend' && now >= end) {
    const goal = c.goal || 0, H = c.extHours * 3600e3;
    if (goal && st.total < goal) { ext = Math.min(c.extTimes, Math.floor((now - end) / H) + 1); }
    else { ext = Math.min(c.extTimes, Math.floor((now - end) / H)); }
    end += ext * H;
  }
  const before = !!(c.startAt && Date.parse(c.startAt) > now), ended = !!(end && now >= end);
  const paused = sh.closed && c.shabbat === 'pause' && !!end && !ended;
  let can = s.status === 'open' && !before && !(ended && c.endMode !== 'open') && !sh.closed, why = '';
  if (s.status !== 'open') why = s.status === 'draft' ? 'הקמפיין עוד לא נפתח' : 'הקמפיין הסתיים';
  else if (before) why = 'הקמפיין ייפתח בקרוב';
  else if (ended && c.endMode !== 'open') why = 'הקמפיין הסתיים. תודה לכל התורמים!';
  else if (sh.closed) why = 'שבת שלום! התרומות ייפתחו מחדש במוצאי שבת';
  return { now, start: c.startAt || '', end: end ? new Date(end).toISOString() : '', end0: c.endAt || '', ext, before, ended, paused, shabbat: sh.closed, shabbatEnd: sh.end ? new Date(sh.end).toISOString() : '', full: sh.closed && c.shabbat === 'full', can, why };
}

/* ===== מה הציבור רואה ===== */
const ANON = 'תורם/ת בעילום שם';
const pubName = d => d.anon ? ANON : (d.show_name || d.name || 'תורם/ת');
function pubDon(d, c, s) {
  const r = d.rep_id ? s.reps.find(x => x.id === d.rep_id) : null;
  return { id: d.id.slice(2, 10), name: pubName(d), amount: c.f.amounts ? +d.total : null, monthly: +d.months !== 1 ? { amount: +d.amount, months: +d.months } : null, dedic: c.f.dedic && d.dedic_name ? (d.dedic_type || '') + ' ' + d.dedic_name : '', message: c.f.message ? d.message || '' : '', rep: r ? r.name || '' : '', at: d.paid_at || d.created_at, pinned: !!d.pinned, offline: d.channel === 'offline' };
}
function pubCfg(c) {
  const o = { ...c }; delete o.faq; o.faq = c.faq; o.match = { on: c.match.on, ratio: c.match.ratio, cap: c.match.cap, matchers: c.match.matchers.map(m => ({ name: m.name || '', logo: m.logo || '', amount: c.f.amounts ? +m.amount || 0 : null })), repsX: c.match.repsX, title: c.match.title };
  return o;
}
async function campView(s, b) {
  const c = cfgOf(s), st = await stats(s), t = await timing(s, c, st), X = c.match.on && c.match.repsX ? c.match.ratio : 1;
  const teams = c.f.teams ? s.teams.filter(x => x.active !== false).map(x => ({ id: x.id, name: x.name, descr: x.descr || '', img: x.img || '', goal: +x.goal || 0, amount: r2((st.team[x.id] || {}).amount * X || 0), count: (st.team[x.id] || {}).count || 0, reps: s.reps.filter(r => r.team_id === x.id && r.active !== false).length })) : [];
  const reps = c.f.reps ? s.reps.filter(r => r.active !== false).map(r => ({ id: r.id, code: r.code, name: r.name || '', team: r.team_id || null, goal: +r.goal || 0, img: r.img || '', amount: r2((st.rep[r.id] || {}).amount * X || 0), count: (st.rep[r.id] || {}).count || 0 })) : [];
  const vis = st.D.filter(d => !d.hidden);
  const one = b.r ? s.reps.find(r => r.code === String(b.r).replace(/\D/g, '') && r.active !== false) : null;
  const tm = b.t ? s.teams.find(x => String(x.id) === String(b.t) && x.active !== false) : null;
  let feed = vis; if (one) feed = feed.filter(d => d.rep_id === one.id); else if (tm) feed = feed.filter(d => d.team_id === tm.id);
  const pinned = feed.filter(d => d.pinned);
  feed = pinned.concat(feed.filter(d => !d.pinned)).slice(0, 60);
  let goal = c.goal, stage = 0;
  if (c.f.bonus && c.bonus.length && goal && st.total >= goal) { const nx = c.bonus.find(x => +x.goal > st.total); stage = nx ? c.bonus.indexOf(nx) + 1 : c.bonus.length; goal = nx ? +nx.goal : +c.bonus[c.bonus.length - 1].goal; }
  return {
    slug: s.slug, status: s.status, cfg: pubCfg(c), org: require('./_orgpages').pub((s.cfg || {}).org, { faq: c.faq, terms: c.terms, cross: c.auction && c.f.auction ? { url: SITE() + '/auction?s=' + c.auction, label: 'המכירה הסינית' } : null }), time: t,
    totals: { total: st.total, raised: st.raised, auction: c.f.auction ? st.auction : 0, matched: st.matched, donors: c.f.donors ? st.donors : null, goal, goal0: c.goal, stage, stageTitle: stage ? String((c.bonus[Math.min(stage, c.bonus.length) - 1] || {}).title || '') : '' },
    teams, reps, feed: c.f.feed ? feed.map(d => pubDon(d, c, s)) : [], feedTotal: c.f.feed ? (one ? feed.length : tm ? feed.length : vis.length) : 0,
    rep: one ? { id: one.id, code: one.code, name: one.name || '', img: one.img || '', story: one.story || '', goal: +one.goal || 0, team: one.team_id || null, amount: r2((st.rep[one.id] || {}).amount * X || 0), count: (st.rep[one.id] || {}).count || 0 } : null,
    team: tm ? { id: tm.id, name: tm.name, descr: tm.descr || '', img: tm.img || '', goal: +tm.goal || 0, amount: r2((st.team[tm.id] || {}).amount * X || 0), count: (st.team[tm.id] || {}).count || 0 } : null,
    payVia: PAY.provs(s, await site())[0] || '',
    auctionUrl: c.auction && c.f.auction ? SITE() + '/auction?s=' + c.auction : ''
  };
}

/* ===== תרומה ===== */
const newId = () => 'gv' + crypto.randomBytes(11).toString('hex');
async function donate(req, s, b) {
  const c = cfgOf(s), st = await stats(s), t = await timing(s, c, st), S = await site();
  if (!t.can) return { status: 409, error: 'closed', message: t.why };
  if (!PAY.provs(s, S).length) return { status: 503, error: 'pay', message: 'הסליקה עוד לא הוגדרה בקמפיין' };
  const amount = r2(+b.amount || 0);
  if (!(amount >= c.min)) return { status: 400, error: 'amount', message: 'הסכום המינימלי לתרומה: ' + c.min + ' ₪' };
  if (amount > 1000000) return { status: 400, error: 'amount', message: 'סכום גבוה מדי' };
  let months = 1;
  if (b.monthly) { if (!c.monthly.on) return { status: 400, error: 'monthly', message: 'הוראת קבע לא פעילה בקמפיין' }; months = Math.floor(+b.months || 0); if (months === 0 && !c.monthly.unlimited) months = c.monthly.def || 12; months = Math.max(c.monthly.unlimited ? 0 : 2, Math.min(c.monthly.max, months)); if (months === 1) months = 2; }
  const total = months === 1 ? amount : c.monthly.count === 'first' ? amount : r2(amount * (months || c.monthly.countUnl));
  const name = clean(b.name, 80), phone = phoneN(b.phone), email = mailN(b.email);
  if (!name) return { status: 400, error: 'name', message: 'נא למלא שם' };
  if (!phone && !email) return { status: 400, error: 'contact', message: 'נא למלא טלפון או מייל' };
  const lockRep = b.link ? s.reps.find(r => r.code === String(b.link).replace(/\D/g, '') && r.active !== false) : null;
  const rep = lockRep || (c.f.repSelect && b.rep ? s.reps.find(r => (String(r.id) === String(b.rep) || r.code === String(b.rep)) && r.active !== false) : null);
  const team = rep && rep.team_id ? rep.team_id : (c.f.teamSelect && b.team && s.teams.find(x => String(x.id) === String(b.team)) ? +b.team : null);
  const m = reqMeta(req) || {};
  const row = { id: newId(), campaign_id: s.id, rep_id: rep ? rep.id : null, team_id: team, amount, months, total, status: 'pending', channel: 'web', name, show_name: clean(b.showName, 80) || null, anon: c.f.anon && !!b.anon,
    dedic_type: c.f.dedic && clean(b.dedicName, 80) ? clean(b.dedicType, 30) || null : null, dedic_name: c.f.dedic ? clean(b.dedicName, 80) || null : null, message: c.f.message ? clean(b.message, 300) || null : null,
    phone: phone || null, email: email || null, city: clean(b.city, 60) || null, ip: m.ip || null, ip_geo: m.geo || null, ua: m.ua ? String(m.ua).slice(0, 200) : null };
  await db('give_donation', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  const desc = 'תרומה: ' + c.title + (months !== 1 ? ' (הוראת קבע)' : '');
  try {
    const w = await PAY.webTx(s, { id: row.id, amount, email, name, phone }, S, desc, { p2: 'give:' + s.slug, back: SITE() + '/give?s=' + s.slug + '&kp=' + row.id, hk: months !== 1, months });
    if (!w) return { status: 503, error: 'pay', message: 'הסליקה לא זמינה' };
    return { status: 200, id: row.id, amount, months, total, ...w };
  } catch (e) { if (e.user) return { status: 400, error: 'pay', message: e.user }; console.error('give pay', e.message); return { status: 502, error: 'pay', message: 'לא הצלחנו להתחיל את התשלום. נסו שוב' }; }
}
async function markPaid(id, extra) {
  const U = await db('give_donation?id=eq.' + enc(id) + '&status=neq.paid', { method: 'PATCH', body: JSON.stringify({ ...(extra || {}), status: 'paid', paid_at: new Date().toISOString() }) });
  const d = U && U[0]; if (!d) return { already: true };
  const C = await db('give_campaign?id=eq.' + d.campaign_id + '&select=slug&limit=1'), slug = C && C[0] && C[0].slug; if (slug) STATS.delete(slug);
  const s = slug && await load(slug);
  if (s) { thankDonor(s, d).catch(e => console.error('give mail', e.message)); notifyPaid(s, d).catch(e => console.error('give notify', e.message)); }
  return { ok: true, donation: d };
}
async function nedPaid(p, ip) {
  const id = String(p.Param1 || p.param1 || ''); if (!/^gv[0-9a-f]{22}$/.test(id)) return { skipped: 'id' };
  const L = await db('give_donation?id=eq.' + id + '&select=id,amount,status,campaign_id&limit=1'); const d = L && L[0]; if (!d) return { error: 'no donation' };
  if (d.status === 'paid') return { already: true };
  const ok = /^(ok|1|true|success)$/i.test(String(p.Status || p.status || '')), paid = Number(p.Amount || p.amount || 0);
  const txn = String(p.TransactionId || p.TransactionID || p.KevaId || p.Id || p.ID || '');
  if (ok && (!paid || paid + 0.001 >= +d.amount)) return markPaid(id, { txn, callback: { ...p, _ip: ip || '' } });
  await db('give_donation?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', txn, callback: p }) });
  return { ok: true, failed: true };
}
async function kesherPaid(s, id, num) {
  const L = await db('give_donation?id=eq.' + enc(id) + '&campaign_id=eq.' + s.id + '&select=id,amount,status,callback&limit=1'), d = L && L[0];
  if (!d) return { status: 404, error: 'no donation' };
  if (d.status === 'paid') return { status: 200, already: true, ok: true };
  num = String(num || '').replace(/\D/g, ''); if (!num) return { status: 400, error: 'num', message: 'חסר מספר עסקה' };
  const used = await db('give_donation?txn=eq.K-' + num + '&select=id&limit=1').catch(() => []);
  if (used && used[0] && used[0].id !== d.id) return { status: 409, error: 'used', message: 'העסקה הזאת כבר שויכה לתרומה אחרת' };
  const r = await PAY.kesherCheck(s, num);
  if (!r.ok) return { status: 402, error: 'notpaid', message: r.msg || 'העסקה לא אושרה בקשר' };
  if (r.amount + 0.01 < +d.amount) return { status: 402, error: 'amount', message: 'הסכום בעסקה קטן מסכום התרומה' };
  return { status: 200, ...(await markPaid(d.id, { txn: 'K-' + r.num, callback: { kesher: r.raw } })), ok: true };
}

/* ===== מיילים ===== */
const senderName = (s, dflt) => String(((s.cfg || {}).mailName) || dflt || '').replace(/[<>"\\,;@]/g, '').trim().slice(0, 60);
const notifyList = s => (Array.isArray((s.cfg || {}).notify) ? s.cfg.notify : []).map(mailN).filter(Boolean).slice(0, 4);
async function thankDonor(s, d) {
  const c = cfgOf(s); if (!d.email || !c.rcp.mail) return; const { sendMail, frame, escH } = require('./_mail'), nm = senderName(s, c.title) || undefined;
  const when = new Date(d.paid_at || Date.now()).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' });
  const row = (k, v) => v ? '<tr><td style="padding:4px 12px 4px 0;color:#666">' + k + '</td><td style="padding:4px 0"><b>' + v + '</b></td></tr>' : '';
  const per = +d.months !== 1 ? ' לחודש, ' + (+d.months ? d.months + ' חודשים' : 'ללא הגבלה') : '';
  const body = '<p>שלום ' + escH(d.name || '') + ',</p><p>תודה רבה על תרומתכם לקמפיין <b>' + escH(c.title) + '</b>.</p>'
    + '<table role="presentation" style="border-collapse:collapse;margin:6px 0 12px">' + row('סכום', (+d.amount) + ' ₪' + per) + row('תאריך', escH(when)) + row('מספר תרומה', escH(String(d.id).slice(2, 10)))
    + row('הארגון', escH(c.rcp.org)) + row('מספר עמותה / עוסק', escH(c.rcp.num)) + row('הקדשה', d.dedic_name ? escH((d.dedic_type || '') + ' ' + d.dedic_name) : '') + '</table>'
    + (c.thanks ? '<p style="white-space:pre-line">' + escH(c.thanks) + '</p>' : '') + (c.rcp.note ? '<p style="white-space:pre-line;color:#444">' + escH(c.rcp.note) + '</p>' : '');
  const rt = notifyList(s)[0];
  await sendMail({ to: d.email, subject: 'אישור תרומה ותודה · ' + c.title, html: frame({ brand: nm, title: 'תודה רבה!', body, button: 'לדף הקמפיין', url: SITE() + '/give/' + s.slug }), fromName: nm, ...(rt ? { replyTo: rt } : {}) }, 'give');
}
async function notify(s, subject, body) {
  const to = notifyList(s); if (!to.length) return;
  const { sendMail, frame, escH } = require('./_mail'), c = cfgOf(s), nm = senderName(s, c.title) || undefined;
  const html = frame({ brand: nm, title: subject, body: body + '<p style="color:#666;font-size:13px">' + escH(c.title) + '</p>', button: 'לניהול הקמפיין', url: SITE() + '/give-manage?s=' + s.slug });
  for (const m of to) await sendMail({ to: m, subject: subject + ' · ' + c.title, html, fromName: nm }, 'give').catch(e => console.error('give notify', m, e.message));
}
async function notifyPaid(s, d) {
  if (!notifyList(s).length || ((s.cfg || {}).notifyMin && +d.total < +s.cfg.notifyMin)) return;
  const { escH } = require('./_mail'), r = d.rep_id ? s.reps.find(x => x.id === d.rep_id) : null;
  await notify(s, 'תרומה חדשה: ' + (+d.total) + ' ₪', '<p><b>' + escH(d.name || '') + '</b>' + (d.anon ? ' (בעילום שם)' : '') + '</p><p>סכום: <b>' + (+d.amount) + ' ₪</b>' + (+d.months !== 1 ? ' × ' + (d.months || 'ללא הגבלה') + ' חודשים' : '') + (r ? ' · נציג: ' + escH(r.name || r.code) : '') + '</p>' + (d.message ? '<p>' + escH(d.message) + '</p>' : '') + (d.phone ? '<p>טלפון: ' + escH(d.phone) + '</p>' : '') + (d.email ? '<p>מייל: ' + escH(d.email) + '</p>' : ''));
}

/* ===== ניהול ===== */
const managersOf = s => (Array.isArray((s.cfg || {}).managers) ? s.cfg.managers : []).map(mailN).filter(Boolean);
const canManage = (s, u) => !!u && (s.user_id === u.id || isAdmin(u) || managersOf(s).includes(String(u.email || '').toLowerCase()));
async function mineOr403(req, res, b) {
  const u = await getUser(req); if (!u) { json(res, 401, { error: 'login' }); return null; }
  const s = await load(b.s, true); if (!s) { json(res, 404, { error: 'no campaign' }); return null; }
  if (!canManage(s, u)) { json(res, 403, { error: 'not yours', email: u.email || '' }); return null; }
  return { u, s };
}
function mgrView(s, S) {
  const c = { ...(s.cfg || {}) }, openFee = require('./_openfee').need(s, S);
  if (c.pay && c.pay.kesher) { const k = { ...c.pay.kesher }; const hp = !!k.password; delete k.password; c.pay = { ...c.pay, kesher: { ...k, hasPassword: hp } }; }
  if (c.ivr && c.ivr.cc) { const cc = { ...c.ivr.cc }; const hp = !!cc.password; delete cc.password; c.ivr = { ...c.ivr, cc: { ...cc, hasPassword: hp } }; }
  if (c.ivr && c.ivr.ytoken) { const { ytoken, ...r } = c.ivr; c.ivr = { ...r, hasToken: true }; }
  const iv = c.ivr || {};
  return { openFee, ivrUrl: iv.key ? SITE() + '/api/pricing?c=_giveivr&s=' + s.slug + '&k=' + iv.key : '', ivrBase: SITE() + '/api/pricing?c=_giveivr', ivrKey: iv.key || '', ivrDefaults: Object.fromEntries(Object.entries(require('./_give_ivr').MSG).map(([k, m]) => [k, [m[0], m[1], require('./_give_ivr').partsOf(m[1])]])), id: s.id, slug: s.slug, name: s.name, status: s.status, cfg: c, eff: cfgOf(s), teams: s.teams, reps: s.reps, provs: PAY.provs(s, S), site: S, managers: managersOf(s), themes: THEMES, url: SITE() + '/give/' + s.slug, fee: FEE.pub(FEE.eff(s.cfg, S.fee)) };
}
function cleanCfg(old, b) {
  const c = { ...(old || {}) }, str = (k, n) => { if (b[k] != null) c[k] = clean(b[k], n); }, iso = k => { if (b[k] != null) c[k] = b[k] && !isNaN(Date.parse(b[k])) ? new Date(b[k]).toISOString() : ''; };
  str('title', 120); str('sub', 600); str('story', 20000); str('terms', 20000); str('thanks', 2000); str('phoneLine', 30); str('screenNote', 200); str('color', 7); str('color2', 7);
  ['logo', 'banner', 'video'].forEach(k => { if (b[k] != null) c[k] = url(b[k]); });
  if (Array.isArray(b.gallery)) c.gallery = b.gallery.map(url).filter(Boolean).slice(0, 30);
  if (b.org && typeof b.org === 'object') c.org = require('./_orgpages').clean(b.org, c.org);
  if (b.listed != null) c.listed = !!b.listed;
  if (b.rcp && typeof b.rcp === 'object') c.rcp = { mail: b.rcp.mail !== false, org: clean(b.rcp.org, 80), num: clean(b.rcp.num, 30), note: clean(b.rcp.note, 500) };
  if (b.theme != null) c.theme = THEMES.includes(b.theme) ? b.theme : 'classic';
  if (b.heroLayout != null) c.heroLayout = ['banner', 'split', 'center'].includes(b.heroLayout) ? b.heroLayout : 'banner';
  if (b.feedSort != null) c.feedSort = b.feedSort === 'big' ? 'big' : 'new';
  iso('startAt'); iso('endAt');
  if (b.goal != null) c.goal = Math.max(0, Math.min(1e10, +b.goal || 0));
  if (b.min != null) c.min = Math.max(1, Math.min(100000, +b.min || 18));
  if (b.notifyMin != null) c.notifyMin = Math.max(0, +b.notifyMin || 0);
  if (b.shabbat != null) c.shabbat = ['pause', 'block', 'full'].includes(b.shabbat) ? b.shabbat : 'pause';
  if (b.endMode != null) c.endMode = ['close', 'open', 'extend'].includes(b.endMode) ? b.endMode : 'close';
  if (b.extHours != null) c.extHours = Math.max(1, Math.min(168, +b.extHours || 6)); if (b.extTimes != null) c.extTimes = Math.max(1, Math.min(10, +b.extTimes || 1));
  if (Array.isArray(b.bonus)) c.bonus = b.bonus.map(x => ({ goal: Math.max(0, +x.goal || 0), title: clean(x.title, 120), text: clean(x.text, 600) })).filter(x => x.goal > 0).slice(0, 10);
  if (Array.isArray(b.amounts)) c.amounts = b.amounts.map(x => ({ v: Math.max(0, r2(+x.v || 0)), label: clean(x.label, 60) })).filter(x => x.v > 0).slice(0, 12);
  if (Array.isArray(b.dedicTypes)) c.dedicTypes = b.dedicTypes.map(x => clean(x, 30)).filter(Boolean).slice(0, 12);
  if (Array.isArray(b.faq)) c.faq = b.faq.map(x => ({ q: clean(x && x.q, 300), a: clean(x && x.a, 3000) })).filter(x => x.q && x.a).slice(0, 60);
  if (b.f && typeof b.f === 'object') { const f = { ...(c.f || {}) }; Object.keys(FEAT).forEach(k => { if (b.f[k] != null) f[k] = !!b.f[k]; }); c.f = f; }
  if (b.match && typeof b.match === 'object') { const m = b.match; c.match = { on: !!m.on, ratio: Math.max(1.1, Math.min(10, +m.ratio || 2)), cap: Math.max(0, +m.cap || 0), auction: !!m.auction, repsX: !!m.repsX, title: clean(m.title, 120),
    matchers: (Array.isArray(m.matchers) ? m.matchers : []).map(x => ({ name: clean(x.name, 80), amount: Math.max(0, +x.amount || 0), logo: url(x.logo) })).filter(x => x.name).slice(0, 30) }; }
  if (b.monthly && typeof b.monthly === 'object') { const m = b.monthly; c.monthly = { on: !!m.on, def: Math.max(0, Math.min(60, Math.floor(+m.def || 0))), max: Math.max(2, Math.min(60, Math.floor(+m.max || 36))), unlimited: m.unlimited !== false, count: m.count === 'first' ? 'first' : 'months', countUnl: Math.max(1, Math.min(60, Math.floor(+m.countUnl || 12))) }; }
  if (b.auction != null) c.auction = /^[a-z0-9][a-z0-9-]{2,39}$/.test(String(b.auction).trim().toLowerCase()) ? String(b.auction).trim().toLowerCase() : '';
  if (b.auctionCount != null) c.auctionCount = !!b.auctionCount;
  if (b.pay && typeof b.pay === 'object') { const p = { ...(c.pay || {}) }; if (b.pay.prov != null) p.prov = ['nedarim', 'kehilot', 'site'].includes(b.pay.prov) ? b.pay.prov : 'nedarim';
    if (b.pay.mosad != null) p.mosad = String(b.pay.mosad).replace(/\D/g, '').slice(0, 10); if (b.pay.apiValid != null) p.apiValid = clean(b.pay.apiValid, 60); if (b.pay.groupe != null) p.groupe = clean(b.pay.groupe, 60);
    if (b.pay.kesher && typeof b.pay.kesher === 'object') { const k = { ...(p.kesher || {}) }, K = b.pay.kesher; if (K.pageUrl != null) k.pageUrl = url(K.pageUrl); if (K.pageId != null) k.pageId = String(K.pageId).replace(/[^\w-]/g, '').slice(0, 40); if (K.userName != null) k.userName = clean(K.userName, 80); if (K.password) k.password = String(K.password).trim().slice(0, 200); if (K.clearPassword) delete k.password; p.kesher = k; }
    c.pay = p; }
  if (b.ivr && typeof b.ivr === 'object') { const v = { ...(c.ivr || {}) }, X = b.ivr; if (!v.key) v.key = crypto.randomBytes(8).toString('hex');
    if (X.on != null) v.on = !!X.on; if (X.newKey) v.key = crypto.randomBytes(8).toString('hex');
    if (X.rep != null) v.rep = ['start', 'end', 'off'].includes(X.rep) ? X.rep : 'start'; if (X.repCash != null) v.repCash = ['paid', 'pending', 'off'].includes(X.repCash) ? X.repCash : 'paid';
    ['status', 'reps'].forEach(k => { if (X[k] != null) v[k] = !!X[k]; }); if (X.max != null) v.max = Math.max(100, Math.min(1e7, +X.max || 100000));
    if (X.ypath != null) v.ypath = String(X.ypath).replace(/[^\d/]/g, '').replace(/^\/+|\/+$/g, '').slice(0, 40);
    if (X.ytoken) v.ytoken = String(X.ytoken).trim().replace(/[\s&=]/g, '').slice(0, 120); if (X.clearToken) delete v.ytoken;
    if (X.payPath != null) v.payPath = String(X.payPath).replace(/[^\d/]/g, '').replace(/^\/+|\/+$/g, '').slice(0, 40);
    if (X.txt && typeof X.txt === 'object') { const K = require('./_give_ivr').MSG, o = {}; Object.keys(K).forEach(k => { const t = clean(X.txt[k], 400).replace(/[.=&"<>-]/g, ' ').trim(); if (t) o[k] = t; }); v.txt = o; }
    if (X.cc && typeof X.cc === 'object') { const cc = { ...(v.cc || {}) }, Y = X.cc; if (Y.on != null) cc.on = !!Y.on; ['type', 'register', 'user', 'terminal'].forEach(k => { if (Y[k] != null) cc[k] = String(Y[k]).replace(/[^\w.:;|-]/g, '').slice(0, 60); });
      if (Y.okCodes != null) cc.okCodes = String(Y.okCodes).split(/[,\s]+/).map(x => x.replace(/[^\w-]/g, '')).filter(Boolean).slice(0, 10).join(','); if (Y.password) cc.password = String(Y.password).trim().replace(/[,&=]/g, '').slice(0, 120); if (Y.clearPassword) delete cc.password; v.cc = cc; }
    c.ivr = v; }
  if (b.mailName != null) c.mailName = clean(b.mailName, 60);
  if (Array.isArray(b.notify)) c.notify = [...new Set(b.notify.map(mailN).filter(Boolean))].slice(0, 4);
  if (Array.isArray(b.managers)) c.managers = [...new Set(b.managers.map(mailN).filter(Boolean))].slice(0, 20);
  return c;
}
async function saveRows(table, s, list, mk) {
  const out = []; let sort = 0;
  for (const x of (Array.isArray(list) ? list : []).slice(0, 2000)) {
    if (x.id && x.del) {
      const col = table === 'give_rep' ? 'rep_id' : 'team_id', t = await db('give_donation?' + col + '=eq.' + (+x.id) + '&select=id&limit=1');
      if (t && t.length) { out.push({ id: x.id, error: 'יש תרומות על השם הזה. אפשר להסתיר במקום למחוק' }); continue; }
      if (table === 'give_team') await db('give_rep?team_id=eq.' + (+x.id) + '&campaign_id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ team_id: null }) });
      await db(table + '?id=eq.' + (+x.id) + '&campaign_id=eq.' + s.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); continue;
    }
    const row = mk(x, sort++); if (row.error) { out.push({ id: x.id || null, error: row.error }); continue; }
    try {
      if (x.id) await db(table + '?id=eq.' + (+x.id) + '&campaign_id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      else await db(table, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ campaign_id: s.id, ...row }) });
    } catch (e) { out.push({ id: x.id || null, error: /duplicate|23505/.test(e.message) ? 'הקוד ' + (row.code || '') + ' כבר קיים בקמפיין' : 'שגיאה בשמירה' }); }
  }
  drop(s.slug); return out;
}
const mkTeam = (x, i) => clean(x.name, 80) ? { name: clean(x.name, 80), descr: clean(x.descr, 2000) || null, img: url(x.img) || null, goal: Math.max(0, +x.goal || 0), sort: i, active: x.active !== false } : { error: 'חסר שם קבוצה' };
const mkRep = s => x => {
  const code = String(x.code || '').replace(/\D/g, ''); if (!(code.length >= 1 && code.length <= 8)) return { error: 'קוד נציג: עד 8 ספרות' };
  const tid = x.team ? +x.team : null;
  return { code, name: clean(x.name, 80) || null, phone: phoneN(x.phone) || null, email: mailN(x.email) || null, goal: Math.max(0, +x.goal || 0), img: url(x.img) || null, story: clean(x.story, 4000) || null,
    team_id: tid && s.teams.some(t => t.id === tid) ? tid : null, active: x.active !== false,
    ...(String(x.pin || '').replace(/\D/g, '').length >= 4 ? { pin: String(x.pin).replace(/\D/g, '').slice(0, 6) } : x.id ? {} : { pin: String(1000 + crypto.randomBytes(2).readUInt16BE(0) % 9000) }) };
};

/* סינון לפי תאריכים (לפי יום בירושלים, כולל שני הקצוות). from / to בפורמט YYYY-MM-DD */
const jday = d => new Date(d.paid_at || d.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const dayArg = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const inRange = (b, d) => { const f = dayArg(b && b.from), t = dayArg(b && b.to); if (!f && !t) return true; const k = jday(d); return (!f || k >= f) && (!t || k <= t); };
async function report(s, b) {
  const c = cfgOf(s), st = await stats(s, true);
  const A0 = await all('give_donation?campaign_id=eq.' + s.id + '&select=status,channel,total,months,paid_at,created_at'), A = A0.filter(d => inRange(b, d)), range = { from: dayArg(b && b.from), to: dayArg(b && b.to), raised: 0, count: 0 };
  const day = {}, hour = {}, ch = {};
  A.filter(d => d.status === 'paid').forEach(d => {
    range.raised += +d.total; range.count++;
    const t = new Date(d.paid_at || d.created_at), k = t.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }), D = day[k] = day[k] || { day: k, amount: 0, count: 0 }; D.amount += +d.total; D.count++;
    const hk = k + ' ' + t.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit' }).slice(0, 2), Hh = hour[hk] = hour[hk] || { hour: hk, amount: 0, count: 0 }; Hh.amount += +d.total; Hh.count++;
    const kk = d.channel + (+d.months !== 1 ? '-hk' : ''), C = ch[kk] = ch[kk] || { ch: kk, amount: 0, count: 0 }; C.amount += +d.total; C.count++;
  });
  const fx = o => { Object.keys(o).forEach(k => { if (typeof o[k] === 'number') o[k] = r2(o[k]); }); return o; };
  return {
    range: { ...range, raised: r2(range.raised) },
    totals: { total: st.total, raised: st.raised, auction: st.auction, matched: st.matched, donors: st.donors, goal: c.goal, pending: A.filter(d => d.status === 'pending').length, failed: A.filter(d => d.status === 'failed').length, refunded: A.filter(d => d.status === 'refunded').length },
    days: Object.values(day).map(fx).sort((a, b) => a.day < b.day ? -1 : 1), hours: Object.values(hour).map(fx).sort((a, b) => a.hour < b.hour ? -1 : 1), channels: Object.values(ch).map(fx),
    reps: s.reps.map(r => fx({ id: r.id, code: r.code, name: r.name, team: r.team_id, goal: +r.goal || 0, amount: (st.rep[r.id] || {}).amount || 0, count: (st.rep[r.id] || {}).count || 0 })).sort((a, b) => b.amount - a.amount),
    teams: s.teams.map(t => fx({ id: t.id, name: t.name, goal: +t.goal || 0, amount: (st.team[t.id] || {}).amount || 0, count: (st.team[t.id] || {}).count || 0, reps: s.reps.filter(r => r.team_id === t.id).length })).sort((a, b) => b.amount - a.amount)
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const b = req.method === 'POST' ? (readBody(req) || {}) : (req.query || {}), a = String(b.a || '');
    /* ===== ציבורי ===== */
    /* דף הפתיחה /give: מה אפשר לעשות כאן, קמפיינים פעילים, ובקשה לפתיחת קמפיין / קבלת פרטים */
    if (a === 'home') {
      const S = await site(); let list = [];
      if (S.listPub) {
        const L = await db('give_campaign?status=eq.open&select=slug,name,cfg&order=created_at.desc&limit=60').catch(() => []);
        const pick = (L || []).filter(x => (x.cfg || {}).listed === true).slice(0, 12);
        list = (await Promise.all(pick.map(async x => { try { const s = await load(x.slug); if (!s) return null; const c = cfgOf(s), st = await stats(s); return { slug: s.slug, title: c.title, logo: c.logo, banner: c.banner, goal: c.goal, total: st.total, theme: c.theme, color: c.color }; } catch (e) { return null; } }))).filter(Boolean);
      }
      const days = (await daysOf()).filter(d => d.on && d.listed && !(d.end && Date.now() > Date.parse(d.end))).slice(0, 6).map(d => ({ id: d.id, title: d.title, sub: d.sub, start: d.start, end: d.end }));
      return json(res, 200, { canOpen: S.open, reqOn: S.reqOn, intro: S.intro, infoText: S.infoText, note: S.note, list, days });
    }
    if (a === 'day') {
      const d = (await daysOf()).find(x => x.id === dayId(b.id)); if (!d || !d.on) return json(res, 404, { error: 'none' });
      return json(res, 200, await dayView(d));
    }
    if (a === 'dayList' || a === 'daySave' || a === 'dayDel') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, {});
      let L = await daysOf();
      if (a === 'daySave') { const d = cleanDay(b.day); if (!d.id || !d.title) return json(res, 400, { error: 'x', message: 'חסרים כתובת ושם ליום הנתינה' }); const i = L.findIndex(x => x.id === d.id); if (i >= 0) L[i] = d; else L.push(d); L = L.slice(-50); await saveSetting('giveDays', { list: L }); DAYC.clear(); }
      if (a === 'dayDel') { L = L.filter(x => x.id !== dayId(b.id)); await saveSetting('giveDays', { list: L }); DAYC.clear(); }
      return json(res, 200, { list: L, base: SITE() + '/give?day=' });
    }
    if (a === 'request') {
      if (req.method !== 'POST') return json(res, 405, {});
      const S = await site(); if (!S.reqOn) return json(res, 403, { error: 'off', message: 'הגשת בקשות כבויה כרגע' });
      if (clean(b.website, 50)) return json(res, 200, { ok: true });
      const r = { id: crypto.randomBytes(6).toString('hex'), at: new Date().toISOString(), kind: b.kind === 'info' ? 'info' : 'open', name: clean(b.name, 80), org: clean(b.org, 120), phone: phoneN(b.phone), email: mailN(b.email), msg: clean(b.msg, 1500), goal: clean(b.goal, 40), when: clean(b.when, 60), status: 'new' };
      if (!r.name) return json(res, 400, { error: 'name', message: 'חסר שם' });
      if (!r.phone && !r.email) return json(res, 400, { error: 'contact', message: 'צריך טלפון או מייל תקין כדי שנוכל לחזור אליכם' });
      const raw = await loadSetting('giveReq').catch(() => ({})) || {}, L = Array.isArray(raw.list) ? raw.list : [];
      const m = reqMeta(req), ip = m && m.ip; const recent = ip ? L.filter(x => x.ip === ip && Date.now() - Date.parse(x.at) < 3600e3).length : 0;
      if (recent >= 3 || L.filter(x => Date.now() - Date.parse(x.at) < 3600e3).length >= 30) return json(res, 429, { error: 'many', message: 'נשלחו כבר כמה בקשות, נחזור אליכם בהקדם' });
      L.unshift({ ...r, ip: ip || '' }); await saveSetting('giveReq', { list: L.slice(0, 300) });
      try { const g = await loadSetting('give').catch(() => ({})) || {}, to = [mailN(g.reqMail), ...admins().map(mailN)].filter(Boolean); const { sendMail, frame, escH } = require('./_mail');
        const body = '<p><b>' + (r.kind === 'info' ? 'בקשה לקבלת פרטים' : 'בקשה לפתיחת קמפיין') + '</b></p><p>' + escH(r.name) + (r.org ? ' · ' + escH(r.org) : '') + '</p>' + (r.phone ? '<p>טלפון: ' + escH(r.phone) + '</p>' : '') + (r.email ? '<p>מייל: ' + escH(r.email) + '</p>' : '') + (r.goal ? '<p>יעד: ' + escH(r.goal) + '</p>' : '') + (r.when ? '<p>מתי: ' + escH(r.when) + '</p>' : '') + (r.msg ? '<p>' + escH(r.msg) + '</p>' : '');
        for (const t of [...new Set(to)].slice(0, 3)) await sendMail({ to: t, subject: 'בקשה חדשה באתר ההתרמה: ' + r.name, html: frame({ title: 'בקשה חדשה', body, button: 'לניהול הבקשות', url: SITE() + '/give-manage' }), ...(r.email ? { replyTo: r.email } : {}) }, 'give').catch(e => console.error('give req mail', e.message)); } catch (e) { console.error('give req mail', e.message); }
      return json(res, 200, { ok: true });
    }
    if (a === 'orgmsg') {
      if (req.method !== 'POST') return json(res, 405, {});
      const s = await load(b.s); if (!s || s.status === 'draft') return json(res, 404, { error: 'no campaign' });
      const r = await require('./_orgpages').submit('give', s, b, (sub, body) => notify(s, sub, body)); return json(res, r.status, r.status === 200 ? { ok: true, already: !!r.already } : { error: r.error, message: r.message });
    }
    if (a === 'camp') { const s = await load(b.s); if (!s || s.status === 'draft' && !b.pv) return json(res, 404, { error: 'no campaign' }); return json(res, 200, await campView(s, b)); }
    if (a === 'feed') {
      const s = await load(b.s); if (!s) return json(res, 404, {}); const c = cfgOf(s); if (!c.f.feed) return json(res, 200, { feed: [] });
      const st = await stats(s); let L = st.D.filter(d => !d.hidden);
      if (b.r) { const r = s.reps.find(x => x.code === String(b.r)); L = r ? L.filter(d => d.rep_id === r.id) : []; }
      if (b.t) L = L.filter(d => String(d.team_id) === String(b.t));
      const q = clean(b.q, 60); if (q) L = L.filter(d => (pubName(d) + ' ' + (d.dedic_name || '') + ' ' + (d.message || '')).includes(q));
      if (b.sort === 'big') L = L.slice().sort((x, y) => y.total - x.total);
      const off = Math.max(0, +b.off || 0); return json(res, 200, { feed: L.slice(off, off + 50).map(d => pubDon(d, c, s)), total: L.length });
    }
    if (a === 'donate') { if (req.method !== 'POST') return json(res, 405, {}); const s = await load(b.s, true); if (!s) return json(res, 404, { error: 'no campaign' }); const r = await donate(req, s, b); return json(res, r.status, r); }
    if (a === 'status') { const L = await db('give_donation?id=eq.' + enc(String(b.id || '')) + '&select=status,amount,months,total&limit=1').catch(() => []); const d = L && L[0]; return json(res, d ? 200 : 404, d || {}); }
    if (a === 'kcheck') { const s = await load(b.s); if (!s) return json(res, 404, {}); try { const r = await kesherPaid(s, String(b.id || ''), b.tn); return json(res, r.status, r); } catch (e) { console.error('give kcheck', e.message); return json(res, 502, { error: 'kesher', message: 'לא הצלחנו לבדוק את התשלום מול קשר. נסו שוב בעוד רגע' }); } }

    /* ===== ניהול ===== */
    if (req.method !== 'POST') return json(res, 405, {});
    if (a === 'mine') {
      const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' }); const S = await site();
      const em = String(u.email || '').toLowerCase();
      const L = isAdmin(u) && b.all ? await db('give_campaign?select=id,slug,name,status,user_id,email,cfg,created_at&order=created_at.desc&limit=500') : await db('give_campaign?select=id,slug,name,status,user_id,email,cfg,created_at&order=created_at.desc&limit=2000');
      const mine = (L || []).filter(s => isAdmin(u) && b.all || s.user_id === u.id || managersOf(s).includes(em)).map(s => ({ slug: s.slug, name: s.name, status: s.status, title: (s.cfg || {}).title || s.name, owner: s.email }));
      return json(res, 200, { list: mine, canCreate: S.open || isAdmin(u), admin: isAdmin(u), site: S, email: u.email || '' });
    }
    if (a === 'create') {
      const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' }); const S = await site();
      if (!S.open && !isAdmin(u)) return json(res, 403, { error: 'closed', message: 'פתיחת קמפיינים עדיין לא פתוחה לכולם' });
      const slug = String(b.slug || '').trim().toLowerCase(), name = clean(b.name, 120);
      if (!SLUG.test(slug)) return json(res, 400, { error: 'slug', message: 'הכתובת: 3 עד 40 אותיות באנגלית, ספרות ומקף' }); if (!name) return json(res, 400, { error: 'name', message: 'חסר שם' });
      try { await db('give_campaign', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug, name, user_id: u.id, email: u.email || null, status: 'draft', cfg: { title: name, f: { ...FEAT }, ...(isAdmin(u) && Array.isArray(b.managers) ? { managers: b.managers.map(mailN).filter(Boolean).slice(0, 20) } : {}) } }) }); }
      catch (e) { return json(res, 409, { error: 'taken', message: 'הכתובת הזאת כבר תפוסה' }); }
      if (isAdmin(u) && Array.isArray(b.managers) && b.managers.map(mailN).filter(Boolean).length) { const { sendMail, frame, escH } = require('./_mail'); for (const m of b.managers.map(mailN).filter(Boolean)) await sendMail({ to: m, subject: 'נפתח עבורכם קמפיין התרמה: ' + name, html: frame({ title: 'קמפיין התרמה', body: '<p>נפתח עבורכם הקמפיין <b>' + escH(name) + '</b>. נכנסים לניהול עם כתובת המייל הזאת.</p>', button: 'לניהול הקמפיין', url: SITE() + '/give-manage?s=' + slug }) }, 'give').catch(() => {}); }
      return json(res, 200, { slug });
    }
    /* בעל האתר: כל הקמפיינים, כמה גויס בכל ערוץ ואמצעי (כולל מזומן), ודמי השימוש */
    if (a === 'siteStats') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, {}); const S = await site();
      const [CL, DL] = await Promise.all([all('give_campaign?select=id,slug,name,status,cfg,email,created_at&order=created_at.desc'), all('give_donation?select=campaign_id,total,amount,months,status,channel,method,txn,paid_at,created_at')]);
      const how = d => d.channel === 'offline' ? (d.method || 'ידני') : d.channel === 'phone' ? (/^YM-/.test(d.txn || '') ? 'אשראי בטלפון' : /^REP-/.test(d.txn || '') ? 'מזומן / צ׳ק דרך נציג' : 'טלפון (סומן ידנית)') : /^K-/.test(d.txn || '') ? 'קשר' : +d.months !== 1 ? 'נדרים פלוס · הוראת קבע' : 'נדרים פלוס';
      const by = new Map(CL.map(c => [c.id, { slug: c.slug, name: (c.cfg || {}).title || c.name, status: c.status, owner: c.email || '', managers: managersOf(c), raised: 0, count: 0, pending: 0, pendingAmount: 0, m: {}, auction: (c.cfg || {}).auction || '', cfg: c.cfg }]));
      DL.filter(d => inRange(b, d)).forEach(d => { const x = by.get(d.campaign_id); if (!x) return; if (d.status === 'paid') { x.raised += +d.total; x.count++; const k = how(d); x.m[k] = r2((x.m[k] || 0) + +d.total); } else if (d.status === 'pending') { x.pending++; x.pendingAmount += +d.total; } });
      const out = [...by.values()].map(x => { const fd = FEE.eff(x.cfg, S.fee); const o = { ...x, raised: r2(x.raised), pendingAmount: r2(x.pendingAmount), fee: FEE.calc(fd, x.raised), feeDef: fd }; delete o.cfg; return o; });
      const tot = out.reduce((t, x) => { t.raised += x.raised; t.count += x.count; t.fee += x.fee; Object.keys(x.m).forEach(k => { t.m[k] = r2((t.m[k] || 0) + x.m[k]); }); return t; }, { raised: 0, count: 0, fee: 0, m: {} });
      return json(res, 200, { range: { from: dayArg(b.from), to: dayArg(b.to) }, list: out, total: { ...tot, raised: r2(tot.raised), fee: r2(tot.fee), campaigns: out.length, open: out.filter(x => x.status === 'open').length } });
    }
    if (a === 'site') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, {});
      if (b.set) { const o = await loadSetting('give').catch(() => ({})) || {}; const n = { ...o, open: !!b.set.open, ...(b.set.reqPay != null ? { reqPay: !!b.set.reqPay } : {}), sitePay: !!b.set.sitePay, kehilotOff: b.set.kehilot === false, note: clean(b.set.note, 500), reqOff: b.set.reqOn === false, listOff: b.set.listPub === false, intro: clean(b.set.intro, 600), infoText: clean(b.set.infoText, 1500), reqMail: mailN(b.set.reqMail), ...(b.set.fee ? { fee: FEE.feeOf(b.set.fee) } : {}) }; await saveSetting('give', n); }
      const raw = await loadSetting('give').catch(() => ({})) || {};
      return json(res, 200, { ...(await site()), reqMail: raw.reqMail || '' });
    }
    if (a === 'requests') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, {});
      const raw = await loadSetting('giveReq').catch(() => ({})) || {}; let L = Array.isArray(raw.list) ? raw.list : [];
      if (b.id && (b.status || b.del)) { L = b.del ? L.filter(x => x.id !== b.id) : L.map(x => x.id === b.id ? { ...x, status: b.status === 'done' ? 'done' : 'new' } : x); await saveSetting('giveReq', { list: L }); }
      return json(res, 200, { list: L.map(x => { const { ip, ...y } = x; return y; }) });
    }
    const M = await mineOr403(req, res, b); if (!M) return; const { u, s } = M;
    if (a === 'get') return json(res, 200, { ...mgrView(s, await site()), amAdmin: isAdmin(u), ...(isAdmin(u) ? { admin: (s.cfg || {}).admin || {} } : {}) });
    if (a === 'dayMine' || a === 'dayJoin') {
      const L = await daysOf();
      if (a === 'dayJoin') {
        const i = L.findIndex(x => x.id === dayId(b.day)); if (i < 0) return json(res, 404, { error: 'none' });
        const has = L[i].campaigns.includes(s.slug);
        if (b.leave) { if (has) { L[i].campaigns = L[i].campaigns.filter(x => x !== s.slug); await saveSetting('giveDays', { list: L }); DAYC.clear(); } }
        else if (!has) { if (!L[i].joinOpen && !isAdmin(u)) return json(res, 403, { error: 'closed', message: 'ההצטרפות ליום הזה סגורה' }); if (L[i].end && Date.now() > Date.parse(L[i].end)) return json(res, 400, { error: 'ended', message: 'יום הנתינה הסתיים' }); L[i].campaigns = L[i].campaigns.concat(s.slug).slice(0, 200); await saveSetting('giveDays', { list: L }); DAYC.clear(); }
      }
      return json(res, 200, { days: L.filter(d => d.on && !(d.end && Date.now() > Date.parse(d.end)) && (d.joinOpen || d.campaigns.includes(s.slug))).map(d => ({ id: d.id, title: d.title, start: d.start, end: d.end, joinOpen: d.joinOpen, joined: d.campaigns.includes(s.slug), url: SITE() + '/give?day=' + d.id })) });
    }
    /* הקלטות לנוסחי השלוחה הטלפונית: מועלות לאחסון של האתר, ומשם לימות המשיח (עם הטוקן והשלוחה שהוגדרו בלשונית השלוחה) */
    if (a === 'msgAudioUrl' || a === 'msgAudioSet') {
      const IV = require('./_give_ivr'), key = String(b.key || ''), def = IV.MSG[key], isAll = b.idx === 'all', idx = isAll ? 0 : Math.floor(+b.idx || 0), part = def && !isAll && IV.partsOf(def[1])[idx];
      if (!def || (!isAll && (!part || !part.s))) return json(res, 400, { error: 'key', message: 'אי אפשר להעלות שמע לחלק הזה' });
      const ak = isAll ? key + '#all' : key + '#' + idx, tag = isAll ? 'all' : String(idx);
      if (a === 'msgAudioUrl') {
        const ext = /^(mp3|wav|m4a|ogg)$/.test(String(b.ext || '')) ? b.ext : 'mp3', M = require('./_r2').mediaPut('give/' + s.id + '/m-' + key + tag + '-' + Date.now().toString(36) + '.' + ext);
        if (!M) return json(res, 503, { error: 'storage', message: 'אחסון הקבצים לא מוגדר באתר' }); return json(res, 200, M);
      }
      const MD = require('./_r2').media(), url = String(b.url || '');
      if (url && !(MD && url.indexOf(MD.url + '/give/' + s.id + '/') === 0)) return json(res, 400, { error: 'url' });
      const ia = { ...((s.cfg || {}).ivrAudio || {}) }, iv = (s.cfg || {}).ivr || {}; let warn = '';
      if (b.mute) ia[ak] = { mute: true };
      else if (!url) { delete ia[ak]; if (idx === 0 && !isAll) delete ia[key]; }
      else if (iv.ytoken && iv.ypath) {
        try { const f = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!f.ok) throw new Error('fetch ' + f.status); const buf = await f.arrayBuffer(), nm = 'gm' + s.id + key.toLowerCase() + tag;
          await ymUpload(iv.ytoken, 'ivr2:/' + iv.ypath + '/' + nm + '.wav', buf); ia[ak] = { url, y: nm }; if (idx === 0 && !isAll) delete ia[key]; }
        catch (e) { warn = 'ההעלאה לימות המשיח נכשלה: ' + String(e.message).slice(0, 120); ia[ak] = { url }; }
      } else { ia[ak] = { url }; warn = 'הקובץ נשמר באתר. כדי שיושמע בטלפון, צריך להזין בלשונית השלוחה את הטוקן של ימות ואת תיקיית השמע'; }
      await db('give_campaign?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg: { ...s.cfg, ivrAudio: ia }, updated_at: new Date().toISOString() }) }); drop(s.slug);
      return json(res, 200, { ok: true, warn, ivrAudio: ia });
    }
    if (a === 'adminSet') {
      if (!isAdmin(u)) return json(res, 403, { error: 'admin' });
      const ad = { ...((s.cfg || {}).admin || {}) }, x = b.set || {}; if (x.fee !== undefined) ad.fee = x.fee && x.fee.type ? FEE.feeOf(x.fee) : null;
      if (x.openPay !== undefined) ad.openPay = x.openPay === 'waive' ? 'waive' : '';
      await db('give_campaign?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg: { ...s.cfg, admin: ad }, updated_at: new Date().toISOString() }) }); drop(s.slug);
      return json(res, 200, { ...mgrView(await load(s.slug, true), await site()), amAdmin: true, admin: ad });
    }
    if (a === 'save') {
      const nc = cleanCfg(s.cfg, b.cfg || {}), oldM = managersOf(s);
      await db('give_campaign?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg: nc, ...(b.cfg && b.cfg.title ? { name: clean(b.cfg.title, 120) } : {}), updated_at: new Date().toISOString() }) }); drop(s.slug);
      const added = (nc.managers || []).filter(m => !oldM.includes(m));
      if (added.length) { const { sendMail, frame, escH } = require('./_mail'), c = cfgOf({ ...s, cfg: nc }); for (const m of added) await sendMail({ to: m, subject: 'הוזמנתם לנהל את הקמפיין ' + c.title, html: frame({ title: 'ניהול קמפיין התרמה', body: '<p>' + escH(u.email || '') + ' הוסיף אתכם כמנהלים של הקמפיין <b>' + escH(c.title) + '</b>.</p><p>נכנסים לניהול עם כתובת המייל הזאת.</p>', button: 'לניהול הקמפיין', url: SITE() + '/give-manage?s=' + s.slug }) }, 'give').catch(() => {}); }
      return json(res, 200, mgrView(await load(s.slug, true), await site()));
    }
    if (a === 'state') { const st = ['draft', 'open', 'closed'].includes(b.status) ? b.status : s.status;
      if (st === 'open' && s.status !== 'open' && !isAdmin(u)) { const N = require('./_openfee').need(s, await site()); if (N.required) return json(res, 402, { error: 'openfee', amount: N.amount, message: 'לפני פתיחת הקמפיין לציבור צריך לשלם דמי פתיחה: ' + N.amount.toLocaleString('he-IL') + ' ₪' }); }
      await db('give_campaign?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: st, updated_at: new Date().toISOString() }) }); drop(s.slug); return json(res, 200, { status: st }); }
    if (a === 'teamsSave') { const errs = await saveRows('give_team', s, b.list, mkTeam); return json(res, 200, { errors: errs, teams: (await load(s.slug, true)).teams }); }
    if (a === 'repsSave') { const errs = await saveRows('give_rep', s, b.list, mkRep(s)); return json(res, 200, { errors: errs, reps: (await load(s.slug, true)).reps }); }
    if (a === 'orgmsgs') return json(res, 200, await require('./_orgpages').list('give', s));
    if (a === 'orgmsgDel') { await require('./_orgpages').del('give', s, b.id); return json(res, 200, await require('./_orgpages').list('give', s)); }
    if (a === 'report') return json(res, 200, await report(s, b));
    if (a === 'donations') {
      let q = 'give_donation?campaign_id=eq.' + s.id + '&select=*&order=created_at.desc';
      if (['paid', 'pending', 'failed', 'refunded'].includes(b.status)) q += '&status=eq.' + b.status;
      const L = (await all(q)).filter(d => inRange(b, d)); return json(res, 200, { list: L.map(d => ({ ...d, callback: undefined })) });
    }
    if (a === 'manual') {
      const c = cfgOf(s); if (!c.f.offline) return json(res, 400, { error: 'off', message: 'תרומות ידניות כבויות בהגדרות' });
      const amount = r2(+b.amount || 0); if (!(amount > 0)) return json(res, 400, { error: 'amount', message: 'סכום לא תקין' });
      const months = Math.max(0, Math.min(60, Math.floor(b.months == null ? 1 : +b.months))), total = months === 1 ? amount : r2(+b.total > 0 ? +b.total : amount * (months || c.monthly.countUnl));
      const rep = b.rep ? s.reps.find(r => String(r.id) === String(b.rep) || r.code === String(b.rep)) : null;
      const team = rep && rep.team_id ? rep.team_id : b.team && s.teams.some(t => String(t.id) === String(b.team)) ? +b.team : null;
      const row = { id: newId(), campaign_id: s.id, rep_id: rep ? rep.id : null, team_id: team, amount, months, total, status: b.pending ? 'pending' : 'paid', channel: 'offline', method: clean(b.method, 30) || null, name: clean(b.name, 80) || 'תורם', show_name: clean(b.showName, 80) || null, anon: !!b.anon,
        dedic_type: clean(b.dedicName, 80) ? clean(b.dedicType, 30) || null : null, dedic_name: clean(b.dedicName, 80) || null, message: clean(b.message, 300) || null, phone: phoneN(b.phone) || null, email: mailN(b.email) || null, city: clean(b.city, 60) || null,
        txn: 'M-' + clean(u.email, 60), paid_at: b.pending ? null : b.at && !isNaN(Date.parse(b.at)) ? new Date(b.at).toISOString() : new Date().toISOString() };
      await db('give_donation', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); drop(s.slug);
      if (b.mail && row.email) thankDonor(s, row).catch(() => {});
      return json(res, 200, { ok: true, id: row.id });
    }
    if (a === 'donUpdate') {
      const L = await db('give_donation?id=eq.' + enc(String(b.id || '')) + '&campaign_id=eq.' + s.id + '&select=*&limit=1'), d = L && L[0]; if (!d) return json(res, 404, {});
      const up = {}, x = b.set || {};
      ['hidden', 'pinned', 'anon'].forEach(k => { if (x[k] != null) up[k] = !!x[k]; });
      ['show_name', 'message', 'dedic_name', 'dedic_type', 'name'].forEach(k => { if (x[k] != null) up[k] = clean(x[k], k === 'message' ? 300 : 80) || null; });
      if (x.rep !== undefined) { const r = x.rep ? s.reps.find(r => String(r.id) === String(x.rep)) : null; up.rep_id = r ? r.id : null; if (r && r.team_id) up.team_id = r.team_id; }
      if (x.team !== undefined) up.team_id = x.team && s.teams.some(t => String(t.id) === String(x.team)) ? +x.team : null;
      if (x.status === 'refunded' && d.status === 'paid') up.status = 'refunded';
      if (x.status === 'paid' && d.status !== 'paid') { up.status = 'paid'; up.paid_at = new Date().toISOString(); up.txn = d.txn || 'M-' + clean(u.email, 60); }
      if (x.status === 'del' && d.channel === 'offline') { await db('give_donation?id=eq.' + d.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); drop(s.slug); return json(res, 200, { deleted: true }); }
      if (Object.keys(up).length) await db('give_donation?id=eq.' + d.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) });
      drop(s.slug); return json(res, 200, { ok: true });
    }
    if (a === 'mediaUrl') {
      const K = { logo: /^(png|jpe?g|webp|svg)$/, banner: /^(png|jpe?g|webp)$/, img: /^(png|jpe?g|webp)$/, video: /^(mp4|webm|mov)$/ }, kind = String(b.kind || ''), ext = String(b.ext || '').toLowerCase();
      if (!K[kind] || !K[kind].test(ext)) return json(res, 400, { error: 'type', message: 'סוג קובץ לא נתמך' });
      const Mx = require('./_r2').mediaPut('give/' + s.id + '/' + kind + '-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex') + '.' + ext);
      if (!Mx) return json(res, 503, { error: 'storage', message: 'אחסון הקבצים לא מוגדר באתר' }); return json(res, 200, Mx);
    }
    return json(res, 400, { error: 'action' });
  } catch (e) { console.error('give', e); return json(res, 500, { error: 'server', message: 'שגיאה בשרת' }); }
};
/* תקציר לדף המכירה הסינית המקושרת */
/* העלאת קובץ שמע למערכת בימות המשיח של הארגון (טוקן + נתיב ivr2:/<תיקייה>/<שם>.wav) */
async function ymUpload(token, path, buf) {
  const fd = new FormData(); fd.append('token', token); fd.append('path', path); fd.append('convertAudio', '1'); fd.append('file', new Blob([buf]), path.split('/').pop());
  const r = await fetch('https://www.call2all.co.il/ym/api/UploadFile', { method: 'POST', body: fd, signal: AbortSignal.timeout(40000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j || (j.responseStatus && j.responseStatus !== 'OK')) throw new Error((j && (j.message || j.responseStatus)) || r.status + ' ' + t.slice(0, 80));
}
module.exports.summary = async slug => { const s = await load(slug); if (!s) return null; const c = cfgOf(s), st = await stats(s), t = await timing(s, c, st);
  return { status: s.status, title: c.title, url: SITE() + '/give/' + s.slug, total: st.total, goal: c.goal, donors: c.f.donors ? st.donors : null, match: c.match.on ? c.match.ratio : 0, can: t.can, end: c.f.countdown ? t.end : '' }; };
module.exports.drop = drop; module.exports.nedPaid = nedPaid; module.exports.cfgOf = cfgOf; module.exports.timing = timing; module.exports.load = load; module.exports.stats = stats; module.exports.markPaid = markPaid;
module.exports.notifyPhone = async (s, d) => { const { escH } = require('./_mail'), r = d.rep_id ? s.reps.find(x => x.id === d.rep_id) : null; await notify(s, 'תרומה בטלפון ממתינה לגבייה: ' + (+d.amount) + ' ₪', '<p>' + escH(d.method || 'תרומה בטלפון') + (r ? ' · נציג: ' + escH(r.name || r.code) : '') + (d.phone ? ' · טלפון: ' + escH(d.phone) : '') + '</p><p>אחרי הגבייה מסמנים "שולם" בלשונית התרומות.</p>'); };
