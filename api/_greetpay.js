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
      if (k === 'src') { if (typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) o.src = v; return; }
      if (typeof v === 'number' && isFinite(v)) o[k] = v;
      else if (typeof v === 'boolean') o[k] = v;
      else if (typeof v === 'string') o[k] = v.slice(0, 3000);
    });
    return o;
  }).filter(Boolean);
  const P = s.panel && typeof s.panel === 'object' ? s.panel : null;
  if (P) out.panel = { on: !!P.on, color: /^#[0-9a-f]{3,8}$/i.test(String(P.color || '')) ? P.color : '#ffffff', op: Math.max(0, Math.min(1, +P.op || 0)), r: Math.max(0, Math.min(100, +P.r || 0)), pad: Math.max(0, Math.min(120, +P.pad || 0)) };
  const U = s.ubg && typeof s.ubg === 'object' ? s.ubg : null;
  if (U && typeof U.src === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(U.src)) out.ubg = { src: U.src, mode: U.mode === 'area' ? 'area' : 'page', op: Math.max(0.05, Math.min(1, +U.op || 1)) };
  return out;
}

/* מהקופה (checkout): בדיקת העיצוב והמחיר. המחיר נלקח מהניהול, לא מהדפדפן */
async function prepare(b) {
  const { g } = await settings();
  const t = (g.templates || []).find(x => x.id === String(b.tpl || '') && x.on !== false);
  if (!t) return { error: 'העיצוב לא נמצא' };
  const amount = Math.round(Number(t.price) * 100) / 100;
  if (!(amount >= 1)) return { error: 'העיצוב הזה חינמי, אין צורך לשלם' };
  const v = b.v == null || b.v === '' ? -1 : parseInt(b.v, 10);
  const vv = v >= 0 && (t.variants || [])[v] ? v : -1;
  const state = cleanState(b.state);
  if (JSON.stringify(state).length > MAX) return { error: 'העיצוב גדול מדי לשמירה (כנראה התמונה). נסו תמונה קטנה יותר.' };
  return { amount, title: t.title || 'עיצוב', tpl: t.id, v: vv, state };
}
async function create(id, email, p) {
  await put(id, { id, email, tpl: p.tpl, v: p.v, title: p.title, state: p.state, created: new Date().toISOString(), mails: 0 });
}
function link(id) { return site() + '/brachot/edit.html?o=' + id + '&k=' + token(id) + '#download'; }
const fmt = t => new Date(t).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

async function sendLink(rec, first) {
  if (!rec.email) return false;
  const { sendMail, frame, escH } = require('./_mail');
  const url = link(rec.id);
  const body = (first ? 'התשלום התקבל, תודה!\n\n' : '') + 'זה הקישור האישי לעיצוב "' + rec.title + '".\n' +
    'אפשר לפתוח אותו מכל מחשב או טלפון, לשנות את הטקסט עד ' + fmt(rec.editUntil) + ', ולהוריד את הקובץ בכל גודל עד ' + fmt(rec.dlUntil) + '.';
  const h = s => escH(s).replace(/\n/g, '<br>');
  await sendMail({ to: rec.email, subject: (first ? 'התשלום התקבל: ' : 'הקישור לעיצוב: ') + rec.title + ' · MyLuach',
    html: frame({ title: h(first ? 'העיצוב שלכם מוכן' : 'הקישור לעיצוב שלכם'), body: h(body), button: 'לפתיחת העיצוב', url, foot: h('מספר הזמנה: ' + rec.id.slice(0, 8) + '. לא לשתף את הקישור: מי שיש לו אותו יכול לשנות את העיצוב.') }),
    text: body + '\n\n' + url }, 'greet');
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
    if (!okId(id)) return json(res, 400, { error: 'id' });
    const now = Date.now();
    /* מיד אחרי תשלום: הדפדפן שקנה מקבל את המפתח (רק בשעתיים הראשונות אחרי התשלום) */
    if (b.action === 'claim') {
      const rows = await db('orders?id=eq.' + id + '&select=status,plan');
      if (!rows || !rows[0] || rows[0].plan !== 'greet' || rows[0].status !== 'paid') return json(res, 402, { error: 'not paid' });
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
