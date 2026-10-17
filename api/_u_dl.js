/* רישום הורדה/הדפסה של לוח, לדף הניהול. עובד גם בלי התחברות (אז בלי מייל, אלא אם נמסר בבקשה). */
'use strict';
const { db, json, getUser, readBody } = require('./_lib');
const KINDS = ['paid', 'lite', 'sample', 'countdown', 'browser'];
const s = (v, n) => v == null || v === '' ? null : String(v).slice(0, n);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const b = readBody(req);
  if (!KINDS.includes(b.kind)) return json(res, 400, { error: 'kind' });
  const user = await getUser(req);
  let email = user ? user.email : s(b.email, 160);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = null;
  try {
    await db('downloads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      user_id: user ? user.id : null, email: email ? email.toLowerCase() : null, kind: b.kind,
      plan: s(b.plan, 20), cal: s(b.cal, 120), view: s(b.view, 20), size: s(b.size, 30),
      pages: Math.max(0, Math.min(999, parseInt(b.pages, 10) || 0)) || null, page: (s(b.page, 20) || 'app') + (b.kind === 'browser' ? (b.wm ? ' · עם סימן מים' : ' · בלי סימן מים') : '') }) });
    json(res, 200, { ok: true });
  } catch (e) { console.error('dl-log', e.message); json(res, 200, { ok: false }); }
};
