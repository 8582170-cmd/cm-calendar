/* יש חשבונית (YeshInvoice): דף תשלום מאובטח שלהם + קבלה אוטומטית.
   יש חשבונית אינם חברת סליקה: הכסף עובר דרך מסוף סליקה שמחובר לחשבון אצלם (זד קרדיט, Grow, קארדקום, טרנזילה ועוד).
   בלי מסוף מחובר, דף התשלום לא יעבוד, לכן האפשרות נשארת כבויה בניהול עד שמחברים מסוף.
   משתני סביבה: YESH_SECRET, YESH_USERKEY (מפתח API מהחשבון ביש חשבונית; סודיים, רק בשרת).
   YESH_TEST_AMOUNT (לא חובה): סכום קבוע לכל רכישה, לבדיקות.
   תיעוד מלא: בפרויקט, claude/yeshinvoice-api.md */
'use strict';
const crypto = require('node:crypto');
const { env } = require('./_lib');

const API = 'https://api.yeshinvoice.co.il/api/';
const ready = () => !!(env('YESH_SECRET') && env('YESH_USERKEY'));
const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

/* סוגי מסמך שדף התשלום יודע להפיק. עוסק פטור: קבלה (6) */
const DOC_TYPES = { 6: 'קבלה', 9: 'חשבונית מס/קבלה', 11: 'קבלה לתרומה' };

async function call(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: JSON.stringify({ secret: env('YESH_SECRET'), userkey: env('YESH_USERKEY') }) },
    body: JSON.stringify(body || {}), signal: AbortSignal.timeout(25000)
  });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j) throw new Error('יש חשבונית: תשובה לא צפויה (' + r.status + ')');
  return j;
}

/* חתימה על מספר ההזמנה: נכנסת לכתובת העדכון (NotifyUrl), כך שרק יש חשבונית (שקיבלו את הכתובת מאיתנו) יכולים לעדכן תשלום */
const sig = id => crypto.createHmac('sha256', env('YESH_SECRET')).update('yesh:' + String(id)).digest('hex').slice(0, 32);
function sigOk(id, s) {
  const exp = sig(id), got = String(s || '');
  return got.length === exp.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(got));
}

/* הגדרות הקבלה מהניהול (cfg.rcpt.yesh): האם להפיק, האם לשלוח ללקוח, ואיזה סוג מסמך */
function rcptOf(cfg) {
  const R = (cfg && cfg.rcpt && cfg.rcpt.yesh) || {};
  return { create: R.create !== false, send: R.send !== false, doc: DOC_TYPES[+R.doc] ? +R.doc : 6 };
}

/* יצירת דף תשלום. מחזיר את הקישור לדף (מוצג בחלון התשלום באתר, בתוך iframe) */
async function createPayment({ id, amount, desc, email, name, phone, cfg, donation }) {
  const R = rcptOf(cfg), q = 'id=' + id + '&s=' + sig(id);
  const doc = donation && R.doc !== 9 ? 11 : R.doc;
  const j = await call('v1/createPayment', {
    Title: String(desc || 'MyLuach').slice(0, 100), Body: '',
    /* כתובות החזרה לדפדפן: בלי החתימה (הלקוח רואה אותן). החתימה רק בכתובת העדכון, שעוברת בין השרתים */
    SuccessUrl: site() + '/pay-return.html?ok=1', ErrorUrl: site() + '/pay-return.html?ok=0',
    NotifyUrl: site() + '/api/yesh-callback?' + q,
    NumPayments: 1, MinPayments: 0, MaxPayments: 0,
    TotalPrice: Math.round(amount * 100) / 100, OrderNumber: id, PaymentType: 1,
    isIframe: true, BgColor: '', LogoUrl: env('YESH_LOGO_URL') || '',
    InvoiceName: String(name || email || 'לקוח MyLuach').slice(0, 80), InvoiceTitle: String(desc || 'MyLuach').slice(0, 100),
    InvoiceNumberID: '', InvoiceEmailAddress: email || '', InvoiceAddress: '', InvoiceCity: '', InvoicePhone: String(phone || ''),
    UniqueID: id, Fields1: id, Fields2: '', Fields3: '',
    CurrencyID: 2, InvoiceLangID: 359,
    SendInvoiceSMS: false, NoCreateInvoice: !R.create, SendInvoiceEmail: R.create && R.send && !!email, DocumentType: doc, CustomerID: 0
  });
  if (!j.Success || !/^https:\/\//.test(String(j.ReturnValue || ''))) throw new Error(String(j.ErrorMessage || 'יש חשבונית: לא נוצר דף תשלום').slice(0, 200));
  return j.ReturnValue;
}

/* קריאת העדכון שמגיע מיש חשבונית. המבנה המדויק של עדכון דף התשלום לא מתועד אצלם,
   לכן בודקים כמה סימנים מוכרים ושומרים את כל ההודעה. מחזיר ok: true / false / null (לא ברור) */
function parse(p) {
  const flat = {};
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4) return; for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object') walk(v, d + 1);
    else if (typeof v === 'string' && /^\s*[{[]/.test(v)) { try { walk(JSON.parse(v), d + 1); } catch (e) { flat[k.toLowerCase()] = v; } }
    else if (flat[k.toLowerCase()] == null) flat[k.toLowerCase()] = v; } };
  walk(p, 0);
  const code = String(flat.responsecode ?? flat.ccode ?? flat.statuscode ?? flat.resultcode ?? '').trim();
  const text = [flat.errormessage, flat.description, flat.message, flat.status, flat.statusdescription].filter(x => x != null).join(' ');
  /* מסמך שנוצר (Webhook "יצירת מסמך" בחשבון): קבלה נוצרת רק אחרי תשלום שעבר */
  const docMade = flat.docnumber != null && (flat.uniquekeyapi != null || flat.doctype != null);
  let ok = null;
  if (/^0+$/.test(code)) ok = true;
  else if (code && !/^0+$/.test(code)) ok = false;
  else if (/fail|declin|error|denied|נכשל|נדח|סירוב/i.test(text)) ok = false;
  else if (/approved|success|הצליח|אושר/i.test(text) || docMade) ok = true;
  /* במסמך: price יכול להיות לפני מע"מ, ולכן מוסיפים את המע"מ אם הוא מופיע (הבדיקה היא רק שלא שולם פחות) */
  const amt = flat.totalprice != null ? Number(flat.totalprice) : flat.price != null ? Number(flat.price) + (Number(flat.vatprice) || 0) : Number(flat.amount ?? flat.sum ?? NaN);
  return { ok, amount: isFinite(amt) ? amt : null, txn: String(flat.asmachta ?? flat.dealnumber ?? flat.transactionid ?? flat.historyid ?? flat.docid ?? flat.docnumber ?? ''),
    docNumber: flat.docnumber != null ? String(flat.docnumber) : '', pdf: String(flat.pdfurl || ''), msg: String(text).slice(0, 200) };
}

/* אילו מסופי סליקה מחוברים לחשבון ביש חשבונית (לבדיקה מהניהול) */
async function plugins() { const j = await call('v1/getCreditCardPlugin', {}); return Array.isArray(j.ReturnValue) ? j.ReturnValue : []; }

module.exports = { ready, createPayment, sigOk, parse, plugins, rcptOf, DOC_TYPES };
