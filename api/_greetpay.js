/* ברכות והזמנות בתשלום: אחרי התשלום הלקוח מקבל קישור אישי לעיצוב.
   עם הקישור אפשר לשנות את העיצוב עוד כמה שעות (editHours מהניהול), ולהוריד אותו עוד כמה ימים אחר כך (dlDays).
   העיצוב (הטקסטים, הצבעים והתמונה) נשמר כקובץ בדלי הפרטי shared: greet/<מספר הזמנה>.json
   הקישור נשלח רק למייל של המשלם.
   נקרא דרך /api/pricing?c=_greetpay (כדי לא להוסיף פונקציית שרת). ההזמנה עצמה נוצרת ב-/api/checkout עם plan=greet. */
'use strict';
const crypto = require('node:crypto');
const { db, env, json, readBody, loadSetting } = require('./_lib');

const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const base = () => env('SUPABASE_URL').replace(/\/$/, '');
const skey = () => { const k = env('SUPABASE_SERVICE_ROLE_KEY'); return { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }) }; };
const file = id => 'greet/' + id + '.json';
const okId = id => /^[0-9a-f]{24}$/.test(String(id || ''));
const token = id => crypto.createHmac('sha256', env('SUPABASE_SERVICE_ROLE_KEY') || 'myluach').update('greet:' + id).digest('hex').slice(0, 24);
const MAX = 3.5e6; /* גודל מקסימלי לעיצוב שמור (כולל תמונה מוקטנת) */

