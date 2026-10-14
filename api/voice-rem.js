/* תזכורות קוליות בטלפון: במסלול המלא, עד 50, אחרי אימות מספר הטלפון */
'use strict';
const { db, readBody, json, getUser, bestPlan } = require('./_lib');
const MAX = 50;
const okRule = r => r && ['heb', 'greg', 'monthly', 'once'].includes(r.rec) && (r.rec === 'once' ? /^\d{4}-\d{2}-\d{2}$/.test(r.date) : +r.d >= 1 && +r.d <= 31 && (r.rec === 'monthly' || (+r.m >= 1 && +r.m <= 13)));
module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'login' });
  try {
    if (req.method === 'GET') {
      const rows = await db('voice_reminders?user_id=eq.' + user.id + '&status=eq.active&select=id,name,rule,notice&order=id');
      return json(res, 200, { items: rows || [], max: MAX });
    }
    const b = readBody(req);
    if (req.method === 'DELETE' || b.action === 'delete') {
      const id = parseInt(b.id || (req.query || {}).id, 10);
      if (id) await db('voice_reminders?id=eq.' + id + '&user_id=eq.' + user.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'off' }) });
      return json(res, 200, { ok: true });
    }
    if ((await bestPlan(user)) !== 'full') return json(res, 403, { error: 'plan' });
    const prof = await db('profiles?user_id=eq.' + user.id + '&select=phone,phone_verified_at');
    const ph = prof && prof[0] && prof[0].phone_verified_at ? prof[0].phone : null;
    if (!ph) return json(res, 409, { error: 'phone' });
    const name = String(b.name || '').trim().slice(0, 120), rule = b.rule || {};
    const notice = (Array.isArray(b.notice) ? b.notice : [1]).map(Number).filter(n => [0, 1, 2, 3, 7].includes(n)).slice(0, 3);
    if (!name || !okRule(rule) || !notice.length) return json(res, 400, { error: 'bad reminder' });
    const clean = { rec: rule.rec, d: +rule.d || null, m: +rule.m || null, date: rule.rec === 'once' ? rule.date : null };
    const id = parseInt(b.id, 10);
    if (id) {
      await db('voice_reminders?id=eq.' + id + '&user_id=eq.' + user.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name, rule: clean, notice, phone: ph }) });
      return json(res, 200, { id });
    }
    const mine = await db('voice_reminders?user_id=eq.' + user.id + '&status=eq.active&select=id');
    if ((mine || []).length >= MAX) return json(res, 429, { error: 'max', max: MAX });
    const row = await db('voice_reminders', { method: 'POST', body: JSON.stringify({ user_id: user.id, phone: ph, name, rule: clean, notice }) });
    json(res, 200, { id: row && row[0] && row[0].id });
  } catch (e) { console.error('voice-rem', e); json(res, 500, { error: 'server error' }); }
};
