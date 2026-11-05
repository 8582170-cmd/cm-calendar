/* תחזית בניהול: כמה מיילים (ושיחות טלפון) צפויים לצאת בכל יום בימים הקרובים, לפי אותו היגיון של המשימה היומית:
   בשבת ובחג לא יוצא כלום, ובערב שבת/חג יוצא גם מה שהיה אמור לצאת בשבת ובחג.
   תזכורות: לפי הכלל וימי ההתראה. פגישות: מייל אחד למשתמש ביום. הזמנות לאירועים: מה שבתור עכשיו. */
'use strict';
const { db } = require('./_lib');
const { hits, todayIL, addD, iso } = require('./_rem');
const { isHoly } = require('./_shabbat');
async function plan(D) {
  D = Math.max(1, Math.min(31, +D || 14));
  const today = todayIL(), holy = {};
  for (let k = 0; k <= D + 4; k++) holy[k] = await isHoly(addD(today, k), true, true).catch(() => false);
  const [rem, voice, ap, invQ, invNew] = await Promise.all([
    db('reminders?status=eq.active&select=rule,notice,last_sent&limit=20000').catch(() => []),
    db('voice_reminders?status=eq.active&select=rule,notice,last_sent&limit=5000').catch(() => []),
    db('appointments?notify=neq.none&date=gte.' + iso(today) + '&date=lte.' + iso(addD(today, D + 5)) + '&select=email,date,notify,last_sent&limit=20000').catch(() => []),
    db('timer_recip?status=eq.queued&select=id&limit=20000').catch(() => null),
    db('timer_recip?status=in.(new,fail)&select=id&limit=20000').catch(() => null)]);
  /* האם תזכורת יוצאת ביום הריצה run (k ימים מהיום) */
  const cache = new Map();
  const hit = async (rule, dayK) => { const key = JSON.stringify(rule) + '|' + dayK; if (cache.has(key)) return cache.get(key); const v = await hits(rule || {}, addD(today, dayK)); cache.set(key, v); return v; };
  const due = async (r, k, cover) => { const N = (r.notice || [1]); for (const c of cover) for (const n of N) if (await hit(r.rule, k + c + n)) return true; return false; };
  const days = [];
  for (let k = 0; k <= D; k++) {
    const d = addD(today, k), row = { date: iso(d), wd: d.getDay(), holy: !!holy[k], rem: 0, voice: 0, appt: 0 };
    if (!holy[k]) {
      const cover = [0]; for (let j = 1; j < 4 && holy[k + j]; j++) cover.push(j);
      for (const r of rem || []) { if (k === 0 && r.last_sent === iso(today)) continue; if (await due(r, k, cover)) row.rem++; }
      for (const r of voice || []) { if (k === 0 && r.last_sent === iso(today)) continue; if (await due(r, k, cover)) row.voice++; }
      const morn = cover.map(c => iso(addD(today, k + c))), before = cover.map(c => iso(addD(today, k + c + 1))), who = new Set();
      for (const a of ap || []) { if (k === 0 && a.last_sent === iso(today)) continue; if ((morn.includes(a.date) && ['morning', 'both'].includes(a.notify)) || (before.includes(a.date) && ['daybefore', 'both'].includes(a.notify))) who.add(a.email); }
      row.appt = who.size;
    }
    days.push(row);
  }
  /* מה נשלח בפועל בשבוע האחרון (לפי יומן המיילים), לפי סוג */
  let past = [];
  try { const since = iso(addD(today, -7)); const L = await db('email_log?ok=eq.true&created_at=gte.' + since + 'T00:00:00%2B02:00&select=kind,created_at&limit=20000');
    const by = {}; (L || []).forEach(x => { const dd = new Date(x.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); (by[dd] = by[dd] || {})[x.kind || 'other'] = (by[dd][x.kind || 'other'] || 0) + 1; });
    past = Object.keys(by).sort().map(k => ({ date: k, kinds: by[k], total: Object.values(by[k]).reduce((a, b) => a + b, 0) })); } catch (e) {}
  return { days, invites: { queued: invQ ? invQ.length : null, waiting: invNew ? invNew.length : null }, capacity: require('./_mail').capacity(), past };
}
module.exports = { plan };
