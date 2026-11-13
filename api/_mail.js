/* שליחת מיילים עם מעבר אוטומטי בין ספקים.
   הזמנות דיגיטליות (kind: invite*): ברירת מחדל Brevo בלבד. כל שאר האתר: Resend → Mailjet → Brevo (כשהמכסה היומית/חודשית מלאה). אפשר לשנות בדף הניהול או במשתנים.
   ספקים: Resend (RESEND_API_KEY), Brevo (BREVO_API_KEY), Mailjet (MAILJET_API_KEY + MAILJET_SECRET_KEY), Amazon SES (SES_ACCESS_KEY_ID + SES_SECRET_ACCESS_KEY + SES_REGION).
   ספק שלא הוגדר מדולג. אם ספק נכשל (מגבלה, תקלה), עוברים לבא בתור. */
'use strict';
const { env, db, loadSetting } = require('./_lib');
const FROM_EMAIL = () => env('MAIL_FROM') || 'noreply@myluach.org';
const FROM_NAME = 'MyLuach';
/* תשובות למיילים מגיעות לכתובת הזאת (ולא ל-noreply): MAIL_REPLY_TO, ואם אין: OWNER_EMAIL */
const REPLY = () => env('MAIL_REPLY_TO') || env('OWNER_EMAIL') || '';

async function viaResend(m) {
  const k = env('RESEND_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: (m.fromName || FROM_NAME) + ' <' + FROM_EMAIL() + '>', to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers || {}, ...((m.replyTo || REPLY()) ? { reply_to: m.replyTo || REPLY() } : {}) }) });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'resend';
}
async function viaBrevo(m) {
  const k = env('BREVO_API_KEY'); if (!k) return null;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': k, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: m.fromName || FROM_NAME, email: FROM_EMAIL() }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text, headers: m.headers || undefined, ...((m.replyTo || REPLY()) ? { replyTo: { email: m.replyTo || REPLY() } } : {}) }) });
  if (!r.ok) throw new Error('brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'brevo';
}
async function viaMailjet(m) {
  const k = env('MAILJET_API_KEY'), s = env('MAILJET_SECRET_KEY'); if (!k || !s) return null;
  const r = await fetch('https://api.mailjet.com/v3.1/send', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(k + ':' + s).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ Messages: [{ From: { Email: FROM_EMAIL(), Name: m.fromName || FROM_NAME }, To: [{ Email: m.to }], Subject: m.subject, HTMLPart: m.html, TextPart: m.text, Headers: m.headers || undefined, ...((m.replyTo || REPLY()) ? { ReplyTo: { Email: m.replyTo || REPLY() } } : {}) }] }) });
  if (!r.ok) throw new Error('mailjet ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'mailjet';
}

