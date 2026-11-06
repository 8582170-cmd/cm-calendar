/* הזמנות בהודעה קולית דרך ימות המשיח (קמפיינים), ואישור הגעה בהקשה דרך שלוחת API.
   הטוקן, הכתובת והזיהוי היוצא: מהגדרות ימות הקיימות בניהול (מפתח 'voice', דרך _voice.cfg).
   הגדרות הקמפיין (בניהול, דף הזמנה לאירוע): voiceTpl = מזהה תבנית להזמנות (הקשה 1 מעבירה לשלוחת ה-API),
   voiceTplRem = תבנית לתזכורות (לא חובה), vkey = סוד שמוגדר בשלוחת ה-API (api_add_0=k=...) */
'use strict';
const V = () => require('./_voice'), EP = () => require('./_eventpay');
async function ready() { try { const c = await V().cfg(), P = await EP().prices(); return !!(c.token && P.voiceTpl); } catch (e) { return false; } }
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
function defText(c, mode) {
  const where = [c.venue, c.addr].filter(Boolean).join(', ');
  const t = c.t || 'האירוע', toT = /^ה/.test(t) ? 'ל' + t.slice(1) : 'ל' + t;
  if (mode === 'rem') return 'שלום {שם}. תזכורת: ' + t + ', ' + whenSay(c) + (where ? ', ב' + where : '') + '. נשמח לראותכם בשמחתנו.';
  return 'שלום {שם}. הנכם מוזמנים ' + toT + ', ' + whenSay(c) + (where ? ', ב' + where : '') + '. למענה על ההזמנה, הקישו 1.';
}
/* הפעלת קמפיין לרשימה: list = [{phone, name}] */
async function run(cur, list, mode, text) {
  const c = cur.cfg || {}, T = String(text || '').trim() || defText(c, mode), P = {};
  list.forEach(r => { const p = phone(r.phone); if (p && !P[p]) P[p] = { name: String(r.name || '').slice(0, 40), text: tts(T.replace(/\{(שם|name)\}/g, r.name || '')) }; });
  const n = Object.keys(P).length; if (!n) throw new Error('no phones');
  const E = await EP().prices(), vc = await V().cfg(), tpl = mode === 'rem' ? (E.voiceTplRem || E.voiceTpl) : E.voiceTpl;
  const j = await yem('RunCampaign', { templateId: String(tpl), phones: JSON.stringify(P), ttsMode: '1', ...(vc.callerId ? { callerId: vc.callerId } : {}) });
  return { id: j.campaignId, n, price: j.estimatedPrice, units: j.customerUnits };
}
const ST = { done: 'ענה', bridged: 'ענה', accepted: 'ענה', up: 'בשיחה', no_answer: 'לא ענה', busy: 'תפוס', amd: 'תא קולי', failed: 'נכשל', error: 'נכשל', canceled: 'בוטל', blocked: 'חסום', remove_request: 'ביקש הסרה', pending: 'ממתין', ringing: 'מחייג', redial: 'חיוג חוזר' };
async function status(id) { const j = await yem('GetCampaignStatus', { campaignId: id, entries: 'all' }); const c = j.campaign || {}; return { st: c.campaignStatus, price: c.currentPrice, entries: (c.entries || []).map(e => ({ phone: phone(e.phone), st: ST[e.entryStatus] || e.entryStatus })) }; }
module.exports = { ready, yem, run, status, defText, tts, phone, whenSay };
