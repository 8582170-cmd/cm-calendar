/* דף הניהול: קריאה ושמירה של המחירים, המבצע והקופונים, ורשימת הזמנות אחרונות.
   הגישה בסיסמה: משתנה הסביבה ADMIN_PASSWORD ב-Vercel. */
'use strict';
const crypto = require('crypto');
const { LP, PAID, loadConfig, publicPricing, env, db, readBody, json } = require('./_lib');

function okPass(given) {
  const real = env('ADMIN_PASSWORD');
  if (!real || real.length < 8) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

const num = (v, lo, hi) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 100) / 100)) : null; };
const date = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const planList = v => (Array.isArray(v) ? v : []).filter(x => PAID.indexOf(x) >= 0);

/* מנקים את מה שהגיע מהדפדפן לפני שמירה */
function clean(c) {
  const out = { plans: {}, sale: null, coupons: [] };
  PAID.forEach(id => {
    const o = (c.plans || {})[id] || {};
    out.plans[id] = { ils: num(o.ils, 0, 100000), usd: num(o.usd, 0, 100000), intro: num(o.intro, 0, 100) };
  });
  const s = c.sale || {};
  out.sale = { on: !!s.on, percent: num(s.percent, 0, 100) || 0, plans: planList(s.plans), until: date(s.until), label: String(s.label || '').slice(0, 60) };
  const seen = {};
  (c.coupons || []).forEach(x => {
    const code = String(x.code || '').trim().toUpperCase().replace(/[^A-Z0-9א-ת_-]/g, '').slice(0, 30);
    if (!code || seen[code]) return; seen[code] = 1;
    out.coupons.push({ code, percent: num(x.percent, 0, 100) || 0, plans: planList(x.plans), until: date(x.until), max: Math.max(0, parseInt(x.max, 10) || 0), on: !!x.on, note: String(x.note || '').slice(0, 80) });
  });
  return out;
}

module.exports = async (req, res) => {
  const b = readBody(req);
  if (!okPass(req.headers['x-admin-password'] || b.password)) {
    await new Promise(r => setTimeout(r, 800));
    return json(res, env('ADMIN_PASSWORD') ? 401 : 503, { error: env('ADMIN_PASSWORD') ? 'wrong password' : 'ADMIN_PASSWORD not set' });
  }
  try {
    if (req.method === 'POST' && b.action === 'save') {
      const value = clean(b.config || {});
      await db('settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ key: 'pricing', value, updated_at: new Date().toISOString() }) });
      return json(res, 200, { ok: true, config: value });
    }
    const cfg = await loadConfig();
    const orders = await db('orders?select=id,plan,amount,status,coupon,email,created_at,paid_at&order=created_at.desc&limit=100');
    const uses = {};
    (orders || []).forEach(o => { if (o.coupon && o.status === 'paid') uses[o.coupon] = (uses[o.coupon] || 0) + 1; });
    const defaults = {};
    LP.PLANS.filter(p => PAID.indexOf(p.id) >= 0).forEach(p => { defaults[p.id] = { name: p.name, ils: p.price.ils, usd: p.price.usd, intro: p.intro || 0 }; });
    json(res, 200, { config: cfg, defaults, effective: publicPricing(cfg), orders, uses, testAmount: env('NEDARIM_TEST_AMOUNT') || '' });
  } catch (e) {
    console.error('admin', e);
    json(res, 500, { error: 'server error', message: String(e.message || e).slice(0, 200) });
  }
};
