/* "אתר שומר שבת": האם עכשיו שבת או יום טוב במיקום של הגולש (מהשקיעה בערב עד צאת הכוכבים).
   חישוב השמש לפי משוואות NOAA (דיוק של כדקה). המיקום: מהבקשה, או מהכותרות של Vercel לפי ה-IP. */
'use strict';
const RAD = Math.PI / 180;
function sunAlt(t, lat, lng) {
  const d = (t - 946728000000) / 864e5;
  const g = (357.529 + 0.98560028 * d) * RAD, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD, e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + lng) * RAD - ra;
  return Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(H)) / RAD;
}
/* הרגע שבו השמש יורדת אל מתחת לגובה alt, אחרי הצהריים של היום המקומי y-m-d */
function descend(y, m, d, lat, lng, alt) {
  let a = Date.UTC(y, m - 1, d, 12) - lng / 15 * 3600e3, b = a + 14 * 3600e3;
  if (sunAlt(a, lat, lng) < alt || sunAlt(b, lat, lng) > alt) return null;
  for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (sunAlt(c, lat, lng) > alt) a = c; else b = c; }
  return Math.round((a + b) / 2);
}
function ymdIn(t, tz) {
  try { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)).split('-'); return [+p[0], +p[1], +p[2]]; }
  catch (e) { const x = new Date(t); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()]; }
}
const addDays = ([y, m, d], n) => { const x = new Date(Date.UTC(y, m - 1, d + n)); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()]; };
let HD = null;
async function holyFn(il, yt) {
  if (!HD) HD = (await import('./_hdate/index.js')).HDate;
  return ([y, m, d]) => {
    const dt = new Date(y, m - 1, d, 12); if (dt.getDay() === 6) return 'shabbat';
    if (!yt) return null;
    const h = new HD(dt), hm = h.getMonth(), hd = h.getDate();
    const T = { 7: il ? [1, 2, 10, 15, 22] : [1, 2, 10, 15, 16, 22, 23], 1: il ? [15, 21] : [15, 16, 21, 22], 3: il ? [6] : [6, 7] }[hm];
    return T && T.includes(hd) ? 'yt' : null;
  };
}
const DEF = { on: true, yt: true, before: 0, after: 0, deg: 8.5 };
function cfgOf(c) { const s = { ...DEF, ...((c && c.shabbat) || {}) }; s.before = Math.max(0, Math.min(120, +s.before || 0)); s.after = Math.max(0, Math.min(120, +s.after || 0)); s.deg = Math.max(3, Math.min(20, +s.deg || 8.5)); return s; }
/* מצב עכשיו: {closed, end, next} (זמנים במילישניות) */
async function status(now, P, conf) {
  const c = cfgOf(conf);
  if (!c.on) return { on: false, closed: false };
  const holy = await holyFn(!!P.il, c.yt), today = ymdIn(now, P.tz);
  const sunset = ymd => descend(ymd[0], ymd[1], ymd[2], P.lat, P.lng, -0.833);
  const tzeit = ymd => descend(ymd[0], ymd[1], ymd[2], P.lat, P.lng, -c.deg);
  const blocks = []; let cur = null;
  for (let i = -2; i <= 10; i++) {
    const day = addDays(today, i), h = holy(day);
    if (h) { if (!cur) { const ss = sunset(addDays(day, -1)); cur = { start: (ss || Date.UTC(day[0], day[1] - 1, day[2]) - 6 * 3600e3) - c.before * 60e3, kind: h }; } const tz = tzeit(day); cur.end = (tz || Date.UTC(day[0], day[1] - 1, day[2], 20)) + c.after * 60e3; if (h === 'yt') cur.kind = cur.kind === 'shabbat' ? 'both' : (cur.kind === 'yt' ? 'yt' : 'both'); }
    else if (cur) { blocks.push(cur); cur = null; }
  }
  if (cur) blocks.push(cur);
  const on = blocks.find(b => now >= b.start && now < b.end), nx = blocks.find(b => b.start > now);
  return { on: true, closed: !!on, kind: on ? on.kind : null, end: on ? on.end : null, next: nx ? nx.start : null, nextEnd: nx ? nx.end : null, tz: P.tz };
}
/* המיקום לפי הבקשה: פרמטרים lat/lng/tz/il, ואם אין, לפי ה-IP (כותרות Vercel), ואם אין, ירושלים */
function placeOf(req) {
  const q = req.query || {}, H = req.headers || {};
  let lat = parseFloat(q.lat), lng = parseFloat(q.lng), tz = String(q.tz || '');
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { lat = parseFloat(H['x-vercel-ip-latitude']); lng = parseFloat(H['x-vercel-ip-longitude']); tz = tz || String(H['x-vercel-ip-timezone'] || ''); }
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { lat = 31.778; lng = 35.235; tz = 'Asia/Jerusalem'; }
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (e) { tz = ''; }
  if (!tz) tz = 'Asia/Jerusalem';
  const il = q.il != null ? q.il === '1' : (/^Asia\/(Jerusalem|Tel_Aviv|Hebron|Gaza)$/.test(tz) || String(H['x-vercel-ip-country'] || '') === 'IL');
  return { lat, lng, tz, il };
}
async function closedNow(req, conf) { try { return (await status(Date.now(), placeOf(req), conf)).closed; } catch (e) { return false; } }
/* האם התאריך (Date של צהריים מקומי) שבת או יום טוב */
async function isHoly(d, il, yt) { const f = await holyFn(il !== false, yt !== false); return !!f([d.getFullYear(), d.getMonth() + 1, d.getDate()]); }
module.exports = { isHoly, status, placeOf, closedNow, cfgOf, sunAlt, descend };
