/* לוח חינמי לשנה בגרסה מוגבלת: מימוש אחד לכל משתמש רשום.
   אחרי המימוש יש 24 שעות להדפיס שוב (למקרה של תקלה במדפסת), ואחר כך זה נסגר. */
'use strict';
const { db, json, getUser } = require('./_lib');
const GRACE = 24 * 3600 * 1000;
module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'login' });
  try {
    const rows = await db('free_lite?user_id=eq.' + user.id + '&select=used_at');
    const row = rows && rows[0];
    if (req.method === 'GET') return json(res, 200, { used: !!row, open: !row || Date.now() - new Date(row.used_at) < GRACE, used_at: row ? row.used_at : null });
    if (row) {
      if (Date.now() - new Date(row.used_at) < GRACE) return json(res, 200, { ok: true, again: true });
      return json(res, 409, { error: 'used', used_at: row.used_at });
    }
    await db('free_lite', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, email: user.email }) });
    json(res, 200, { ok: true });
  } catch (e) { console.error('free-lite', e); json(res, 503, { error: 'unavailable' }); }
};
