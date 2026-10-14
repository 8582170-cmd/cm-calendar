/* שליחת SMS ושיחות קוליות (הקראת טקסט) דרך ימות המשיח.
   משתני סביבה: YEMOT_TOKEN ("מספר_מערכת:סיסמה" או טוקן), YEMOT_CALLER_ID (אופציונלי: המספר שיוצג).
   הפרמטרים לפי ממשק ה-API של ימות המשיח; אם הם שונים במערכת שלכם, משנים רק כאן. */
'use strict';
const { env } = require('./_lib');
const BASE = 'https://www.call2all.co.il/ym/api/';
const ready = () => !!env('YEMOT_TOKEN');
/* מספר ישראלי בפורמט 05XXXXXXXX */
function normPhone(p) {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4); else if (d.startsWith('972')) d = '0' + d.slice(3);
  return /^0(5\d|7\d|[2-489])\d{7}$/.test(d) ? d : null;
}
async function call(method, params) {
  const q = new URLSearchParams({ token: env('YEMOT_TOKEN'), ...params });
  const r = await fetch(BASE + method + '?' + q.toString());
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok || !j || (j.responseStatus && j.responseStatus !== 'OK')) throw new Error('yemot ' + method + ' ' + r.status + ' ' + t.slice(0, 200));
  return j;
}
async function sendSms(phone, message) {
  return call('SendSms', { phones: phone, message, ...(env('YEMOT_CALLER_ID') ? { from: env('YEMOT_CALLER_ID') } : {}) });
}
async function callTTS(phone, text) {
  return call('SendTTS', { phones: phone, ttsMessage: text, ...(env('YEMOT_CALLER_ID') ? { callerId: env('YEMOT_CALLER_ID') } : {}) });
}
module.exports = { ready, normPhone, sendSms, callTTS };
