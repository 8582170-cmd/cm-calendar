/* קבלה ללקוח על תשלום שעבר בחברה שלא מפיקה קבלה בעצמה (או שלא רוצים את הקבלה שלה):
   נדרים פלוס, ביט, PayPal. לפי ההגדרה בניהול (cfg.rcpt.<חברה>.by): לא להפיק / להפיק ב-SUMIT / להפיק ביש חשבונית,
   ו-cfg.rcpt.<חברה>.send: האם לשלוח את הקבלה ללקוח במייל.
   SUMIT ויש חשבונית שגבו בעצמם מפיקים קבלה בזמן התשלום (ההגדרות שלהם נשלחות שם), ולכן לא נוגעים בהם כאן.
   תקלה בהפקת הקבלה אף פעם לא עוצרת את התשלום: היא נשמרת בהזמנה (callback.receipt.error) ומוצגת בניהול. */
'use strict';
const { env, db, loadConfig } = require('./_lib');

/* שם האמצעי שנשמר בתשלום → המפתח בהגדרות */
const KEY = { 'נדרים פלוס': 'nedarim', 'ביט': 'bit', 'PayPal': 'paypal', 'PayPal (מנוי)': 'paypal' };
const SELF = ['sumit', 'yesh']; /* מפיקים קבלה בעצמם בזמן החיוב */

function settingFor(cfg, key) {
  const R = ((cfg && cfg.rcpt) || {})[key] || {};
  return { by: ['sumit', 'yesh'].includes(R.by) ? R.by : '', send: R.send !== false };
}

/* תאריך ושעה לפי שעון ישראל, בפורמט של יש חשבונית */
function ilNow() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value || '00';
  return { day: g('year') + '-' + g('month') + '-' + g('day'), time: g('hour').replace('24', '00') + ':' + g('minute') };
}

function descOf(o) {
  const PLAN = (require('./_lib').PLAN_NAMES || {})[o.plan];
  return o.plan === 'donation' ? 'MyLuach · תרומה' : o.plan === 'greet' ? 'MyLuach · ברכה / הזמנה מעוצבת' : o.plan === 'event' ? 'MyLuach · דף הזמנה לאירוע'
    : o.plan === 'gift' ? 'MyLuach · מתנה לאירוע' : o.plan === 'wishd' ? 'MyLuach · ברכה לאירוע' : /^(gsub|gpack|rsub):/.test(String(o.plan)) ? 'MyLuach · מנוי / חבילה'
    : 'MyLuach' + (PLAN ? ' · מסלול ' + PLAN : '');
}

/* פרטי הלקוח והכרטיס מתוך מה שהחברה שלחה (אם יש) */
function payerOf(o) {
  const cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
  const pp = cb.paypal || {};
  const name = String(cb.ClientName || cb.FirstName || pp.name || '').trim() || String(o.email || 'לקוח MyLuach');
  const last4 = String(cb.LastNum || cb.LastDigits || cb.CardLast4 || '').replace(/\D/g, '').slice(-4);
  return { name: name.slice(0, 80), last4 };
}

