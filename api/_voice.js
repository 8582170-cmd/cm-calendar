/* שליחת SMS ושיחות קוליות (הקראת טקסט) דרך ימות המשיח.
   ההגדרות נקבעות בדף הניהול (טבלת settings, מפתח 'voice'); משתני סביבה YEMOT_TOKEN / YEMOT_CALLER_ID הם גיבוי.
   שמות הפעולות והפרמטרים ניתנים לשינוי בדף הניהול, אם בממשק של ימות המשיח הם שונים. */
'use strict';
const { env, loadSetting } = require('./_lib');
const DEF = { enabled: false, token: '', callerId: '', smsFrom: '', base: 'https://www.call2all.co.il/ym/api/',
  smsMethod: 'SendSms', smsPhones: 'phones', smsText: 'message', smsFromParam: 'from',
  ttsMethod: 'SendTTS', ttsPhones: 'phones', ttsText: 'ttsMessage', ttsCallerParam: 'callerId',
  codeVia: 'both', max: 50,
  codeSms: 'MyLuach: קוד האימות שלכם הוא {code}',
  codeCall: 'קוד האימות שלכם למיי לוח הוא: {code}. חוזר: {code}',
  remCall: 'שלום, זוהי תזכורת ממיי לוח. {name}, {when}, יום {weekday}, {hebdate}. חוזר: {name}, {when}.' };
let C = null, CT = 0;
async function cfg() {
  if (C && Date.now() - CT < 30000) return C;
  const s = await loadSetting('voice');
  C = { ...DEF, ...s, token: s.token || env('YEMOT_TOKEN'), callerId: s.callerId || env('YEMOT_CALLER_ID') };
  if (!s.token && env('YEMOT_TOKEN') && s.enabled === undefined) C.enabled = true;
  CT = Date.now(); return C;
}
async function ready() { const c = await cfg(); return !!(c.enabled && c.token); }
function normPhone(p) {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4); else if (d.startsWith('972')) d = '0' + d.slice(3);
  return /^0(5\d|7\d|[2-489])\d{7}$/.test(d) ? d : null;
}
const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : '');
async function call(method, params) {
  const c = await cfg();
  const q = new URLSearchParams({ token: c.token, ...params });
  const r = await fetch(c.base.replace(/\/?$/, '/') + method + '?' + q.toString());
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok || !j || (j.responseStatus && j.responseStatus !== 'OK')) throw new Error('yemot ' + method + ' ' + r.status + ' ' + t.slice(0, 200));
  return j;
}
async function sendSms(phone, message) {
  const c = await cfg(); const p = { [c.smsPhones]: phone, [c.smsText]: message };
  if (c.smsFrom) p[c.smsFromParam] = c.smsFrom;
  return call(c.smsMethod, p);
}
async function callTTS(phone, text) {
  const c = await cfg(); const p = { [c.ttsPhones]: phone, [c.ttsText]: text };
  if (c.callerId) p[c.ttsCallerParam] = c.callerId;
  return call(c.ttsMethod, p);
}
module.exports = { DEF, cfg, ready, normPhone, fill, sendSms, callTTS, clearCache: () => { C = null; } };
