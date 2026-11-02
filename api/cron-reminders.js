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
const { isHoly } = require('./_shabbat');

module.exports = async (req, res) => {
  const secret = env('CRON_SECRET');
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return json(res, 401, { error: 'unauthorized' });
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  const today = todayIL(), tIso = iso(today);
  let sent = 0, failed = 0, checked = 0;
  /* שומר שבת: בשבת ובחג לא שולחים כלום. בערב שבת/חג (הריצה בבוקר, לפני 12:00) שולחים גם את מה שהיה אמור לצאת בשבת ובחג */
  if (await isHoly(today, true, true)) return json(res, 200, { date: tIso, skipped: 'shabbat' });
  const days = [0]; for (let k = 1; k < 4 && await isHoly(addD(today, k), true, true); k++) days.push(k);
  /* תזכורת שהייתה אמורה לצאת ביום today+k (k ב-days): המרחק שלה מהיום */
  const dueIn = async (r) => { const N = (r.notice || [1]).slice().sort((a, b) => a - b);
    for (const k of days) for (const n of N) { if (await hits(r.rule || {}, addD(today, k + n))) return k + n; } return null; };
  try {
    for (let from = 0; ; from += 1000) {
      const rows = await db('reminders?status=eq.active&select=id,email,name,rule,notice,token,last_sent&order=id&offset=' + from + '&limit=1000');
      if (!rows || !rows.length) break;
      for (const r of rows) {
        checked++;
        if (r.last_sent === tIso) continue;
        const hitN = await dueIn(r);
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
        const hitN = await dueIn(r);
        if (hitN === null) continue;
        const day = addD(today, hitN), heb = await hebStr(day);
        try {
          await voice.callTTS(r.phone, voice.fill(vc.remCall, { name: r.name, when: when(hitN), weekday: WD[day.getDay()], hebdate: heb }));
          await db('voice_reminders?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_sent: tIso }) });
          vsent++;
        } catch (e) { vfailed++; console.error('voice send', r.id, e.message); }
      }
    }
    /* פגישות: מייל אחד לכל משתמש עם הפגישות של היום (בבוקר) ושל מחר (יום לפני) */
    let asent = 0;
    try {
      /* בבוקר של היום (ושל שבת/חג שאחריו), ויום לפני (כולל מה שאחרי השבת/החג) */
      const morn = days.map(k => iso(addD(today, k))), before = days.map(k => iso(addD(today, k + 1)));
      const all = [...new Set(morn.concat(before))];
      const ap = await db('appointments?notify=neq.none&date=in.(' + all.join(',') + ')&select=id,email,date,start_t,end_t,title,place,notify,last_sent&order=date,start_t&limit=10000');
      const by = {};
      for (const a of ap || []) {
        if (!a.email || a.last_sent === tIso) continue;
        const ok = (morn.includes(a.date) && ['morning', 'both'].includes(a.notify)) || (before.includes(a.date) && ['daybefore', 'both'].includes(a.notify));
        if (!ok) continue;
        (by[a.email] = by[a.email] || []).push(a);
      }
      const rel = ds => { const [y, m, d] = ds.split('-').map(Number), n = Math.round((new Date(y, m - 1, d, 12) - today) / 864e5); return n <= 2 ? when(n) : 'ביום ' + WD[new Date(y, m - 1, d, 12).getDay()]; };
      for (const [email, L] of Object.entries(by)) {
        const line = a => rel(a.date) + (a.start_t ? ' ' + a.start_t + (a.end_t ? '–' + a.end_t : '') : '') + ' · ' + a.title + (a.place ? ' (' + a.place + ')' : '');
        try {
          await sendMail({ to: email, subject: L.length === 1 ? 'תזכורת לפגישה: ' + L[0].title : 'הפגישות שלך: ' + L.length + ' פגישות',
            html: frame({ title: 'הפגישות שלך', body: L.map(a => escH(line(a))).join('<br>'), button: 'ליומן', url: site + '/online/#day', foot: 'קיבלתם את המייל כי ביקשתם תזכורת לפגישה ביומן של MyLuach. אפשר לשנות זאת בעריכת הפגישה.' }),
            text: L.map(line).join('\n') }, 'appointment');
          await db('appointments?id=in.(' + L.map(a => a.id).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_sent: tIso }) });
          asent++;
        } catch (e) { console.error('appt mail', email, e.message); }
      }
    } catch (e) { console.error('appt cron', e.message); }
    /* גיבוי לגוגל שיטס (אם הוגדר) */
    let backup = null; try { backup = await require('./_backup').run(); } catch (e) { backup = { error: String(e.message).slice(0, 120) }; console.error('backup', e.message); }
    /* ניקוי דוגמיות הורדה ישנות */
    let cleaned = 0; try { const cfg = await require('./_lib').loadConfig(); cleaned = await require('./_usage').cleanSamples(cfg.sampleKeepDays == null ? 365 : +cfg.sampleKeepDays); } catch (e) { console.error('clean samples', e.message); }
    try { await require('./_share').clean(); } catch (e) { console.error('clean shares', e.message); }
    /* התראה במייל כש-R2 מגיע ל-80% מה-10GB החינמיים (פעם בחודש לכל היותר). הכתובת: ALERT_EMAIL ב-Vercel */
    try {
      const R2 = require('./_r2'), to = require('./_lib').env('ALERT_EMAIL');
      if (R2.on() && to) {
        const C = await R2.list('cal/'), I = await R2.list('img/'), used = [...C, ...I].reduce((a, f) => a + f.size, 0), LIM = 10 * 1024 ** 3;
        const { loadSetting, saveSetting } = require('./_lib'), mon = tIso.slice(0, 7), last = await loadSetting('r2alert').catch(() => null);
        if (used > LIM * 0.8 && !(last && last.month === mon)) {
          const gb = (used / 1024 ** 3).toFixed(2);
          await sendMail({ to, subject: 'MyLuach: האחסון ב-R2 הגיע ל-' + Math.round(used / LIM * 100) + '%', html: frame({ title: 'האחסון ב-R2 מתמלא', body: 'הלוחות השמורים ב-Cloudflare R2 תופסים ' + gb + 'GB מתוך 10GB החינמיים.<br>אפשר לפנות מקום בדף הניהול (שימוש באחסון ← פינוי מקום עכשיו), או להמשיך: כל GB נוסף עולה בערך 1.5 סנט לחודש.' }), text: 'R2: ' + gb + 'GB / 10GB' }, 'alert');
          await saveSetting('r2alert', { month: mon, used });
        }
      }
    } catch (e) { console.error('r2 alert', e.message); }
    json(res, 200, { date: tIso, days: days.length, cleaned, backup, checked, sent, failed, vsent, vfailed, asent });
  } catch (e) {
    console.error('cron', e);
    json(res, 500, { error: 'server error', sent, failed });
  }
};
