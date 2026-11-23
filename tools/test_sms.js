/* ניתוב SMS: ישראלי דרך ימות/ספק מקומי, זר דרך Plivo */
const assert = require('assert'), path = require('path');
const ENV = {}; const f = require.resolve('../api/_lib.js');
require.cache[f] = { id: f, filename: f, loaded: true, exports: { env: k => ENV[k] || '' } };
const voice = require.resolve('../api/_voice.js'); require.cache[voice] = { id: voice, filename: voice, loaded: true, exports: { cfg: async () => ({ token: 'YT', base: 'https://www.call2all.co.il/ym/api/' }) } };
const S = require('../api/_sms.js'); const calls = [];
global.fetch = async (u, o) => { calls.push([u, o]); if (/call2all/.test(u)) return { ok: true, text: async () => JSON.stringify({ responseStatus: 'OK', oks: ['x'] }) }; return { ok: true, status: 202, text: async () => JSON.stringify({ message: 'message(s) queued', message_uuid: ['u1'] }) }; };
(async () => {
  assert.deepStrictEqual(S.route('050-1234567'), { il: true }); assert.deepStrictEqual(S.route('+972501234567'), { il: true }); assert.deepStrictEqual(S.route('00972501234567'), { il: true });
  assert.deepStrictEqual(S.route('+1 (415) 555-1234'), { il: false, e164: '+14155551234' }); assert.deepStrictEqual(S.route('0044 7700 900123'), { il: false, e164: '+447700900123' });
  assert.throws(() => S.route('+12'), /phone/);
  await S.send('0501234567', 'שלום'); assert.ok(/call2all/.test(calls[0][0]), 'ישראלי: ימות');
  await assert.rejects(() => S.send('+447700900123', 'hi'), /plivo not set/);
  ENV.PLIVO_AUTH_ID = 'AID'; ENV.PLIVO_AUTH_TOKEN = 'TOK'; ENV.PLIVO_FROM = 'MyLuach';
  await S.send('+447700900123', 'hi'); const c = calls[calls.length - 1]; assert.strictEqual(c[0], 'https://api.plivo.com/v1/Account/AID/Message/'); const b = JSON.parse(c[1].body); assert.deepStrictEqual(b, { src: 'MyLuach', dst: '447700900123', text: 'hi' }); assert.ok(c[1].headers.Authorization.startsWith('Basic '));
  await assert.rejects(() => S.send('+14155551234', 'hi'), /no sender for US/); ENV.PLIVO_FROM_US = '+12025550000'; await S.send('+14155551234', 'hi'); assert.strictEqual(JSON.parse(calls[calls.length - 1][1].body).src, '+12025550000');
  global.fetch = async () => ({ ok: false, status: 401, text: async () => '{"error":"auth"}' }); await assert.rejects(() => S.send('+447700900123', 'hi'), /plivo 401/);
  console.log('בדיקות SMS עברו');
})().catch(e => { console.error(e); process.exit(1); });
