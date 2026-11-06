/* מתנה / תרומה לאירוע בכרטיס אשראי דרך האתר (רק אם הופעל בניהול, ואם בעל האירוע בחר בזה).
   האורח משלם את הסכום; העמלה (אחוז ו/או סכום קבוע מהניהול) נשארת באתר, והשאר מגיע לבעל האירוע.
   ההעברה לבעל האירוע נעשית ידנית: הוא לוחץ "בקשת העברה", ומנהל האתר מקבל מייל ומסמן בניהול שהועבר. */
'use strict';
const { db, env } = require('./_lib');
const r2 = n => Math.round(n * 100) / 100;
async function prepare(b) {
  const T = require('./_timer'), s = String(b.slug || '').toLowerCase(), cur = await T.get(s).catch(() => null);
  if (!cur || !require('./_timer').feat(cur, 'gift') || !(cur.cfg || {}).gc) return { error: 'המתנה באשראי לא זמינה באירוע הזה' };
  const E = await require('./_eventpay').prices(); if (!E.giftOn) return { error: 'המתנה באשראי לא זמינה כרגע' };
  const amount = r2(Number(b.amount)); if (!(amount >= E.giftMin && amount <= E.giftMax)) return { error: 'הסכום צריך להיות בין ' + E.giftMin + ' ל־' + E.giftMax + ' ₪' };
  const fee = Math.min(amount, r2(amount * E.giftPct / 100 + E.giftFixed));
  const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  return { amount, fee, net: r2(amount - fee), slug: s, name: clean(b.gname, 80), msg: clean(b.gmsg, 500), title: 'מתנה לאירוע (' + s + ')' };
}
async function create(id, email, g, meta) { await db('timer_gift', { meta: meta || null, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: g.slug, order_id: id, name: g.name, msg: g.msg, amount: g.amount, fee: g.fee, net: g.net, status: 'pending' }) }); }
async function paid(o) {
  const L = await db('timer_gift?order_id=eq.' + o.id + '&select=id,slug,name,msg,amount,net,status&limit=1'); const g = L && L[0]; if (!g || g.status === 'paid') return;
  await db('timer_gift?id=eq.' + g.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }) });
  const cur = await require('./_timer').get(g.slug).catch(() => null), to = cur && cur.paid && cur.paid.email; if (!to) return;
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  await require('./_paid').send('gift', to, { 'שם': g.name || 'אורח', 'סכום': (+g.amount) + ' ₪', 'ברכה': g.msg ? '\n\n"' + g.msg + '"' : '', 'נטו': (+g.net) + ' ₪' }, { url: site + '/invite?s=' + g.slug }, 'gift').catch(() => {});
}
module.exports = { prepare, create, paid };
