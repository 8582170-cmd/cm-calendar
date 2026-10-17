/* החשבון של המשתמש המחובר: המסלול ששילם עליו (רכישות של 400 הימים האחרונים, לפי חשבון או מייל).
   אפשר לשלוח claim: מספרי הזמנות שבוצעו בדפדפן לפני ההתחברות, כדי לצרף אותן לחשבון. */
'use strict';
const { getUser, LP, PAID, db, readBody, json, upsertProfile, planInfo } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    upsertProfile(user);
    const b = readBody(req);
    const claim = (Array.isArray(b.claim) ? b.claim : String(b.claim || '').split(',')).filter(x => /^[0-9a-f]{24}$/.test(x)).slice(0, 20);
    for (const id of claim) {
      await db('orders?id=eq.' + id + '&user_id=is.null', { method: 'PATCH', body: JSON.stringify({ user_id: user.id }) });
    }
    const since = new Date(Date.now() - 400 * 864e5).toISOString();
    const or = 'or=(user_id.eq.' + user.id + (user.email ? ',email.eq.' + encodeURIComponent(user.email) : '') + ')';
    const rows = await db('orders?select=id,plan,amount,paid_at,user_id&status=eq.paid&paid_at=gte.' + encodeURIComponent(since) + '&' + or + '&order=paid_at.desc');
    const rank = id => LP.PLANS.findIndex(p => p.id === id);
    let plan = null;
    (rows || []).forEach(o => { if (PAID.indexOf(o.plan) >= 0 && (!plan || rank(o.plan) > rank(plan))) plan = o.plan; });
    /* הזמנות לפי מייל שעוד לא שויכו לחשבון: משייכים */
    for (const o of rows || []) if (!o.user_id) await db('orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify({ user_id: user.id }) });
    let dl = null; try { const pi = await planInfo(user); dl = { limit: pi.limit, used: pi.used, left: pi.left }; } catch (e) {}
    json(res, 200, { email: user.email, plan, dl, orders: (rows || []).filter(o => o.plan !== 'donation').map(o => ({ id: o.id.slice(0, 8), plan: o.plan, amount: o.amount, paid_at: o.paid_at })) });
  } catch (e) {
    console.error('me', e);
    json(res, 500, { error: 'server error' });
  }
};
