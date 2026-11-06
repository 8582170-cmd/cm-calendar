/* הזמנות בהודעה קולית דרך ימות המשיח (קמפיינים), ואישור הגעה בהקשה דרך שלוחת API.
   הטוקן, הכתובת והזיהוי היוצא: מהגדרות ימות הקיימות בניהול (מפתח 'voice', דרך _voice.cfg).
   הגדרות הקמפיין (בניהול, דף הזמנה לאירוע): voiceTpl = מזהה תבנית להזמנות (הקשה 1 מעבירה לשלוחת ה-API),
   voiceTplRem = תבנית לתזכורות (לא חובה), vkey = סוד שמוגדר בשלוחת ה-API (api_add_0=k=...) */
'use strict';
const V = () => require('./_voice'), EP = () => require('./_eventpay');
/* tpl: האם יש תבנית קמפיין (נדרשת להזמנה עם הקשה). תזכורת נשלחת ב-SendTTS ולא צריכה תבנית */
async function ready(tpl) { try { const c = await V().cfg(), P = await EP().prices(); return !!(c.token && (!tpl || P.voiceTpl || P.voicePath)); } catch (e) { return false; } }
async function yem(method, params) {
  const c = await V().cfg(), body = new URLSearchParams({ token: c.token || '', ...params });
  const r = await fetch(String(c.base || 'https://www.call2all.co.il/ym/api/').replace(/\/?$/, '/') + method, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), signal: AbortSignal.timeout(25000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j) throw new Error('yemot ' + r.status + ' ' + t.slice(0, 120));
  if (j.responseStatus && j.responseStatus !== 'OK') { const e = new Error(String(j.message || j.responseStatus).slice(0, 160)); e.code = j.messageCode || j.code; throw e; }
  return j;
}
/* טקסט להקראה: בלי תווים שיש להם משמעות בתשובות של ימות */
const tts = s => String(s || '').replace(/[.=&"<>]/g, ',').replace(/[״׳'`]/g, '').replace(/\s+/g, ' ').trim();
const phone = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0\d{8,9}$/.test(v) ? v : ''; };
/* תאריך לקריאה: יום בשבוע, תאריך עברי ושעה */
function whenSay(c) {
  try { const d = new Date(c.d + 'T12:00:00Z'), wd = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' }).format(d);
    const p = {}; new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return wd + ', ' + p.day + ' ב' + p.month + (c.h ? ', בשעה ' + c.h : ''); } catch (e) { return c.d || ''; }
}
/* הנוסח הרגיל של ההודעה הקולית. אפשר לשנות אותו בניהול האירועים (eventpay.vtxt). {שם} מתמלא בשם המוזמן בזמן השליחה */
const VTXT = { inv: 'שלום {שם}. הנכם מוזמנים {לאירוע}, {מתי}{מקום}. למענה על ההזמנה, הקישו 1.',
  ivr: 'שלום {שם}. הנכם מוזמנים {לאירוע}, {מתי}{מקום}.',
  rem: 'שלום. תזכורת: {אירוע}, {מתי}{מקום}. נשמח לראותכם בשמחתנו.' };
function defText(c, mode, E) {
  const where = [c.venue, c.addr].filter(Boolean).join(', ');
  const t = c.t || 'האירוע', toT = /^ה/.test(t) ? 'ל' + t.slice(1) : 'ל' + t;
  const m = mode === 'rem' || mode === 'ivr' ? mode : 'inv';
  const own = E && E.vtxt && String(E.vtxt[m] || '').trim();
  const V = { 'אירוע': t, 'לאירוע': toT, 'מתי': whenSay(c), 'מקום': where ? ', ב' + where : '' };
  return (own || VTXT[m]).replace(/\{(אירוע|לאירוע|מתי|מקום)\}/g, (x, k) => V[k]);
}
/* הפעלת קמפיין לרשימה: list = [{phone, name}] */
async function run(cur, list, mode, text) {
  const c = cur.cfg || {}, E = await EP().prices(), T = String(text || '').trim() || defText(c, mode, E), P = {};
  const direct = E.voiceDirect && mode !== 'rem';
  if (E.voicePath && mode !== 'rem') return bridge(list, E.voicePath);
  list.forEach(r => { const p = phone(r.phone); if (p && !P[p]) P[p] = direct ? { name: String(r.name || '').slice(0, 40) } : { name: String(r.name || '').slice(0, 40), text: tts(T.replace(/\{(שם|name)\}/g, r.name || '')) }; });
  const n = Object.keys(P).length; if (!n) throw new Error('no phones');
  const vc = await V().cfg(), tpl = mode === 'rem' ? (E.voiceTplRem || E.voiceTpl) : E.voiceTpl;
  const j = await yem('RunCampaign', { templateId: String(tpl), phones: JSON.stringify(P), ...(direct ? {} : { ttsMode: '1' }), ...(vc.callerId ? { callerId: vc.callerId } : {}) });
  return { id: j.campaignId, n, price: j.estimatedPrice, units: j.customerUnits };
}
/* קמפיין שנכנס לשלוחה (CallExtensionBridging): מי שעונה נכנס ישר לשלוחת ה-API ושומע את ההזמנה משם. עד 500 מספרים לקריאה */
async function bridge(list, path) {
  const ph = [...new Set(list.map(r => phone(r.phone)).filter(Boolean))]; if (!ph.length) throw new Error('no phones');
  const vc = await V().cfg(), ids = [];
  for (let i = 0; i < ph.length; i += 500) { const j = await yem('CallExtensionBridging', { phones: ph.slice(i, i + 500).join(':'), ivrPath: 'ivr2:/' + path, ...(vc.callerId ? { callerId: vc.callerId } : {}) }); ids.push(j.campaignId || ''); }
  return { id: ids[0], ids, n: ph.length, bridge: 1 };
}
/* שליחת טקסט ישירות (SendTTS): אותו טקסט לכולם, בלי תבנית. הסטטוסים חוזרים בזמן אמת ל-callbackUrl (עד 500 מספרים) */
async function sendTTS(list, text, cb) {
  const ph = [...new Set(list.map(r => phone(r.phone)).filter(Boolean))]; if (!ph.length) throw new Error('no phones');
  const vc = await V().cfg(), T = tts(String(text || '').replace(/\{(שם|name)\}/g, '').replace(/\s+,/g, ','));
  const j = await yem('SendTTS', { ttsMessage: T, phones: ph.join(':'), ...(vc.callerId ? { callerId: vc.callerId } : {}), ...(cb && ph.length <= 500 ? { callbackUrl: cb } : {}) });
  return { id: j.CampaignId || j.campaignId || '', n: ph.length, price: j.billing };
}
const ST = { done: 'ענה', bridged: 'ענה', accepted: 'ענה', up: 'בשיחה', no_answer: 'לא ענה', busy: 'תפוס', amd: 'תא קולי', failed: 'נכשל', error: 'נכשל', canceled: 'בוטל', blocked: 'חסום', remove_request: 'ביקש הסרה', pending: 'ממתין', ringing: 'מחייג', redial: 'חיוג חוזר' };
async function status(id) { const j = await yem('GetCampaignStatus', { campaignId: id, entries: 'all' }); const c = j.campaign || {}; return { st: c.campaignStatus, price: c.currentPrice, entries: (c.entries || []).map(e => ({ phone: phone(e.phone), st: ST[e.entryStatus] || e.entryStatus })) }; }
module.exports = { ready, yem, run, sendTTS, status, defText, VTXT, tts, phone, whenSay };
