/* תזכורות SMS מול תזכורות שיחה: מכסות נפרדות, שיחה רק לישראל, אימות טלפון זר */
const assert = require('assert');
const mock = (rel, exp) => { const f = require.resolve('../' + rel); require.cache[f] = { id: f, filename: f, loaded: true, exports: exp }; };
const T = { voice_reminders: [], profiles: [{ user_id: 'u1', phone: '0501234567', phone_verified_at: 'x' }], phone_codes: [] }; let nid = 1; const sent = [];
let SUBS = { off: true };
mock('api/_lib.js', { db: async (q, o) => { o = o || {}; const [tbl, qs] = q.split('?'); const P = new URLSearchParams(qs || ''); const rows = T[tbl] || (T[tbl] = []);
    const flt = r => [...P.entries()].every(([k, v]) => !/^(select|order|limit)$/.test(k) && /^eq\./.test(v) ? String(r[k]) === v.slice(3) : true);
    if (o.method === 'POST') { const b = JSON.parse(o.body); const r = { id: nid++, status: 'active', ...b }; rows.push(r); return [r]; }
    if (o.method === 'PATCH') { const b = JSON.parse(o.body); rows.filter(flt).forEach(r => Object.assign(r, b)); return []; }
    return rows.filter(flt); },
  readBody: r => r.body, json: (res, st, o) => { res.st = st; res.o = o; }, getUser: async () => ({ id: 'u1', email: 'a@b.c' }), bestPlan: async () => 'full', upsertProfile: async (u, p) => { Object.assign(T.profiles[0], p); }, reqMeta: () => ({}), env: k => process.env[k] || '', loadSetting: async () => ({}) });
mock('api/_voice.js', { cfg: async () => ({ max: 50, codeVia: 'both', codeSms: 'code {code}', codeCall: 'x', remSms: 'r {name}' }), ready: async () => true, normPhone: p => { const d = String(p || '').replace(/[^\d+]/g, '').replace(/^\+?972/, '0'); return /^05\d{8}$/.test(d) ? d : null; }, fill: (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : ''), sendSms: async (p, t) => sent.push(['yemot', p, t]), callTTS: async () => {} });
const SM = require('../api/_sms.js'); // אמיתי, עם מדיה מדומה
mock('api/_subs.js', { remEnt: async () => SUBS });
const V = require('../api/_u_voice.js'), PH = require('../api/_u_phone.js');
const call = async (h, body, method) => { const res = {}; await h({ method: method || 'POST', body, query: {} }, res); return res; };
const rule = { rec: 'once', date: '2027-01-01' };
(async () => {
  let r = await call(V, { name: 'א', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 503, 'SMS לא מוכן (אין ספק)');
  SM.ready = async () => true;
  r = await call(V, { name: 'א', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 200); assert.strictEqual(T.voice_reminders[0].channel, 'sms');
  r = await call(V, { name: 'ב', rule, notice: [1] }); assert.strictEqual(r.st, 200); assert.strictEqual(T.voice_reminders[1].channel, 'call', 'ברירת מחדל שיחה');
  r = await call(V, null, 'GET'); assert.strictEqual(r.o.items.length, 2);
  /* מכסות נפרדות: עם מגבלות פעילות */
  SUBS = { mail: null, voice: 1, sms: 2 };
  r = await call(V, { name: 'ג', rule, notice: [1] }); assert.strictEqual(r.st, 429, 'שיחות: המכסה 1 כבר מלאה'); 
  r = await call(V, { name: 'ג', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 200, 'SMS: מכסה 2, שני במקום ראשון');
  r = await call(V, { name: 'ד', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 429, 'SMS מלא');
  SUBS = { mail: null, voice: 5, sms: 0 }; r = await call(V, { name: 'ה', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 403, 'אין SMS במסלול');
  /* שיחה למספר בינלאומי חסומה, SMS מותר */
  SUBS = { off: true }; T.profiles[0].phone = '+447700900123';
  r = await call(V, { name: 'ו', rule, notice: [1] }); assert.strictEqual(r.st, 400); assert.strictEqual(r.o.error, 'callil');
  r = await call(V, { name: 'ו', rule, notice: [1], channel: 'sms' }); assert.strictEqual(r.st, 200);
  /* אימות טלפון זר: קוד ב-SMS דרך Plivo בלבד */
  const plivoSent = []; global.fetch = async (u, o) => { plivoSent.push([u, JSON.parse(o.body)]); return { ok: true, status: 202, text: async () => '{"message_uuid":["u"]}' }; };
  process.env.PLIVO_AUTH_ID = 'A'; process.env.PLIVO_AUTH_TOKEN = 'T';
  r = await call(PH, { action: 'send', phone: '+44 7700 900123', via: 'call' }); assert.strictEqual(r.st, 200, JSON.stringify(r.o)); assert.strictEqual(r.o.phone, '+447700900123'); assert.ok(/Message/.test(plivoSent[0][0]) && plivoSent[0][1].dst === '447700900123', 'הקוד נשלח ב-SMS גם כשביקשו שיחה');
  r = await call(PH, { action: 'send', phone: '0447700900123' }); assert.strictEqual(r.st, 400, 'בלי + זה לא נחשב מספר זר');
  console.log('בדיקות תזכורות SMS עברו');
})().catch(e => { console.error(e); process.exit(1); });
