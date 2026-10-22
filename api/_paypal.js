/* תשלום דרך פייפל (Orders API v2). משתני סביבה: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE=live|sandbox */
'use strict';
const { env } = require('./_lib');

const ready = () => !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET'));
const base = () => env('PAYPAL_MODE') === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
let TOK = null;
async function token() {
  if (TOK && TOK.exp > Date.now() + 60000) return TOK.v;
  const r = await fetch(base() + '/v1/oauth2/token', {
    method: 'POST', body: 'grant_type=client_credentials',
    headers: { Authorization: 'Basic ' + Buffer.from(env('PAYPAL_CLIENT_ID') + ':' + env('PAYPAL_SECRET')).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('paypal auth ' + r.status + ' ' + (j.error_description || j.error || ''));
  TOK = { v: j.access_token, exp: Date.now() + (+j.expires_in || 300) * 1000 };
  return TOK.v;
}
async function call(path, body) {
  const r = await fetch(base() + path, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('paypal ' + r.status + ' ' + ((j.details && j.details[0] && j.details[0].issue) || j.name || '')), { j });
  return j;
}
/* הזמנה בפייפל לסכום בשקלים. ref = מספר ההזמנה שלנו */
async function create(amount, ref, desc) {
  const j = await call('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: ref, custom_id: ref, description: String(desc || 'MyLuach').slice(0, 120), amount: { currency_code: 'ILS', value: (Math.round(amount * 100) / 100).toFixed(2) } }],
    application_context: { brand_name: 'MyLuach', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', locale: 'he-IL' }
  });
  return j.id;
}
/* גבייה אחרי שהלקוח אישר. מחזיר {ok, amount, email, txn} */
async function capture(ppid) {
  let j;
  try { j = await call('/v2/checkout/orders/' + encodeURIComponent(ppid) + '/capture'); }
  catch (e) { if (e.j && e.j.details && e.j.details.some(d => d.issue === 'ORDER_ALREADY_CAPTURED')) j = await get(ppid); else throw e; }
  const cap = (((j.purchase_units || [])[0] || {}).payments || {}).captures || [];
  const c = cap.find(x => x.status === 'COMPLETED');
  return { ok: j.status === 'COMPLETED' && !!c, amount: c ? +c.amount.value : 0, currency: c ? c.amount.currency_code : '', email: (j.payer && j.payer.email_address) || '', txn: c ? c.id : '' };
}
async function get(ppid) {
  const r = await fetch(base() + '/v2/checkout/orders/' + encodeURIComponent(ppid), { headers: { Authorization: 'Bearer ' + await token() } });
  return r.json();
}
module.exports = { ready, create, capture };
