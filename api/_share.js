/* שיתוף לוח עם המשפחה: בעל הלוח (משתמש מחובר) יוצר קישור, ומי שמקבל אותו מוסיף אירועים ותמונות בלי הרשמה.
   התוספות נשמרות בטבלת share_items (והתמונות בדלי הפרטי shared) עד שבעל הלוח פותח את הלוח ומאשר אותן.
   אחרי אישור או דחייה התמונה נמחקת מהאחסון: היא כבר שמורה בלוח של בעל הלוח, כך שהאחסון כמעט לא גדל.
   בעל הלוח: POST /api/user?fn=share · משתתף: GET/POST /api/pricing?c=_share&k=<קוד> */
'use strict';
const { db, json, getUser, readBody, bestPlan, loadConfig, env } = require('./_lib');
const crypto = require('node:crypto');

/* כמה תמונות אפשר לקבל מהמשפחה, לפי המסלול של בעל הלוח (אירועים: עד EVENTS בכל מסלול) */
const PHOTOS = { family: 100, full: 300 }, PHOTOS_FREE = 5, EVENTS = 200;
const EV_KINDS = ['birthday', 'anniversary', 'yahrzeit', 'event', 'other'];
const ST = ['new', 'ok', 'no'];
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const int = (v, lo, hi) => { v = parseInt(v, 10); return isFinite(v) && v >= lo && v <= hi ? v : null; };
const sid = v => /^[A-Za-z0-9_-]{8,24}$/.test(String(v || '')) ? String(v) : '';

const base = () => env('SUPABASE_URL').replace(/\/$/, '');
const skey = () => { const k = env('SUPABASE_SERVICE_ROLE_KEY'); return { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }) }; };
async function storage(path, opts) {
  const r = await fetch(base() + '/storage/v1/' + path, { ...opts, headers: { ...skey(), 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (j.message || j.error || ''));
  return j;
}
async function signRead(paths) {
  if (!paths.length) return {};
  const j = await storage('object/sign/shared', { method: 'POST', body: JSON.stringify({ expiresIn: 3600, paths }) });
  const out = {}; (Array.isArray(j) ? j : []).forEach(x => { if (x && x.signedURL) out[x.path] = base() + '/storage/v1' + x.signedURL; });
  return out;
}
async function removeImgs(paths) { if (paths.length) await storage('object/shared', { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) }).catch(e => console.error('share rm', e.message)); }

/* חודשי הלוח (לבחירה אצל המשתתף): [{k: מפתח המקום לתמונה, t: שם}] */
const months = v => (Array.isArray(v) ? v : []).slice(0, 40).map(x => ({ k: str(x && x.k, 40), t: str(x && x.t, 40) })).filter(x => x.k && x.t);
const pubShare = s => ({ id: s.id, title: s.title, owner: s.owner_name, auto: !!s.auto, active: !!s.active, months: s.months || [], cal: s.cal || 'heb' });

async function photoLimit(s) {
  let plan = null;
  try { plan = await bestPlan({ id: s.user_id, email: s.owner_email || '' }); } catch (e) {}
  return PHOTOS[plan] || PHOTOS_FREE;
}
async function counts(id) {
  const rows = await db('share_items?select=kind,data&share_id=eq.' + id + '&status=in.(up,new,ok)&limit=2000');
  let photos = 0, events = 0; (rows || []).forEach(r => { if (r.kind === 'photo' || (r.data && r.data.img)) photos++; if (r.kind === 'event') events++; });
  return { photos, events };
}

/* ---------- בעל הלוח ---------- */
async function owner(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const user = await getUser(req); if (!user) return json(res, 401, { error: 'login' });
  const b = readBody(req), a = String(b.action || '');
  try {
    const mine = async id => { id = sid(id); if (!id) return null; const r = await db('shares?select=*&id=eq.' + id + '&user_id=eq.' + user.id); return r && r[0] || null; };
    if (a === 'create') {
      const id = crypto.randomBytes(9).toString('base64url');
      const row = { id, user_id: user.id, owner_email: user.email || null, title: str(b.title, 80) || 'הלוח שלנו', owner_name: str(b.owner, 40), months: months(b.months), cal: b.cal === 'greg' ? 'greg' : 'heb', auto: !!b.auto, active: true };
      const r = await db('shares', { method: 'POST', body: JSON.stringify(row) });
      return json(res, 200, { share: pubShare(r[0] || row), items: [], limit: await photoLimit(row) });
    }
    const s = await mine(b.sid);
    if (!s) return json(res, 200, { share: null });
    if (a === 'set') {
      const p = {};
      if ('title' in b) p.title = str(b.title, 80) || s.title;
      if ('owner' in b) p.owner_name = str(b.owner, 40);
      if ('auto' in b) p.auto = !!b.auto;
      if ('active' in b) p.active = !!b.active;
      if ('months' in b) p.months = months(b.months);
      if (Object.keys(p).length) Object.assign(s, (await db('shares?id=eq.' + s.id, { method: 'PATCH', body: JSON.stringify(p) }))[0] || p);
    }
    if (a === 'done') {
      const st = b.st === 'no' ? 'no' : 'ok', ids = (Array.isArray(b.ids) ? b.ids : []).map(x => int(x, 1, 1e12)).filter(Boolean).slice(0, 500);
      if (ids.length) {
        const rows = await db('share_items?select=id,img&share_id=eq.' + s.id + '&id=in.(' + ids.join(',') + ')');
        await db('share_items?share_id=eq.' + s.id + '&id=in.(' + ids.join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: st, img: null }) });
        await removeImgs((rows || []).map(r => r.img).filter(Boolean));
      }
    }
    /* get / set / done: מחזירים את התוספות שמחכות */
    const items = await db('share_items?select=id,who,kind,data,img,created_at&share_id=eq.' + s.id + '&status=eq.new&order=id.asc&limit=300');
    const urls = await signRead((items || []).map(x => x.img).filter(Boolean)).catch(() => ({}));
    return json(res, 200, { share: pubShare(s), items: (items || []).map(x => ({ id: x.id, who: x.who, kind: x.kind, data: x.data || {}, url: x.img ? urls[x.img] || null : null, at: x.created_at })), limit: await photoLimit(s), used: await counts(s.id) });
  } catch (e) { console.error('share owner', e.message); return json(res, 503, { error: /relation|does not exist|42P01/.test(e.message) ? 'setup' : 'unavailable' }); }
}

