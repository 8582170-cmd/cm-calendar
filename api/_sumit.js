/* תשלום דרך SUMIT (סאמיט): סליקת כרטיס אשראי + הפקת קבלה אוטומטית ושליחתה ללקוח.
   משתני סביבה: SUMIT_COMPANY_ID, SUMIT_API_KEY (סודי, רק בשרת), SUMIT_PUBLIC_KEY (ציבורי, לטופס בדפדפן).
   הדפדפן הופך את פרטי הכרטיס לאסימון חד־פעמי (SingleUseToken) ישירות מול SUMIT, כך שמספר הכרטיס לא עובר דרכנו. */
'use strict';
const { env } = require('./_lib');

const ready = () => !!(env('SUMIT_COMPANY_ID') && env('SUMIT_API_KEY') && env('SUMIT_PUBLIC_KEY'));
const pub = () => ready() ? { cid: +env('SUMIT_COMPANY_ID'), pk: env('SUMIT_PUBLIC_KEY') } : null;

async function call(path, body) {
  try {
    const r = await fetch('https://api.sumit.co.il' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Credentials: { CompanyID: +env('SUMIT_COMPANY_ID'), APIKey: env('SUMIT_API_KEY') }, ...body }), signal: AbortSignal.timeout(25000) });
    return await r.json().catch(() => ({}));
  } catch (e) { console.error('sumit', e.message); return {}; }
}
/* חיוב חד־פעמי. מחזיר {ok, message, paymentId, documentId, raw} */
async function charge({ token, amount, name, email, ref, desc }) {
  const j = await call('/billing/payments/charge/', {
    Customer: { ExternalIdentifier: String(email || ref), SearchMode: 2, Name: String(name || email || 'לקוח MyLuach').slice(0, 80), EmailAddress: email || '' },
    SingleUseToken: token,
    Items: [{ Item: { Name: String(desc || 'MyLuach').slice(0, 100), Description: 'הזמנה ' + String(ref).slice(0, 8) }, Quantity: 1, UnitPrice: Math.round(amount * 100) / 100, Currency: 0 }],
    VATIncluded: true, OnlyDocument: false, DocumentLanguage: 0, SendDocumentByEmail: !!email
  });
  const D = j && j.Data || {}, P = D.Payment || j.Payment || {};
  const fw = j.Status === 0 || j.Status === 'Success';
  const ok = fw ? (P.ValidPayment === true && String(P.Status) === '000') : false;
  /* תקלה של המערכת (הרשאה, הגדרות, מכסה) ולא סירוב של הכרטיס: אין תוצאת תשלום בכלל */
  const system = !ok && (!fw || !P || P.ID == null && P.Status == null);
  return { ok, system, message: (P.StatusDescription || j.UserErrorMessage || '').toString().slice(0, 200), paymentId: P.ID || null, documentId: D.DocumentID || null, amount: +(P.Amount || amount), raw: { Status: j.Status, Payment: { ID: P.ID, Status: P.Status, ValidPayment: P.ValidPayment, StatusDescription: P.StatusDescription }, DocumentID: D.DocumentID, CustomerID: D.CustomerID } };
}
module.exports = { ready, pub, charge };
