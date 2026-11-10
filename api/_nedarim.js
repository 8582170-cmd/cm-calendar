/* נדרים פלוס: פעולות API מעבר לטופס התשלום (לפי התיעוד הרשמי, Manage3 / Tamal3 / DebitBit).
   משתני סביבה: NEDARIM_MOSAD, NEDARIM_API_VALID (טופס וביט), NEDARIM_API_PASSWORD (npk_..., לכל הניהול),
   NEDARIM_WEBHOOK_SECRET (לא חובה: אימות חתימת HMAC על העדכונים). */
'use strict';
const crypto = require('node:crypto');
const { env, loadSetting, saveSetting } = require('./_lib');
const M3 = 'https://matara.pro/nedarimplus/Reports/Manage3.aspx', T3 = 'https://matara.pro/nedarimplus/Reports/Tamal3.aspx', BIT = 'https://matara.pro/nedarimplus/V6/Files/WebServices/DebitBit.aspx';

const ready = () => !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID'));
const apiReady = () => ready() && !!env('NEDARIM_API_PASSWORD');
/* תווים שנדרים דוחים (נראים כמו HTML) */
const safe = v => String(v == null ? '' : v).replace(/[<>]/g, ' ').replace(/&#/g, '& #');

async function call(url, params, method) {
  const q = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => q.append(k, safe(v)));
  const r = method === 'POST' ? await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: q.toString() }) : await fetch(url + '?' + q.toString());
  const t = (await r.text()).trim(); try { return JSON.parse(t); } catch (e) { return { text: t }; }
}
const m3 = (Action, p) => call(M3, { Action, MosadId: env('NEDARIM_MOSAD'), ApiPassword: env('NEDARIM_API_PASSWORD'), ...p });

/* מה פתוח למוסד (ביט, הוראת קבע). קריאה ציבורית, נשמרת ל-6 שעות */
let MI = null;
async function mosad() {
  if (!ready()) return null;
  if (MI && Date.now() - MI.at < 6 * 3600e3) return MI.d;
  const c = await loadSetting('nedmosad').catch(() => null);
  if (c && c.at && c.v === 2 && Date.now() - c.at < 6 * 3600e3) { MI = c; return c.d; }
  try {
    const r = await fetch('https://www.matara.pro/nedarimplus/online/Files/Manage.aspx?Action=GetMosad&MosadId=' + encodeURIComponent(env('NEDARIM_MOSAD')));
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    const yes = v => v === true || v === 1 || /^(true|1|yes|כן|on)$/i.test(String(v == null ? '' : v).trim());
    const d = j && !j.Status ? { bit: yes(j.Bit), keva: String(j.PayBt || '').charAt(2) === '1', name: j.MosadName || '' } : { bit: false, keva: false, err: String(t).slice(0, 100) };
    MI = { at: Date.now(), v: 2, d }; await saveSetting('nedmosad', MI).catch(() => {}); return d;
  } catch (e) { return { bit: false, keva: false }; }
}
/* ביט מוצג רק אם נדרים פלוס מדווח שהוא פתוח למוסד, ואם לא כובה ידנית (בניהול: "לא להציע ביט", או NEDARIM_BIT=off) */
async function bitOn() { if (/^(off|0|false)$/i.test(env('NEDARIM_BIT'))) return false; const d = await mosad(); if (!(d && d.bit)) return false; try { const cfg = await require('./_lib').loadConfig(); if (cfg && cfg.bitOff) return false; } catch (e) {} return true; }

