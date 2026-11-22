/* תשלום דמי פתיחה לפני שמכירה סינית או קמפיין התרמה נפתחים לציבור.
   ההגדרה (בעל האתר, לכל אגף): reqPay. הסכום הוא החלק הקבוע של דמי השימוש שחלים על הארגון (הגדרה כללית או אישית).
   דמי שימוש באחוז בלבד: אי אפשר לגבות מראש, ולכן אין תשלום. בעל האתר יכול לפטור ארגון (cfg.admin.openPay = 'waive').
   התשלום דרך הקופה של האתר (/api/checkout, plan = ofee). אחרי התשלום cfg.openfee = {paid, amount, at, order},
   והחלק הקבוע לא נגבה שוב בדוח דמי השימוש (api/_fee.js). */
'use strict';
const { db, loadSetting, env } = require('./_lib');
const FEE = require('./_fee');
const TBL = { auction: 'auction_sale', give: 'give_campaign' }, WING = { auction: 'המכירה', give: 'הקמפיין' };
const enc = encodeURIComponent;

/* מה נדרש מהמכירה / הקמפיין הזה. S = הגדרות האגף (reqPay, fee) */
function need(s, S) {
  const cfg = (s && s.cfg) || {}, p = cfg.openfee || {};
  const o = { on: false, required: false, amount: 0, paid: !!p.paid, waived: ((cfg.admin || {}).openPay) === 'waive' };
  const f = FEE.raw(cfg, S && S.fee); o.choose = !!f.needPlan;
  if (!S || !S.reqPay) return o;
  const a = f.type === 'fixed' || f.type === 'both' ? Math.round(f.fixed * 100) / 100 : 0;
  o.amount = a; o.on = a >= 1 && !o.waived; o.required = o.on && !o.paid && !o.choose;
  return o;
}
async function siteOf(wing) { const s = (await loadSetting(wing).catch(() => ({}))) || {}; return { reqPay: s.reqPay === true, fee: FEE.feeOf(s.fee) }; }
async function row(wing, slug) { const L = await db(TBL[wing] + '?slug=eq.' + enc(slug) + '&select=id,slug,name,status,cfg&limit=1').catch(() => []); return L && L[0]; }

/* הארגון בוחר מסלול דמי שימוש. אחרי תשלום דמי פתיחה או אחרי שהפתיחה לציבור, המסלול נעול (בעל האתר יכול לשנות בהגדרה אישית לארגון) */
async function choosePlan(wing, s, S, id) {
  const pl = FEE.plansPub(s.cfg, S && S.fee), p = pl.find(x => x.id === String(id || ''));
  if (!p) return { error: 'המסלול לא נמצא' };
  if (((s.cfg || {}).openfee || {}).paid) return { error: 'דמי הפתיחה כבר שולמו, ולכן אי אפשר להחליף מסלול. פנו אלינו.' };
  if (s.status === 'open') return { error: 'אי אפשר להחליף מסלול כשהפתיחה לציבור כבר בוצעה. פנו אלינו.' };
  const cfg = { ...(s.cfg || {}), feePlan: p.id };
  await db(TBL[wing] + '?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg, updated_at: new Date().toISOString() }) });
  try { require('./_' + wing).drop && require('./_' + wing).drop(s.slug); } catch (e) {}
  return { ok: true };
}
/* לפני התשלום (נקרא מהקופה) */
async function prepare(b) {
  const wing = String(b.wing || ''), slug = String(b.slug || '').toLowerCase();
  if (!TBL[wing] || !/^[a-z0-9-]{3,40}$/.test(slug)) return { error: 'הכתובת לא תקינה' };
  const s = await row(wing, slug); if (!s) return { error: WING[wing] + ' לא נמצא' };
  const n = need(s, await siteOf(wing));
  if (n.paid) return { error: 'דמי הפתיחה כבר שולמו' };
  if (!n.required) return { error: 'אין דמי פתיחה לתשלום' + (WING[wing] ? ' ל' + WING[wing] : '') };
  return { amount: n.amount, plan: 'ofee:' + wing + ':' + slug, title: 'דמי פתיחה: ' + (s.name || slug) };
}
/* אחרי התשלום (נקרא מ-_paid.notify) */
async function paid(o) {
  const m = /^ofee:(auction|give):([a-z0-9-]+)$/.exec(String(o.plan || '')); if (!m) return;
  const s = await row(m[1], m[2]); if (!s) throw new Error('no ' + m[1] + ' ' + m[2]);
  if ((s.cfg || {}).openfee && s.cfg.openfee.paid) return;
  const cfg = { ...(s.cfg || {}), openfee: { paid: true, amount: +o.amount || 0, at: new Date().toISOString(), order: o.id } };
  await db(TBL[m[1]] + '?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cfg, updated_at: new Date().toISOString() }) });
  try { require('./_' + m[1]).drop && require('./_' + m[1]).drop(s.slug); } catch (e) {}
  const to = String(o.email || s.email || '').trim();
  if (to) { const { sendMail, frame, escH } = require('./_mail'), site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    await sendMail({ to, subject: 'דמי הפתיחה שולמו: ' + (s.name || s.slug), html: frame({ title: 'התשלום התקבל, תודה!', body: '<p>דמי הפתיחה עבור <b>' + escH(s.name || s.slug) + '</b> שולמו (' + (+o.amount || 0).toLocaleString('he-IL') + ' ₪).</p><p>עכשיו אפשר לפתוח ' + WING[m[1]] + ' לציבור מדף הניהול.</p>', button: 'לדף הניהול', url: site + (m[1] === 'auction' ? '/auction-manage?s=' : '/give-manage?s=') + s.slug }) }, 'openfee').catch(() => {}); }
}
module.exports = { need, siteOf, prepare, paid, choosePlan };