async function viaSumit(o, key, send) {
  const S = require('./_sumit'); if (!S.ready()) throw new Error('SUMIT לא מוגדר בשרת');
  const cfg = await loadConfig().catch(() => ({})), type = +((cfg.rcpt || {}).sumitDoc) === 1 ? 1 : 2; /* 2 = קבלה, 1 = חשבונית מס/קבלה */
  const { name, last4 } = payerOf(o), amount = Math.round(+o.amount * 100) / 100, how = { nedarim: 'כרטיס אשראי (נדרים פלוס)', bit: 'ביט', paypal: 'PayPal' }[key] || key;
  const j = await S.call('/accounting/documents/create/', {
    Details: { Customer: { ExternalIdentifier: String(o.email || o.id), SearchMode: 2, Name: name, EmailAddress: o.email || '' },
      SendByEmail: send && o.email ? { EmailAddress: o.email, Original: true, SendAsPaymentRequest: false } : null,
      Language: 0, Currency: 0, Type: type, Description: descOf(o) + ' · שולם ב: ' + how, ExternalReference: o.id },
    Items: [{ Quantity: 1, UnitPrice: amount, TotalPrice: amount, Item: { Name: descOf(o).slice(0, 100), Description: 'הזמנה ' + String(o.id).slice(0, 8) } }],
    Payments: [{ Amount: amount, Details_CreditCard: { Last4Digits: last4 || null } }],
    VATIncluded: true
  });
  const ok = j && (j.Status === 0 || j.Status === 'Success');
  if (!ok) throw new Error(String((j && (j.UserErrorMessage || j.TechnicalErrorDetails)) || 'SUMIT לא הפיקו קבלה').slice(0, 200));
  const D = j.Data || {};
  return { by: 'sumit', id: D.DocumentID || D.ID || null, number: D.DocumentNumber || null, sent: !!(send && o.email) };
}

async function viaYesh(o, key, send) {
  const Y = require('./_yesh'); if (!Y.ready()) throw new Error('יש חשבונית לא מוגדר בשרת');
  const cfg = await loadConfig().catch(() => ({})), doc = Y.rcptOf(cfg).doc === 9 ? 9 : 6;
  const { name, last4 } = payerOf(o), amount = Math.round(+o.amount * 100) / 100, t = ilNow();
  const pay = key === 'bit' ? { TypeID: 4, PaymentAppType: 1 } : key === 'paypal' ? { TypeID: 5 } : { TypeID: 3, CardLastDigits: last4, TransactionType: 1, NumberofPayments: 1 };
  const j = await Y.call('v1.1/createDocument', {
    Title: descOf(o).slice(0, 100), Notes: '', NotesBottom: '', HideNotes: 'הזמנה באתר: ' + o.id,
    CurrencyID: 2, LangID: 359, SendSMS: false, SendEmail: !!(send && o.email), IncludePDF: true,
    DocumentType: doc, ExchangeRate: 1, RoundPriceAuto: false, OrderNumber: o.id,
    DateCreated: t.day + ' ' + t.time, MaxDate: t.day + ' ' + t.time, hideMaxDate: true, statusID: 2, isDraft: false,
    DocumentUniqueKey: String(o.id).slice(0, 20),
    Customer: { Name: name, EmailAddress: o.email || '', CustomKey: String(o.email || ''), ID: -1 },
    items: [{ Quantity: 1, Price: amount, Name: descOf(o).slice(0, 100), vatType: doc === 9 ? 2 : 4 }],
    payments: [{ Price: amount, DueDate: t.day, ...pay }]
  });
  if (!j.Success) throw new Error(String(j.ErrorMessage || 'יש חשבונית לא הפיקו קבלה').slice(0, 200));
  const R = j.ReturnValue || {};
  return { by: 'yesh', id: R.id || null, number: R.docNumber || null, pdf: R.pdfurl || null, sent: !!(send && o.email) };
}

/* נקרא אחרי שהזמנה סומנה כשולמה (פעם אחת) */
async function issue(o, via) {
  const key = KEY[via]; if (!key || SELF.includes(key) || !(+o.amount > 0)) return null;
  const cfg = await loadConfig().catch(() => ({}));
  const S = settingFor(cfg, key); if (!S.by) return null;
  let rec;
  try { rec = S.by === 'sumit' ? await viaSumit(o, key, S.send) : await viaYesh(o, key, S.send); }
  catch (e) { console.error('receipt', key, S.by, e.message); rec = { by: S.by, error: e.message }; }
  rec.at = new Date().toISOString();
  try { const cur = ((await db('orders?id=eq.' + o.id + '&select=callback')) || [])[0] || {};
    await db('orders?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...(cur.callback || {}), receipt: rec } }) }); } catch (e) {}
  return rec;
}

module.exports = { issue, settingFor, KEY };
