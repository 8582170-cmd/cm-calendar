/* הרשמה לתזכורת במייל מהלוח המקוון. מייל חדש מקבל קודם מייל אישור (כדי שלא ירשמו כתובת של מישהו אחר). */
'use strict';
const crypto = require('node:crypto');
const { env, db, readBody, json, getUser } = require('./_lib');
const { sendMail, frame, escH } = require('./_mail');

const okRule = r => r && ['heb', 'greg', 'monthly', 'once'].includes(r.rec) && (r.rec === 'once' ? /^\d{4}-\d{2}-\d{2}$/.test(r.date) : +r.d >= 1 && +r.d <= 31 && (r.rec === 'monthly' || (+r.m >= 1 && +r.m <= 13)));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const b = readBody(req);
    /* משתמש מחובר שמבקש למייל של החשבון: מופעל מיד. גולש לא מחובר, או מייל אחר: נשלח קודם מייל אישור
       (כל תזכורת חדשה כזאת דורשת אישור) */
    const user = await getUser(req).catch(() => null);
    const email = String(b.email || (user && user.email) || '').trim().toLowerCase().slice(0, 200);
    const own = !!(user && user.email && user.email.toLowerCase() === email);
    const name = String(b.name || '').trim().slice(0, 120);
    const rule = b.rule || {};
    const notice = (Array.isArray(b.notice) ? b.notice : [1]).map(Number).filter(n => [0, 1, 2, 3, 7, 14, 30].includes(n)).slice(0, 4);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'email' });
    if (!name || !okRule(rule) || !notice.length) return json(res, 400, { error: 'bad reminder' });
    const cleanRule = { rec: rule.rec, d: +rule.d || null, m: +rule.m || null, date: rule.rec === 'once' ? rule.date : null, ...(/^\/t\/[a-z0-9-]{3,40}$/.test(String(rule.url || '')) ? { url: rule.url } : {}) };
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

    /* עדכון תזכורת קיימת (עם האסימון שלה) */
    const tok = String(b.token || '');
    if (/^[0-9a-f]{32}$/.test(tok)) {
      const rows = await db('reminders?token=eq.' + tok + '&select=id,email,status');
      if (rows && rows[0] && rows[0].email === email) {
        await db('reminders?token=eq.' + tok, { method: 'PATCH', body: JSON.stringify({ name, rule: cleanRule, notice, lang: b.lang === 'en' ? 'en' : 'he' }) });
        return json(res, 200, { token: tok, status: rows[0].status });
      }
    }
    /* הגבלות נגד ניצול */
    const mine = await db('reminders?email=eq.' + encodeURIComponent(email) + '&select=status,created_at&order=created_at.desc&limit=200');
    if ((mine || []).filter(r => r.status !== 'off').length >= 100) return json(res, 429, { error: 'too many' });
    const confirmed = own;
    if (!confirmed) { /* נגד שליחת מיילי אישור בהמוניהם מאותו מחשב */
      const ip = (require('./_lib').reqMeta(req) || {}).ip;
      if (ip) { try { const n = await db('reminders?select=id&status=eq.pending&ip=eq.' + encodeURIComponent(ip) + '&created_at=gte.' + encodeURIComponent(new Date(Date.now() - 3600e3).toISOString()) + '&limit=20'); if ((n || []).length >= 8) return json(res, 429, { error: 'too many' }); } catch (e) {} }
    }
    const token = crypto.randomBytes(16).toString('hex');
    await db('reminders', { meta: require('./_lib').reqMeta(req), method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email, name, rule: cleanRule, notice, lang: b.lang === 'en' ? 'en' : 'he', status: confirmed ? 'active' : 'pending', token }) });
    if (!confirmed) {
      const recent = (mine || []).find(r => r.status === 'pending' && Date.now() - new Date(r.created_at) < 10 * 60000);
      if (!recent) {
        const url = site + '/api/rem-confirm?t=' + token;
        await require('./_paid').send('remconfirm', email, { 'שם': name }, { url, text: url }, 'confirm');
      }
    }
    json(res, 200, { token, email, status: confirmed ? 'active' : 'pending' });
  } catch (e) {
    console.error('rem-subscribe', e);
    json(res, 500, { error: 'server error' });
  }
};
