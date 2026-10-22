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
  const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(url + '/storage/v1/object/samples/' + path, { method: 'POST', headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' }, body });
  return r.ok ? path : null;
}
const KINDS = ['paid', 'lite', 'sample', 'countdown', 'browser'];
const REPRINT = 30 * 60 * 1000; /* הדפסה חוזרת תוך 30 דקות (תקלה במדפסת) לא נספרת */
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
    try { info = await planInfo(user); } catch (e) { return json(res, 503, { error: 'unavailable' }); }
    if (!info.plan) return json(res, 403, { error: 'plan' });
    if (info.used != null) {
      let recent = false;
      try { const r = await db('downloads?select=created_at&kind=eq.paid&user_id=eq.' + user.id + '&order=created_at.desc&limit=1'); recent = r && r[0] && Date.now() - new Date(r[0].created_at) < REPRINT; } catch (e) {}
      if (recent) kind = 'reprint';
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
    await db('downloads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      user_id: user ? user.id : null, email: email ? email.toLowerCase() : null, kind,
      plan: info ? info.plan : s(b.plan, 20), cal: (info && /^[hg]\d{4}$/.test(String(b.yr || '')) ? b.yr + ' · ' : '') + (s(b.cal, 110) || ''), view: s(b.view, 20), size: s(b.size, 30),
      pages: Math.max(0, Math.min(999, parseInt(b.pages, 10) || 0)) || null, snap, page: (s(b.page, 20) || 'app') + (b.kind === 'browser' ? (b.wm ? ' · עם סימן מים' : ' · בלי סימן מים') : '') }) });
    json(res, 200, { ok: true, reprint: kind === 'reprint', left: info && info.left != null ? Math.max(0, info.left - (kind === 'paid' ? 1 : 0)) : null, limit: info ? info.limit : null });
  } catch (e) { console.error('dl-log', e.message); json(res, 200, { ok: false }); }
};
