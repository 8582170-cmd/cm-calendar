/* שליחת SMS (רק בארץ). כללי לכל ספק שיש לו API פשוט דרך כתובת אינטרנט:
   SMS_URL     כתובת עם {to} {msg} {from}, למשל: https://api.provider.co.il/send?user=U&pass=P&to={to}&text={msg}&from={from}
   SMS_METHOD  GET (ברירת מחדל) או POST
   SMS_BODY    (ל-POST) גוף הבקשה עם אותם משתנים, למשל JSON או XML של הספק
   SMS_TYPE    (ל-POST) סוג התוכן, למשל application/json
   SMS_FROM    שם השולח (עד 11 תווים באנגלית, למשל MyLuach), אחרי אישור אצל הספק
   SMS_OK      (לא חובה) ביטוי שחייב להופיע בתשובה של הספק כשהשליחה הצליחה
   הטלפון נשלח בפורמט בינלאומי (9725XXXXXXXX). אם הספק רוצה 05XXXXXXXX: SMS_LOCAL=1 */
'use strict';
const { env } = require('./_lib');
/* בלי SMS_URL: שולחים דרך ימות המשיח (SendSms, 0.1 יחידה לכל 70 תווים), עם הטוקן מהגדרות התזכורות הקוליות */
const urlReady = () => /^https:\/\//.test(env('SMS_URL') || '');
async function ready() { if (urlReady()) return true; try { const c = await require('./_voice').cfg(); return !!c.token; } catch (e) { return false; } }
async function yemot(phone, text) {
  let p = String(phone || '').replace(/[^\d]/g, ''); if (p.startsWith('972')) p = '0' + p.slice(3); if (!/^05\d{8}$/.test(p)) throw new Error('phone');
  const c = await require('./_voice').cfg(), from = env('SMS_FROM') || c.smsFrom || '';
  const body = new URLSearchParams({ token: c.token, phones: p, message: text, ...(from ? { from } : {}) });
  const r = await fetch(String(c.base || 'https://www.call2all.co.il/ym/api/').replace(/\/?$/, '/') + 'SendSms', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), signal: AbortSignal.timeout(15000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j || j.responseStatus !== 'OK') throw new Error('sms ' + t.slice(0, 100));
  if (j.errors && Object.keys(j.errors).length && !(j.oks || []).length) throw new Error('sms rejected ' + JSON.stringify(j.errors).slice(0, 80));
  return true;
}
function intl(p) { p = String(p || '').replace(/[^\d]/g, ''); if (p.startsWith('972')) p = '0' + p.slice(3); if (!/^05\d{8}$/.test(p)) throw new Error('phone'); return env('SMS_LOCAL') === '1' ? p : '972' + p.slice(1); }
async function send(phone, text) {
  if (!urlReady()) return yemot(phone, text);
  const to = intl(phone), from = env('SMS_FROM') || 'MyLuach', enc = encodeURIComponent;
  const fillU = t => t.replace(/\{to\}/g, enc(to)).replace(/\{msg\}/g, enc(text)).replace(/\{from\}/g, enc(from));
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fillB = t => t.replace(/\{to\}/g, to).replace(/\{msg\}/g, /json/.test(env('SMS_TYPE') || '') ? JSON.stringify(text).slice(1, -1) : esc(text)).replace(/\{from\}/g, from);
  const post = (env('SMS_METHOD') || 'GET').toUpperCase() === 'POST';
  const r = await fetch(fillU(env('SMS_URL')), post ? { method: 'POST', headers: { 'Content-Type': env('SMS_TYPE') || 'application/x-www-form-urlencoded' }, body: fillB(env('SMS_BODY') || '') , signal: AbortSignal.timeout(15000) } : { signal: AbortSignal.timeout(15000) });
  const t = await r.text().catch(() => '');
  if (!r.ok) throw new Error('sms ' + r.status + ' ' + t.slice(0, 80));
  if (env('SMS_OK') && !new RegExp(env('SMS_OK')).test(t)) throw new Error('sms rejected ' + t.slice(0, 80));
  return true;
}
module.exports = { ready, send };
