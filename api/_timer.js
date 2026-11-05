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
    gift: /^https:\/\/[^\s<>"']{6,300}$/.test(String(c.gift || '')) ? String(c.gift) : '', gl: str(c.gl, 40)
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
function inviteMail(slug, cur, r, site) {
  const c = cur.cfg || {}, th = THC[c.th] || THC.classic, acc = /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : th[0], bg = /^[0-9a-f]{6}$/i.test(c.b || '') ? c.b : th[1], dark = c.th === 'elegant' || c.th === 'digital';
  const ink = dark ? 'f3efe6' : '1a232c', mute = dark ? 'b8ae9c' : '5d6873', EN = c.lang === 'en', page = site + '/t/' + slug + (r.name ? '?to=' + encodeURIComponent(r.name) : '');
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
  if (greet) h += row('<div style="font-size:21px;font-weight:bold;color:#' + acc + '">' + H(greet) + '</div>');
  if (cur.mail && cur.mail.note) h += row('<div style="font-size:16px;white-space:pre-line">' + H(cur.mail.note) + '</div>');
  if (c.it) h += row('<div style="font-size:16px;white-space:pre-line">' + H(c.it) + '</div>');
  h += row('<div style="font-size:22px;font-weight:bold;color:#' + acc + '">' + H(title) + '</div><div style="font-size:14px;color:#' + mute + ';margin-top:4px">' + H(when) + '</div>');
  const U = (c.u === 'm' ? ['months'] : c.u === 'w' ? ['weeks'] : []).concat(['days', 'hours', 'minutes', 'seconds']), UL = EN ? { months: 'months', weeks: 'weeks', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds' } : { months: 'חודשים', weeks: 'שבועות', days: 'ימים', hours: 'שעות', minutes: 'דקות', seconds: 'שניות' };
  h += row('<a href="' + H(page) + '" target="_blank"><img src="' + H(img) + '" width="420" alt="" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0"></a><table role="presentation" width="420" align="center" cellpadding="0" cellspacing="0" style="max-width:100%;direction:ltr;font-size:13px;color:#' + mute + ';text-align:center"><tr>' + U.map(k => '<td>' + UL[k] + '</td>').join('') + '</tr></table>');
  if (loc || c.tr) h += row('<div style="font-size:15px">' + (c.venue ? '<b style="color:#' + acc + '">' + H(c.venue) + '</b><br>' : '') + (c.addr ? H(c.addr) + '<br>' : '') + (c.tr ? L.rec + ': ' + H(c.tr) + (c.h ? ' · ' + H(c.tl || (EN ? 'Ceremony' : 'חופה')) + ': ' + H(c.h) : '') : '') + '</div>' +
    (c.addr ? '<div style="margin-top:6px">' + btn('https://waze.com/ul?q=' + encodeURIComponent(c.addr) + '&navigate=yes', L.waze) + btn('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc), L.maps) + '</div>' : ''));
  h += row((c.rv ? btn(page + (page.includes('?') ? '&' : '?') + 'go=rsvp', L.rsvp, true) : btn(page, L.open, true)) + (c.wl ? btn(page + (page.includes('?') ? '&' : '?') + 'go=wish', L.wish) : '') + btn(page + (page.includes('?') ? '&' : '?') + 'go=cal', L.cal) + (/^https:\/\//.test(c.gift || '') ? btn(c.gift, L.gift) : ''));
  h += '<tr><td style="padding:14px 18px 16px;text-align:center;font-size:11px;color:#' + mute + '"><a href="' + H(unsub) + '" style="color:#' + mute + '">' + L.un + '</a> · <a href="' + site + '/invite" style="color:#' + mute + ';text-decoration:none">myluach.org</a></td></tr></table></td></tr></table></body></html>';
  const text = (greet ? greet + '\n\n' : '') + title + '\n' + when + (loc ? '\n' + loc : '') + '\n\n' + page + '\n\n' + L.un + ': ' + unsub;
  return { html: h, text, unsub };
}
/* שליחת המיילים שבתור, כמה בכל פעם (מגבלות השרת והספקים). נקרא מהדפדפן בלולאה, ומהמשימה היומית */
async function sendBatch(s, cur, n) {
  const { sendMail } = require('./_mail'), site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
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
/* המשימה היומית: ממשיכה שליחות שנעצרו (למשל כשהגענו למגבלה היומית של ספקי המייל) */
async function cronSend(max) {
  const Q = await db('timer_recip?status=eq.queued&select=slug&limit=2000').catch(() => []); const S = [...new Set((Q || []).map(x => x.slug))]; let sent = 0;
  for (const s of S) { if (sent >= max) break; const cur = await get(s).catch(() => null); if (!cur || !cur.paid) continue; const r = await sendBatch(s, cur, Math.min(40, max - sent)); sent += r.sent || 0; if (r.stop === 'limit') break; }
  return { sent };
}
async function guest(req, res, b) {
  const s = str(b.slug, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
  const cur = await get(s); if (!cur) return json(res, 404, { error: 'not found' });
  const c = cur.cfg || {}, meta = require('./_lib').reqMeta(req) || {}, clean1 = (v, n) => str(v, n).replace(/[<>]/g, '').trim();
  /* דף ההזמנה פתוח לאורחים רק אחרי תשלום */
  if (['rsvp', 'wish', 'teh'].includes(b.act) && !cur.paid) return json(res, 402, { error: 'unpaid' });
  try {
    if (b.act === 'rsvp') {
      if (!c.rv) return json(res, 403, { error: 'off' });
      const name = clean1(b.name, 80); if (!name) return json(res, 400, { error: 'name' });
      if (await recent('timer_rsvp', s, meta.ip) >= 15) return json(res, 429, { error: 'rate' });
      const st = ['yes', 'no', 'maybe'].includes(b.status) ? b.status : 'yes', n = v => Math.max(0, Math.min(50, parseInt(v, 10) || 0));
      await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, name, phone: clean1(b.phone, 30), status: st, adults: st === 'no' ? 0 : n(b.adults) || 1, kids: st === 'no' ? 0 : n(b.kids), note: clean1(b.note, 300) }) });
      return json(res, 200, { ok: true });
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
    if (b.act === 'owner') {
      const [t, r, w] = await Promise.all([db('timer_teh?slug=eq.' + s + '&select=round,chapter,name,created_at&order=round.asc,chapter.asc&limit=3000').catch(() => null),db('timer_rsvp?slug=eq.' + s + '&select=id,name,phone,status,adults,kids,note,created_at&order=created_at.desc&limit=2000').catch(() => null),
        db('timer_wall?slug=eq.' + s + '&select=id,name,text,public,hidden,created_at&order=created_at.desc&limit=1000').catch(() => null)]);
      const R = await db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err&order=id.asc&limit=10000').catch(() => null);
      const sent = (R || []).filter(x => x.status === 'sent').length;
      return json(res, 200, { rsvp: r, wall: w, teh: t, recip: R, paid: cur.paid ? { emails: +cur.paid.emails || 0, sent, at: cur.paid.at } : null, mail: cur.mail || null, setup: r === null || w === null, rsetup: R === null });
    }
    /* רשימת נמענים */
    if (b.act === 'radd') {
      const L = (Array.isArray(b.list) ? b.list : []).slice(0, 10000).map(x => ({ name: clean1(x && x.name, 80), email: str(x && x.email, 200).trim().toLowerCase() })).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.email));
      if (!L.length) return json(res, 400, { error: 'empty' });
      const have = await db('timer_recip?slug=eq.' + s + '&select=email&limit=10000').catch(() => []), H = new Set((have || []).map(x => x.email));
      if (H.size + L.length > 10000) return json(res, 400, { error: 'max' });
      const add = []; L.forEach(x => { if (!H.has(x.email)) { H.add(x.email); add.push({ slug: s, name: x.name, email: x.email, token: crypto.randomBytes(12).toString('hex'), status: 'new' }); } });
      for (let i = 0; i < add.length; i += 500) await db('timer_recip', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(add.slice(i, i + 500)) });
      return json(res, 200, { ok: true, added: add.length, skipped: L.length - add.length });
    }
    /* שליחה: מסמנים נמענים לשליחה (לפי היתרה), ושומרים את נושא המייל */
    if (b.act === 'send') {
      if (!cur.paid) return json(res, 402, { error: 'unpaid' });
      const R = await db('timer_recip?slug=eq.' + s + '&select=id,status&limit=10000');
      const sent = R.filter(x => x.status === 'sent').length, left = Math.max(0, (+cur.paid.emails || 0) - sent - R.filter(x => x.status === 'queued').length);
      const ids = Array.isArray(b.ids) && b.ids.length ? new Set(b.ids.map(Number)) : null;
      const pick = R.filter(x => (x.status === 'new' || x.status === 'fail' || (b.again && x.status === 'sent')) && (!ids || ids.has(x.id))).slice(0, left).map(x => x.id);
      await T_put_mail(s, cur, { subject: clean1(b.subject, 140) || 'הזמנה: ' + (c.t || 'האירוע'), note: clean1(b.note, 600) });
      for (let i = 0; i < pick.length; i += 300) await db('timer_recip?id=in.(' + pick.slice(i, i + 300).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'queued', err: null }) });
      return json(res, 200, { ok: true, queued: pick.length, left: left - pick.length });
    }
    if (b.act === 'mailpreview') { const m = inviteMail(s, cur, { name: str(b.name, 80) || 'משפחת ישראלי', token: '0'.repeat(24) }, (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '')); return json(res, 200, { html: m.html }); }
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
    if (req.method === 'GET' && q.prices) { const E = require('./_eventpay'), P = await E.prices(); return json(res, 200, { on: P.on, prices: P.prices, tiers: E.TIERS }); }
    if (req.method === 'GET') {
      const s = str(q.s, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
      /* קיר הברכות הציבורי */
      /* חלוקת תהילים: הסבב הנוכחי ומי לקח כל פרק */
      if (q.teh) { res.setHeader('Cache-Control', 'no-store'); return json(res, 200, await tehState(s)); }
      if (q.wall) { const L = await db('timer_wall?slug=eq.' + s + '&public=is.true&hidden=is.false&select=id,name,text,created_at&order=created_at.desc&limit=300').catch(() => []);
        res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { wall: L || [] }); }
      const o = RESERVED.has(s) ? { reserved: true } : await get(s);
      if (q.check) return json(res, 200, { free: !o });
      if (!o || o.reserved) return json(res, 404, { error: 'not found' });
      res.setHeader('Cache-Control', 'public, max-age=60');
      return json(res, 200, { cfg: o.cfg, paid: !!o.paid });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const b = readBody(req) || {};
    if (b.img) return upload(req, res, b);
    if (b.act) return guest(req, res, b);
    const s = str(b.slug, 40).toLowerCase();
    if (!SLUG.test(s) || RESERVED.has(s)) return json(res, 400, { error: 'slug' });
    const cfg = clean(b.cfg); if (!cfg.d) return json(res, 400, { error: 'date' });
    const cur = await get(s);
    if (cur) {
      const tok = str(b.token, 64);
      if (!tok || tok.length !== cur.token.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cur.token))) return json(res, 409, { error: 'taken' });
      await put(s, { ...cur, cfg, updated: new Date().toISOString() });
      return json(res, 200, { ok: true, slug: s, token: tok, updated: true });
    }
    const token = crypto.randomBytes(16).toString('hex');
    await put(s, { cfg, token, created: new Date().toISOString(), ip: (require('./_lib').reqMeta(req) || {}).ip || null });
    return json(res, 200, { ok: true, slug: s, token });
  } catch (e) { console.error('timer', e.message); return json(res, 500, { error: e.message === 'storage' ? 'storage' : 'server' }); }
};

module.exports.get = get; module.exports.put = put; module.exports.own = own;
module.exports.cronSend = cronSend; module.exports.inviteMail = inviteMail;
