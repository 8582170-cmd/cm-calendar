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
  const t = c.ticker || {};
  const ints = v => [...new Set((Array.isArray(v) ? v : []).map(x => parseInt(x, 10)).filter(x => x >= 0 && x < 100000))].slice(0, 20000);
  out.ticker = { mode: ['auto', 'selected', 'off'].includes(t.mode) ? t.mode : 'auto', ids: ints(t.ids), hide: ints(t.hide) };
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
    /* מבזקי דברי הימים: אירועים של תאריך עברי מסוים, או חיפוש */
    if (req.method === 'POST' && (b.action === 'yzday' || b.action === 'yzsearch')) {
      const { loadYZ } = require('./_yz'); const { list } = loadYZ();
      if (b.action === 'yzsearch') { const q = String(b.q || '').trim(); if (q.length < 2) return json(res, 200, { items: [] }); return json(res, 200, { items: list.filter(e => e.t.includes(q)).slice(0, 200) }); }
      const { HDate } = await import('./_hdate/index.js'); const ds = String(b.date || '');
      const d = /^\d{4}-\d{2}-\d{2}$/.test(ds) ? new Date(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10), 12) : new Date();
      const h = new HDate(d), m = h.getMonth(), day = h.getDate(), leap = HDate.isLeapYear(h.getFullYear());
      return json(res, 200, { heb: h.renderGematriya(true), items: list.filter(e => e.d === day && (e.m === m || (!leap && m === 12 && e.m === 13))) });
    }
    if (req.method === 'POST' && b.action === 'mailtest') {
      const { sendMail, frame, configured } = require('./_mail');
      const to = String(b.to || '').trim(), prov = String(b.provider || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json(res, 400, { error: 'כתובת מייל לא תקינה' });
      if (!configured()[prov]) return json(res, 400, { error: 'הספק ' + prov + ' לא מוגדר ב-Vercel' });
      try {
        await sendMail({ to, subject: 'בדיקת שליחה דרך ' + prov, text: 'מייל בדיקה מ-MyLuach דרך ' + prov,
          html: frame({ title: 'בדיקת שליחה', body: 'המייל הזה נשלח דרך <b>' + prov + '</b>. אם קיבלתם אותו, הספק עובד.' }) }, 'test', prov);
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 300) }); }
    }
    const cfg = await loadConfig();
    const orders = await db('orders?select=id,plan,amount,status,coupon,email,created_at,paid_at&order=created_at.desc&limit=100');
    const uses = {};
    (orders || []).forEach(o => { if (o.coupon && o.status === 'paid') uses[o.coupon] = (uses[o.coupon] || 0) + 1; });
    const defaults = {};
    LP.PLANS.filter(p => PAID.indexOf(p.id) >= 0).forEach(p => { defaults[p.id] = { name: p.name, ils: p.price.ils, usd: p.price.usd, intro: p.intro || 0 }; });
    /* מיילים היום (לפי שעון ישראל) ותזכורות פעילות. אם הטבלאות עוד לא נוצרו: ריק */
    let mail = null;
    try {
      const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      const logs = await db('email_log?select=provider,kind,ok&created_at=gte.' + day + 'T00:00:00%2B03:00&limit=5000');
      const rem = await db('reminders?select=status&limit=20000');
      mail = { providers: require('./_mail').configured(), today: {}, failed: 0, reminders: { active: 0, pending: 0, off: 0 } };
      (logs || []).forEach(l => { if (l.ok) mail.today[l.provider] = (mail.today[l.provider] || 0) + 1; else mail.failed++; });
      (rem || []).forEach(r => { mail.reminders[r.status] = (mail.reminders[r.status] || 0) + 1; });
      /* דוח: 30 ימים אחרונים לפי יום ושרת, ו-200 המיילים האחרונים */
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const all = await db('email_log?select=created_at,provider,ok&created_at=gte.' + encodeURIComponent(since) + '&order=created_at.desc&limit=20000');
      const byDay = {};
      (all || []).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
        const o = byDay[d] = byDay[d] || { failed: 0 };
        if (l.ok) o[l.provider] = (o[l.provider] || 0) + 1; else o.failed++;
      });
      mail.byDay = byDay;
      mail.recent = await db('email_log?select=*&order=created_at.desc&limit=200');
    } catch (e) { mail = null; }
    json(res, 200, { config: cfg, defaults, effective: publicPricing(cfg), orders, uses, mail, testAmount: env('NEDARIM_TEST_AMOUNT') || '' });
  } catch (e) {
    console.error('admin', e);
    json(res, 500, { error: 'server error', message: String(e.message || e).slice(0, 200) });
  }
};
