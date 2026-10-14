/* רץ פעם ביום (Vercel Cron, vercel.json): שולח את התזכורות של היום.
   מוגן ב-CRON_SECRET (Vercel שולח אותו אוטומטית בכותרת Authorization). */
'use strict';
const { env, db, json } = require('./_lib');
const { sendMail, frame, escH } = require('./_mail');
const { hits, hebStr, todayIL, addD, iso } = require('./_rem');
const voice = require('./_voice');

const G_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const when = n => n === 0 ? 'היום' : n === 1 ? 'מחר' : n === 2 ? 'מחרתיים' : n === 7 ? 'בעוד שבוע' : 'בעוד ' + n + ' ימים';

module.exports = async (req, res) => {
  const secret = env('CRON_SECRET');
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return json(res, 401, { error: 'unauthorized' });
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  const today = todayIL(), tIso = iso(today);
  let sent = 0, failed = 0, checked = 0;
  try {
    for (let from = 0; ; from += 1000) {
      const rows = await db('reminders?status=eq.active&select=id,email,name,rule,notice,token,last_sent&order=id&offset=' + from + '&limit=1000');
      if (!rows || !rows.length) break;
      for (const r of rows) {
        checked++;
        if (r.last_sent === tIso) continue;
        let hitN = null;
        for (const n of (r.notice || [1]).slice().sort((a, b) => a - b)) { if (await hits(r.rule || {}, addD(today, n))) { hitN = n; break; } }
        if (hitN === null) continue;
        const day = addD(today, hitN), heb = await hebStr(day);
        const gStr = day.getDate() + ' ב' + G_MONTHS[day.getMonth()] + ' ' + day.getFullYear();
        const off = site + '/api/rem-confirm?t=' + r.token + '&off=1';
        const subject = 'תזכורת: ' + r.name + ' ' + when(hitN);
        try {
          await sendMail({ to: r.email, subject,
            html: frame({ title: escH(r.name), body: '<b>' + when(hitN) + '</b>, יום ' + WD[day.getDay()] + '<br>' + escH(heb) + ' · ' + gStr, button: 'ללוח השנה', url: site + '/online/', foot: 'קיבלתם את המייל כי ביקשתם תזכורת בלוח השנה של MyLuach. <a href="' + off + '" style="color:#6b7679">להפסקת התזכורת</a>' }),
            text: r.name + ' ' + when(hitN) + ' (' + heb + ', ' + gStr + ').\nלהפסקת התזכורת: ' + off,
            headers: { 'List-Unsubscribe': '<' + off + '>' } }, 'reminder');
          await db('reminders?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_sent: tIso }) });
          sent++;
        } catch (e) { failed++; console.error('reminder send', r.id, e.message); }
      }
      if (rows.length < 1000) break;
    }
    /* תזכורות קוליות בטלפון (אם ימות המשיח מוגדר) */
    let vsent = 0, vfailed = 0;
    if (await voice.ready()) {
      const vc = await voice.cfg();
      const vr = await db('voice_reminders?status=eq.active&select=id,phone,name,rule,notice,last_sent&order=id&limit=5000').catch(() => []);
      for (const r of vr || []) {
        if (r.last_sent === tIso) continue;
        let hitN = null;
        for (const n of (r.notice || [1]).slice().sort((a, b) => a - b)) { if (await hits(r.rule || {}, addD(today, n))) { hitN = n; break; } }
        if (hitN === null) continue;
        const day = addD(today, hitN), heb = await hebStr(day);
        try {
          await voice.callTTS(r.phone, voice.fill(vc.remCall, { name: r.name, when: when(hitN), weekday: WD[day.getDay()], hebdate: heb }));
          await db('voice_reminders?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_sent: tIso }) });
          vsent++;
        } catch (e) { vfailed++; console.error('voice send', r.id, e.message); }
      }
    }
    json(res, 200, { date: tIso, checked, sent, failed, vsent, vfailed });
  } catch (e) {
    console.error('cron', e);
    json(res, 500, { error: 'server error', sent, failed });
  }
};
