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
  const c = cur.cfg || {}, min = Math.max(E.giftMin, +c.gmin || 0);
  const amount = r2(Number(b.amount)); if (!(amount >= min && amount <= E.giftMax)) return { error: 'הסכום צריך להיות בין ' + min + ' ל־' + E.giftMax + ' ₪' };
  const fee = Math.min(amount, r2(amount * E.giftPct / 100 + E.giftFixed));
  const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  /* מי רואה (כמו בברכה), עיצוב ותמונה. הברכה עצמה עולה לקיר אחרי התשלום */
  let vis = ['all', 'anon', 'host'].includes(b.gvis) ? b.gvis : 'all'; if (vis === 'anon' && !c.wan) vis = 'all';
  const noname = !!b.gnoname && !!c.wsec && vis !== 'all', style = /^[a-z0-9-]{1,20}$/.test(String(b.gstyle || '')) ? b.gstyle : null;
  const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })(), img = M && String(b.gimg || '').indexOf(M.url + '/timers/wish/' + s + '/') === 0 ? String(b.gimg).slice(0, 300) : null;
  return { amount, fee, net: r2(amount - fee), slug: s, name: clean(b.gname, 80), msg: clean(b.gmsg, 1000), vis, noname, style, img, wall: !!c.wl, title: 'מתנה לאירוע (' + s + ')' };
}
/* ברכה מעוצבת מאתר הברכות לקיר של אירוע, עם או בלי מתנה (plan=wishd). בלי מתנה: שורה בסכום 0 שמחכה לתשלום על העיצוב */
async function prepareWish(b) {
  if (+b.amount > 0) { const g = await prepare(b); if (g.error) return g; return g; }
  const T = require('./_timer'), s = String(b.slug || '').toLowerCase(), cur = await T.get(s).catch(() => null);
  if (!cur || !(cur.cfg || {}).wl || cur.disabled) return { error: 'קיר הברכות לא פתוח באירוע הזה' };
  const c = cur.cfg, clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  let vis = ['all', 'anon', 'host'].includes(b.gvis) ? b.gvis : 'all'; if (vis === 'anon' && !c.wan) vis = 'all';
  const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })(), img = M && String(b.gimg || '').indexOf(M.url + '/timers/wish/' + s + '/') === 0 ? String(b.gimg).slice(0, 300) : null;
  return { amount: 0, fee: 0, net: 0, slug: s, name: clean(b.gname, 80), msg: clean(b.gmsg, 1000), vis, noname: !!b.gnoname && !!c.wsec && vis !== 'all', style: null, img, wall: true, title: 'ברכה לאירוע (' + s + ')' };
}
async function create(id, email, g, meta) {
  const row = { slug: g.slug, order_id: id, name: g.name, msg: g.msg, amount: g.amount, fee: g.fee, net: g.net, status: 'pending', vis: g.vis, noname: g.noname, style: g.style, img: g.img, wall: g.wall };
  await db('timer_gift', { meta: meta || null, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) })
    .catch(async e => { if (!/vis|noname|style|img|wall|column/.test(e.message)) throw e; ['vis', 'noname', 'style', 'img', 'wall'].forEach(k => delete row[k]); await db('timer_gift', { meta: meta || null, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); });
}
async function paid(o) {
  const L = await db('timer_gift?order_id=eq.' + o.id + '&select=id,slug,name,msg,amount,net,status,vis,noname,style,img,wall&limit=1').catch(() => db('timer_gift?order_id=eq.' + o.id + '&select=id,slug,name,msg,amount,net,status&limit=1')); const g = L && L[0]; if (!g || g.status === 'paid') return;
  await db('timer_gift?id=eq.' + g.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }) });
  /* המתנה (והברכה שנכתבה איתה) עולה לקיר עם הסכום, לפי מה שהנותן בחר לגבי מי רואה. בלי טקסט היא מופיעה רק באזור המתנות */
  { const vis = g.vis || 'all';
    await db('timer_wall', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: g.slug, name: g.name || '', text: g.msg || '', public: vis !== 'host', vis, noname: !!g.noname, style: g.style || null, img: g.img || null, gift: +g.amount, gift_id: g.id }) }).catch(e => console.error('gift wall', e.message)); }
  if (!(+g.amount > 0)) return;
  const cur = await require('./_timer').get(g.slug).catch(() => null), to = cur && cur.paid && cur.paid.email; if (!to) return;
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  await require('./_paid').send('gift', to, { 'שם': g.noname ? 'אורח (ביקש לא לפרסם את שמו)' : (g.name || 'אורח'), 'סכום': (+g.amount) + ' ₪', 'ברכה': g.msg ? '\n\n"' + g.msg + '"' : '', 'נטו': (+g.net) + ' ₪' }, { url: site + '/invite?s=' + g.slug }, 'gift').catch(() => {});
}
module.exports = { prepare, prepareWish, create, paid };