/* Amazon SES (API v2). חתימת SigV4 בלי ספרייה. משתנים: SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION (למשל eu-west-1) */
function sigV4(o) {
  const c = require('crypto'), hash = x => c.createHash('sha256').update(x).digest('hex'), hmac = (k, d) => c.createHmac('sha256', k).update(d).digest();
  const amz = o.amz || new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), date = amz.slice(0, 8);
  const H = { host: o.host, 'x-amz-date': amz }; if (o.ctype) H['content-type'] = o.ctype;
  const names = Object.keys(H).sort(), signed = names.join(';');
  const canon = [o.method, o.path, o.query || '', names.map(n => n + ':' + H[n] + '\n').join(''), signed, hash(o.body || '')].join('\n');
  const scope = date + '/' + o.region + '/' + o.service + '/aws4_request';
  const kS = hmac(hmac(hmac(hmac('AWS4' + o.secret, date), o.region), o.service), 'aws4_request');
  const sig = c.createHmac('sha256', kS).update(['AWS4-HMAC-SHA256', amz, scope, hash(canon)].join('\n')).digest('hex');
  return { amz, auth: 'AWS4-HMAC-SHA256 Credential=' + o.key + '/' + scope + ', SignedHeaders=' + signed + ', Signature=' + sig };
}
async function viaSES(m) {
  const key = env('SES_ACCESS_KEY_ID'), secret = env('SES_SECRET_ACCESS_KEY'); if (!key || !secret) return null;
  const region = env('SES_REGION') || 'us-east-1', host = 'email.' + region + '.amazonaws.com', path = '/v2/email/outbound-emails', reply = m.replyTo || REPLY();
  const hdrs = Object.entries(m.headers || {}).map(([Name, Value]) => ({ Name, Value: String(Value) }));
  const body = JSON.stringify({ FromEmailAddress: (m.fromName || FROM_NAME) + ' <' + FROM_EMAIL() + '>', Destination: { ToAddresses: [m.to] }, ...(reply ? { ReplyToAddresses: [reply] } : {}),
    Content: { Simple: { Subject: { Data: m.subject, Charset: 'UTF-8' }, Body: { Html: { Data: m.html, Charset: 'UTF-8' }, ...(m.text ? { Text: { Data: m.text, Charset: 'UTF-8' } } : {}) }, ...(hdrs.length ? { Headers: hdrs } : {}) } } });
  const sg = sigV4({ method: 'POST', host, path, body, region, service: 'ses', key, secret, ctype: 'application/json' });
  const r = await fetch('https://' + host + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Amz-Date': sg.amz, Authorization: sg.auth }, body });
  if (!r.ok) throw new Error('ses ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'ses';
}

const PROVIDERS = { resend: viaResend, brevo: viaBrevo, mailjet: viaMailjet, ses: viaSES };
/* מכסה יומית חינמית של כל ספק (אפשר לשנות במשתני סביבה MAIL_CAP_RESEND וכו'). ספק שהגיע למכסה היום מדולג מראש */
const CAPS = { resend: 100, brevo: 300, mailjet: 200, ses: 1e9 };
/* מכסה חודשית חינמית (MAIL_MONTH_RESEND וכו', או בדף הניהול). ספק שהגיע אליה מדולג עד תחילת החודש */
const MONTH = { resend: 3000, mailjet: 6000 };
const cap = k => { const v = env('MAIL_CAP_' + k.toUpperCase()); return v !== '' && v != null && !isNaN(+v) ? (+v || 1e9) : CAPS[k]; };  /* 0 = בלי מגבלה (חבילה בתשלום) */
/* מגבלה לשעה (Mailjet מגביל כרגע ל-30 מיילים בשעה). אפשר לשנות במשתנה MAIL_HOURLY_MAILJET, או 0 לביטול */
const HOURLY = { mailjet: 30 };
const hourCap = k => { const v = env('MAIL_HOURLY_' + k.toUpperCase()); return v !== '' && v != null && !isNaN(+v) ? +v : (HOURLY[k] || 0); };
/* הגדרות ניתוב מדף הניהול (settings.mailroute): { inv: [...], other: [...], caps: { ספק: { day, month, hour } } } */
let ROUTE = null;
async function getRoute() { if (ROUTE && Date.now() - ROUTE.at < 30000) return ROUTE.v; let v = {}; try { v = (await loadSetting('mailroute')) || {}; } catch (e) {} ROUTE = { at: Date.now(), v }; return v; }
const names = v => String(Array.isArray(v) ? v.join(',') : (v || '')).split(',').map(x => x.trim().toLowerCase()).filter((k, i, a) => PROVIDERS[k] && a.indexOf(k) === i);
const capOv = (R, k, f) => { const o = R && R.caps && R.caps[k]; return o && o[f] != null && isFinite(+o[f]) ? +o[f] : null; };
const capDay = (R, k) => { const v = capOv(R, k, 'day'); return v == null ? cap(k) : (v || 1e9); };
const capMonth = (R, k) => { const v = capOv(R, k, 'month'); if (v != null) return v || 1e9; const e = env('MAIL_MONTH_' + k.toUpperCase()); return e !== '' && e != null && !isNaN(+e) ? (+e || 1e9) : (MONTH[k] || 1e9); };
const capHour = (R, k) => { const v = capOv(R, k, 'hour'); return v == null ? hourCap(k) : v; };
/* כמה מיילים נשלחו (היום, החודש, בשעה האחרונה) לכל ספק. נשמר בזיכרון חצי דקה ומתעדכן בכל שליחה */
let CNT = null;
async function counts() {
  if (CNT && Date.now() - CNT.at < 45000) return CNT;
  const out = { at: Date.now(), n: {}, m: {}, h: {} };
  try {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }), t0 = Date.parse(day + 'T00:00:00+03:00'), hr = Date.now() - 3600e3;
    const rows = await db('email_log?select=provider,created_at&ok=eq.true&created_at=gte.' + day.slice(0, 7) + '-01T00:00:00%2B03:00&limit=20000');
    (rows || []).forEach(r => { const t = Date.parse(r.created_at); out.m[r.provider] = (out.m[r.provider] || 0) + 1; if (t >= t0) out.n[r.provider] = (out.n[r.provider] || 0) + 1; if (t > hr) out.h[r.provider] = (out.h[r.provider] || 0) + 1; });
  } catch (e) {}
  return (CNT = out);
}
/* only: לשלוח דרך ספק אחד בלבד (לבדיקה מדף הניהול).
   אחרת: לפי הסדר; ספק שנכשל (מגבלה, חסימה, תקלה) — עוברים מיד לבא. אם כולם "מלאים" לפי הספירה, מנסים בכל זאת את כולם. */
async function sendMail(m, kind, only) {
  const errs = [], R = await getRoute();
  /* הפרדה: מיילים של ההזמנות הדיגיטליות (kind שמתחיל ב-invite) ושל שאר האתר יוצאים מרשימות ספקים נפרדות.
     סדר העדיפות: דף הניהול ← משתנה סביבה (MAIL_INVITE_ORDER / MAIL_OTHER_ORDER) ← ברירת מחדל. ספקים: resend, brevo, mailjet, ses */
  const inv = /^invite/.test(kind || '');
  let order = only ? [only] : (names(R[inv ? 'inv' : 'other']).length ? names(R[inv ? 'inv' : 'other']) : names(env(inv ? 'MAIL_INVITE_ORDER' : 'MAIL_OTHER_ORDER') || (inv ? 'brevo' : 'resend,mailjet,brevo')));
  if (!order.length) order = inv ? ['brevo'] : ['resend', 'mailjet', 'brevo'];
  if (!only) {
    const C = await counts();
    const free = order.filter(k => (C.n[k] || 0) < capDay(R, k) && (C.m[k] || 0) < capMonth(R, k) && (!capHour(R, k) || (C.h[k] || 0) < capHour(R, k)));
    order = free.concat(order.filter(k => free.indexOf(k) < 0));
  }
  for (const k of order) {
    const fn = PROVIDERS[k]; if (!fn) continue;
    try { const used = await fn(m); if (used) { if (CNT) { ['n', 'm', 'h'].forEach(x => { CNT[x][used] = (CNT[x][used] || 0) + 1; }); } await logMail(used, kind, true, m); return used; } }
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
  return { resend: !!env('RESEND_API_KEY'), brevo: !!env('BREVO_API_KEY'), mailjet: !!(env('MAILJET_API_KEY') && env('MAILJET_SECRET_KEY')), ses: !!(env('SES_ACCESS_KEY_ID') && env('SES_SECRET_ACCESS_KEY')) };
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
module.exports = { sendMail, frame, escH, configured, textToHtml, capacity, getRoute, _sigV4: sigV4 };
