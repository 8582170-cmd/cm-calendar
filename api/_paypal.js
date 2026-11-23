/* תשלום דרך פייפל (Orders API v2). משתני סביבה: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE=live|sandbox */
'use strict';
const { env } = require('./_lib');

const ready = () => !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET'));
const base = acc => (acc ? acc.mode : env('PAYPAL_MODE')) === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const TOKS = new Map();
async function token(acc) {
  const ck = acc ? acc.id : '', TOK = TOKS.get(ck);
  if (TOK && TOK.exp > Date.now() + 60000) return TOK.v;
  const r = await fetch(base(acc) + '/v1/oauth2/token', {
    method: 'POST', body: 'grant_type=client_credentials',
    headers: { Authorization: 'Basic ' + btoa((acc ? acc.id : env('PAYPAL_CLIENT_ID')) + ':' + (acc ? acc.secret : env('PAYPAL_SECRET'))), 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('paypal auth ' + r.status + ' ' + (j.error_description || j.error || ''));
  TOKS.set(ck, { v: j.access_token, exp: Date.now() + (+j.expires_in || 300) * 1000 });
  return j.access_token;
}
async function call(path, body, acc) {
  const r = await fetch(base(acc) + path, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(acc), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('paypal ' + r.status + ' ' + ((j.details && j.details[0] && j.details[0].issue) || j.name || '')), { j });
  return j;
}
/* הזמנה בפייפל לסכום בשקלים. ref = מספר ההזמנה שלנו */
/* email: מייל הלקוח (אם ידוע) למילוי מראש בטופס של פייפל, כדי שלא יצטרך להקליד */
async function create(amount, ref, desc, email, acc) {
  const j = await call('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: ref, custom_id: ref, description: String(desc || 'MyLuach').slice(0, 120), amount: { currency_code: 'ILS', value: (Math.round(amount * 100) / 100).toFixed(2) } }],
    ...(email ? { payer: { email_address: email, address: { country_code: 'IL' } } } : {}),
    application_context: { brand_name: 'MyLuach', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', locale: 'he-IL' }
  }, acc);
  return j.id;
}
/* גבייה אחרי שהלקוח אישר. מחזיר {ok, amount, email, txn} */
async function capture(ppid, acc) {
  let j;
  try { j = await call('/v2/checkout/orders/' + encodeURIComponent(ppid) + '/capture', undefined, acc); }
  catch (e) { if (e.j && e.j.details && e.j.details.some(d => d.issue === 'ORDER_ALREADY_CAPTURED')) j = await get(ppid, acc); else throw e; }
  const cap = (((j.purchase_units || [])[0] || {}).payments || {}).captures || [];
  const c = cap.find(x => x.status === 'COMPLETED');
  return { ok: j.status === 'COMPLETED' && !!c, amount: c ? +c.amount.value : 0, currency: c ? c.amount.currency_code : '', email: (j.payer && j.payer.email_address) || '', txn: c ? c.id : '' };
}
async function get(ppid, acc) {
  const r = await fetch(base(acc) + '/v2/checkout/orders/' + encodeURIComponent(ppid), { headers: { Authorization: 'Bearer ' + await token() } });
  return r.json();
}
/* החזר כספי (מלא או חלקי) לפי מזהה הגבייה. key = מפתח למניעת החזר כפול */
async function refund(captureId, amount, key, note, acc) {
  const r = await fetch(base(acc) + '/v2/payments/captures/' + encodeURIComponent(captureId) + '/refund', {
    method: 'POST', headers: { Authorization: 'Bearer ' + await token(acc), 'Content-Type': 'application/json', 'PayPal-Request-Id': key, Prefer: 'return=representation' },
    body: JSON.stringify({ ...(amount ? { amount: { value: (Math.round(amount * 100) / 100).toFixed(2), currency_code: 'ILS' } } : {}), note_to_payer: String(note || 'החזר מ־MyLuach').slice(0, 255) })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const iss = (j.details && j.details[0] && j.details[0].issue) || j.name || ''; throw Object.assign(new Error(iss || ('paypal ' + r.status)), { issue: iss }); }
  return { id: j.id, status: j.status, amount: j.amount ? +j.amount.value : amount };
}
/* פנייה כללית ל-API (למנויים: מוצר, תוכנית, מנוי) */
async function api(method, path, body) {
  const r = await fetch(base() + path, { method, headers: { Authorization: 'Bearer ' + await token(acc), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('paypal ' + r.status + ' ' + ((j.details && j.details[0] && j.details[0].issue) || j.name || '')), { j, status: r.status });
  return j;
}
module.exports = { ready, create, capture, refund, api };