/* החזר כספי: עסקה מהיום (לפני השידור) מבטלים בלי עלות. אחרת זיכוי (מלא או חלקי) */
async function refund(tid, amount, full) {
  tid = String(tid || '').replace(/\D/g, ''); if (!tid) throw new Error('אין מזהה עסקה של נדרים פלוס להזמנה הזאת');
  if (full) {
    const c = await m3('DeletedAllowedTransaction', { TransactionId: tid });
    if (c.text && /בוטלה בהצלחה/.test(c.text)) return { via: 'nedarim', how: 'cancel' };
    if (c.text && !/שודרה/.test(c.text)) throw new Error(c.text.slice(0, 160));
  }
  const r = await m3('RefundTransaction', { TransactionId: tid, RefundAmount: full ? 'Full' : (Math.round(amount * 100) / 100).toFixed(2), AjaxId: String(Date.now()) });
  if (r.Result === 'OK') return { via: 'nedarim', how: 'refund' };
  throw new Error(String(r.Message || r.text || 'הזיכוי נכשל').slice(0, 160));
}

/* קישור לקבלה שנדרים הפיקו לעסקה */
async function receipt(tid) {
  tid = String(tid || '').replace(/\D/g, ''); if (!tid) return null;
  const r = await call(T3, { Action: 'ShowInvoice', MosadId: env('NEDARIM_MOSAD'), ApiPassword: env('NEDARIM_API_PASSWORD'), TransactionId: tid });
  return r.Result === 'OK' && /^https?:\/\//.test(String(r.Message || '')) ? r.Message : null;
}

/* קישור ללקוח לעדכון כרטיס בהוראת קבע (תקף 14 יום) */
async function updateLink(kid) {
  const r = await m3('CreateKevaUpdateLink', { KevaId: String(kid) });
  return r.Result === 'OK' ? r.Link : null;
}

/* ביט: יצירת בקשה (מחזירה קישור), ובדיקת מצב */
async function bitCreate(o) {
  const r = await call(BIT, { Action: 'CreateTransaction', MosadId: env('NEDARIM_MOSAD'), ApiValid: env('NEDARIM_API_VALID'), Zeout: '', ClientName: String(o.name || '').slice(0, 50), Street: '', City: '', Phone: String(o.phone || '').replace(/\D/g, '').slice(0, 20), Mail: String(o.mail || '').slice(0, 50),
    Amount: String(o.amount), Groupe: env('NEDARIM_GROUPE') || '', Comment: String(o.comment || '').slice(0, 300), Param2: o.ref, UrlSuccess: o.back || '', UrlFailure: o.back || '', CallBack: o.callback || '', Currency: '1', Tashlumim: '1' }, 'POST');
  if (r.Status !== 'OK') throw new Error(String(r.Message || r.text || 'ביט לא זמין').slice(0, 160));
  return { link: r.Message, pre: String(r.PreTransactionId || ''), direct: r.DirectLink || '' };
}
async function bitCheck(pre) {
  const r = await call(BIT, { Action: 'CheckTransaction', MosadId: env('NEDARIM_MOSAD'), TransactionId: String(pre) });
  return { ok: r.Status === 'OK', tid: r.Status === 'OK' ? String(r.Message || '') : '', msg: String(r.Message || r.text || '') };
}

/* חתימת HMAC על עדכון (X-Nedarim-Signature). null = אין חתימה בבקשה (אז בודקים לפי כתובת IP) */
function verify(req) {
  const sec = env('NEDARIM_WEBHOOK_SECRET'), sig = String(req.headers['x-nedarim-signature'] || '').replace(/^v1=/, ''), ts = String(req.headers['x-nedarim-timestamp'] || '');
  if (!sig || !sec || req.rawBody == null) return null;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false;
  const exp = crypto.createHmac('sha256', sec).update(ts + '.' + req.rawBody).digest('hex');
  return exp.length === sig.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig));
}

/* חיבור כתובת עדכוני הסירובים של המוסד לאתר (מכפתור בניהול) */
async function setSiruvHook(url) { return m3('SetWebhook', { Type: 'Siruv', Url: url, Force: '1' }); }
async function hooks() { return m3('GetWebhook', {}); }

module.exports = { ready, apiReady, mosad, bitOn, refund, receipt, updateLink, bitCreate, bitCheck, verify, setSiruvHook, hooks, m3 };
