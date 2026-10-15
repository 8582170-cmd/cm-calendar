/* פגישות ביומן האונליין (למשתמשים רשומים): נשמרות בשרת ומופיעות בכל מכשיר */
'use strict';
const { db, readBody, json, getUser } = require('./_lib');
const MAX = 3000;
const D = /^\d{4}-\d{2}-\d{2}$/, T = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLS = 'id,date,start_t,end_t,title,place,note,color,notify';
module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'login' });
  try {
    const q = req.query || {};
    if (req.method === 'GET') {
      const from = D.test(q.from || '') ? q.from : '2000-01-01', to = D.test(q.to || '') ? q.to : '2100-01-01';
      const rows = await db('appointments?user_id=eq.' + user.id + '&date=gte.' + from + '&date=lte.' + to + '&select=' + COLS + '&order=date,start_t&limit=' + MAX);
      return json(res, 200, { items: rows || [] });
    }
    const b = readBody(req);
    if (req.method === 'DELETE' || b.action === 'delete') {
      const id = parseInt(b.id || q.id, 10);
      if (id) await db('appointments?id=eq.' + id + '&user_id=eq.' + user.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return json(res, 200, { ok: true });
    }
    const o = {
      date: String(b.date || ''), start_t: T.test(b.start_t || '') ? b.start_t : null, end_t: T.test(b.end_t || '') ? b.end_t : null,
      title: String(b.title || '').trim().slice(0, 160), place: String(b.place || '').trim().slice(0, 160) || null,
      note: String(b.note || '').trim().slice(0, 1000) || null, color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : null,
      notify: ['none', 'morning', 'daybefore', 'both'].includes(b.notify) ? b.notify : 'none', email: user.email || null
    };
    if (!D.test(o.date) || !o.title) return json(res, 400, { error: 'bad' });
    if (o.start_t && o.end_t && o.end_t < o.start_t) o.end_t = null;
    const id = parseInt(b.id, 10);
    if (id) {
      await db('appointments?id=eq.' + id + '&user_id=eq.' + user.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...o, last_sent: null }) });
      return json(res, 200, { id });
    }
    const cnt = await db('appointments?user_id=eq.' + user.id + '&select=id&limit=' + (MAX + 1));
    if ((cnt || []).length >= MAX) return json(res, 429, { error: 'max', max: MAX });
    const row = await db('appointments', { method: 'POST', body: JSON.stringify({ user_id: user.id, ...o }) });
    json(res, 200, { id: row && row[0] && row[0].id });
  } catch (e) { console.error('appt', e); json(res, 500, { error: 'server error' }); }
};