async function put(id, obj) {
  const r = await fetch(base() + '/storage/v1/object/shared/' + file(id), { method: 'POST', headers: { ...skey(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(obj) });
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function get(id) {
  const r = await fetch(base() + '/storage/v1/object/shared/' + file(id), { headers: skey() });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error('storage ' + r.status);
  return r.json();
}
async function settings() {
  const g = (await loadSetting('greettpl')) || {}, p = g.pay || {};
  const n = (v, a, z, d) => { v = Number(v); return isFinite(v) && v >= a && v <= z ? v : d; };
  return { g, editHours: n(p.editHours, 1, 720, 48), dlDays: n(p.dlDays, 0, 365, 30) };
}
/* ניקוי מצב העיצוב שהלקוח שולח (לא שומרים יותר ממה שצריך) */
function cleanState(s) {
  s = s && typeof s === 'object' ? s : {};
  const out = { colors: {}, blocks: [], scale: Math.max(0.4, Math.min(2, Number(s.scale) || 1)) };
  Object.keys(s.colors || {}).slice(0, 12).forEach(k => { const v = String(s.colors[k] || ''); if (/^[A-Z]{1,8}$/.test(k) && /^#[0-9a-f]{3,8}$/i.test(v)) out.colors[k] = v; });
  out.blocks = (Array.isArray(s.blocks) ? s.blocks : []).slice(0, 60).map(b => {
    if (!b || typeof b !== 'object') return null;
    const o = {};
    Object.keys(b).slice(0, 30).forEach(k => {
      const v = b[k];
      if (k === 'src') { if (typeof v === 'string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || (/^https:\/\/[^\s"'<>]+$/.test(v) && (v.startsWith(base() + '/') || (env('R2_MEDIA_URL') && v.startsWith(env('R2_MEDIA_URL').replace(/\/$/, '') + '/')) || /^https:\/\/(pub-[a-f0-9]+\.r2\.dev|media\.myluach\.org)\//.test(v))) || /^\/assets\/greetings\/stickers\/[\w.-]+$/.test(v))) o.src = v; return; }
      if (k === 'abs') { if (v && typeof v === 'object') o.abs = { x: +v.x || 0, y: +v.y || 0, w: Math.max(10, +v.w || 100) }; return; }
      if (typeof v === 'number' && isFinite(v)) o[k] = v;
      else if (typeof v === 'boolean') o[k] = v;
      else if (typeof v === 'string') o[k] = v.slice(0, 3000);
    });
    return o;
  }).filter(Boolean);
  const P = s.panel && typeof s.panel === 'object' ? s.panel : null;
  if (P) out.panel = { on: !!P.on, color: /^#[0-9a-f]{3,8}$/i.test(String(P.color || '')) ? P.color : '#ffffff', op: Math.max(0, Math.min(1, +P.op || 0)), r: Math.max(0, Math.min(100, +P.r || 0)), rb: P.rb == null ? undefined : Math.max(0, Math.min(100, +P.rb || 0)), pad: Math.max(0, Math.min(120, +P.pad || 0)), dt: Math.max(-300, Math.min(600, +P.dt || 0)), db: Math.max(-300, Math.min(600, +P.db || 0)), dr: Math.max(-300, Math.min(600, +P.dr || 0)), dl: Math.max(-300, Math.min(600, +P.dl || 0)) };
  const n = (v, a, z) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(z, v)) : undefined; };
  const PG = s.page && typeof s.page === 'object' ? s.page : null;
  if (PG) out.page = { fit: ['cover', 'contain', 'containc', 'stretch'].includes(PG.fit) ? PG.fit : undefined, land: PG.land == null ? undefined : !!PG.land, rot: PG.rot == null ? undefined : Math.max(0, Math.min(3, Math.round(+PG.rot || 0))), fx: !!PG.fx, fy: !!PG.fy, op: n(PG.op, 0.05, 1), br: n(PG.br, 20, 200), sat: n(PG.sat, 0, 300), hue: n(PG.hue, -180, 180), color: /^#[0-9a-f]{6}$/i.test(String(PG.color || '')) ? PG.color : undefined };
  const BD = s.border && typeof s.border === 'object' ? s.border : null;
  if (BD && /^[a-z]{2,20}$/.test(String(BD.style || ''))) out.border = { style: BD.style, color: /^([a-z]{3,12}|#[0-9a-f]{6})$/i.test(String(BD.color || '')) ? BD.color : 'gold', s: n(BD.s, 0.2, 4), m: n(BD.m, 0, 200), op: n(BD.op, 0.05, 1) };
  const TS = s.tshape && typeof s.tshape === 'object' ? s.tshape : null;
  const fpts = p => { if (!Array.isArray(p) || p.length < 3) return undefined; return p.slice(0, 32).map(q => { q = Array.isArray(q) ? q : []; const f = v => { v = Number(v); return isFinite(v) ? Math.round(Math.max(-0.1, Math.min(1.1, v)) * 1000) / 1000 : 0.5; }; return q[2] ? [f(q[0]), f(q[1]), 1] : [f(q[0]), f(q[1])]; }); };
  if (TS) out.tshape = { s: ['rect', 'ellipse', 'arch', 'archb', 'trap', 'trapi', 'diamond', 'hex', 'free'].includes(TS.s) ? TS.s : 'rect', p: TS.s === 'free' ? fpts(TS.p) : undefined, a: n(TS.a, -45, 45), k: n(TS.k, 0.15, 0.95), tt: TS.tt === false ? false : undefined };
  const AR = s.area && typeof s.area === 'object' ? s.area : null;
  if (AR) out.area = { t: n(AR.t, 0, 60), b: n(AR.b, 0, 60), r: n(AR.r, 0, 60), l: n(AR.l, 0, 60), v: AR.v === 'top' ? 'top' : 'center', mine: AR.mine ? 1 : undefined };
  if (s.preset && typeof s.preset === 'object' && /^[\w-]{1,40}$/.test(String(s.preset.id || ''))) out.preset = { id: String(s.preset.id) };
  if (s.selfText) out.selfText = true;
  if (s.own && typeof s.own.src === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.own.src)) out.own = { src: s.own.src };
  const U = s.ubg && typeof s.ubg === 'object' ? s.ubg : null;
  if (U && typeof U.src === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(U.src)) out.ubg = { src: U.src, mode: U.mode === 'area' ? 'area' : 'page', op: Math.max(0.05, Math.min(1, +U.op || 1)) };
  return out;
}

/* מהקופה (checkout): בדיקת העיצוב והמחיר. המחיר נלקח מהניהול, לא מהדפדפן */
async function prepare(b) {
  const { g } = await settings();
  const BUILTIN = ['own', 'gate-wedding', 'vine-wedding', 'harps-barmitzvah'];
  const id = String(b.tpl || '');
  let t = (g.templates || []).find(x => x.id === id && x.on !== false);
  if (!t && BUILTIN.includes(id)) t = { id, title: id === 'own' ? 'דף מעוצב משלכם' : 'עיצוב', price: 0, variants: [] };
  /* רקעים משותפים (מהמאגר המובנה ומהמאגר של הלוח): הרקע עצמו חינם, משלמים רק על נוסח בתשלום */
  if (!t && /^(pk|cl)-[\w-]{1,48}$/.test(id)) t = { id, title: 'דף רקע', price: 0, variants: [] };
  if (!t) return { error: 'העיצוב לא נמצא' };
  const state = cleanState(b.state);
  /* נוסח בתשלום: המחיר שלו מהניהול */
  let pp = 0, ptitle = '';
  if (state.preset && state.preset.id) {
    const gp = (await loadSetting('greetings')) || {};
    const p = (gp.presets || []).find(x => x.id === state.preset.id && x.on !== false);
    if (p) { pp = Math.max(0, +p.price || 0); ptitle = p.title || ''; state.preset = { id: p.id, price: pp, title: ptitle }; } else delete state.preset;
  }
  const amount = Math.round((Number(t.price) + pp) * 100) / 100;
  if (!(amount >= 1)) return { error: 'העיצוב הזה חינמי, אין צורך לשלם' };
  const v = b.v == null || b.v === '' ? -1 : parseInt(b.v, 10);
  const vv = v >= 0 && (t.variants || [])[v] ? v : -1;
  if (JSON.stringify(state).length > MAX) return { error: 'העיצוב גדול מדי לשמירה (כנראה התמונה). נסו תמונה קטנה יותר.' };
  return { amount, title: (t.title || 'עיצוב') + (ptitle ? ' · ' + ptitle : ''), tpl: t.id, v: vv, state };
}
async function create(id, email, p) {
  await put(id, { id, email, tpl: p.tpl, v: p.v, title: p.title, state: p.state, created: new Date().toISOString(), mails: 0 });
}
/* הגדרות השליחה במייל (בניהול): on, free (גם לעיצוב חינמי), perDay (מגבלה יומית למשתמש) */
async function mailCfg() { const g = (await loadSetting('greetmail').catch(() => ({}))) || {}; return { on: !!g.on, free: !!g.free, perDay: Math.max(1, Math.min(500, parseInt(g.perDay, 10) || 20)) }; }
function link(id) { return site() + '/brachot/edit.html?o=' + id + '&k=' + token(id) + '#download'; }
const fmt = t => new Date(t).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

async function sendLink(rec, first) {
  if (!rec.email) return false;
  const url = link(rec.id);
  /* הנוסח: בניהול ← המיילים שהלקוחות מקבלים ← greet / greetlink */
  await require('./_paid').send(first ? 'greet' : 'greetlink', rec.email, { 'עיצוב': rec.title, 'עריכה': fmt(rec.editUntil), 'הורדה': fmt(rec.dlUntil), 'הזמנה': rec.id.slice(0, 8) }, { url, text: url }, 'greet');
  return true;
}
/* מ-markPaid: פותחים את זמן העריכה ושולחים את הקישור */
async function paid(o) {
  const rec = await get(o.id); if (!rec) return;
  const { editHours, dlDays } = await settings();
  const now = Date.now();
  rec.paidAt = new Date(now).toISOString();
  rec.editUntil = new Date(now + editHours * 3600e3).toISOString();
  rec.dlUntil = new Date(now + editHours * 3600e3 + dlDays * 864e5).toISOString();
  if (!rec.email && o.email) rec.email = o.email;
  await put(o.id, rec);
  try { await sendLink(rec, true); } catch (e) { console.error('greet link mail', e.message); }
}

function view(rec, now) {
  return { id: rec.id, tpl: rec.tpl, v: rec.v, title: rec.title, state: rec.state, paid: !!rec.paidAt, editUntil: rec.editUntil || null, dlUntil: rec.dlUntil || null, now: new Date(now).toISOString(),
    email: rec.email ? rec.email.replace(/^(.).*?(@.*)$/, '$1•••$2') : '' };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    const b = readBody(req), id = String(b.o || '');
    /* האזור האישי: כל הברכות וההזמנות שהמשתמש המחובר קנה (לפי החשבון או המייל שלו), עם הקישור האישי לכל אחת */
    if (b.action === 'mine') {
      const user = await require('./_lib').getUser(req);
      if (!user) return json(res, 401, { error: 'login' });
      const em = String(user.email || '').toLowerCase(), enc = encodeURIComponent;
      const rows = await db('orders?select=id,amount,status,coupon,txn,created_at,paid_at&plan=eq.greet&status=in.(paid,refunded)&or=(user_id.eq.' + user.id + (em ? ',email.eq.' + enc(em) : '') + ')&order=created_at.desc&limit=100').catch(() => []);
      const now = Date.now();
      const list = await Promise.all((rows || []).map(async o => {
        const rec = await get(o.id).catch(() => null);
        const x = { id: o.id, no: String(o.id).slice(0, 8), amount: +o.amount || 0, via: o.coupon === 'SUB' ? 'sub' : o.coupon === 'PACK' ? 'pack' : '', rc: /^\d{4,}$/.test(String(o.txn || '')) && require('./_nedarim').apiReady(), status: o.status, at: o.paid_at || o.created_at, title: (rec && rec.title) || 'ברכה / הזמנה', tpl: rec ? rec.tpl : '', v: rec ? rec.v : -1,
          editUntil: rec && rec.editUntil || null, dlUntil: rec && rec.dlUntil || null };
        if (rec && rec.paidAt && o.status === 'paid' && (!rec.dlUntil || now <= Date.parse(rec.dlUntil))) x.link = '/brachot/edit.html?o=' + o.id + '&k=' + token(o.id);
        return x;
      }));
      return json(res, 200, { now: new Date(now).toISOString(), list });
    }
    /* מנויים וחבילות: מה יש ללקוח המחובר, ומה אפשר לקנות */
    if (b.action === 'ent') {
      const SB = require('./_subs'), user = await require('./_lib').getUser(req).catch(() => null), S = await SB.cfg();
      return json(res, 200, { gmail: await mailCfg().then(g => g.on ? { free: g.free, perDay: g.perDay } : null).catch(() => null), offers: await SB.pub(), ent: user ? await SB.greetEnt(user, S) : null, rent: user ? await SB.remEnt(user, S).catch(() => null) : null, login: !!user });
    }
    /* שליחת ברכה מעוצבת במייל (הגדרה greetmail בניהול): רק למשתמש מחובר, לעיצוב ששולם (o + k) או חינמי (אם מותר), עם מגבלה יומית.
       התמונה מגיעה מהדפדפן (JPEG), נשמרת באחסון, ומוצגת בגוף המייל. המייל יוצא בשם השולח, ותשובה מגיעה אליו */
    if (b.action === 'gmsend') {
      const GM = await mailCfg(); if (!GM.on) return json(res, 403, { error: 'off', message: 'השליחה במייל לא פעילה כרגע.' });
      const user = await require('./_lib').getUser(req); if (!user) return json(res, 401, { error: 'login', message: 'צריך להיכנס לחשבון.' });
      let okDesign = false;
      if (okId(b.o) && String(b.k || '') === token(b.o)) { const rec = await get(b.o).catch(() => null); okDesign = !!(rec && rec.paidAt && Date.now() <= Date.parse(rec.dlUntil)); }
      else if (GM.free && b.free) okDesign = true;
      if (!okDesign) return json(res, 402, { error: 'paid', message: 'אפשר לשלוח במייל עיצוב ששולם' + (GM.free ? ' או עיצוב חינמי' : '') + '.' });
      const to = [...new Set(String(b.to || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)))].slice(0, 50);
      if (!to.length) return json(res, 400, { error: 'to', message: 'נא לכתוב לפחות כתובת מייל אחת.' });
      const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }), { loadSetting: ls, saveSetting: ss } = require('./_lib');
      const CNT = (await ls('greetmailcnt').catch(() => ({}))) || {}, C = CNT.day === day ? CNT : { day, u: {} }, used = +C.u[user.id] || 0;
      if (used + to.length > GM.perDay) return json(res, 429, { error: 'limit', message: 'אפשר לשלוח עד ' + GM.perDay + ' מיילים ביום. נשארו היום: ' + Math.max(0, GM.perDay - used) + '.' });
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'img' });
      const buf = Buffer.from(m[1], 'base64'); if (buf.length > 1300000) return json(res, 413, { error: 'big' });
      const R2 = require('./_r2'), MB = R2.media(); if (!MB) return json(res, 503, { error: 'storage' });
      const P = R2.mediaPut('greetmail/' + day.slice(0, 7) + '/' + crypto.randomBytes(12).toString('hex') + '.jpg');
      const up = await fetch(P.upload, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf }); if (!up.ok) return json(res, 502, { error: 'storage' });
      const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
      const from = clean(b.from, 60) || user.email, note = clean(b.note, 600);
      const { escH } = require('./_mail'), imgH = '<p style="margin:0 0 16px"><a href="' + P.url + '"><img src="' + P.url + '" alt="' + escH('ברכה מ' + from) + '" style="display:block;width:100%;max-width:476px;height:auto;border-radius:10px;border:1px solid #e3e6e3"></a></p>';
      let sent = 0;
      for (const addr of to) { try { await require('./_paid').send('greetmail', addr, { 'שולח': from, 'מייל השולח': user.email, 'הודעה': note }, { url: P.url, beforeBody: imgH, replyTo: user.email, footHtml: '<a href="mailto:contact@myluach.org?subject=' + encodeURIComponent('דיווח על מייל ברכה מ' + user.email) + '" style="color:#6b7679">דיווח על שימוש לרעה</a>' }, 'greetmail'); sent++; } catch (e) { console.error('greetmail', e.message); if (/no mail provider/.test(e.message)) break; } }
      C.u[user.id] = used + sent; await ss('greetmailcnt', C).catch(() => {});
      return json(res, 200, { ok: true, sent, left: Math.max(0, GM.perDay - used - sent) });
    }
    /* קבלה מנדרים פלוס להזמנה של המשתמש */
    if (b.action === 'receipt') {
      const user = await require('./_lib').getUser(req); if (!user) return json(res, 401, { error: 'login' });
      const oid = String(b.order || ''); if (!okId(oid)) return json(res, 400, { error: 'id' });
      const o = ((await db('orders?id=eq.' + oid + '&select=email,user_id,txn')) || [])[0];
      if (!o || (o.user_id !== user.id && String(o.email || '').toLowerCase() !== user.email)) return json(res, 404, { error: 'not found' });
      const u = await require('./_nedarim').receipt(o.txn).catch(() => null);
      return u ? json(res, 200, { url: u }) : json(res, 404, { error: 'none', message: 'הקבלה עוד לא מוכנה. נסו שוב מאוחר יותר.' });
    }
    /* ביטול חידוש אוטומטי של מנוי (ברכות או תזכורות). התוקף נשאר עד סוף התקופה ששולמה */
    if (b.action === 'cancelauto') {
      const user = await require('./_lib').getUser(req); if (!user) return json(res, 401, { error: 'login' });
      const oid = String(b.order || ''); if (!okId(oid)) return json(res, 400, { error: 'id' });
      const o = ((await db('orders?id=eq.' + oid + '&select=id,email,user_id,plan,callback')) || [])[0];
      if (!o || (o.user_id !== user.id && String(o.email || '').toLowerCase() !== user.email)) return json(res, 404, { error: 'not found' });
      try { const A = await require('./_subauto').cancel(o); return json(res, 200, { ok: true, until: A.until }); }
      catch (e) { console.error('cancelauto', e.message); return json(res, 502, { error: 'provider', message: 'לא הצלחנו לבטל מול חברת התשלום. נסו שוב או כתבו לנו.' }); }
    }
    /* עיצוב בתשלום מתוך המנוי או החבילה: נוצרת הזמנה ששולמה בסכום 0 (קופון SUB / PACK), ומשם הכל כמו תשלום רגיל */
    if (b.action === 'redeem') {
      const user = await require('./_lib').getUser(req); if (!user) return json(res, 401, { error: 'login', message: 'צריך להתחבר לחשבון.' });
      const SB = require('./_subs'), ent = await SB.greetEnt(user);
      const use = ent.canSub ? 'SUB' : ent.packLeft > 0 ? 'PACK' : null;
      if (!use) return json(res, 402, { error: 'none', message: ent.sub ? 'נוצלה המכסה של החודש במנוי.' : 'אין מנוי או חבילה פעילים.' });
      const p = await prepare(b); if (p.error) return json(res, 400, { error: 'greet', message: p.error });
      const oid = crypto.randomBytes(12).toString('hex'), now0 = new Date().toISOString();
      const o = { id: oid, plan: 'greet', amount: 0, status: 'pending', email: user.email, user_id: user.id, coupon: use, created_at: now0 };
      await db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify(o) });
      await create(oid, user.email, p);
      await require('./_paid').markPaid(o, { callback: { redeem: use, value: p.amount } }, use === 'SUB' ? 'מנוי' : 'חבילה');
      return json(res, 200, { id: oid, use });
    }
    if (!okId(id)) return json(res, 400, { error: 'id' });
    const now = Date.now();
    /* מיד אחרי תשלום: הדפדפן שקנה מקבל את המפתח (רק בשעתיים הראשונות אחרי התשלום) */
    if (b.action === 'claim') {
      const rows = await db('orders?id=eq.' + id + '&select=status,plan');
      if (!rows || !rows[0] || (rows[0].plan !== 'greet' && rows[0].plan !== 'wishd') || rows[0].status !== 'paid') return json(res, 402, { error: 'not paid' });
      let rec = await get(id); if (!rec) return json(res, 404, { error: 'not found' });
      if (!rec.paidAt) { await paid({ id, email: rec.email }); rec = await get(id); }
      if (now - Date.parse(rec.paidAt) > 2 * 3600e3) return json(res, 403, { error: 'old', message: 'הקישור נשלח למייל שלכם.' });
      return json(res, 200, { k: token(id), ...view(rec, now) });
    }
    if (String(b.k || '') !== token(id)) return json(res, 403, { error: 'key', message: 'הקישור לא תקין.' });
    const rec = await get(id); if (!rec) return json(res, 404, { error: 'not found', message: 'העיצוב לא נמצא.' });
    if (!rec.paidAt) return json(res, 402, { error: 'not paid', message: 'התשלום עדיין לא אושר.' });
    if (b.action === 'get') return json(res, 200, view(rec, now));
    if (b.action === 'save') {
      if (now > Date.parse(rec.editUntil)) return json(res, 403, { error: 'locked', message: 'זמן העריכה הסתיים. אפשר עדיין להוריד את הקובץ.' });
      const st = cleanState(b.state);
      if (JSON.stringify(st).length > MAX) return json(res, 413, { error: 'big', message: 'העיצוב גדול מדי לשמירה. נסו תמונה קטנה יותר.' });
      rec.state = st; rec.saved = new Date(now).toISOString();
      await put(id, rec);
      return json(res, 200, { ok: true, saved: rec.saved });
    }
    if (b.action === 'mail') {
      if (now > Date.parse(rec.dlUntil)) return json(res, 403, { error: 'expired', message: 'תוקף הקישור הסתיים.' });
      if ((rec.mails || 0) >= 30) return json(res, 429, { error: 'many', message: 'כבר נשלחו הרבה מיילים לעיצוב הזה. הקישור נמצא במיילים הקודמים.' });
      rec.mails = (rec.mails || 0) + 1; await put(id, rec);
      await sendLink(rec, false);
      return json(res, 200, { ok: true, to: view(rec, now).email });
    }
    json(res, 400, { error: 'action' });
  } catch (e) { console.error('greetpay', e); json(res, 500, { error: 'server', message: 'תקלה זמנית. נסו שוב בעוד רגע.' }); }
};
module.exports.prepare = prepare;
module.exports.create = create;
module.exports.paid = paid;
