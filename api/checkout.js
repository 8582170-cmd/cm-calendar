/* יצירת הזמנה והחזרת קישור לעמוד התשלום של נדרים פלוס */
'use strict';
const crypto = require('crypto');
const { priceFor, PLAN_NAMES, env, db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const { plan } = readBody(req);
    const amount = priceFor(plan);
    if (!amount) return json(res, 400, { error: 'unknown plan' });
    const mosad = env('NEDARIM_MOSAD');
    if (!mosad) return json(res, 500, { error: 'payments not configured' });
    const id = crypto.randomBytes(12).toString('hex');
    const charge = Number(env('NEDARIM_TEST_AMOUNT')) || amount;
    await db('orders', { method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending' }) });
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    const q = new URLSearchParams({
      mosad, Amount: String(charge), AmountLock: '1',
      CallBack: site + '/api/nedarim-callback',
      Param1: id, Param2: plan,
      Comment: 'MyLuach · מסלול ' + PLAN_NAMES[plan]
    });
    json(res, 200, { id, amount: charge, url: 'https://www.matara.pro/nedarimplus/online/?' + q.toString() });
  } catch (e) {
    console.error('checkout', e);
    json(res, 500, { error: 'server error' });
  }
};
