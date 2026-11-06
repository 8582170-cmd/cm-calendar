/* שעוני ספירה לאחור עם כתובת קבועה: www.myluach.org/t/<כתובת>
   נשמרים ב-Cloudflare R2 (הדלי הפרטי) בנתיב timers/<כתובת>.json. מי שיצר מקבל קוד עריכה (נשמר אצלו בדפדפן), ורק איתו אפשר לעדכן.
   GET  ?c=_timer&s=<כתובת>           → ההגדרות (בלי קוד העריכה), או 404
   GET  ?c=_timer&s=<כתובת>&check=1   → {free}
   POST {slug, cfg, token?}            → יצירה (אם פנוי) או עדכון (עם קוד העריכה) */
'use strict';
const crypto = require('node:crypto');
const { readBody, json } = require('./_lib');

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['admin', 'api', 'new', 'edit', 'test', 'timer', 'myluach', 'www', 'login', 'null', 'undefined']);
const key = s => 'timers/' + s + '.json';
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
/* תמונה מותרת רק מהדלי הציבורי שלנו (שהועלתה דרך הבונה) */
function okImg(u) { u = String(u || ''); const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })();
  return u.length < 300 && /\/timers\/img\/[0-9]{6}\/[a-f0-9]{24}\.jpg$/.test(u) && (u.startsWith('https://media.myluach.org/') || (M && u.startsWith(M.url + '/'))); }
/* העלאת תמונה: עד 20 לשעה מכל כתובת IP, עד 400KB, רק JPEG (הדפדפן מקטין וממיר לפני ההעלאה) */
async function upload(req, res, b) {
  const R2 = require('./_r2'); if (!R2.media()) return json(res, 503, { error: 'storage' });
  /* העלאת תמונה רק למשתמש רשום (חינם) */
  const user = await require('./_lib').getUser(req).catch(() => null); if (!user) return json(res, 401, { error: 'login' });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'type' });
  const buf = Buffer.from(m[1], 'base64'); if (buf.length > (b.big ? 900000 : 400000)) return json(res, 413, { error: 'size' });
  if (!(buf[0] === 0xFF && buf[1] === 0xD8)) return json(res, 400, { error: 'type' });
  const ip = ((require('./_lib').reqMeta(req) || {}).ip || 'x').replace(/[^0-9a-f.:]/gi, '').slice(0, 45), hr = new Date().toISOString().slice(0, 13).replace(/\D/g, '');
  const rk = 'timers/rl/' + hr + '/' + ip.replace(/:/g, '_') + '.json';
  let n = 0; try { const r = await fetch(R2.presign('GET', rk, 60)); if (r.ok) n = (await r.json()).n || 0; } catch (e) {}
  if (n >= 20) return json(res, 429, { error: 'rate' });
  const path = 'timers/img/' + new Date().toISOString().slice(0, 7).replace('-', '') + '/' + crypto.randomBytes(12).toString('hex') + '.jpg';
  const P = R2.mediaPut(path); const r = await fetch(P.upload, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf });
  if (!r.ok) throw new Error('r2 put ' + r.status);
  try { await fetch(R2.presign('PUT', rk, 60), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n: n + 1 }) }); } catch (e) {}
  return json(res, 200, { ok: true, url: P.url });
}
/* סרטון ומוזיקה לדף ההזמנה: מהדלי הציבורי שלנו בלבד */
function okMedia(u, kind) { u = String(u || ''); const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })();
  return u.length < 300 && new RegExp('/timers/media/[0-9]{6}/[a-f0-9]{24}\\.(' + (kind === 'video' ? 'mp4|webm' : 'mp3|m4a') + ')$').test(u) && (u.startsWith('https://media.myluach.org/') || !!(M && u.startsWith(M.url + '/'))); }
