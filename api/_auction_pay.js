/* מכירה סינית: שכבת התשלום. בנויה כך שגם אגף גיוס ההמונים העתידי יוכל להשתמש בה.
   ספקים:
   - nedarim: נדרים פלוס של הארגון. מנהל המכירה מזין מספר מוסד וקוד אימות (ApiValid). הכסף נכנס ישר לארגון.
   - kehilot: קשר / קהילות של הארגון (דף תשלום של קשר). מנהל המכירה מזין קישור לדף התשלום, שם משתמש וסיסמת API.
     פעיל רק כשבעל האתר הפעיל אותו (auction.kehilot).
   - site: סליקה דרך האתר (חשבון נדרים פלוס של MyLuach), והאתר מעביר לארגון. כבוי עד שבעל האתר מפעיל (auction.sitePay). */
'use strict';
const { env } = require('./_lib');

const SITE = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, ' ').replace(/&#/g, '& #').trim().slice(0, n || 200);
const KESHER = 'https://kesherhk.info/ConnectToKesher/ConnectToKesher';

/* מה מוגדר במכירה (מה שמנהל המכירה הזין) */
const orgNed = sale => { const p = (sale.cfg || {}).pay || {}; return /^\d{3,10}$/.test(String(p.mosad || '')) && String(p.apiValid || '').length >= 4 ? { mosad: String(p.mosad), apiValid: String(p.apiValid), groupe: clean(p.groupe, 60) } : null; };
const siteNed = () => env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID') ? { mosad: env('NEDARIM_MOSAD'), apiValid: env('NEDARIM_API_VALID'), groupe: env('NEDARIM_GROUPE') || '' } : null;
const orgKesher = sale => { const k = (((sale.cfg || {}).pay || {}).kesher) || {}; return /^https:\/\/[^\s"<>]+$/.test(k.pageUrl || '') && k.userName && k.password ? { pageUrl: k.pageUrl, pageId: String(k.pageId || ''), userName: String(k.userName), password: String(k.password) } : null; };
function kehilotReady(sale) { return !!(sale && orgKesher(sale)); }

/* אילו ספקים זמינים למכירה הזאת, לפי מה שבעל האתר פתח (S = הגדרות האגף) ומה שהמכירה הגדירה */
function provs(sale, S) {
  const want = ((sale.cfg || {}).pay || {}).prov || 'nedarim', out = [];
  if (want === 'nedarim' && orgNed(sale)) out.push('nedarim');
  if (want === 'kehilot' && S && S.kehilot === true && kehilotReady(sale)) out.push('kehilot');
  if (want === 'site' && S && S.sitePay === true && siteNed()) out.push('site');
  return out;
}

/* טופס התשלום המוטמע של נדרים פלוס: כל 19 השדות חייבים להישלח, גם ריקים (כמו ב-checkout.js). שם, טלפון ומייל ממלא הדפדפן */
function nedTx(acc, sale, order, desc, opt) {
  opt = opt || {};
  return {
    Mosad: acc.mosad, ApiValid: acc.apiValid, Zeout: '', PaymentType: opt.hk ? 'HK' : 'Ragil',
    Amount: String(order.amount), Tashlumim: opt.hk ? (opt.months > 0 ? String(opt.months) : '') : '1', Currency: '1',
    FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: order.email || '',
    Groupe: acc.groupe || '', Comment: clean(desc, 180) + ' · ' + order.id.slice(2, 10),
    Param1: order.id, Param2: opt.p2 || 'auction:' + sale.slug,
    CallBack: SITE() + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
  };
}

/* ===== קשר / קהילות ===== */
async function kesher(acc, func, extra) {
  const r = await fetch(KESHER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Json: { userName: acc.userName, password: acc.password, func, ...extra }, format: 'json' }), signal: AbortSignal.timeout(20000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j) throw new Error('kesher ' + r.status + ' ' + t.slice(0, 120));
  return j;
}
/* קישור לדף התשלום של קשר עם טוקן (הסכום נעול, הלקוח לא יכול לשנות אותו). בסיום קשר מחזירים ל-successurl / failedurl */
async function kesherLink(sale, order, desc, opt) {
  const acc = orgKesher(sale); if (!acc) throw new Error('kesher not set');
  const nm = String(order.name || '').trim().split(/\s+/);
  const req = { Total: String(order.amount), Name: clean(order.name, 60), FirstName: clean(nm[0], 40), LastName: clean(nm.slice(1).join(' '), 40), Tel: order.phone || '', Mail: order.email || '',
    Comment: clean(desc, 120) + ' · ' + order.id.slice(2, 10), AddData: order.id, NumPayment: '1', MaxPayments: '1' };
  if (acc.pageId) req.PaymentPageId = acc.pageId;
  const j = await kesher(acc, 'GetLinkToken', { request: req });
  const tok = j.Token || (j.Data && j.Data.Token);
  if (!tok) throw new Error(String((j.RequestResult && j.RequestResult.Description) || j.Description || 'אין טוקן מקשר').slice(0, 160));
  const back = (opt && opt.back) || SITE() + '/auction?s=' + sale.slug + '&kp=' + order.id;
  const u = new URL(acc.pageUrl);
  u.searchParams.set('token', tok); u.searchParams.set('successurl', back); u.searchParams.set('failedurl', back + '&kf=1'); u.searchParams.set('adddata', order.id);
  return u.toString();
}
/* בדיקת עסקה מול קשר (GetTranData): האם עברה, ובאיזה סכום. הסכום חוזר באגורות */
async function kesherCheck(sale, num) {
  const acc = orgKesher(sale); if (!acc) throw new Error('kesher not set');
  num = String(num || '').replace(/\D/g, ''); if (!num) return { ok: false, msg: 'אין מספר עסקה' };
  const j = await kesher(acc, 'GetTranData', { transactionNum: num });
  const d = j && (j.Id || j.NumTransaction) ? j : (j && (j.Data || j.Result)) || null;
  if (!d) return { ok: false, msg: String((j && j.RequestResult && j.RequestResult.Description) || 'העסקה לא נמצאה').slice(0, 160) };
  const cs = d.CreditStatus, okStatus = cs === 0 || cs === '0' || cs == null && /תקינ|הצלח|אושר/.test(String(d.Status || ''));
  const credit = String(d.TransactionType || d.DealType || '').toLowerCase() === 'credit';
  return { ok: okStatus && !credit && !d.CancelReason, amount: Math.round(+d.Total || +d.Sum || 0) / 100, num: String(d.NumTransaction || d.Id || num), add: [d.Details, d.Comment, d.AddData, d.Comment4].map(x => String(x || '')).join(' '), raw: { Status: d.Status, CreditStatus: cs, Total: d.Total, TranDate: d.TranDate, OKNum: d.OKNum } };
}

/* מה הדפדפן מקבל כדי לשלם */
async function webTx(sale, order, S, desc, opt) {
  const p = provs(sale, S)[0];
  if (p === 'nedarim') return { provider: 'nedarim', tx: nedTx(orgNed(sale), sale, order, desc, opt) };
  if (p === 'site') return { provider: 'nedarim', via: 'site', tx: nedTx(siteNed(), sale, order, desc, opt) };
  if (p === 'kehilot') { if (opt && opt.hk) throw Object.assign(new Error('hk'), { user: 'הוראת קבע אפשרית כרגע רק דרך נדרים פלוס' }); return { provider: 'kehilot', url: await kesherLink(sale, order, desc, opt) }; }
  return null;
}
module.exports = { provs, webTx, orgNed, siteNed, orgKesher, kehilotReady, kesherCheck, nedTx };
