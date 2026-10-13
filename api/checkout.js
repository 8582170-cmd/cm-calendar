/* יצירת הזמנה, והחזרת פרטי העסקה לטופס התשלום המוטמע של נדרים פלוס (iframe) */
'use strict';
const crypto = require('crypto');
const { getUser, PLAN_NAMES, loadConfig, publicPricing, checkCoupon, finalPrice, env, db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const b = readBody(req);
    const plan = String(b.plan || '');
    const isDon = plan === 'donation';
    let amount, coupon = null, info = null;
    if (isDon) {
      /* תרומה: הסכום נבחר על ידי התורם (1–100,000 ₪, עד 2 ספרות אחרי הנקודה) */
      amount = Math.round(Number(b.amount) * 100) / 100;
      if (!(amount >= 1 && amount <= 100000)) return json(res, 400, { error: 'bad amount' });
    } else {
      const cfg = await loadConfig();
      if (b.coupon) {
        coupon = await checkCoupon(cfg, b.coupon, plan);
        if (coupon && coupon.error) return json(res, 400, { error: 'coupon', message: coupon.error });
      }
      info = finalPrice(publicPricing(cfg), plan, coupon);
      if (!info) return json(res, 400, { error: 'unknown plan' });
      amount = info.amount;
      if (!(amount >= 1)) return json(res, 400, { error: 'amount too low' });
    }
    const mosad = env('NEDARIM_MOSAD'), apiValid = env('NEDARIM_API_VALID');
    if (!mosad || !apiValid) return json(res, 503, { error: 'payments not configured' });
    const user = await getUser(req);
    const email = (String(b.email || '').trim() || (user ? user.email : '')).toLowerCase().slice(0, 200);
    const id = crypto.randomBytes(12).toString('hex');
    const charge = isDon ? amount : (Number(env('NEDARIM_TEST_AMOUNT')) || amount);
    await db('orders', { method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: coupon ? coupon.code : null }) });
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    /* כל 19 השדות חייבים להישלח, גם ריקים (לפי התיעוד של נדרים פלוס). שם, טלפון ומייל ממלא הדפדפן. */
    const tx = {
      Mosad: mosad, ApiValid: apiValid, Zeout: '', PaymentType: 'Ragil',
      Amount: String(charge), Tashlumim: '1', Currency: '1',
      FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: email,
      Groupe: (isDon && env('NEDARIM_GROUPE_DONATION')) || env('NEDARIM_GROUPE') || '', Comment: (isDon ? 'MyLuach · תרומה' : 'MyLuach · מסלול ' + PLAN_NAMES[plan]) + ' · ' + id.slice(0, 8),
      Param1: id, Param2: plan,
      CallBack: site + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
    };
    json(res, 200, { id, amount: charge, tx, base: info ? info.base : amount, off: info ? info.off : 0, why: info ? info.why : '', coupon: coupon ? coupon.code : null });
  } catch (e) {
    console.error('checkout', e);
    json(res, 500, { error: 'server error' });
  }
};
