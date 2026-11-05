/* רישום הורדה/הדפסה של לוח, לדף הניהול. עובד גם בלי התחברות (אז בלי מייל, אלא אם נמסר בבקשה). */
'use strict';
const { db, json, getUser, readBody, planInfo, loadConfig, env } = require('./_lib');
const crypto = require('node:crypto');
/* דוגמית: שמירת תוכן הלוח (בלי תמונות) בדלי הפרטי samples, לפי שיעור הדגימה שנקבע בניהול */
async function saveSnap(snap) {
  if (!snap || typeof snap !== 'object') return null;
  const body = JSON.stringify(snap); if (body.length > 4000000) return null;
  const rate = (await loadConfig()).sampleRate; if (Math.random() * 100 >= (rate == null ? 100 : +rate)) return null;
  const path = new Date().toISOString().slice(0, 7) + '/' + crypto.randomBytes(12).toString('hex') + '.json';
  /* מהיום: ל-Cloudflare R2 (הדלי הפרטי), בנתיב samples/... . בהורדות נשמר "r2/<חודש>/<קובץ>" */
  try { const R2 = require('./_r2'); if (R2.on()) { const r = await fetch(R2.presign('PUT', 'samples/' + path, 600), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }); if (r.ok) return 'r2/' + path; } } catch (e) { console.error('r2 sample', e.message); }
  const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(url + '/storage/v1/object/samples/' + path, { method: 'POST', headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' }, body });
  return r.ok ? path : null;
}
const KINDS = ['paid', 'lite', 'sample', 'countdown', 'browser'];
const REPRINT = 30 * 60 * 1000; /* הדפסה חוזרת תוך 30 דקות (תקלה במדפסת) לא נספרת */
/* תיקונים אחרי ההדפסה הראשונה של לוח, לפי המסלול: כמה מהלוח מותר לשנות (ביחס להדפסה הראשונה), ובמשך כמה זמן. בלי הגבלה על מספר התיקונים.
   מעבר לזה (למשל לוח למשפחה אחרת) נספר כהורדה חדשה */
const FIX = { basic: { chg: 0.4, ms: 24 * 3600e3 }, family: { chg: 0.5, ms: 24 * 3600e3 }, full: { chg: 0.7, ms: 7 * 24 * 3600e3 },
  cdbasic: { chg: 0.4, ms: 24 * 3600e3 }, cdfull: { chg: 0.5, ms: 24 * 3600e3 } };
const fixRule = plan => FIX[plan] || FIX.basic;
const partsOf = v => String(v || '').split(',').filter(x => /^[0-9a-f]{10}$/.test(x));
/* כמה מהלוח השתנה: חלקים שהוחלפו, נמחקו או נוספו, ביחס לגודל הלוח */
function changed(a, b) { const A = new Set(partsOf(a)), B = new Set(partsOf(b)); if (!A.size && !B.size) return 0; if (!A.size || !B.size) return 1; let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return Math.max(A.size - n, B.size - n) / Math.max(A.size, B.size); }
/* גרסה שכבר הודפסה (אותה "טביעת אצבע" של התוכן): אפשר להדפיס שוב בלי הגבלה, עד חודש אחרי סוף השנה של הלוח */
async function yearEnd(yr) {
  const m = /^([hg])(\d{4})$/.exec(String(yr || '')); if (!m) return null;
  if (m[1] === 'g') return new Date(Date.UTC(+m[2] + 1, 0, 31));
  try { const { HDate } = await import('./_hdate/index.js'); const d = new HDate(1, 7, +m[2] + 1).greg(); return new Date(d.getTime() + 30 * 864e5); } catch (e) { return null; }
}
/* האם ההדפסה הזאת חינם: {free, why: 'quick' | 'grace' | 'same'} */
async function freeReprint(user, b, plan) {
  const cid = /^[\w-]{6,64}$/.test(String(b.cid || '')) ? String(b.cid) : '', vh = /^[0-9a-f]{64}$/.test(String(b.vh || '')) ? String(b.vh) : '';
  let rows = [];
  try { rows = await db('downloads?select=created_at,kind,cid,vh,parts,cal&kind=in.(paid,reprint)&user_id=eq.' + user.id + '&order=created_at.desc&limit=200') || []; }
  catch (e) { try { rows = await db('downloads?select=created_at,cal&kind=in.(paid,reprint)&user_id=eq.' + user.id + '&order=created_at.desc&limit=1') || []; } catch (x) {} }
  const now = Date.now();
  if (rows[0] && now - new Date(rows[0].created_at) < REPRINT) return { free: true, why: 'quick' };
  if (cid) {
    const mine = rows.filter(r => r.cid === cid);
    const first = mine.length ? mine[mine.length - 1] : null;
    if (vh && mine.some(r => r.vh === vh)) { const end = await yearEnd(b.yr); if (!end || now < end.getTime()) return { free: true, why: 'same' }; }
    /* תיקון בזמן התיקונים של המסלול: רק אם השינוי מההדפסה הראשונה לא גדול מהמותר */
    const R = fixRule(plan);
    if (first && now - new Date(first.created_at) < R.ms && b.parts && first.parts) {
      const chg = changed(first.parts, b.parts);
      if (chg <= R.chg) return { free: true, why: 'grace', chg: Math.round(chg * 100), max: Math.round(R.chg * 100), until: new Date(new Date(first.created_at).getTime() + R.ms).toISOString() };
      return { free: false, why: 'toomuch', chg: Math.round(chg * 100), max: Math.round(R.chg * 100) };
    }
  }
  return { free: false };
}
const s = (v, n) => v == null || v === '' ? null : String(v).slice(0, n);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const b = readBody(req);
  if (!KINDS.includes(b.kind)) return json(res, 400, { error: 'kind' });
  const user = await getUser(req);
  let kind = b.kind, info = null;
  /* הורדה בתשלום: השרת מאשר לפי התשלומים בפועל ולפי ההורדות שכבר נוצלו */
  if (kind === 'paid') {
    if (!user) return json(res, 401, { error: 'login' });
    try { info = await planInfo(user, String(b.page || '') === 'countdown'); } catch (e) { return json(res, 503, { error: 'unavailable' }); }
    if (!info.plan) return json(res, 403, { error: 'plan' });
    if (info.used != null) {
      const fr = await freeReprint(user, b, info.plan);
      /* בדיקה בלבד (לפני ההדפסה, כדי להציג ללקוח אם היא חינם) */
      if (b.dry) return json(res, 200, { free: fr.free, why: fr.why || null, until: fr.until || null, chg: fr.chg == null ? null : fr.chg, max: fr.max == null ? null : fr.max, left: info.left, limit: info.limit });
      if (fr.free) kind = 'reprint';
      else if (info.left <= 0) return json(res, 409, { error: 'used', limit: info.limit, plan: info.plan });
      /* הדפסות של מסלול אחד: רק לאותה שנה (לפי הלוח הראשון שהודפס מאז הרכישה) */
      const yr = /^[hg]\d{4}$/.test(String(b.yr || '')) ? String(b.yr) : '';
      if (yr) {
        try {
          const prev = await db('downloads?select=cal&kind=in.(paid,reprint)&user_id=eq.' + user.id + '&created_at=gte.' + encodeURIComponent(info.since) + '&order=created_at.asc&limit=50');
          const first = (prev || []).map(r => (/^([hg]\d{4}) · /.exec(r.cal || '') || [])[1]).find(Boolean);
          if (first && first !== yr) return json(res, 409, { error: 'year', year: first, plan: info.plan });
        } catch (e) {}
      }
    }
  }
  let email = user ? user.email : s(b.email, 160);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = null;
  let snap = null; try { snap = await saveSnap(b.snap); } catch (e) {}
  try {
    const cid = /^[\w-]{6,64}$/.test(String(b.cid || '')) ? String(b.cid) : null, vh = /^[0-9a-f]{64}$/.test(String(b.vh || '')) ? String(b.vh) : null, parts = partsOf(b.parts).slice(0, 600).join(',') || null;
    await db('downloads', { meta: { ...(require('./_lib').reqMeta(req) || {}), ...(cid ? { cid } : {}), ...(vh ? { vh } : {}), ...(parts ? { parts } : {}) }, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      user_id: user ? user.id : null, email: email ? email.toLowerCase() : null, kind,
      plan: info ? info.plan : s(b.plan, 20), cal: (info && /^[hg]\d{4}$/.test(String(b.yr || '')) ? b.yr + ' · ' : '') + (s(b.cal, 110) || ''), view: s(b.view, 20), size: s(b.size, 30),
      pages: Math.max(0, Math.min(999, parseInt(b.pages, 10) || 0)) || null, snap, page: (s(b.page, 20) || 'app') + (b.kind === 'browser' ? (b.wm ? ' · עם סימן מים' : ' · בלי סימן מים') : '') }) });
    json(res, 200, { ok: true, reprint: kind === 'reprint', left: info && info.left != null ? Math.max(0, info.left - (kind === 'paid' ? 1 : 0)) : null, limit: info ? info.limit : null });
  } catch (e) { console.error('dl-log', e.message); json(res, 200, { ok: false }); }
};