/* ---------- המשתתפים (בלי הרשמה) ---------- */
function cleanEvent(e) {
  e = e || {};
  const kind = EV_KINDS.includes(e.kind) ? e.kind : 'event';
  const rec = ['heb', 'greg', 'once'].includes(e.rec) ? e.rec : 'once';
  const o = { kind, name: str(e.name, 60), rec };
  if (rec === 'once') { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) return null; o.date = String(e.date); }
  else {
    o.day = int(e.day, 1, 31); o.month = int(e.month, 1, 14); if (!o.day || !o.month) return null;
    const y = int(e.year, 1900, 6100); if (y) o.year = y;
  }
  if (!o.name) return null;
  return o;
}
async function pub(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const b = readBody(req), id = sid(b.k);
  if (!id) return json(res, 404, { error: 'link' });
  try {
    const r = await db('shares?select=*&id=eq.' + id); const s = r && r[0];
    if (!s) return json(res, 404, { error: 'link' });
    const limit = await photoLimit(s), used = await counts(id);
    const info = { title: s.title, owner: s.owner_name, months: s.months || [], cal: s.cal || 'heb', active: !!s.active, auto: !!s.auto, photosLeft: Math.max(0, limit - used.photos), eventsLeft: Math.max(0, EVENTS - used.events) };
    if (req.method !== 'POST') return json(res, 200, info);
    if (!s.active) return json(res, 403, { error: 'closed' });
    if (await require('./_shabbat').closedNow(req, await loadConfig())) return json(res, 423, { error: 'shabbat' });
    const who = str(b.who, 40); if (!who) return json(res, 400, { error: 'who' });
    const a = String(b.action || '');
    if (a === 'sign') {
      if (info.photosLeft <= 0) return json(res, 409, { error: 'photos', limit });
      if (!/^image\/(jpeg|png|webp)$/.test(String(b.type || '')) || !(+b.size > 0) || +b.size > 6 * 1024 * 1024) return json(res, 400, { error: 'file' });
      const path = id + '/' + crypto.randomBytes(8).toString('hex') + '.jpg';
      const j = await storage('object/upload/sign/shared/' + path, { method: 'POST', body: '{}' });
      if (!j.url) throw new Error('sign');
      await db('share_items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ share_id: id, who, kind: 'photo', img: path, status: 'up', data: {} }) });
      return json(res, 200, { upload: base() + '/storage/v1' + j.url, path });
    }
    if (a === 'add') {
      const img = typeof b.img === 'string' && b.img.startsWith(id + '/') && /^[\w-]+\/[0-9a-f]{16}\.jpg$/.test(b.img) ? b.img : null;
      let data, kind;
      if (b.kind === 'event') {
        data = cleanEvent(b.ev); if (!data) return json(res, 400, { error: 'event' });
        if (info.eventsLeft <= 0) return json(res, 409, { error: 'events' });
        kind = 'event'; if (img) data.img = 1;
      } else {
        if (!img) return json(res, 400, { error: 'img' });
        const mk = str(b.month, 40); data = { month: (s.months || []).some(m => m.k === mk) ? mk : '', note: str(b.note, 80) }; kind = 'photo';
      }
      if (img) {
        const up = await db('share_items?share_id=eq.' + id + '&img=eq.' + encodeURIComponent(img) + '&status=eq.up', { method: 'PATCH', body: JSON.stringify({ who, kind, data, status: 'new' }) });
        if (!up || !up.length) return json(res, 400, { error: 'img' });
      } else await db('share_items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ share_id: id, who, kind, data, status: 'new' }) });
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: 'action' });
  } catch (e) { console.error('share pub', e.message); return json(res, 503, { error: 'unavailable' }); }
}

/* ניקוי (מה-cron): העלאות שלא הושלמו תוך יום, ותוספות שלא טופלו תוך 180 יום */
async function clean() {
  const day = new Date(Date.now() - 864e5).toISOString(), old = new Date(Date.now() - 180 * 864e5).toISOString();
  const rows = await db('share_items?select=id,img&or=(and(status.eq.up,created_at.lt.' + day + '),and(status.eq.new,created_at.lt.' + old + '))&limit=500');
  if (!rows || !rows.length) return 0;
  await removeImgs(rows.map(r => r.img).filter(Boolean));
  await db('share_items?id=in.(' + rows.map(r => r.id).join(',') + ')', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return rows.length;
}
module.exports = { owner, pub, clean, cleanEvent, PHOTOS, PHOTOS_FREE, EVENTS };
