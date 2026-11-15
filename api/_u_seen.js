/* פעילות אחרונה של משתמש מחובר (נשלח מהדפדפן בטעינת דף ובחזרה ללשונית, לכל היותר פעם ב-10 דקות).
   מוצג בניהול בכרטיס הלקוח וברשימת "פעילות אחרונה". נשמר רק הזמן והדף, בלי שום תוכן. */
'use strict';
const { db, json, getUser, readBody } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, {});
  const user = await getUser(req).catch(() => null); if (!user) return json(res, 401, { error: 'login' });
  const b = readBody(req) || {}, page = String(b.p || '').replace(/[^\w\/.\-]/g, '').slice(0, 80) || '/';
  await db('user_seen?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, email: String(user.email || '').toLowerCase() || null, seen_at: new Date().toISOString(), page }) }).catch(e => console.error('seen', e.message));
  return json(res, 200, { ok: true });
};
