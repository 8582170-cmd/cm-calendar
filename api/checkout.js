/* יצירת הזמנה והחזרת פרטי התשלום.
   נדרים פלוס: פרטי העסקה לטופס המוטמע (iframe). פייפל: מספר הזמנה בפייפל, ואחר כך גבייה (action=ppcapture).
   קופון של 100%: ההזמנה מסומנת כשולמה מיד, בלי תשלום. לקוח חוזר: הנחה לפי ההגדרה בניהול. */
'use strict';
const crypto = require('node:crypto');
const { getUser, PLAN_NAMES, PAID, loadConfig, publicPricing, checkCoupon, finalPrice, env, db, readBody, json } = require('./_lib');

const MSG = {
  shabbat: 'האתר שומר שבת וחג: אי אפשר לשלם עכשיו. נשמח לראותכם במוצאי השבת או החג.',
  config: 'התשלום באתר עדיין לא פעיל. נסו שוב בקרוב.',
  low: 'הסכום אחרי ההנחה נמוך מדי לחיוב.',
  server: 'תקלה זמנית. נסו שוב בעוד רגע.'
};
/* באיזה אמצעי תשלום משתמשים: ההגדרה בניהול, ואם הוא לא מוגדר בשרת, האחר */
function provider(cfg, isDon) {
  const ned = !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID')), pp = require('./_paypal').ready();
  /* דף התרומות בנוי על הטופס של נדרים פלוס */
  if (isDon) return ned ? 'nedarim' : null;
  const want = cfg.pay === 'paypal' ? 'paypal' : 'nedarim';
  if (want === 'paypal' && pp) return 'paypal';
  if (want === 'nedarim' && ned) return 'nedarim';
  return pp ? 'paypal' : ned ? 'nedarim' : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const b = readBody(req);
    const cfg = await loadConfig();
    /* פייפל: גבייה אחרי שהלקוח אישר בחלון של פייפל */
    if (b.action === 'ppcapture') {
      const id = String(b.id || ''); if (!/^[0-9a-f]{24}$/.test(id)) return json(res, 400, { error: 'id' });
      const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
      if (!o || !o.txn) return json(res, 404, { error: 'order' });
      if (o.status === 'paid') return json(res, 200, { status: 'paid', plan: o.plan });
      const c = await require('./_paypal').capture(o.txn);
      if (!c.ok || c.currency !== 'ILS' || c.amount + 0.001 < +o.amount) {
        await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ status: c.ok ? 'underpaid' : 'failed', callback: c }) });
        return json(res, 402, { error: 'payment', message: 'התשלום לא הושלם בפייפל. אפשר לנסות שוב.' });
      }
      if (!o.email && c.email) { o.email = c.email.toLowerCase(); await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ email: o.email }) }); }
      await require('./_paid').markPaid(o, { callback: { paypal: c } }, 'PayPal');
      return json(res, 200, { status: 'paid', plan: o.plan });
    }

    const plan = String(b.plan || '');
    const isDon = plan === 'donation';
    const user = await getUser(req);
    const email = (String(b.email || '').trim() || (user ? user.email : '')).toLowerCase().slice(0, 200);
    let amount, coupon = null, info = null;
    if (isDon) {
      /* תרומה: הסכום נבחר על ידי התורם (1–100,000 ₪, עד 2 ספרות אחרי הנקודה) */
      amount = Math.round(Number(b.amount) * 100) / 100;
      if (!(amount >= 1 && amount <= 100000)) return json(res, 400, { error: 'bad amount' });
    } else {
      if (b.coupon) {
        coupon = await checkCoupon(cfg, b.coupon, plan);
        if (coupon && coupon.error) return json(res, 400, { error: 'coupon', message: coupon.error });
      }
      /* לקוח חוזר: מי שכבר שילם על מסלול בעבר */
      let renew = null;
      const R = cfg.renew || {};
      if (R.on && +R.percent > 0 && (user || email)) {
        try {
          const or = 'or=(' + [user ? 'user_id.eq.' + user.id : '', email ? 'email.eq.' + encodeURIComponent(email) : ''].filter(Boolean).join(',') + ')';
          const prev = await db('orders?select=id&status=eq.paid&plan=in.(' + PAID.join(',') + ')&' + or + '&limit=1');
          if (prev && prev.length) renew = { percent: Math.min(100, +R.percent), why: 'renew' };
        } catch (e) {}
      }
      if ((cfg.off || []).indexOf(plan) >= 0) return json(res, 400, { error: 'off', message: 'המסלול הזה לא נמכר כרגע' });
      info = finalPrice(publicPricing(cfg), plan, coupon, renew);
      if (!info) return json(res, 400, { error: 'unknown plan', message: 'המסלול לא נמצא' });
      amount = info.amount;
      if (!(amount > 0) && info.off >= 100) {
        /* חינם (קופון או הנחה של 100%): ההזמנה נפתחת מיד */
        const id = crypto.randomBytes(12).toString('hex');
        const o = { id, plan, amount: 0, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: coupon ? coupon.code : null };
        await db('orders', { method: 'POST', body: JSON.stringify(o) });
        await require('./_paid').markPaid(o, {}, info.why === 'coupon' ? 'קופון ' + (coupon && coupon.code) : 'הנחה של 100%');
        return json(res, 200, { id, amount: 0, free: true, plan, base: info.base, off: 100, why: info.why, coupon: coupon ? coupon.code : null });
      }
      /* הנחה גבוהה מאוד (למשל 99%): החיוב המינימלי הוא 1 ₪ (מתחת לזה חברות התשלום לא גובות) */
      if (amount > 0 && amount < 1) { amount = 1; info.amount = 1; info.min = true; }
      if (!(amount >= 1)) return json(res, 400, { error: 'low', message: MSG.low });
    }
    /* אתר שומר שבת: לא פותחים תשלום בשבת ובחג (לפי מיקום הגולש) */
    if (await require('./_shabbat').closedNow(req, cfg)) return json(res, 423, { error: 'shabbat', message: MSG.shabbat });
    const prov = provider(cfg, isDon);
    if (!prov) return json(res, 503, { error: 'payments not configured', message: MSG.config });
    const id = crypto.randomBytes(12).toString('hex');
    const desc = isDon ? 'MyLuach · תרומה' : 'MyLuach · מסלול ' + PLAN_NAMES[plan];
    const extra = { base: info ? info.base : amount, off: info ? info.off : 0, why: info ? info.why : '', min: !!(info && info.min), coupon: coupon ? coupon.code : null };

    if (prov === 'paypal') {
      const charge = isDon ? amount : (Number(env('PAYPAL_TEST_AMOUNT')) || amount);
      await db('orders', { method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: extra.coupon }) });
      const ppid = await require('./_paypal').create(charge, id, desc + ' · ' + id.slice(0, 8), email);
      await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ txn: ppid }) });
      return json(res, 200, { id, amount: charge, provider: 'paypal', ppid, ...extra });
    }

    const mosad = env('NEDARIM_MOSAD'), apiValid = env('NEDARIM_API_VALID');
    const charge = isDon ? amount : (Number(env('NEDARIM_TEST_AMOUNT')) || amount);
    await db('orders', { method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: extra.coupon }) });
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    /* כל 19 השדות חייבים להישלח, גם ריקים (לפי התיעוד של נדרים פלוס). שם, טלפון ומייל ממלא הדפדפן. */
    const tx = {
      Mosad: mosad, ApiValid: apiValid, Zeout: '', PaymentType: 'Ragil',
      Amount: String(charge), Tashlumim: '1', Currency: '1',
      FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: email,
      Groupe: (isDon && env('NEDARIM_GROUPE_DONATION')) || env('NEDARIM_GROUPE') || '', Comment: desc + ' · ' + id.slice(0, 8),
      Param1: id, Param2: plan,
      CallBack: site + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
    };
    json(res, 200, { id, amount: charge, provider: 'nedarim', tx, ...extra });
  } catch (e) {
    console.error('checkout', e);
    json(res, 500, { error: 'server error', message: MSG.server });
  }
};