/* העלאה ישירה מהדפדפן ל-R2 (קובץ גדול): השרת רק נותן כתובת העלאה חתומה. רק למשתמש רשום */
async function mediaUp(req, res, b) {
  const R2 = require('./_r2'); if (!R2.media()) return json(res, 503, { error: 'storage' });
  const user = await require('./_lib').getUser(req).catch(() => null); if (!user) return json(res, 401, { error: 'login' });
  /* סרטון ומוזיקה: רק לבעל אירוע שמור. אם האירוע לא שולם תוך שבוע, הקובץ נמחק (במשימה היומית) */
  const sl = str(b.slug, 40).toLowerCase(), cur = SLUG.test(sl) ? await get(sl).catch(() => null) : null;
  if (!cur || !own(cur, b.token)) return json(res, 403, { error: 'owner' });
  const T = { 'video/mp4': ['mp4', 'video', 20e6], 'video/webm': ['webm', 'video', 20e6], 'audio/mpeg': ['mp3', 'audio', 10e6], 'audio/mp4': ['m4a', 'audio', 10e6], 'audio/x-m4a': ['m4a', 'audio', 10e6], 'audio/aac': ['m4a', 'audio', 10e6] }[String(b.type || '')];
  if (!T) return json(res, 400, { error: 'type' }); if (!(+b.size > 0) || +b.size > T[2]) return json(res, 413, { error: 'size', max: T[2] });
  const path = 'timers/media/' + new Date().toISOString().slice(0, 7).replace('-', '') + '/' + crypto.randomBytes(12).toString('hex') + '.' + T[0];
  const P = R2.mediaPut(path);
  if (!cur.paid) { try { const { loadSetting, saveSetting } = require('./_lib'), M = (await loadSetting('mediapend')) || {}; M[path] = { s: sl, at: Date.now() }; await saveSetting('mediapend', M); } catch (e) { console.error('mediapend', e.message); } }
  return json(res, 200, { put: P.upload, url: P.url, ctype: b.type });
}
function clean(c) {
  c = c || {};
  return {
    t: str(c.t, 90), d: /^\d{4}-\d{2}-\d{2}$/.test(c.d) ? c.d : '', h: /^\d{1,2}:\d{2}$/.test(c.h || '') ? c.h : '',
    z: /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(c.z || '') ? c.z : 'Asia/Jerusalem', u: ['d', 'w', 'm'].includes(c.u) ? c.u : 'd',
    th: /^[a-z]{2,16}$/.test(c.th || '') ? c.th : 'classic', c: /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : '', b: /^([0-9a-f]{6}|none)$/i.test(c.b || '') ? c.b : '',
    lang: c.lang === 'en' ? 'en' : 'he', l: c.l === 'stack' ? 'stack' : 'row', fr: ['1', '2'].includes(String(c.fr)) ? String(c.fr) : '0',
    wp: ['bottom', 'none'].includes(c.wp) ? c.wp : 'top', wd: ['h', 'b'].includes(c.wd) ? c.wd : 'g', wh: ['o', 'c'].includes(c.wh) ? c.wh : 's', ww: String(c.ww) === '0' ? '0' : '1', wt: String(c.wt) === '0' ? '0' : '1', ns: String(c.ns) === '1' ? '1' : '0',
    p: okImg(c.p) ? c.p : '', ps: ['rect', 'wide'].includes(c.ps) ? c.ps : 'circle',
    /* דף הזמנה */
    inv: okImg(c.inv) ? c.inv : '', it: str(c.it, 1500), pt: str(c.pt, 300), venue: str(c.venue, 120), addr: str(c.addr, 200),
    tr: /^\d{1,2}:\d{2}$/.test(c.tr || '') ? c.tr : '', tl: str(c.tl, 40), rv: c.rv ? 1 : 0, rm: c.rm ? 1 : 0, wl: c.wl ? 1 : 0, tp: c.tp ? 1 : 0, tpt: str(c.tpt, 120),
    gift: /^https:\/\/[^\s<>"']{6,300}$/.test(String(c.gift || '')) ? String(c.gift) : '', gl: str(c.gl, 40),
    /* אפשרויות לבחירת בעל האירוע: תזכורת למי שלא ענה (ימים לפני), תזכורת ביום האירוע, תודה אחרי, שאלות נוספות, גלריה, מתנה באשראי, SMS */
    nr: Math.max(0, Math.min(30, parseInt(c.nr, 10) || 0)), dr: c.dr ? 1 : 0, ty: c.ty ? 1 : 0, tyt: str(c.tyt, 600),
    qs: (Array.isArray(c.qs) ? c.qs : []).slice(0, 3).map(x => ({ q: str(x && x.q, 80).replace(/[<>]/g, ''), o: (Array.isArray(x && x.o) ? x.o : []).slice(0, 8).map(v => str(v, 30).replace(/[<>]/g, '')).filter(Boolean) })).filter(x => x.q),
    gal: c.gal ? 1 : 0, gc: c.gc ? 1 : 0, sms: c.sms ? 1 : 0, clk: c.clk === 0 || c.clk === '0' ? 0 : 1,
    bgi: okImg(c.bgi) ? c.bgi : '', bgv: okMedia(c.bgv, 'video') ? c.bgv : '', mus: okMedia(c.mus, 'audio') ? c.mus : '', bgo: Math.max(0, Math.min(80, parseInt(c.bgo, 10) || 0))
  };
}
async function get(s) {
  const R2 = require('./_r2'); if (!R2.on()) throw new Error('storage');
  const r = await fetch(R2.presign('GET', key(s), 120)); if (r.status === 404) return null; if (!r.ok) throw new Error('r2 ' + r.status);
  return r.json();
}
async function put(s, obj) {
  const R2 = require('./_r2');
  const r = await fetch(R2.presign('PUT', key(s), 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
  if (!r.ok) throw new Error('r2 put ' + r.status);
}
/* אורחים: אישור הגעה וברכה. בעל האירוע (עם קוד העריכה): רשימות, הסתרה ומחיקה */
const { db } = require('./_lib');
async function recent(table, s, ip) { if (!ip) return 0; const L = await db(table + '?slug=eq.' + s + '&ip=eq.' + encodeURIComponent(ip) + '&created_at=gte.' + encodeURIComponent(new Date(Date.now() - 3600e3).toISOString()) + '&select=id&limit=30').catch(() => []); return (L || []).length; }
const own = (cur, tok) => { tok = str(tok, 64); return !!(cur && tok && tok.length === cur.token.length && crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cur.token))); };
async function tehState(s) {
  const L = await db('timer_teh?slug=eq.' + s + '&select=round,chapter,name&order=round.desc&limit=3000').catch(() => null);
  if (L === null) return { setup: true, round: 1, taken: [] };
  const max = L.length ? L[0].round : 1, cur = L.filter(x => x.round === max), round = cur.length >= 150 ? max + 1 : max;
  return { round, done: round - 1, taken: round === max ? cur.map(x => ({ c: x.chapter, n: x.name })) : [] };
}
/* שבת וחג: לא שולחים ולא מתזמנים. בודקים לפי ארץ ישראל וגם לפי חו"ל (יום טוב שני), עם שעה לפני כניסת השבת וחצי שעה אחרי צאתה */
async function holyAt(ms) { const S = require('./_shabbat'), conf = { shabbat: { on: true, yt: true, before: 60, after: 30 } };
  for (const il of [true, false]) { const r = await S.status(ms, { lat: 31.778, lng: 35.235, tz: 'Asia/Jerusalem', il }, conf).catch(() => ({})); if (r.closed) return r; } return null; }
/* מסלול חינם (עם רישום): דף ההזמנה פתוח ו-20 מיילים. "מלא" = שולם */
const isFull = cur => !!(cur && cur.paid && !cur.paid.free);
async function T_put_mail(s, cur, mail) { await put(s, { ...cur, mail }); cur.mail = mail; }
/* ---------- מייל ההזמנה: דומה לדף האירוע ---------- */
const THC = { classic: ['1e5a63', 'ffffff', 'eef4f4'], wedding: ['a8646f', 'fff8f6', 'f8e8e5'], barmitzvah: ['1f3a5f', 'f7f8fb', 'e6ecf5'], batmitzvah: ['b8487a', 'fff7fb', 'fbe3ef'], kids: ['e0663a', 'fffaf2', 'ffe3d3'], elegant: ['c9a227', '1d1a17', '2a2622'], digital: ['39e888', '0b0f0c', '111a14'], minimal: ['172126', 'ffffff', 'f3f5f4'] };
const gemN = n => { const o = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], t = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']; n %= 1000; let r = h[Math.floor(n / 100)] || ''; n %= 100; r += n === 15 ? 'טו' : n === 16 ? 'טז' : t[Math.floor(n / 10)] + o[n % 10]; return r.length > 1 ? r.slice(0, -1) + '״' + r.slice(-1) : r + '׳'; };
const LLs = { 'Asia/Jerusalem': [31.778, 35.235], 'America/New_York': [40.71, -74], 'Europe/London': [51.51, -0.13], 'Europe/Paris': [48.86, 2.35], 'America/Los_Angeles': [34.05, -118.24], 'America/Chicago': [41.88, -87.63] };
/* שעת השקיעה המקומית (כמו בדף האירוע), כדי לדעת אם האירוע כבר ביום העברי הבא */
function sunsetH(y, m, d, tz) { const c = LLs[tz] || LLs['Asia/Jerusalem'], lat = c[0], lng = c[1], R = Math.PI / 180;
  let off = 2; try { const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit' }); off = ((+f.format(new Date(Date.UTC(y, m - 1, d, 12))) - 12) + 24) % 24; if (off > 12) off -= 24; } catch (e) {}
  const N = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5), lh = lng / 15, t = N + (18 - lh) / 24, M = .9856 * t - 3.289;
  const L = (M + 1.916 * Math.sin(M * R) + .02 * Math.sin(2 * M * R) + 282.634 + 720) % 360; let RA = (Math.atan(.91764 * Math.tan(L * R)) / R + 720) % 360;
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15; const sd = .39782 * Math.sin(L * R), cd = Math.cos(Math.asin(sd)), ch = (Math.cos(90.833 * R) - sd * Math.sin(lat * R)) / (cd * Math.cos(lat * R));
  if (ch > 1 || ch < -1) return null; const Hh = Math.acos(ch) / R / 15, T = Hh + RA - .06571 * t - 6.622; return ((T - lh + off) % 24 + 48) % 24; }
const H = v => String(v == null ? '' : v).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function inviteMail(slug, cur, r, site, mode) {
  const c = cur.cfg || {}, th = THC[c.th] || THC.classic, acc = /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : th[0], bg = /^[0-9a-f]{6}$/i.test(c.b || '') ? c.b : th[1], dark = c.th === 'elegant' || c.th === 'digital';
  const ink = dark ? 'f3efe6' : '1a232c', mute = dark ? 'b8ae9c' : '5d6873', EN = c.lang === 'en', page = site + '/t/' + slug + '?' + (r.name ? 'to=' + encodeURIComponent(r.name) + '&' : '') + 'r=' + r.token;
  const title = c.t || (EN ? 'You are invited' : 'הזמנה');
  let when = c.d; try { const d = new Date(c.d + 'T12:00:00Z'); when = (c.ww !== '0' ? new Intl.DateTimeFormat(EN ? 'en-US' : 'he-IL', { weekday: 'long', timeZone: 'UTC' }).format(d) + ', ' : '') + new Intl.DateTimeFormat(EN ? 'en-US' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    if (c.wd === 'h' || c.wd === 'b') { const [y, mo, da] = c.d.split('-').map(Number), hm = /^(\d{1,2}):(\d{2})$/.exec(c.h || ''), ss = hm && c.wh !== 'c' ? sunsetH(y, mo, da, c.z || 'Asia/Jerusalem') : null, after = ss != null && (+hm[1] + hm[2] / 60) >= ss;
      const p = {}; new Intl.DateTimeFormat(EN ? 'en-u-ca-hebrew' : 'he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(d.getTime() + (after ? 864e5 : 0))).forEach(x => { p[x.type] = x.value; });
      let hd = EN ? p.day + ' ' + p.month + ' ' + p.year : gemN(+p.day) + ' ב' + p.month + ' ' + gemN(+p.year); if (after && c.wh === 'o') hd = (EN ? 'Eve of ' : 'אור ל') + hd;
      when = c.wd === 'h' ? hd : when + ' · ' + hd; } } catch (e) {}
  if (c.h) when += (EN ? ' · ' : ' · בשעה ') + c.h;
  const greet = r.name ? String(c.pt || (EN ? 'Dear {name}, we would be delighted to celebrate with you!' : 'לכבוד {שם}, נשמח מאוד לראותך בשמחתנו!')).replace(/\{(שם|name)\}/g, r.name) : '';
  const img = site + '/api/pricing?c=_cdimg&d=' + c.d + (c.h ? '&h=' + encodeURIComponent(c.h) : '') + '&u=' + (c.u || 'd') + '&fg=' + acc + '&bg=' + bg + (c.z && c.z !== 'Asia/Jerusalem' ? '&z=' + encodeURIComponent(c.z) : '') + '&a=1';
  const btn = (href, label, pri) => '<a href="' + H(href) + '" target="_blank" style="display:inline-block;margin:4px;padding:10px 18px;border-radius:999px;border:2px solid #' + acc + ';' + (pri ? 'background:#' + acc + ';color:#' + bg : 'color:#' + acc) + ';font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">' + label + '</a>';
  const loc = [c.venue, c.addr].filter(Boolean).join(', '), dir = EN ? 'ltr' : 'rtl', unsub = site + '/api/pricing?c=_timer&unsub=' + r.token;
  const L = EN ? { rsvp: '✅ RSVP', wish: '✍️ Write a blessing', cal: '📅 Add to calendar', waze: '🚗 Waze', maps: '📍 Maps', gift: '🎁 ' + (c.gl || 'Gift'), rec: 'Reception', open: 'Open the invitation', un: 'Unsubscribe' }
                 : { rsvp: '✅ אישור הגעה', wish: '✍️ כתיבת ברכה', cal: '📅 הוספה ליומן', waze: '🚗 וייז', maps: '📍 מפות', gift: '🎁 ' + (c.gl || 'מתנה'), rec: 'קבלת פנים', open: 'לדף ההזמנה', un: 'הסרה מרשימת התפוצה' };
  const row = x => '<tr><td style="padding:8px 18px;text-align:center">' + x + '</td></tr>';
  let h = '<!doctype html><html dir="' + dir + '"><body style="margin:0;padding:0;background:#f4f2ee"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:16px 8px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#' + bg + ';border-radius:16px;overflow:hidden;direction:' + dir + ';font-family:Arial,sans-serif;color:#' + ink + '">';
  if (/^https:\/\//.test(c.inv || '')) h += '<tr><td><a href="' + H(page) + '" target="_blank"><img src="' + H(c.inv) + '" width="600" alt="' + H(title) + '" style="display:block;width:100%;height:auto;border:0"></a></td></tr>';
  const MH = { nr: EN ? 'We haven’t heard from you yet. Will you join us? Please reply with one click.' : 'עוד לא קיבלנו ממך אישור הגעה. נשמח לדעת אם תגיעו, בלחיצה אחת.', dr: EN ? 'Today is the day! Looking forward to seeing you.' : 'היום זה קורה! מחכים לראותכם.', ty: c.tyt || (EN ? 'Thank you for celebrating with us!' : 'תודה רבה שהשתתפתם בשמחתנו!') };
  if (mode && MH[mode]) h += row('<div style="font-size:19px;font-weight:bold;color:#' + acc + ';white-space:pre-line">' + H(MH[mode]) + '</div>');
  if (greet && mode !== 'ty') h += row('<div style="font-size:21px;font-weight:bold;color:#' + acc + '">' + H(greet) + '</div>');
  if (cur.mail && cur.mail.note && !mode) h += row('<div style="font-size:16px;white-space:pre-line">' + H(cur.mail.note) + '</div>');
  if (c.it && !mode) h += row('<div style="font-size:16px;white-space:pre-line">' + H(c.it) + '</div>');
  h += row('<div style="font-size:22px;font-weight:bold;color:#' + acc + '">' + H(title) + '</div><div style="font-size:14px;color:#' + mute + ';margin-top:4px">' + H(when) + '</div>');
  const U = (c.u === 'm' ? ['months'] : c.u === 'w' ? ['weeks'] : []).concat(['days', 'hours', 'minutes', 'seconds']), UL = EN ? { months: 'months', weeks: 'weeks', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds' } : { months: 'חודשים', weeks: 'שבועות', days: 'ימים', hours: 'שעות', minutes: 'דקות', seconds: 'שניות' };
  if (mode !== 'ty' && c.clk !== 0) h += row('<a href="' + H(page) + '" target="_blank"><img src="' + H(img) + '" width="420" alt="" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0"></a><table role="presentation" width="420" align="center" cellpadding="0" cellspacing="0" style="max-width:100%;direction:ltr;font-size:13px;color:#' + mute + ';text-align:center"><tr>' + U.map(k => '<td>' + UL[k] + '</td>').join('') + '</tr></table>');
  if (loc || c.tr) h += row('<div style="font-size:15px">' + (c.venue ? '<b style="color:#' + acc + '">' + H(c.venue) + '</b><br>' : '') + (c.addr ? H(c.addr) + '<br>' : '') + (c.tr ? L.rec + ': ' + H(c.tr) + (c.h ? ' · ' + H(c.tl || (EN ? 'Ceremony' : 'חופה')) + ': ' + H(c.h) : '') : '') + '</div>' +
    (c.addr ? '<div style="margin-top:6px">' + btn('https://waze.com/ul?q=' + encodeURIComponent(c.addr) + '&navigate=yes', L.waze) + btn('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc), L.maps) + '</div>' : ''));
  h += row((mode === 'ty' ? btn(page, L.open, true) + (c.gal ? btn(page + '&go=gal', EN ? '📷 Share your photos' : '📷 להעלאת תמונות מהאירוע') : '') : (c.rv && mode !== 'dr' ? btn(page + '&go=rsvp', L.rsvp, true) : btn(page, L.open, true)) + btn(page + '&go=cal', L.cal)) + (c.wl ? btn(page + '&go=wish', L.wish) : '') + (/^https:\/\//.test(c.gift || '') ? btn(c.gift, L.gift) : ''));
  h += '<tr><td style="padding:14px 18px 16px;text-align:center;font-size:11px;color:#' + mute + '"><a href="' + H(unsub) + '" style="color:#' + mute + '">' + L.un + '</a> · <a href="' + site + '/invite" style="color:#' + mute + ';text-decoration:none">myluach.org</a></td></tr></table></td></tr></table></body></html>';
  const text = (greet ? greet + '\n\n' : '') + title + '\n' + when + (loc ? '\n' + loc : '') + '\n\n' + page + '\n\n' + L.un + ': ' + unsub;
  return { html: h, text, unsub };
}
/* שליחת המיילים שבתור, כמה בכל פעם (מגבלות השרת והספקים). נקרא מהדפדפן בלולאה, ומהמשימה היומית */
async function sendBatch(s, cur, n) {
  const { sendMail } = require('./_mail'), site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  if (cur.mail && cur.mail.at && Date.parse(cur.mail.at) > Date.now()) return { done: false, scheduled: cur.mail.at, sent: 0 };
  if (await holyAt(Date.now())) return { done: false, stop: 'shabbat', sent: 0 };
  const Q = await db('timer_recip?slug=eq.' + s + '&status=eq.queued&select=id,name,email,token&order=id.asc&limit=' + n);
  if (!Q.length) return { done: true, left: 0 };
  const sentN = (await db('timer_recip?slug=eq.' + s + '&status=eq.sent&select=id&limit=10000')).length;
  let room = Math.max(0, (+(cur.paid || {}).emails || 0) - sentN);
  const ok = [], bad = []; let stop = '';
  for (const r of Q) {
    if (room <= 0) { stop = 'quota'; break; }
    const m = inviteMail(s, cur, r, site);
    try { await sendMail({ to: r.email, subject: (cur.mail && cur.mail.subject) || 'הזמנה', html: m.html, text: m.text, replyTo: (cur.paid && cur.paid.email) || undefined, headers: { 'List-Unsubscribe': '<' + m.unsub + '>' } }, 'invite'); ok.push(r.id); room--; }
    catch (e) { if (/no mail provider/.test(e.message)) { stop = 'limit'; break; } bad.push(r.id); }
  }
  const now = new Date().toISOString();
  if (ok.length) await db('timer_recip?id=in.(' + ok.join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sent', sent_at: now, err: null }) });
  if (bad.length) await db('timer_recip?id=in.(' + bad.join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'fail', err: 'send' }) });
  if (stop === 'quota') await db('timer_recip?slug=eq.' + s + '&status=eq.queued', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'new' }) });
  const left = (await db('timer_recip?slug=eq.' + s + '&status=eq.queued&select=id&limit=10000')).length;
  return { sent: ok.length, failed: bad.length, left, stop, done: !left };
}
async function unsub(req, res, tok) {
  if (/^[0-9a-f]{24}$/.test(tok)) await db('timer_recip?token=eq.' + tok, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'unsub' }) }).catch(() => {});
  res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>הוסרתם מהרשימה</title><body style="font-family:Arial,sans-serif;text-align:center;padding:40px 16px;background:#f6f4ef"><h1 style="color:#1e5a63">הוסרתם מהרשימה ✓</h1><p>לא יישלחו אליכם עוד הזמנות לאירוע הזה.</p><p style="font-size:12px;color:#888">myluach.org</p></body></html>');
}
/* מיילים אוטומטיים לפי בחירת בעל האירוע: תזכורת למי שלא ענה (nr ימים לפני), ביום האירוע למי שאישר, ותודה אחרי האירוע.
   cover = הימים שהריצה של היום מכסה (היום, ושבת/חג שאחריו). כל נמען מקבל כל סוג פעם אחת (nr_at/dr_at/ty_at) */
async function autoMails(cover, max) {
  const idx = (await require('./_lib').loadSetting('evpaid').catch(() => null)) || {}, { addD, iso, todayIL } = require('./_rem'), today = todayIL(), out = { nr: 0, dr: 0, ty: 0 };
  const covered = cover.map(k => iso(addD(today, k))), site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  const { sendMail } = require('./_mail'); let budget = max;
  for (const s of Object.keys(idx)) {
    if (budget <= 0) break;
    const cur = await get(s).catch(() => null); if (!isFull(cur)) continue; const c = cur.cfg || {}; if (!/^\d{4}-\d{2}-\d{2}$/.test(c.d || '')) continue;
    const [y, m, d] = c.d.split('-').map(Number), ev = new Date(y, m - 1, d, 12), dd = n => iso(addD(ev, n));
    const jobs = [];
    if (c.nr && c.rv && covered.includes(dd(-c.nr))) jobs.push('nr');
    if (c.dr && covered.includes(dd(0))) jobs.push('dr');
    if (c.ty && (covered.includes(dd(1)) || (iso(today) > dd(1) && iso(today) <= dd(4)))) jobs.push('ty');
    if (!jobs.length) continue;
    const R = await db('timer_recip?slug=eq.' + s + '&status=eq.sent&select=id,name,email,token,nr_at,dr_at,ty_at&limit=10000').catch(() => []);
    const ans = await db('timer_rsvp?slug=eq.' + s + '&rtok=not.is.null&select=rtok,status&limit=10000').catch(() => []), A = {}; (ans || []).forEach(x => { A[x.rtok] = x.status; });
    let room = (+cur.paid.emails || 0) - R.length;
    for (const job of jobs) {
      const who = R.filter(r => !r[job + '_at'] && (job === 'nr' ? !A[r.token] : A[r.token] === 'yes'));
      const done = [];
      for (const r of who) { if (budget <= 0 || room <= 0) break; const mm = inviteMail(s, cur, r, site, job);
        const subj = { nr: (c.lang === 'en' ? 'Reminder: please RSVP · ' : 'תזכורת: נשמח לאישור הגעה · '), dr: (c.lang === 'en' ? 'Today! ' : 'היום! '), ty: (c.lang === 'en' ? 'Thank you · ' : 'תודה · ') }[job] + (c.t || '');
        try { await sendMail({ to: r.email, subject: subj, html: mm.html, text: mm.text, replyTo: cur.paid.email || undefined, headers: { 'List-Unsubscribe': '<' + mm.unsub + '>' } }, 'invite-' + job); done.push(r.id); budget--; room--; out[job]++; }
        catch (e) { if (/no mail provider/.test(e.message)) { budget = 0; break; } } }
      if (done.length) await db('timer_recip?id=in.(' + done.join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ [job + '_at']: new Date().toISOString() }) });
    }
  }
  return out;
}
/* מחיקת סרטונים ומוזיקה של אירועים שלא שולמו תוך שבוע מההעלאה */
async function cleanMedia() {
  const { loadSetting, saveSetting } = require('./_lib'), M = (await loadSetting('mediapend').catch(() => null)) || {}, R2 = require('./_r2'), MB = R2.media(); if (!MB) return { deleted: 0 };
  let del = 0, kept = 0, changed = false;
  for (const path of Object.keys(M)) {
    const x = M[path]; if (Date.now() - x.at < 7 * 864e5) continue;
    const cur = await get(x.s).catch(() => null);
    if (isFull(cur)) { delete M[path]; changed = true; kept++; continue; }
    try { await fetch(R2.presign('DELETE', path, 120, null, MB), { method: 'DELETE' }); del++; } catch (e) { continue; }
    if (cur && cur.cfg) { const u = MB.url + '/' + path, c = { ...cur.cfg }; let ch = false; ['bgv', 'mus'].forEach(k => { if (c[k] === u) { c[k] = ''; ch = true; } }); if (ch) await put(x.s, { ...cur, cfg: c }).catch(() => {}); }
    delete M[path]; changed = true;
  }
  if (changed) await saveSetting('mediapend', M);
  return { deleted: del, kept };
}
/* המשימה היומית: ממשיכה שליחות שנעצרו (למשל כשהגענו למגבלה היומית של ספקי המייל) */
async function cronSend(max) {
  const Q = await db('timer_recip?status=eq.queued&select=slug&limit=2000').catch(() => []); const S = [...new Set((Q || []).map(x => x.slug))]; let sent = 0;
  for (const s of S) { if (sent >= max) break; const cur = await get(s).catch(() => null); if (!cur || !cur.paid) continue; const r = await sendBatch(s, cur, Math.min(40, max - sent)); sent += r.sent || 0; if (r.stop === 'limit') break; }
  return { sent };
}
async function galList(s) { const R2 = require('./_r2'), M = R2.media(); if (!M) return []; const L = await R2.list('timers/gal/' + s + '/', 1000, M); return L.map(x => ({ key: x.key, url: M.url + '/' + x.key })).reverse(); }
async function guest(req, res, b) {
  const s = str(b.slug, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
  const cur = await get(s); if (!cur) return json(res, 404, { error: 'not found' });
  const c = cur.cfg || {}, meta = require('./_lib').reqMeta(req) || {}, clean1 = (v, n) => str(v, n).replace(/[<>]/g, '').trim();
  /* דף ההזמנה פתוח לאורחים רק אחרי תשלום */
  if (['rsvp', 'wish', 'teh'].includes(b.act) && !cur.paid) return json(res, 402, { error: 'unpaid' });
  /* מעקב פתיחה: מוזמן שנכנס מהקישור האישי שלו */
  if (b.act === 'open') {
    const tk = String(b.r || ''); if (!/^[0-9a-f]{24}$/.test(tk)) return json(res, 400, { error: 'r' });
    const L = await db('timer_recip?slug=eq.' + s + '&token=eq.' + tk + '&select=id,opened_at,opens&limit=1').catch(() => null); const x = L && L[0]; if (!x) return json(res, 200, { ok: false });
    const now = new Date().toISOString();
    await db('timer_recip?id=eq.' + x.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ opened_at: x.opened_at || now, last_open: now, opens: (+x.opens || 0) + 1 }) }).catch(() => {});
    return json(res, 200, { ok: true });
  }
  try {
    if (b.act === 'rsvp') {
      if (!c.rv) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80); if (!name) return json(res, 400, { error: 'name' });
      if (await recent('timer_rsvp', s, meta.ip) >= 15) return json(res, 429, { error: 'rate' });
      const st = ['yes', 'no', 'maybe'].includes(b.status) ? b.status : 'yes', n = v => Math.max(0, Math.min(50, parseInt(v, 10) || 0));
      const rtok = /^[0-9a-f]{24}$/.test(String(b.r || '')) ? String(b.r) : null, ans = (Array.isArray(b.ans) ? b.ans : []).slice(0, 3).map(v => clean1(v, 100));
      const row = { slug: s, name, phone: clean1(b.phone, 30), status: st, adults: st === 'no' ? 0 : n(b.adults) || 1, kids: st === 'no' ? 0 : n(b.kids), note: clean1(b.note, 300), rtok, ans: ans.length ? ans : null };
      /* מי שהגיע מקישור אישי: עדכון של התשובה הקודמת שלו, לא שורה חדשה */
      const prev = rtok ? await db('timer_rsvp?slug=eq.' + s + '&rtok=eq.' + rtok + '&select=id&limit=1').catch(() => []) : [];
      if (prev && prev[0]) await db('timer_rsvp?id=eq.' + prev[0].id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      else await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(async e => { if (/rtok|ans|column/.test(e.message)) { delete row.rtok; delete row.ans; await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); } else throw e; });
      return json(res, 200, { ok: true });
    }
    if (b.act === 'gal') {
      if (!c.gal || !isFull(cur)) return json(res, 403, { error: 'off' });
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'type' });
      const buf = Buffer.from(m[1], 'base64'); if (buf.length > 900000 || !(buf[0] === 0xFF && buf[1] === 0xD8)) return json(res, 400, { error: 'size' });
      const R2 = require('./_r2'); if (!R2.media()) return json(res, 503, { error: 'storage' });
      const ip = (meta.ip || 'x').replace(/[^0-9a-f.:]/gi, '').replace(/:/g, '_'), hr = new Date().toISOString().slice(0, 13).replace(/\D/g, ''), rk = 'timers/rl/' + hr + '/g-' + ip + '.json';
      let n = 0; try { const r = await fetch(R2.presign('GET', rk, 60)); if (r.ok) n = (await r.json()).n || 0; } catch (e) {}
      if (n >= 30) return json(res, 429, { error: 'rate' });
      const P = R2.mediaPut('timers/gal/' + s + '/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.jpg');
      const r = await fetch(P.upload, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf }); if (!r.ok) throw new Error('r2 ' + r.status);
      try { await fetch(R2.presign('PUT', rk, 60), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n: n + 1 }) }); } catch (e) {}
      return json(res, 200, { ok: true, url: P.url });
    }
    if (b.act === 'wish') {
      if (!c.wl) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80), text = clean1(b.text, 1000); if (!name || !text) return json(res, 400, { error: 'text' });
      if (await recent('timer_wall', s, meta.ip) >= 10) return json(res, 429, { error: 'rate' });
      await db('timer_wall', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, name, text, public: b.pub !== false }) });
      return json(res, 200, { ok: true });
    }
    if (b.act === 'teh') {
      if (!c.tp) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80); if (!name) return json(res, 400, { error: 'name' });
      const want = [...new Set((Array.isArray(b.chapters) ? b.chapters : []).map(x => parseInt(x, 10)).filter(x => x >= 1 && x <= 150))].slice(0, 10); if (!want.length) return json(res, 400, { error: 'chapters' });
      if (await recent('timer_teh', s, meta.ip) >= 30) return json(res, 429, { error: 'rate' });
      const st = await tehState(s), taken = new Set(st.taken.map(x => x.c)), free = want.filter(x => !taken.has(x));
      if (!free.length) return json(res, 409, { error: 'taken', state: st });
      const got = [];
      for (const ch of free) { try { await db('timer_teh', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, round: st.round, chapter: ch, name }) }); got.push(ch); } catch (e) { if (!/duplicate|23505|409/.test(e.message)) throw e; } }
      return json(res, 200, { ok: true, got, round: st.round, state: await tehState(s) });
    }
    /* בעל האירוע */
    if (!own(cur, b.token)) return json(res, 403, { error: 'token' });
    /* הפעלה חינם (עם רישום): עד 3 אירועים חינם לכל משתמש */
    if (b.act === 'freeact') {
      if (cur.paid) return json(res, 200, { ok: true, already: true });
      const user = await require('./_lib').getUser(req).catch(() => null); if (!user) return json(res, 401, { error: 'login' });
      const { loadSetting, saveSetting } = require('./_lib'), F = (await loadSetting('evfree').catch(() => null)) || {}, mine = (F[user.id] || []).filter(x => x !== s);
      if (mine.length >= 3) return json(res, 429, { error: 'max' });
      F[user.id] = mine.concat(s); await saveSetting('evfree', F);
      await put(s, { ...cur, paid: { free: true, emails: 20, sms: 0, email: user.email || '', orders: [], at: new Date().toISOString() } });
      await require('./_eventpay').index(s, c.d).catch(() => {});
      return json(res, 200, { ok: true });
    }
    if (b.act === 'owner') {
      const [t, r, w] = await Promise.all([db('timer_teh?slug=eq.' + s + '&select=round,chapter,name,created_at&order=round.asc,chapter.asc&limit=3000').catch(() => null),db('timer_rsvp?slug=eq.' + s + '&select=id,name,phone,status,adults,kids,note,created_at&order=created_at.desc&limit=2000').catch(() => null),
        db('timer_wall?slug=eq.' + s + '&select=id,name,text,public,hidden,created_at&order=created_at.desc&limit=1000').catch(() => null)]);
      const R = await db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at,opened_at,last_open,opens&order=id.asc&limit=10000').catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at&order=id.asc&limit=10000')).catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err&order=id.asc&limit=10000').catch(() => null));
      const G = await db('timer_gift?slug=eq.' + s + '&status=eq.paid&select=id,name,msg,amount,fee,net,payout,paid_at&order=paid_at.desc&limit=2000').catch(() => null);
      const EP = await require('./_eventpay').prices().catch(() => ({}));
      const sent = (R || []).filter(x => x.status === 'sent').length;
      if (r) { const R2x = await db('timer_rsvp?slug=eq.' + s + '&select=id,rtok,ans,seat&limit=2000').catch(() => null); if (R2x) { const m = {}; R2x.forEach(x => { m[x.id] = x; }); r.forEach(x => Object.assign(x, m[x.id] || {})); } }
      return json(res, 200, { gifts: G, seat: cur.seat || null, gal: cur.cfg && cur.cfg.gal ? await galList(s).catch(() => []) : [], flags: { giftOn: !!EP.giftOn, smsOn: !!EP.smsOn, giftPct: EP.giftPct, giftFixed: EP.giftFixed }, sms: cur.paid ? +cur.paid.sms || 0 : 0, rsvp: r, wall: w, teh: t, recip: R, paid: cur.paid ? { emails: +cur.paid.emails || 0, sent, at: cur.paid.at, free: !!cur.paid.free } : null, mail: cur.mail || null, setup: r === null || w === null, rsetup: R === null });
    }
    /* רשימת נמענים */
    if (b.act === 'radd') {
      const ph = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0(5\d{8}|[2-9]\d{7})$/.test(v) ? v : ''; };
      const L = (Array.isArray(b.list) ? b.list : []).slice(0, 10000).map(x => ({ name: clean1(x && x.name, 80), email: str(x && x.email, 200).trim().toLowerCase(), grp: clean1(x && x.grp, 40), cnt: Math.max(0, Math.min(99, parseInt(x && x.cnt, 10) || 0)), phone: ph(x && x.phone) }))
        .map(x => ({ ...x, email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.email) ? x.email : (x.phone ? 'sms-' + x.phone + '@phone.invalid' : '') })).filter(x => x.email);
      if (!L.length) return json(res, 400, { error: 'empty' });
      const have = await db('timer_recip?slug=eq.' + s + '&select=email&limit=10000').catch(() => []), H = new Set((have || []).map(x => x.email));
      if (H.size + L.length > 10000) return json(res, 400, { error: 'max' });
      const add = []; L.forEach(x => { if (!H.has(x.email)) { H.add(x.email); add.push({ slug: s, name: x.name, email: x.email, token: crypto.randomBytes(12).toString('hex'), status: 'new', ...(x.grp ? { grp: x.grp } : {}), ...(x.cnt ? { cnt: x.cnt } : {}), ...(x.phone ? { phone: x.phone } : {}) }); } });
      for (let i = 0; i < add.length; i += 500) await db('timer_recip', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(add.slice(i, i + 500)) });
      return json(res, 200, { ok: true, added: add.length, skipped: L.length - add.length });
    }
    /* שליחה: מסמנים נמענים לשליחה (לפי היתרה), ושומרים את נושא המייל */
    if (b.act === 'send') {
      if (!cur.paid) return json(res, 402, { error: 'unpaid' });
      const R = (await db('timer_recip?slug=eq.' + s + '&select=id,status,email&limit=10000')).filter(x => !/@phone\.invalid$/.test(x.email));
      const sent = R.filter(x => x.status === 'sent').length, left = Math.max(0, (+cur.paid.emails || 0) - sent - R.filter(x => x.status === 'queued').length);
      const ids = Array.isArray(b.ids) && b.ids.length ? new Set(b.ids.map(Number)) : null;
      const pick = R.filter(x => (x.status === 'new' || x.status === 'fail' || (b.again && x.status === 'sent')) && (!ids || ids.has(x.id))).slice(0, left).map(x => x.id);
      let at = null;
      if (b.at) { at = Date.parse(b.at); if (!isFinite(at)) return json(res, 400, { error: 'at' }); if (at < Date.now() + 2 * 60e3) at = null; else if (at > Date.now() + 400 * 864e5) return json(res, 400, { error: 'far' }); }
      const hz = await holyAt(at || Date.now()); if (hz) return json(res, 400, { error: 'shabbat', end: hz.end });
      await T_put_mail(s, cur, { subject: clean1(b.subject, 140) || 'הזמנה: ' + (c.t || 'האירוע'), note: clean1(b.note, 600), at: at ? new Date(at).toISOString() : null });
      for (let i = 0; i < pick.length; i += 300) await db('timer_recip?id=in.(' + pick.slice(i, i + 300).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'queued', err: null }) });
      return json(res, 200, { ok: true, queued: pick.length, left: left - pick.length, at: at ? new Date(at).toISOString() : null });
    }
    /* ביטול תזמון: מחזירים את מי שבתור לרשימה */
    if (b.act === 'unsched') {
      await db('timer_recip?slug=eq.' + s + '&status=eq.queued', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'new' }) });
      await T_put_mail(s, cur, { ...(cur.mail || {}), at: null }); return json(res, 200, { ok: true });
    }
    if (b.act === 'mailpreview') { const m = inviteMail(s, cur, { name: str(b.name, 80) || 'משפחת ישראלי', token: '0'.repeat(24) }, (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '')); return json(res, 200, { html: m.html }); }
    /* הושבה: שולחנות (בקובץ האירוע) ושיבוץ לכל אישור הגעה */
    if (['tables', 'seatset', 'smsnext', 'seatbulk'].includes(b.act) && !isFull(cur)) return json(res, 402, { error: 'full' });
    if (b.act === 'tables') { const T = (Array.isArray(b.tables) ? b.tables : []).slice(0, 200).map((x, i) => ({ id: str(x && x.id, 12).replace(/[^\w-]/g, '') || 't' + i, n: clean1(x && x.n, 40) || String(i + 1), c: Math.max(1, Math.min(50, parseInt(x && x.c, 10) || 10)) })); await put(s, { ...cur, seat: { tables: T } }); return json(res, 200, { ok: true, tables: T }); }
    /* שיבוץ של כמה אורחים ביחד (שיבוץ אוטומטי): { map: { rsvpId: tableId } } */
    if (b.act === 'seatbulk') { const by = {}; Object.entries(b.map || {}).slice(0, 2000).forEach(([id, t]) => { id = parseInt(id, 10); if (id) (by[str(t, 12) || ''] = by[str(t, 12) || ''] || []).push(id); });
      for (const t of Object.keys(by)) await db('timer_rsvp?slug=eq.' + s + '&id=in.(' + by[t].join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ seat: t || null }) });
      return json(res, 200, { ok: true }); }
    if (b.act === 'seatset') { const id = parseInt(b.id, 10); if (!id) return json(res, 400, { error: 'id' }); await db('timer_rsvp?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ seat: str(b.seat, 12) || null }) }); return json(res, 200, { ok: true }); }
    if (b.act === 'galdel') { const k = str(b.key, 200); if (!k.startsWith('timers/gal/' + s + '/')) return json(res, 400, { error: 'key' }); const R2 = require('./_r2'), M = R2.media(); await fetch(R2.presign('DELETE', k, 120, null, M), { method: 'DELETE' }); return json(res, 200, { ok: true }); }
    /* מתנות באשראי: בקשה להעברת הכסף לבעל האירוע (מייל למנהל האתר) */
    if (b.act === 'payout') {
      const G = await db('timer_gift?slug=eq.' + s + '&status=eq.paid&payout=eq.open&select=id,net&limit=2000'); if (!G.length) return json(res, 400, { error: 'none' });
      const sum = G.reduce((a, x) => a + (+x.net || 0), 0);
      await db('timer_gift?id=in.(' + G.map(x => x.id).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ payout: 'requested' }) });
      const to = require('./_lib').env('OWNER_EMAIL'); if (to) { const { sendMail, frame, escH } = require('./_mail'); await sendMail({ to, subject: 'בקשת העברת מתנות: ' + s + ' · ' + sum.toFixed(2) + ' ₪', html: frame({ title: 'בקשה להעברת מתנות', body: 'אירוע: <b>' + escH(s) + '</b><br>' + G.length + ' מתנות · לתשלום לבעל האירוע: <b>' + sum.toFixed(2) + ' ₪</b><br>מייל בעל האירוע: ' + escH((cur.paid && cur.paid.email) || '') + '<br>פרטי חשבון: ' + escH(clean1(b.bank, 300)) }) }, 'owner').catch(() => {}); }
      return json(res, 200, { ok: true, sum });
    }
    /* SMS (רק בארץ, אם הופעל בניהול): שליחה לנמענים עם טלפון, ביתרת ה-SMS של האירוע */
    if (b.act === 'smsnext') {
      const EP = await require('./_eventpay').prices(); if (!EP.smsOn || !require('./_sms').ready()) return json(res, 403, { error: 'sms off' });
      if (!cur.paid) return json(res, 402, { error: 'unpaid' }); if (await holyAt(Date.now())) return json(res, 200, { stop: 'shabbat', sent: 0 });
      const used = (await db('timer_recip?slug=eq.' + s + '&sms_at=not.is.null&select=id&limit=20000')).length; let room = (+cur.paid.sms || 0) - used;
      if (room <= 0) return json(res, 200, { stop: 'quota', sent: 0 });
      const Q = await db('timer_recip?slug=eq.' + s + '&phone=not.is.null&sms_at=is.null&status=neq.unsub&select=id,name,phone,token&order=id.asc&limit=20');
      const site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, ''), ok = []; let failed = 0;
      for (const r of Q) { if (room <= 0) break; const link = site + '/t/' + s + '?to=' + encodeURIComponent(r.name || '') + '&r=' + r.token;
        const txt = (r.name ? (c.lang === 'en' ? 'Dear ' : 'לכבוד ') + r.name + ', ' : '') + (c.t || '') + ' – ' + (c.lang === 'en' ? 'invitation and RSVP: ' : 'הזמנה ואישור הגעה: ') + link;
        try { await require('./_sms').send(r.phone, txt); ok.push(r.id); room--; } catch (e) { failed++; await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sms_err: String(e.message).slice(0, 120) }) }).catch(() => {}); } }
      if (ok.length) await db('timer_recip?id=in.(' + ok.join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sms_at: new Date().toISOString(), sms_err: null }) });
      const left = (await db('timer_recip?slug=eq.' + s + '&phone=not.is.null&sms_at=is.null&status=neq.unsub&select=id&limit=20000')).length;
      return json(res, 200, { sent: ok.length, failed, left, done: !left || !Q.length });
    }
    if (b.act === 'sendnext') { const r = await sendBatch(s, cur, 15); return json(res, 200, r); }
    const id = parseInt(b.id, 10); if (!id) return json(res, 400, { error: 'id' });
    if (b.act === 'whide') { await db('timer_wall?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ hidden: !!b.hidden }) }); return json(res, 200, { ok: true }); }
    if (b.act === 'wdel') { await db('timer_wall?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
    if (b.act === 'rrm') { await db('timer_recip?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
    if (b.act === 'rdel') { await db('timer_rsvp?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
  } catch (e) { console.error('timer guest', e.message); return json(res, 500, { error: /relation|does not exist|42P01/.test(e.message) ? 'setup' : 'server' }); }
  return json(res, 400, { error: 'act' });
}
module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    if (req.method === 'GET' && q.unsub) return unsub(req, res, str(q.unsub, 40));
    /* שליחה מתוזמנת: ה-Worker קורא לזה כל שעה (עם CRON_SECRET) */
    if (req.method === 'GET' && q.cron) { const sec = require('./_lib').env('CRON_SECRET'); if (!sec || String(req.headers.authorization || '') !== 'Bearer ' + sec) return json(res, 401, { error: 'auth' }); return json(res, 200, await cronSend(120)); }
    if (req.method === 'GET' && q.prices) { const E = require('./_eventpay'), P = await E.prices(); return json(res, 200, { on: P.on, prices: P.prices, tiers: E.TIERS, sms: E.SMS, smsOn: P.smsOn, giftOn: P.giftOn, giftMin: P.giftMin, giftMax: P.giftMax }); }
    if (req.method === 'GET') {
      const s = str(q.s, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
      /* קיר הברכות הציבורי */
      /* חלוקת תהילים: הסבב הנוכחי ומי לקח כל פרק */
      if (q.teh) { res.setHeader('Cache-Control', 'no-store'); return json(res, 200, await tehState(s)); }
      if (q.gal) { const cur = await get(s); if (!isFull(cur) || !(cur.cfg || {}).gal) return json(res, 200, { gal: [] }); res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { gal: (await galList(s).catch(() => [])).map(x => x.url) }); }
      if (q.wall) { const L = await db('timer_wall?slug=eq.' + s + '&public=is.true&hidden=is.false&select=id,name,text,created_at&order=created_at.desc&limit=300').catch(() => []);
        res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { wall: L || [] }); }
      const o = RESERVED.has(s) ? { reserved: true } : await get(s);
      if (q.check) return json(res, 200, { free: !o });
      if (!o || o.reserved) return json(res, 404, { error: 'not found' });
      res.setHeader('Cache-Control', 'public, max-age=60');
      let gcOn = false; if (isFull(o) && o.cfg && o.cfg.gc) { try { gcOn = !!(await require('./_eventpay').prices()).giftOn; } catch (e) {} }
      return json(res, 200, { cfg: o.cfg, paid: !!o.paid, full: isFull(o), gcOn });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const b = readBody(req) || {};
    if (b.img) return upload(req, res, b);
    if (b.mup) return mediaUp(req, res, b);
    if (b.act) return guest(req, res, b);
    const s = str(b.slug, 40).toLowerCase();
    if (!SLUG.test(s) || RESERVED.has(s)) return json(res, 400, { error: 'slug' });
    const cfg = clean(b.cfg); if (!cfg.d) return json(res, 400, { error: 'date' });
    const cur = await get(s);
    if (cur) {
      const tok = str(b.token, 64);
      if (!tok || tok.length !== cur.token.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cur.token))) return json(res, 409, { error: 'taken' });
      await put(s, { ...cur, cfg, updated: new Date().toISOString() });
      if (cur.paid) await require('./_eventpay').index(s, cfg.d).catch(() => {});
      return json(res, 200, { ok: true, slug: s, token: tok, updated: true });
    }
    const token = crypto.randomBytes(16).toString('hex');
    await put(s, { cfg, token, created: new Date().toISOString(), ip: (require('./_lib').reqMeta(req) || {}).ip || null });
    return json(res, 200, { ok: true, slug: s, token });
  } catch (e) { console.error('timer', e.message); return json(res, 500, { error: e.message === 'storage' ? 'storage' : 'server' }); }
};

module.exports.get = get; module.exports.put = put; module.exports.own = own; module.exports.isFull = isFull;
module.exports.cronSend = cronSend; module.exports.inviteMail = inviteMail;
module.exports.autoMails = autoMails; module.exports.cleanMedia = cleanMedia;
