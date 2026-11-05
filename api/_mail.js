/* שליחת מיילים עם מעבר אוטומטי בין ספקים.
   הסדר: Resend (RESEND_API_KEY) → Brevo (BREVO_API_KEY) → Mailjet (MAILJET_API_KEY + MAILJET_SECRET_KEY).
   ספק שלא הוגדר מדולג. אם ספק נכשל (מגבלה, תקלה), עוברים לבא בתור. */
'use strict';
const { env, db } = require('./_lib');
const FROM_EMAIL = () => env('MAIL_FROM') || 'noreply@myluach.org';
const FROM_NAME = 'MyLuach';
/* תשובות למיילים מגיעות לכתובת הזאת (ולא ל-noreply): MAIL_REPLY_TO, ואם אין: OWNER_EMAIL */
const REPLY = () => env('MAIL_REPLY_TO') || env('OWNER_EMAIL') || '';

async function viaResend(m) {
  const k = env('RESEND_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_NAME + ' <' + FROM_EMAIL() + '>', to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers || {}, ...((m.replyTo || REPLY()) ? { reply_to: m.replyTo || REPLY() } : {}) }) });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'resend';
}
async function viaBrevo(m) {
  const k = env('BREVO_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': k, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM_EMAIL() }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text, headers: m.headers || undefined, ...((m.replyTo || REPLY()) ? { replyTo: { email: m.replyTo || REPLY() } } : {}) }) });
  if (!r.ok) throw new Error('brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'brevo';
}
async function viaMailjet(m) {
  const k = env('MAILJET_API_KEY'), s = env('MAILJET_SECRET_KEY'); if (!k || !s) return null;
  const r = await fetch('https://api.mailjet.com/v3.1/send', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(k + ':' + s).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ Messages: [{ From: { Email: FROM_EMAIL(), Name: FROM_NAME }, To: [{ Email: m.to }], Subject: m.subject, HTMLPart: m.html, TextPart: m.text, Headers: m.headers || undefined, ...((m.replyTo || REPLY()) ? { ReplyTo: { Email: m.replyTo || REPLY() } } : {}) }] }) });
  if (!r.ok) throw new Error('mailjet ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'mailjet';
}

const PROVIDERS = { resend: viaResend, brevo: viaBrevo, mailjet: viaMailjet };
/* מכסה יומית חינמית של כל ספק (אפשר לשנות במשתני סביבה MAIL_CAP_RESEND וכו'). ספק שהגיע למכסה היום מדולג מראש */
const CAPS = { resend: 100, brevo: 300, mailjet: 200 };
const cap = k => +env('MAIL_CAP_' + k.toUpperCase()) || CAPS[k];
/* מגבלה לשעה (Mailjet מגביל כרגע ל-30 מיילים בשעה). אפשר לשנות במשתנה MAIL_HOURLY_MAILJET, או 0 לביטול */
const HOURLY = { mailjet: 30 };
const hourCap = k => { const v = env('MAIL_HOURLY_' + k.toUpperCase()); return v !== '' && v != null && !isNaN(+v) ? +v : (HOURLY[k] || 0); };
async function sentToday() {
  try {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }), hr = Date.now() - 3600e3;
    const rows = await db('email_log?select=provider,created_at&ok=eq.true&created_at=gte.' + day + 'T00:00:00%2B03:00&limit=5000');
    const n = {}, h = {}; (rows || []).forEach(r => { n[r.provider] = (n[r.provider] || 0) + 1; if (Date.parse(r.created_at) > hr) h[r.provider] = (h[r.provider] || 0) + 1; });
    Object.defineProperty(n, 'hour', { value: h, enumerable: false }); return n;
  } catch (e) { return {}; }
}
/* only: לשלוח דרך ספק אחד בלבד (לבדיקה מדף הניהול).
   אחרת: לפי הסדר; ספק שנכשל (מגבלה, חסימה, תקלה) — עוברים מיד לבא. אם כולם "מלאים" לפי הספירה, מנסים בכל זאת את כולם. */
