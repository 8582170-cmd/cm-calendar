/* בדיקת מערכת לדף הניהול ולמשימת הלילה: הגדרות חסרות, חיבורים, תקלות בשליחות ובתשלומים.
   כל בדיקה: { id, g (קבוצה), lv: ok / info / warn / bad, t (כותרת), d (פירוט), fix (מה לעשות) }.
   bad = משהו לא עובד ללקוחות עכשיו. warn = כדאי לטפל. info = לידיעה. */
'use strict';
const { db, env, loadSetting, loadConfig } = require('./_lib');

async function run() {
  const C = [], add = (g, id, lv, t, d, fix, act) => C.push({ g, id, lv, t, d: d || '', fix: fix || '', ...(act ? { act } : {}) });
  const iso = ms => new Date(Date.now() - ms).toISOString();
  const cnt = async q => { const r = await db(q + '&limit=1000'); return (r || []).length; };

  /* ---------- חיבורים והגדרות ---------- */
  let dbOk = true;
  try { await db('settings?select=key&limit=1'); add('sys', 'db', 'ok', 'מסד הנתונים (Supabase) מחובר'); }
  catch (e) { dbOk = false; add('sys', 'db', 'bad', 'אין חיבור למסד הנתונים', String(e.message || e).slice(0, 160), 'לבדוק את SUPABASE_URL ו־SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת'); }
  const mailKeys = ['RESEND_API_KEY', 'BREVO_API_KEY', 'MAILJET_API_KEY'].filter(k => env(k));
  if (!mailKeys.length) add('sys', 'mail', 'bad', 'אין ספק מיילים מוגדר', 'לא יוצאים מיילים בכלל (אישורים, תזכורות, הזמנות)', 'להוסיף מפתח של Resend, Brevo או Mailjet בהגדרות השרת');
  else add('sys', 'mail', mailKeys.length === 1 ? 'info' : 'ok', 'ספקי מיילים: ' + mailKeys.length, mailKeys.length === 1 ? 'יש ספק אחד בלבד: כשהוא מגיע למגבלה היומית, המיילים מחכים למחר' : '');
  if (!env('OWNER_EMAIL') && !env('ALERT_EMAIL')) add('sys', 'owner', 'warn', 'לא מוגדר מייל לבעל האתר', 'לא תקבל הודעות על רכישות והתראות', 'להוסיף OWNER_EMAIL (או ALERT_EMAIL) בהגדרות השרת');
  if (!env('SITE_URL')) add('sys', 'site', 'info', 'SITE_URL לא מוגדר', 'נעשה שימוש ב־https://www.myluach.org');
  if (!env('CRON_SECRET')) add('sys', 'cron', 'warn', 'CRON_SECRET לא מוגדר', 'משימת הלילה פחות מוגנת');
  try { if (!require('./_r2').on()) add('sys', 'r2', 'warn', 'אחסון R2 לא מחובר', 'הלוחות נשמרים רק ב־Supabase, שהמקום בו מוגבל'); else add('sys', 'r2', 'ok', 'אחסון R2 מחובר'); } catch (e) {}
  try { if (!require('./_r2').media()) add('sys', 'media', 'info', 'אחסון המדיה (R2_MEDIA_*) לא מוגדר', 'העלאת תמונות, סרטונים ומוזיקה לדפי ההזמנה לא תעבוד'); } catch (e) {}
  if (!env('SHEETS_BACKUP_URL')) add('sys', 'backup', 'info', 'גיבוי לילי לגוגל שיטס לא מוגדר');

  /* תשלומים: הספקים שנבחרו בהגדרות חייבים להיות מוגדרים */
  let cfg = {}; try { cfg = await loadConfig(); } catch (e) {}
  const provReady = { nedarim: !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID')), paypal: !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET')), sumit: require('./_sumit').ready() };
  const PN = { nedarim: 'נדרים פלוס', paypal: 'PayPal', sumit: 'SUMIT' };
  const used = [cfg.pay || 'nedarim'].concat(Array.isArray(cfg.payAlso) ? cfg.payAlso : []);
  used.forEach(p => { if (PN[p] && !provReady[p]) add('pay', 'pay-' + p, 'bad', PN[p] + ' נבחר כאמצעי תשלום אבל לא מוגדר', 'לקוחות שיבחרו בו לא יוכלו לשלם', 'להשלים את המפתחות של ' + PN[p] + ' בהגדרות השרת, או להוריד אותו ב"תשלום ולקוחות חוזרים"'); });
  /* נדרים פלוס: מפתח API (להחזרים, קבלות והוראות קבע), עדכוני סירובים וחתימה */
  if (provReady.nedarim) {
    const N = require('./_nedarim');
    if (!N.apiReady()) add('pay', 'ned-api', 'warn', 'נדרים פלוס: חסר מפתח API (NEDARIM_API_PASSWORD)', 'בלי המפתח: אין החזר אוטומטי, קבלות באתר והוראת קבע', 'ליצור מפתח שמתחיל ב־npk_ בנדרים (הגדרות > API > מפתחות API) ולהוסיף בהגדרות השרת');
    else { try { const h = await N.hooks(); const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
      if (h.Result === 'OK' && !String(h.CallBackSiruvUrl || '').startsWith(site)) add('pay', 'ned-hook', 'warn', 'נדרים פלוס: עדכוני הסירובים לא מחוברים לאתר', 'כשחיוב חודשי של מנוי נכשל, הלקוח לא יקבל מייל לעדכון הכרטיס', 'ללחוץ "חיבור" כאן', 'nedhook');
      if (h.Result === 'OK' && +h.SignatureEnabled === 1 && !env('NEDARIM_WEBHOOK_SECRET')) add('pay', 'ned-sig', 'warn', 'נדרים פלוס: העדכונים חתומים, אבל באתר לא הוגדר המפתח', 'האתר בודק את העדכונים רק לפי כתובת IP', 'להוסיף NEDARIM_WEBHOOK_SECRET בהגדרות השרת'); } catch (e) {} }
  }
  if (!used.some(p => provReady[p])) add('pay', 'pay-none', 'bad', 'אין אף אמצעי תשלום פעיל', 'אי אפשר לקנות באתר'); else add('pay', 'pay-ok', 'ok', 'אמצעי תשלום פעילים: ' + used.filter(p => provReady[p]).map(p => PN[p]).join(', '));
  if (env('PAYPAL_MODE') && env('PAYPAL_MODE') !== 'live' && used.includes('paypal')) add('pay', 'pp-sandbox', 'warn', 'PayPal במצב בדיקה (sandbox)', 'תשלומים אמיתיים לא עוברים', 'לשנות את PAYPAL_MODE ל־live');
  ['PAYPAL_TEST_AMOUNT', 'NEDARIM_TEST_AMOUNT', 'SUMIT_TEST_AMOUNT'].forEach(k => { if (env(k)) add('pay', 'test-' + k, 'warn', 'מוגדר סכום בדיקה: ' + k, 'כל התשלומים בספק הזה נגבים בסכום הבדיקה במקום במחיר האמיתי', 'למחוק את ' + k + ' בהגדרות השרת כשמסיימים לבדוק'); });

  /* הודעות קוליות ו־SMS לאירועים */
  let EP = {}; try { EP = await require('./_eventpay').prices(); } catch (e) {}
  let vc = {}; try { vc = await require('./_voice').cfg(); } catch (e) {}
  if (EP.voiceOn && !vc.token) add('ev', 'v-token', 'bad', 'הודעות קוליות לאירועים מופעלות, אבל אין טוקן של ימות המשיח', 'בעלי אירועים יקבלו שגיאה', 'להזין טוקן ב"תזכורות קוליות בטלפון" או לכבות את ההודעות הקוליות בניהול האירועים');
  if (EP.voiceOn && !EP.voicePath && !EP.voiceTpl) add('ev', 'v-path', 'bad', 'הודעות קוליות מופעלות בלי שלוחה ובלי תבנית קמפיין', 'אי אפשר לשלוח הזמנות קוליות', 'בניהול האירועים ← הודעות קוליות: להזין שלוחה או מזהה תבנית');
  if (EP.voiceOn && !vc.callerId) add('ev', 'v-cid', 'warn', 'אין מספר מזוהה יוצא לשיחות', 'השיחות יוצאות ממספר ברירת המחדל של ימות');
  if (EP.smsOn) { let ok = false; try { ok = await require('./_sms').ready(); } catch (e) {} if (!ok) add('ev', 'sms', 'bad', 'SMS לאירועים מופעל, אבל ספק ה־SMS לא מחובר'); }
  if (EP.on === false) add('ev', 'ev-buy', 'info', 'רכישה בדפי ההזמנה לאירוע כבויה', 'בעלי אירועים משתמשים רק במסלול החינמי');

  if (dbOk) {
    /* ---------- טבלאות ועמודות שצריך להוסיף ---------- */
    const miss = [];
    await db('timer_event?select=slug&limit=1').catch(() => miss.push('טבלת האירועים (timer_event)'));
    await db('timer_recip?select=opened_at,call_at,call_st&limit=1').catch(() => miss.push('עמודות הפתיחה והשיחות ב־timer_recip'));
    await db('email_log?select=to_email,error&limit=1').catch(() => miss.push('עמודות ב־email_log'));
    if (miss.length) add('sys', 'sql', 'warn', 'חסרים חלקים במסד הנתונים', miss.join(' · '), 'להריץ ב־Supabase את הקבצים tools/supabase_timer.sql ו־tools/supabase_reminders.sql (בטוח להריץ שוב)');

    /* ---------- פעילות ---------- */
    const last = await loadSetting('cronlast').catch(() => null);
    if (!last || !last.at) add('act', 'cronrun', 'info', 'עדיין לא נרשמה ריצה של משימת הלילה', 'מעכשיו כל ריצה נרשמת כאן');
    else { const h = (Date.now() - Date.parse(last.at)) / 3600e3;
      add('act', 'cronrun', h > 74 ? 'bad' : h > 50 ? 'warn' : 'ok', 'משימת הלילה רצה לאחרונה לפני ' + (h < 1 ? 'פחות משעה' : Math.round(h) + ' שעות'), last.err ? 'שגיאה בריצה האחרונה: ' + last.err : last.skipped ? 'שבת / חג: לא נשלח כלום' : (last.sent != null ? 'נשלחו ' + last.sent + ' תזכורות במייל' : ''), h > 50 ? 'לבדוק ב"משימת הלילה" (אפשר להריץ ידנית), ואת ה־Cron ב־Cloudflare / GitHub' : ''); }
    try {
      const S = (await loadSetting('sched')) || {}, any = ['cal', 'ev'].some(a => ['mail', 'voice'].some(b => ((((S[a] || {})[b] || {}).times || ((S[a] || {})[b] || {}).hours) || []).length));
      if (any) { const H = await loadSetting('hourlast').catch(() => null), h = H && H.at ? (Date.now() - Date.parse(H.at)) / 3600e3 : 1e9;
        /* בשבת ובחג ה־Worker לא רץ, לכן הסף גבוה */
        if (h > 28) add('act', 'hourly', h > 80 ? 'bad' : 'warn', 'הריצה השעתית לא פועלת' + (h < 1e8 ? ' (לאחרונה לפני ' + Math.round(h) + ' שעות)' : ''), 'נקבעו שעות לתזכורות, אבל הן יוצאות רק כשהריצה השעתית פועלת', 'ב־Cloudflare ← ה־Worker של המשימות ← Triggers: להוסיף Cron "*/5 * * * *" (כל 5 דקות)'); }
    } catch (e) {}
    try {
      const M = await db('email_log?select=ok,kind,error,created_at&created_at=gte.' + encodeURIComponent(iso(864e5)) + '&limit=5000');
      const n = (M || []).length, bad = (M || []).filter(x => x.ok === false);
      if (bad.length) { const ex = bad.slice(0, 3).map(x => (x.kind || '') + ': ' + String(x.error || '').slice(0, 80)).join(' · ');
        add('act', 'mailfail', bad.length >= 5 && bad.length / Math.max(1, n) > 0.2 ? 'bad' : 'warn', bad.length + ' מיילים נכשלו ב־24 השעות האחרונות (מתוך ' + n + ')', ex, 'לבדוק ב"דוח מיילים" ולשלוח מייל בדיקה'); }
      else add('act', 'mailfail', 'ok', 'מיילים: ' + n + ' נשלחו ב־24 השעות האחרונות, בלי כשלונות');
    } catch (e) {}
    try {
      const F = await cnt('orders?select=id&status=eq.failed&created_at=gte.' + encodeURIComponent(iso(864e5)));
      if (F >= 3) add('act', 'payfail', 'warn', F + ' תשלומים נכשלו ביממה האחרונה', 'אולי בעיה אצל ספק התשלום', 'לבדוק ב"הזמנות אחרונות"');
      const U = await cnt('orders?select=id&status=eq.underpaid&created_at=gte.' + encodeURIComponent(iso(30 * 864e5)));
      if (U) add('act', 'underpaid', 'warn', U + ' הזמנות ששולמו חלקית (30 יום)', 'הלקוח שילם פחות מהמחיר ולא קיבל את המסלול', 'לבדוק ב"הזמנות אחרונות" ולטפל מול הלקוח');
      const P = await cnt('orders?select=id&status=eq.pending&created_at=gte.' + encodeURIComponent(iso(864e5)) + '&created_at=lt.' + encodeURIComponent(iso(3600e3)));
      if (P >= 5) add('act', 'pending', 'info', P + ' הזמנות נפתחו ולא שולמו ביממה האחרונה', 'נטישה רגילה, אבל מספר גבוה יכול להעיד על בעיה בדף התשלום');
    } catch (e) {}
    try {
      const FB = await loadSetting('feedback'), wk = iso(7 * 864e5);
      const n = (Array.isArray(FB) ? FB : []).filter(x => x && x.kind === 'contact' && String(x.t || '') >= wk).length;
      if (n) add('act', 'contact', 'info', n + ' פניות חדשות מהאתר בשבוע האחרון', '', 'ב"משובים ופניות"');
    } catch (e) {}
    try {
      const G = await db('timer_gift?select=net&status=eq.paid&payout=neq.done&limit=5000');
      const s = (G || []).reduce((a, g) => a + (+g.net || 0), 0);
      if (s > 0) add('act', 'gifts', 'warn', 'מתנות שמחכות להעברה לבעלי אירועים: ' + Math.round(s) + ' ₪', '', 'בניהול האירועים ← מתנות');
    } catch (e) {}
    try {
      const B = (await loadSetting('ipblock')) || {}, now = Date.now(), act = Object.values(B).filter(v => !v.until || now < v.until).length;
      if (act) add('act', 'ipblock', 'info', act + ' כתובות IP חסומות עכשיו', '', 'ב"אבטחה"');
      const F = (await loadSetting('secfails')) || {}, day = now - 864e5, fl = Object.values(F).filter(v => (v.at || 0) > day).reduce((a, v) => a + (+v.total || 0), 0);
      if (fl >= 10) add('act', 'logins', 'warn', fl + ' ניסיונות כניסה שגויים לניהול ביממה האחרונה', 'אם זה לא אתה, מישהו מנסה לנחש את הסיסמה', 'לשקול סיסמה ארוכה יותר');
    } catch (e) {}
    const MT = await loadSetting('maint').catch(() => null);
    if (MT && (MT.on || MT.buy)) add('act', 'maint', 'warn', 'מצב תחזוקה פעיל' + (MT.buy ? ' (הרכישות חסומות)' : ''), MT.text || '', 'לכבות ב"מצב תחזוקה" כשמסיימים');
  }
  const order = { bad: 0, warn: 1, info: 2, ok: 3 };
  C.sort((a, b) => order[a.lv] - order[b.lv]);
  return { at: new Date().toISOString(), checks: C, bad: C.filter(x => x.lv === 'bad').length, warn: C.filter(x => x.lv === 'warn').length };
}

