/* החשבון של המשתמש המחובר: המסלול ששילם עליו (רכישות של 400 הימים האחרונים, לפי חשבון או מייל).
   אפשר לשלוח claim: מספרי הזמנות שבוצעו בדפדפן לפני ההתחברות, כדי לצרף אותן לחשבון. */
'use strict';
const { cdUsable, getUser, LP, PAID, db, readBody, json, upsertProfile, planInfo, loadConfig } = require('./_lib');

async function welcome(to) {
  const { sendMail } = require('./_mail');
  await sendMail({ to, ...(await require('./_paid').welcome()) }, 'welcome');
}

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    await loadConfig(); /* כדי שמסלולים שנוצרו בניהול יוכרו */
    /* משתמש חדש (אין לו עדיין רשומה): מייל ברוכים הבאים, פעם אחת */
    let isNew = false; try { const pr = await db('profiles?user_id=eq.' + user.id + '&select=user_id'); isNew = !(pr && pr.length); } catch (e) {}
    await upsertProfile(user);
    if (isNew && user.email) welcome(user.email).catch(e => console.error('welcome', e.message));
    const b = readBody(req);
    const claim = (Array.isArray(b.claim) ? b.claim : String(b.claim || '').split(',')).filter(x => /^[0-9a-f]{24}$/.test(x)).slice(0, 20);
    for (const id of claim) {
      await db('orders?id=eq.' + id + '&user_id=is.null', { method: 'PATCH', body: JSON.stringify({ user_id: user.id }) });
    }
    const since = new Date(Date.now() - 400 * 864e5).toISOString();
    const or = 'or=(user_id.eq.' + user.id + (user.email ? ',email.eq.' + encodeURIComponent(user.email) : '') + ')';
    const rows = await db('orders?select=id,plan,amount,paid_at,user_id&status=eq.paid&paid_at=gte.' + encodeURIComponent(since) + '&' + or + '&order=paid_at.desc');
    const rank = id => LP.rank(id);
    /* plan = הטוב ביותר ללוח השנה; cdPlan = ללוח הספירה: מסלולי ספירה או המסלול המלא */
    const cdOnly = id => !!(LP.PLANS.find(p => p.id === id) || {}).cd;
    let plan = null, cdPlan = null;
    (rows || []).forEach(o => { if (PAID.indexOf(o.plan) < 0) return; if (!cdOnly(o.plan) && (!plan || rank(o.plan) > rank(plan))) plan = o.plan; if (cdUsable(o) && (!cdPlan || rank(o.plan) > rank(cdPlan))) cdPlan = o.plan; });
    /* הזמנות לפי מייל שעוד לא שויכו לחשבון: משייכים */
    for (const o of rows || []) if (!o.user_id) await db('orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify({ user_id: user.id }) });
    let dl = null; try { const pi = await planInfo(user, !!b.cd); dl = { limit: pi.limit, used: pi.used, left: pi.left }; } catch (e) {}
    json(res, 200, { email: user.email, plan, cdPlan, dl, orders: (rows || []).filter(o => o.plan !== 'donation').map(o => ({ id: o.id.slice(0, 8), plan: o.plan, amount: o.amount, paid_at: o.paid_at })) });
  } catch (e) {
    console.error('me', e);
    json(res, 500, { error: 'server error' });
  }
};
