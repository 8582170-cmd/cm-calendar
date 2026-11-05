/* אבטחה: זיהוי דפדפן/מכשיר, הגבלת ניסיונות כניסה לניהול, וחסימת כתובות IP.
   הנתונים נשמרים בהגדרות (settings): secfails = ניסיונות כניסה שגויים לפי IP, ipblock = כתובות חסומות. */
'use strict';
const { loadSetting, saveSetting, env } = require('./_lib');

/* דפדפן · מערכת הפעלה · סוג מכשיר, מתוך User-Agent */
function uaInfo(ua) {
  ua = String(ua || ''); if (!ua) return null;
  const m = (re) => { const x = re.exec(ua); return x ? x[1] : ''; };
  let br = '';
  if (/Edg\//.test(ua)) br = 'Edge ' + m(/Edg\/(\d+)/);
  else if (/OPR\/|Opera/.test(ua)) br = 'Opera ' + m(/OPR\/(\d+)/);
  else if (/SamsungBrowser\//.test(ua)) br = 'Samsung ' + m(/SamsungBrowser\/(\d+)/);
  else if (/Firefox\//.test(ua)) br = 'Firefox ' + m(/Firefox\/(\d+)/);
  else if (/CriOS\//.test(ua)) br = 'Chrome ' + m(/CriOS\/(\d+)/);
  else if (/Chrome\//.test(ua)) br = 'Chrome ' + m(/Chrome\/(\d+)/);
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) br = 'Safari ' + m(/Version\/(\d+)/);
  else if (/bot|crawl|spider|curl|wget|python|node|axios|postman/i.test(ua)) br = 'רובוט / סקריפט';
  else br = 'אחר';
  let os = '';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11'; else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS ' + m(/OS (\d+)_/);
  else if (/Android/.test(ua)) os = 'Android ' + m(/Android (\d+)/);
  else if (/Mac OS X/.test(ua)) os = 'macOS'; else if (/CrOS/.test(ua)) os = 'ChromeOS'; else if (/Linux/.test(ua)) os = 'Linux';
  const dev = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'טאבלט' : /Mobi|iPhone|Android/.test(ua) ? 'טלפון' : 'מחשב';
  return [br.trim(), os.trim(), dev].filter(Boolean).join(' · ').slice(0, 80);
}

const LOCKS = [5, 15, 60, 240, 1440].map(n => n * 60e3); /* אחרי כל 5 ניסיונות שגויים: 5 דקות, 15, שעה, 4 שעות, יום */
const FAILS_PER_LEVEL = 5;
const ipOf = req => { const H = (req && req.headers) || {}; return String(H['cf-connecting-ip'] || H['x-real-ip'] || H['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 45); };

/* לפני בדיקת הסיסמה: האם הכתובת נעולה כרגע */
async function loginLocked(req) {
  const ip = ipOf(req); if (!ip) return null;
  const F = (await loadSetting('secfails')) || {}, s = F[ip];
  return s && s.until && Date.now() < s.until ? { until: s.until, level: s.lvl } : null;
}
/* אחרי בדיקת הסיסמה: מעדכנים את המונה */
async function loginResult(req, ok) {
  const ip = ipOf(req); if (!ip) return null;
  const F = (await loadSetting('secfails')) || {}, now = Date.now();
  if (ok) { if (F[ip]) { delete F[ip]; await saveSetting('secfails', F); } return null; }
  const s = F[ip] && now - (F[ip].at || 0) < 24 * 3600e3 ? F[ip] : { n: 0, lvl: 0 };
  s.n = (s.n || 0) + 1; s.at = now; s.total = (s.total || 0) + 1;
  let locked = null;
  if (s.n >= FAILS_PER_LEVEL) {
    s.lvl = (s.lvl || 0) + 1; s.n = 0; s.until = now + LOCKS[Math.min(s.lvl, LOCKS.length) - 1]; locked = { until: s.until, level: s.lvl };
    /* מהנעילה השלישית: חסימה מלאה של הכתובת ליום, והודעה במייל */
    if (s.lvl >= 3) await block(ip, 'ניסיונות כניסה חוזרים לניהול עם סיסמה שגויה (' + s.total + ')', 24 * 3600e3, true);
    if (s.lvl >= 2) await notify('נעילת כניסה לניהול', 'כתובת ' + ip + ' ננעלה אחרי ' + s.total + ' ניסיונות כניסה שגויים (שלב ' + s.lvl + ').');
  }
  F[ip] = s;
  /* ניקוי רשומות ישנות */
  for (const k of Object.keys(F)) if (now - (F[k].at || 0) > 7 * 24 * 3600e3) delete F[k];
  await saveSetting('secfails', F);
  return locked;
}

/* חסימת IP: {ip: {t, until, reason, auto}}. until ריק = עד שפותחים ידנית */
async function block(ip, reason, ms, auto) {
  if (!ip) return;
  const B = (await loadSetting('ipblock')) || {};
  B[ip] = { t: new Date().toISOString(), until: ms ? Date.now() + ms : null, reason: String(reason || '').slice(0, 200), auto: !!auto };
  await saveSetting('ipblock', B);
  if (auto) await notify('כתובת IP נחסמה אוטומטית', 'הכתובת ' + ip + ' נחסמה: ' + reason + '. אפשר לפתוח אותה בדף הניהול, באזור "אבטחה".');
}
async function unblock(ip) { const B = (await loadSetting('ipblock')) || {}; delete B[ip]; await saveSetting('ipblock', B); }
async function clearFails(ip) { const F = (await loadSetting('secfails')) || {}; delete F[ip]; await saveSetting('secfails', F); }

function notify(subject, text) {
  const to = env('OWNER_EMAIL') || env('ALERT_EMAIL'); if (!to) return;
  try { const { sendMail, frame, escH } = require('./_mail'); return sendMail({ to, subject: '🔒 ' + subject, html: frame({ title: escH(subject), body: escH(text) }), text }, 'security').catch(() => {}); } catch (e) {}
}

module.exports = { uaInfo, ipOf, loginLocked, loginResult, block, unblock, clearFails, LOCKS };