/* ממשימת הלילה: מייל לבעל האתר כשיש תקלה חדשה (bad). אותה רשימת תקלות לא נשלחת שוב באותו יום */
async function alert() {
  const to = env('ALERT_EMAIL') || env('OWNER_EMAIL'); if (!to) return null;
  const H = await run(), B = H.checks.filter(x => x.lv === 'bad'); if (!B.length) return { bad: 0 };
  const sig = B.map(x => x.id).sort().join(','), day = new Date().toISOString().slice(0, 10), last = await loadSetting('healthalert').catch(() => null);
  if (last && last.sig === sig && last.day === day) return { bad: B.length, skipped: true };
  const { sendMail, frame, escH } = require('./_mail'), site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  await sendMail({ to, subject: '⚠️ MyLuach: ' + B.length + ' תקלות שדורשות טיפול', html: frame({ title: 'בדיקת המערכת מצאה תקלות', body: B.map(x => '<b>' + escH(x.t) + '</b>' + (x.d ? '<br>' + escH(x.d) : '') + (x.fix ? '<br><i>' + escH(x.fix) + '</i>' : '')).join('<br><br>'), button: 'לבדיקת המערכת', url: site + '/admin#sys' }) }, 'alert');
  await require('./_lib').saveSetting('healthalert', { sig, day });
  return { bad: B.length, sent: true };
}
module.exports = { run, alert };
