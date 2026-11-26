/* UPAY: סליקה ישירה (בלי ספק ביניים). השרת מתחבר עם המפתח, מבקש דף תשלום עם הסכום של ההזמנה, ומקבל קישור לדף.
   הלקוח משלם בדף של UPAY (בתוך חלון באתר), ו-UPAY שולחים עדכון לכתובת שלנו (ipnurl) עם תוצאת העסקה.
   משתני סביבה: UPAY_EMAIL (המייל של החשבון ב-UPAY), UPAY_KEY (מפתח ה-API מהאזור האישי; סודי).
   UPAY_TEST_AMOUNT (לא חובה): סכום קבוע לכל רכישה, לבדיקות.
   המבנה לפי ספריות קוד פתוח שעובדות מול UPAY (EasyCard, @smartbill/upay), ונבדק בתשלום אמיתי של ₪1 (26.11.2026). */
'use strict';
const crypto = require('node:crypto');
const { env } = require('./_lib');

const API = 'https://app.upay.co.il/API6/clientsecure/json.php';
const ready = () => !!(env('UPAY_EMAIL') && env('UPAY_KEY'));
const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

/* חתימה על מספר ההזמנה בכתובת העדכון, כך שרק מי שקיבל את הכתובת מאיתנו (UPAY) יכול לעדכן תשלום */
const sig = id => crypto.createHmac('sha256', env('UPAY_KEY')).update('upay:' + String(id)).digest('hex').slice(0, 32);
function sigOk(id, s) { const exp = sig(id), got = String(s || ''); return got.length === exp.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(got)); }

/* הגדרות הקבלה מהניהול (cfg.rcpt.upay): האם UPAY מפיקים חשבונית מס/קבלה ושולחים ללקוח */
function rcptOf(cfg) { const R = (cfg && cfg.rcpt && cfg.rcpt.upay) || {}; return { create: R.create !== false }; }

async function call(msgs) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ msgs: JSON.stringify(msgs) }), signal: AbortSignal.timeout(25000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j || !Array.isArray(j.results)) throw new Error('UPAY: תשובה לא צפויה (' + r.status + ')');
  return j.results;
}

/* יצירת דף תשלום להזמנה. מחזיר את הקישור לדף */
async function createPayment({ id, amount, desc, email, phone, cfg }) {
  const em = env('UPAY_EMAIL'), key = env('UPAY_KEY'), H = { refername: 'UPAY', livesystem: 1, language: 'HE' }, R = rcptOf(cfg);
  const q = 'c=_upaycb&id=' + id + '&s=' + sig(id);
  const tr = { email: em, amount: (Math.round(amount * 100) / 100).toFixed(2), numberpayments: '1', currency: 'NIS', commissionreduction: '1', acceptedtransaction: '1',
    comment: String(desc || 'MyLuach').slice(0, 100), productdescription: String(desc || 'MyLuach').slice(0, 100),
    ipnurl: site() + '/api/pricing?' + q, returnurl: site() + '/pay-return.html?ok=1&via=upay',
    createinvoiceandreceipt: R.create ? '1' : '0' };
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) tr.emailnotify = email;
  const ph = String(phone || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(ph)) tr.cellphonenotify = ph;
  const res = await call([
    { header: H, request: { mainaction: 'CONNECTION', minoraction: 'LOGIN', encoding: 'json', numbertemplate: 1, parameters: { email: em, key } } },
    { header: H, request: { mainaction: 'CASHIER', minoraction: 'REDIRECTDEPOSITCREDITCARDTRANSFER', encoding: 'json', numbertemplate: 1, parameters: { transfers: [tr], key, cardreader: '0', creditcardcompanytype: 'ISR', creditcardtype: 'MA' } } }]);
  const L = res[0] || {}, C = res[1] || {};
  if (!L.success || !/LOGIN_OK/.test(String((L.header || {}).errormessage || ''))) throw new Error('UPAY login: ' + String((L.header || {}).errordescription || (L.header || {}).errormessage || '').slice(0, 150));
  const t = ((C.result || {}).transactions || [])[0] || {};
  if (!/_OK$/.test(String((C.header || {}).errormessage || '')) || !/^https:\/\//.test(String(t.url || ''))) throw new Error('UPAY: ' + String((C.header || {}).errordescription || (C.header || {}).errormessage || 'לא נוצר דף תשלום').slice(0, 150));
  return { url: t.url, cashier: String(t.cashierid || '') };
}

/* קריאת העדכון מ-UPAY (מגיע בכתובת, GET). דוגמה אמיתית: errordescription=SUCCESS, providererrorcode=0, amount, transactionid, providerconfirmationnumber */
function parse(p) {
  const d = String(p.errordescription || '').toUpperCase(), code = String(p.providererrorcode ?? '');
  const ok = d === 'SUCCESS' && (code === '' || code === '0') ? true : d === 'FAILURE' || (code && code !== '0') ? false : null;
  const amt = Number(p.amount ?? p.depositamount); 
  return { ok, amount: isFinite(amt) ? amt : null, txn: String(p.transactionid || ''), conf: String(p.providerconfirmationnumber || ''), cashier: String(p.depositcashierid || ''),
    card: String(p.fourdigits || ''), brand: String(p.cardname || p.cardtype || ''), payments: String(p.numberpayments || '') };
}
/* מה שומרים מההודעה (בלי ת"ז, שם בעל הכרטיס ותוקף) */
const keep = p => { const o = {}; ['errordescription', 'providererrorcode', 'providererrordescription', 'amount', 'depositamount', 'depositnetamount', 'transactionid', 'depositcashierid', 'providerconfirmationnumber', 'fourdigits', 'cardtype', 'cardname', 'companytype', 'clearer', 'numberpayments', 'actiondate', 'foreign', 'emailnotify'].forEach(k => { if (p[k] != null && p[k] !== '') o[k] = String(p[k]).slice(0, 120); }); return o; };

/* העדכון מ-UPAY: /api/pricing?c=_upaycb&id=<הזמנה>&s=<חתימה>&...תוצאת העסקה */
async function callback(req, res) {
  const { db, readBody, json } = require('./_lib');
  const p = readBody(req), id = String(p.id || ''), s = p.s;
  try {
    if (!/^[0-9a-f]{24}$/.test(id) || !ready() || !sigOk(id, s)) return json(res, 403, { error: 'signature' });
    const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
    if (!o) return json(res, 404, { error: 'no order' });
    const r = parse(p), cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
    const upay = { ...(cb.upay || {}), log: [...(((cb.upay || {}).log) || []), { at: new Date().toISOString(), ok: r.ok, body: keep(p) }].slice(-6) };
    if (r.conf) upay.conf = r.conf; if (r.card) upay.card = r.card;
    if (o.status === 'paid') { await db('orders?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...cb, upay } }) }); return json(res, 200, { ok: true, already: true }); }
    const enough = r.amount != null && r.amount + 0.001 >= Number(o.amount);
    if (r.ok === true && enough) {
      await require('./_paid').markPaid(o, { txn: r.txn || o.txn || '', callback: { ...cb, upay } }, 'UPAY');
      return json(res, 200, { ok: true });
    }
    /* עסקה שנדחתה: ההזמנה נשארת פתוחה, כי הלקוח יכול לנסות כרטיס אחר באותו דף */
    const status = r.ok === true ? 'underpaid' : o.status;
    await db('orders?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, callback: { ...cb, upay } }) });
    json(res, 200, { ok: true });
  } catch (e) { console.error('upay callback', e); json(res, 500, { error: 'server error' }); }
}

module.exports = { ready, createPayment, parse, sigOk, callback, rcptOf };
