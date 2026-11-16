/* מכירה סינית: שכבת התשלום. בנויה כך שגם אגף גיוס ההמונים העתידי יוכל להשתמש בה.
   ספקים:
   - nedarim: נדרים פלוס של הארגון. מנהל המכירה מזין מספר מוסד וקוד אימות (ApiValid). הכסף נכנס ישר לארגון. פעיל.
   - kehilot: סליקת קהילות של הארגון. כבוי עד שיתקבל תיעוד ה-API (בניהול האתר: auction.kehilot).
   - site: סליקה דרך האתר (חשבון נדרים פלוס של MyLuach), והאתר מעביר לארגון. כבוי עד שבעל האתר מפעיל (auction.sitePay). */
'use strict';
const { env } = require('./_lib');

const SITE = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, ' ').replace(/&#/g, '& #').trim().slice(0, n || 200);

/* מה מוגדר במכירה (מה שמנהל המכירה הזין) */
const orgNed = sale => { const p = (sale.cfg || {}).pay || {}; return /^\d{3,10}$/.test(String(p.mosad || '')) && String(p.apiValid || '').length >= 4 ? { mosad: String(p.mosad), apiValid: String(p.apiValid), groupe: clean(p.groupe, 60) } : null; };
const siteNed = () => env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID') ? { mosad: env('NEDARIM_MOSAD'), apiValid: env('NEDARIM_API_VALID'), groupe: env('NEDARIM_GROUPE') || '' } : null;

/* אילו ספקים זמינים למכירה הזאת, לפי מה שבעל האתר פתח (S = הגדרות האגף) ומה שהמכירה הגדירה */
function provs(sale, S) {
  const want = ((sale.cfg || {}).pay || {}).prov || 'nedarim', out = [];
  if (want === 'nedarim' && orgNed(sale)) out.push('nedarim');
  if (want === 'kehilot' && S && S.kehilot === true && kehilotReady(sale)) out.push('kehilot');
  if (want === 'site' && S && S.sitePay === true && siteNed()) out.push('site');
  return out;
}
/* קהילות: אין עדיין חיבור (חסר תיעוד API). המקום לחבר אותו */
function kehilotReady() { return false; }

/* טופס התשלום המוטמע של נדרים פלוס: כל 19 השדות חייבים להישלח, גם ריקים (כמו ב-checkout.js). שם, טלפון ומייל ממלא הדפדפן */
function nedTx(acc, sale, order, desc) {
  return {
    Mosad: acc.mosad, ApiValid: acc.apiValid, Zeout: '', PaymentType: 'Ragil',
    Amount: String(order.amount), Tashlumim: '1', Currency: '1',
    FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: order.email || '',
    Groupe: acc.groupe || '', Comment: clean(desc, 180) + ' · ' + order.id.slice(2, 10),
    Param1: order.id, Param2: 'auction:' + sale.slug,
    CallBack: SITE() + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
  };
}
/* מה הדפדפן מקבל כדי לשלם */
function webTx(sale, order, S, desc) {
  const p = provs(sale, S)[0];
  if (p === 'nedarim') return { provider: 'nedarim', tx: nedTx(orgNed(sale), sale, order, desc) };
  if (p === 'site') return { provider: 'nedarim', via: 'site', tx: nedTx(siteNed(), sale, order, desc) };
  return null;
}
module.exports = { provs, webTx, orgNed, siteNed, kehilotReady };
