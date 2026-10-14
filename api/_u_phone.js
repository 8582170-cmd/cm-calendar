/* אימות מספר טלפון לתזכורות קוליות: שולחים קוד ב-SMS (או בשיחה), והמשתמש מקליד אותו */
'use strict';
const crypto = require('crypto');
const { db, readBody, json, getUser, upsertProfile } = require('./_lib');
const { ready, cfg, fill, normPhone, sendSms, callTTS } = require('./_voice');
const H = s => crypto.createHash('sha256').update(String(s)).digest('hex');
module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'login' });
  try {
    if (req.method === 'GET') {
      const p = await db('profiles?user_id=eq.' + user.id + '&select=phone,phone_verified_at');
      const r = p && p[0];
      const c = await cfg();
      return json(res, 200, { phone: r && r.phone_verified_at ? r.phone : null, ready: await ready(), via: c.codeVia, max: c.max });
    }
    const b = readBody(req);
    if (b.action === 'send') {
      if (!(await ready())) return json(res, 503, { error: 'not configured' });
      const c = await cfg();
      const phone = normPhone(b.phone); if (!phone) return json(res, 400, { error: 'phone' });
      const since = new Date(Date.now() - 3600e3).toISOString();
      const recent = await db('phone_codes?user_id=eq.' + user.id + '&created_at=gte.' + encodeURIComponent(since) + '&select=id');
      if ((recent || []).length >= 5) return json(res, 429, { error: 'too many' });
      const code = String(crypto.randomInt(100000, 1000000));
      await db('phone_codes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, phone, code_hash: H(user.id + code) }) });
      const via = c.codeVia === 'sms' ? 'sms' : c.codeVia === 'call' ? 'call' : (b.via === 'call' ? 'call' : 'sms');
      if (via === 'call') await callTTS(phone, fill(c.codeCall, { code: code.split('').join(' ') }));
      else await sendSms(phone, fill(c.codeSms, { code }));
      return json(res, 200, { ok: true, phone });
    }
    if (b.action === 'check') {
      const rows = await db('phone_codes?user_id=eq.' + user.id + '&order=created_at.desc&limit=1&select=id,phone,code_hash,tries,created_at');
      const r = rows && rows[0];
      if (!r || Date.now() - new Date(r.created_at) > 15 * 60e3) return json(res, 400, { error: 'expired' });
      if (r.tries >= 5) return json(res, 429, { error: 'too many' });
      if (H(user.id + String(b.code || '').trim()) !== r.code_hash) {
        await db('phone_codes?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ tries: r.tries + 1 }) });
        return json(res, 400, { error: 'code' });
      }
      await upsertProfile(user, { phone: r.phone, phone_verified_at: new Date().toISOString() });
      return json(res, 200, { ok: true, phone: r.phone });
    }
    json(res, 400, { error: 'action' });
  } catch (e) { console.error('phone', e); json(res, 500, { error: 'server error' }); }
};