async function sendMail(m, kind, only) {
  const errs = [];
  let order = only ? [only] : ['resend', 'brevo', 'mailjet'];
  if (!only) {
    const n = await sentToday();
    const H = n.hour || {}, free = order.filter(k => (n[k] || 0) < cap(k) && (!hourCap(k) || (H[k] || 0) < hourCap(k)));
    order = free.concat(order.filter(k => free.indexOf(k) < 0));
  }
  for (const k of order) {
    const fn = PROVIDERS[k]; if (!fn) continue;
    try { const used = await fn(m); if (used) { await logMail(used, kind, true, m); return used; } }
    catch (e) { errs.push(e.message); console.error('mail fail', k, e.message); await logMail(k, kind, false, m, e.message); }
  }
  throw new Error('no mail provider succeeded: ' + (errs.join(' | ') || 'none configured'));
}
function logMail(provider, kind, ok, m, err) {
  const base = { provider, kind: kind || '', ok };
  const full = { ...base, to_email: m && m.to ? String(m.to).slice(0, 200) : null, subject: m && m.subject ? String(m.subject).slice(0, 200) : null, error: err ? String(err).slice(0, 300) : null };
  const ins = row => db('email_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  /* אם עמודות הדוח עוד לא נוספו (tools/supabase_email_log2.sql) — שומרים לפחות את הבסיס */
  return ins(full).catch(() => ins(base)).catch(() => {});
}

/* מסגרת מייל אחידה בעברית */
/* מסגרת המייל. o: lang ('he'/'en'), size ('s'/'m'/'l'), accent (צבע הכותרות, הכפתור והקישורים), ink (צבע הטקסט) */
function frame({ title, body, button, url, foot, lang, size, accent, ink }) {
  const en = lang === 'en', ok = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const A = ok(accent) ? accent : '#1f5c63', T = ok(ink) ? ink : '#3c474b', fs = { s: 14, m: 16, l: 18 }[size] || 16;
  const btn = button && url ? '<p style="margin:0 0 22px"><a href="' + url + '" style="display:inline-block;background:' + A + ';color:#ffffff;text-decoration:none;font-weight:bold;font-size:' + fs + 'px;padding:12px 26px;border-radius:10px">' + button + '</a></p>' : '';
  return '<div dir="' + (en ? 'ltr' : 'rtl') + '" style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f4;padding:24px 12px"><div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dde2df;border-radius:14px;padding:28px 24px;text-align:' + (en ? 'left' : 'right') + '">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 ' + (en ? 'auto 18px 0' : '0 18px auto') + ';direction:ltr"><tr><td style="vertical-align:middle;padding-right:8px"><span style="font-size:24px;font-weight:bold;color:' + A + ';font-family:Arial,Helvetica,sans-serif">MyLuach</span></td>' +
    '<td style="vertical-align:middle"><img src="https://www.myluach.org/assets/icon-180.png" width="36" height="36" alt="MyLuach" style="display:block;border:0;border-radius:8px"></td></tr></table>' +
    '<h1 style="font-size:' + (fs + 4) + 'px;color:#172126;margin:0 0 10px">' + title + '</h1><div style="font-size:' + fs + 'px;line-height:1.6;color:' + T + ';margin:0 0 22px">' + String(body).replace(/\{A\}/g, A).replace(/\{FS(\d)\}/g, (m, n) => fs + (+n)) + '</div>' + btn +
    (foot ? '<p style="font-size:' + (fs - 3) + 'px;line-height:1.6;color:#6b7679;margin:0">' + foot + '</p>' : '') +
    '</div><p style="text-align:center;font-size:12px;color:#8a9497;margin:14px 0 0">' + (en ? 'MyLuach · Hebrew–Gregorian calendar · myluach.org' : 'MyLuach · לוח שנה עברי־לועזי · myluach.org') + '</p></div>';
}
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function configured() {
  return { resend: !!env('RESEND_API_KEY'), brevo: !!env('BREVO_API_KEY'), mailjet: !!(env('MAILJET_API_KEY') && env('MAILJET_SECRET_KEY')) };
}
/* טקסט רגיל שכותבים בדף הניהול: שורות, **מודגש**, וקישורים (כתובת מלאה או [טקסט](כתובת)) */
function textToHtml(t) {
  return escH(String(t || '').slice(0, 20000))
    /* "# " בתחילת שורה = כותרת גדולה, "## " = כותרת משנה (בצבע המייל) */
    .replace(/^## (.+)$/gm, '<b style="display:block;font-size:{FS2}px;color:{A};margin:10px 0 2px">$1</b>')
    .replace(/^# (.+)$/gm, '<b style="display:block;font-size:{FS5}px;color:{A};margin:12px 0 4px">$1</b>')
    .replace(/\n?(<b style="display:block[^>]*>[^<]*<\/b>)\n?/g, '$1')
    .replace(/\[([^\]]{1,80})\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:{A}">$1</a>')
    .replace(/(^|[\s(>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" style="color:{A}">$2</a>')
    .replace(/\*\*([^*\n]{1,200})\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}
/* הקיבולת היומית של הספקים המחוברים (לתחזית בניהול) */
function capacity() { const c = configured(), out = {}; Object.keys(c).forEach(k => { if (c[k]) out[k] = { day: cap(k), hour: hourCap(k) || null }; }); return out; }
module.exports = { sendMail, frame, escH, configured, textToHtml, capacity };
