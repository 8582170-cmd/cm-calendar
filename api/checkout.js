/* יצירת הזמנה, והחזרת פרטי העסקה לטופס התשלום המוטמע של נדרים פלוס (iframe) */
'use strict';
const crypto = require('crypto');
const { priceFor, PLAN_NAMES, env, db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const b = readBody(req);
    const plan = String(b.plan || '');
    const isDon = plan === 'donation';
    /* תרומה: הסכום נבחר על ידי התורם (1–100,000 ₪, עד 2 ספרות אחרי הנקודה) */
    const amount = isDon ? Math.round(Number(b.amount) * 100) / 100 : priceFor(plan);
    if (!amount || !(amount >= 1 && amount <= 100000)) return json(res, 400, { error: isDon ? 'bad amount' : 'unknown plan' });
    const mosad = env('NEDARIM_MOSAD'), apiValid = env('NEDARIM_API_VALID');
    if (!mosad || !apiValid) return json(res, 503, { error: 'payments not configured' });
    const email = String(b.email || '').trim().slice(0, 200);
    const id = crypto.randomBytes(12).toString('hex');
    const charge = isDon ? amount : (Number(env('NEDARIM_TEST_AMOUNT')) || amount);
    await db('orders', { method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null }) });
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    /* כל 19 השדות חייבים להישלח, גם ריקים (לפי התיעוד של נדרים פלוס). שם, טלפון ומייל ממלא הדפדפן. */
    const tx = {
      Mosad: mosad, ApiValid: apiValid, Zeout: '', PaymentType: 'Ragil',
      Amount: String(charge), Tashlumim: '1', Currency: '1',
      FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: email,
      Groupe: '', Comment: (isDon ? 'MyLuach · תרומה' : 'MyLuach · מסלול ' + PLAN_NAMES[plan]) + ' · ' + id.slice(0, 8),
      Param1: id, Param2: plan,
      CallBack: site + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
    };
    json(res, 200, { id, amount: charge, tx });
  } catch (e) {
    console.error('checkout', e);
    json(res, 500, { error: 'server error' });
  }
};
