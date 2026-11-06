/* דוחות כספיים לדף הניהול (action: fin).
   הכנסות = הזמנות ששולמו (וגם כאלה שהוחזרו, עם קיזוז ההחזרים). מתנות לאירועים (plan=gift) הן כסף של בעלי האירוע:
   הן לא נספרות בהכנסות, רק העמלה מהן (timer_gift.fee). תרומות מוצגות בנפרד וגם בסך הכל. */
'use strict';
const { db, PLAN_NAMES } = require('./_lib');
const ilDay = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const r2 = n => Math.round(n * 100) / 100;
const SPECIAL = { event: 'דף הזמנה לאירוע', greet: 'ברכה / הזמנה מעוצבת', donation: 'תרומה', gift: 'מתנות לאירועים (כסף של בעלי האירוע)' };
const VIA = { bit: 'ביט', paypal: 'PayPal', sumit: 'SUMIT', nedarim: 'נדרים פלוס', free: 'חינם / מתנה מהניהול', other: 'לא ידוע' };

function viaOf(o, cb) {
  if (cb.paypal) return 'paypal';
  if (cb.sumit) return 'sumit';
  if (cb.bit) return 'bit';
  if (!(+o.amount)) return 'free';
  if (Object.keys(cb).some(k => /^[A-Z]/.test(k))) return 'nedarim';
  return 'other';
}

async function all(q) {
  const out = [];
  for (let off = 0; off < 100000; off += 1000) { const L = await db(q + '&limit=1000&offset=' + off); out.push(...(L || [])); if (!L || L.length < 1000) break; }
  return out;
}

module.exports = async function (b) {
  const D = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  const from = D(b.from), to = D(b.to);
  /* התאריכים לפי שעון ישראל: מתחילת יום from עד סוף יום to (בערך: מוסיפים טווח של יום ומסננים אחר כך לפי ilDay) */
  let w = '&status=in.(paid,refunded)';
  if (from) w += '&paid_at=gte.' + encodeURIComponent(new Date(Date.parse(from + 'T00:00:00Z') - 864e5).toISOString());
  if (to) w += '&paid_at=lt.' + encodeURIComponent(new Date(Date.parse(to + 'T00:00:00Z') + 2 * 864e5).toISOString());
  const SUBS = await require('./_subs').cfg().catch(() => null);
  const raw = await all('orders?select=id,plan,amount,status,coupon,email,created_at,paid_at,callback' + w + '&order=paid_at.asc');
  const rows = [];
  raw.forEach(o => {
    const day = ilDay(o.paid_at || o.created_at); if ((from && day < from) || (to && day > to)) return;
    const cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
    const refunded = r2((cb.refunds || []).reduce((a, x) => a + (+x.amount || 0), 0)) + (o.status === 'refunded' && !(cb.refunds || []).length ? +o.amount || 0 : 0);
    rows.push({ id: o.id, day, plan: o.plan, name: PLAN_NAMES[o.plan] ? 'מסלול ' + PLAN_NAMES[o.plan] : SPECIAL[o.plan] || (/^(gsub|gpack|rsub):/.test(o.plan) ? require('./_subs').nameOf(o.plan, SUBS) : null) || o.plan, amount: +o.amount || 0, refunded: r2(refunded), status: o.status, via: viaOf(o, cb), coupon: o.coupon || '', email: String(o.email || '').toLowerCase(), admin: !!cb.admin });
  });
  const inc = rows.filter(o => o.plan !== 'gift');
  const S = { gross: 0, refunds: 0, net: 0, n: 0, paidN: 0, donations: 0, free: 0, customers: 0, avg: 0 };
  const byMonth = {}, byPlan = {}, byVia = {}, byCoupon = {}, byCust = {};
  const add = (M, k, o, extra) => { const x = M[k] || (M[k] = { k, n: 0, gross: 0, refunds: 0, net: 0, ...(extra || {}) }); x.n++; x.gross += o.amount; x.refunds += o.refunded; x.net += o.amount - o.refunded; return x; };
  inc.forEach(o => {
    S.n++; S.gross += o.amount; S.refunds += o.refunded; if (o.amount > 0) S.paidN++; else S.free++; if (o.plan === 'donation') S.donations += o.amount - o.refunded;
    add(byMonth, o.day.slice(0, 7), o); add(byPlan, o.plan, o, { name: o.name }); add(byVia, o.via, o, { name: VIA[o.via] });
    if (o.coupon) add(byCoupon, o.coupon, o);
    if (o.email) add(byCust, o.email, o);
  });
  S.net = S.gross - S.refunds; S.customers = Object.keys(byCust).length; S.avg = S.paidN ? S.net / S.paidN : 0;
  /* מתנות לאירועים: מחזור, העמלה (הכנסה של האתר) ומה שעוד לא הועבר לבעלי האירוע */
  let gifts = null;
  try {
    let gw = '&status=eq.paid'; if (from) gw += '&paid_at=gte.' + encodeURIComponent(new Date(Date.parse(from + 'T00:00:00Z') - 864e5).toISOString()); if (to) gw += '&paid_at=lt.' + encodeURIComponent(new Date(Date.parse(to + 'T00:00:00Z') + 2 * 864e5).toISOString());
    const G = (await all('timer_gift?select=slug,amount,fee,net,payout,paid_at' + gw)).filter(g => { const d = ilDay(g.paid_at); return !(from && d < from) && !(to && d > to); });
    gifts = { n: G.length, amount: 0, fee: 0, net: 0, open: 0, events: new Set(G.map(g => g.slug)).size };
    G.forEach(g => { gifts.amount += +g.amount || 0; gifts.fee += +g.fee || 0; gifts.net += +g.net || 0; if (g.payout !== 'done') gifts.open += +g.net || 0; });
    G.forEach(g => { const m = ilDay(g.paid_at).slice(0, 7); const x = byMonth[m] || (byMonth[m] = { k: m, n: 0, gross: 0, refunds: 0, net: 0 }); x.giftFee = (x.giftFee || 0) + (+g.fee || 0); });
    ['amount', 'fee', 'net', 'open'].forEach(k => { gifts[k] = r2(gifts[k]); });
  } catch (e) { gifts = null; }
  const fix = M => Object.values(M).map(x => ({ ...x, gross: r2(x.gross), refunds: r2(x.refunds), net: r2(x.net), ...(x.giftFee != null ? { giftFee: r2(x.giftFee) } : {}) }));
  Object.keys(S).forEach(k => { S[k] = r2(S[k]); });
  /* שאלה שימושית: כמה מהלקוחות קנו יותר מפעם אחת (בטווח) */
  S.repeat = Object.values(byCust).filter(x => x.n > 1).length;
  return {
    from, to, stats: S, gifts,
    months: fix(byMonth).sort((a, c) => a.k.localeCompare(c.k)),
    plans: fix(byPlan).sort((a, c) => c.net - a.net),
    via: fix(byVia).sort((a, c) => c.net - a.net),
    coupons: fix(byCoupon).sort((a, c) => c.n - a.n),
    top: fix(byCust).sort((a, c) => c.net - a.net).slice(0, 15),
    rows: b.rows ? rows.map(o => ({ ...o, viaName: VIA[o.via] })) : undefined
  };
};
