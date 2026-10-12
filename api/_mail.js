/* שליחת מיילים עם מעבר אוטומטי בין ספקים.
   הסדר: Resend (RESEND_API_KEY) → Brevo (BREVO_API_KEY) → Mailjet (MAILJET_API_KEY + MAILJET_SECRET_KEY).
   ספק שלא הוגדר מדולג. אם ספק נכשל (מגבלה, תקלה), עוברים לבא בתור. */
'use strict';
const { env, db } = require('./_lib');
const FROM_EMAIL = () => env('MAIL_FROM') || 'noreply@myluach.org';
const FROM_NAME = 'MyLuach';

async function viaResend(m) {
  const k = env('RESEND_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_NAME + ' <' + FROM_EMAIL() + '>', to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers || {} }) });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'resend';
}
async function viaBrevo(m) {
  const k = env('BREVO_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': k, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM_EMAIL() }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text, headers: m.headers || undefined }) });
  if (!r.ok) throw new Error('brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'brevo';
}
async function viaMailjet(m) {
  const k = env('MAILJET_API_KEY'), s = env('MAILJET_SECRET_KEY'); if (!k || !s) return null;
  const r = await fetch('https://api.mailjet.com/v3.1/send', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(k + ':' + s).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ Messages: [{ From: { Email: FROM_EMAIL(), Name: FROM_NAME }, To: [{ Email: m.to }], Subject: m.subject, HTMLPart: m.html, TextPart: m.text, Headers: m.headers || undefined }] }) });
  if (!r.ok) throw new Error('mailjet ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'mailjet';
}

const PROVIDERS = { resend: viaResend, brevo: viaBrevo, mailjet: viaMailjet };
/* מכסה יומית חינמית של כל ספק (אפשר לשנות במשתני סביבה MAIL_CAP_RESEND וכו'). ספק שהגיע למכסה היום מדולג מראש */
const CAPS = { resend: 100, brevo: 300, mailjet: 200 };
const cap = k => +env('MAIL_CAP_' + k.toUpperCase()) || CAPS[k];
async function sentToday() {
  try {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    const rows = await db('email_log?select=provider&ok=eq.true&created_at=gte.' + day + 'T00:00:00%2B03:00&limit=5000');
    const n = {}; (rows || []).forEach(r => { n[r.provider] = (n[r.provider] || 0) + 1; }); return n;
  } catch (e) { return {}; }
}
/* only: לשלוח דרך ספק אחד בלבד (לבדיקה מדף הניהול).
   אחרת: לפי הסדר; ספק שנכשל (מגבלה, חסימה, תקלה) — עוברים מיד לבא. אם כולם "מלאים" לפי הספירה, מנסים בכל זאת את כולם. */
async function sendMail(m, kind, only) {
  const errs = [];
  let order = only ? [only] : ['resend', 'brevo', 'mailjet'];
  if (!only) {
    const n = await sentToday();
    const free = order.filter(k => (n[k] || 0) < cap(k));
    order = free.concat(order.filter(k => free.indexOf(k) < 0));
  }
  for (const k of order) {
    const fn = PROVIDERS[k]; if (!fn) continue;
    try { const used = await fn(m); if (used) { logMail(used, kind, true); return used; } }
    catch (e) { errs.push(e.message); console.error('mail fail', k, e.message); logMail(k, kind, false); }
  }
  throw new Error('no mail provider succeeded: ' + (errs.join(' | ') || 'none configured'));
}
function logMail(provider, kind, ok) {
  db('email_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ provider, kind: kind || '', ok }) }).catch(() => {});
}

/* מסגרת מייל אחידה בעברית */
function frame({ title, body, button, url, foot }) {
  const btn = button && url ? '<p style="margin:0 0 22px"><a href="' + url + '" style="display:inline-block;background:#1f5c63;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 26px;border-radius:10px">' + button + '</a></p>' : '';
  return '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f4;padding:24px 12px"><div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #dde2df;border-radius:14px;padding:28px 24px;text-align:right">' +
    '<div style="font-size:24px;font-weight:bold;color:#1f5c63;margin-bottom:18px;direction:ltr;text-align:right">MyLuach</div>' +
    '<h1 style="font-size:20px;color:#172126;margin:0 0 10px">' + title + '</h1><div style="font-size:16px;line-height:1.6;color:#3c474b;margin:0 0 22px">' + body + '</div>' + btn +
    (foot ? '<p style="font-size:13px;line-height:1.6;color:#6b7679;margin:0">' + foot + '</p>' : '') +
    '</div><p style="text-align:center;font-size:12px;color:#8a9497;margin:14px 0 0">MyLuach · לוח שנה עברי־לועזי · myluach.org</p></div>';
}
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function configured() {
  return { resend: !!env('RESEND_API_KEY'), brevo: !!env('BREVO_API_KEY'), mailjet: !!(env('MAILJET_API_KEY') && env('MAILJET_SECRET_KEY')) };
}
module.exports = { sendMail, frame, escH, configured };
