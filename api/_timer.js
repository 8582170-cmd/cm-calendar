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
const agKey = h => { const [a, b] = String(h).split(':').map(Number); return (a < 5 ? a + 24 : a) * 60 + (b || 0); };  /* אחרי חצות נחשב המשך הערב */
const clampI = (v, a, z, d) => { v = parseInt(v, 10); return isFinite(v) ? Math.max(a, Math.min(z, v)) : d; };
/* לוח זמנים של תזכורות: [{d: ימים לפני האירוע, h: שעה ביום}] */
function sched(L, max, maxD) { const seen = {}; return (Array.isArray(L) ? L : []).slice(0, max * 2).map(x => ({ d: clampI(x && x.d, 0, maxD, 0), h: clampI(x && x.h, 6, 22, 10) })).filter(x => { const k = x.d + ':' + x.h; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, max).sort((a, b) => b.d - a.d || a.h - b.h); }
function clean(c) {
  c = c || {};
  return {
    t: str(c.t, 90), d: /^\d{4}-\d{2}-\d{2}$/.test(c.d) ? c.d : '', h: /^\d{1,2}:\d{2}$/.test(c.h || '') ? c.h : '',
    z: /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(c.z || '') ? c.z : 'Asia/Jerusalem', u: ['d', 'w', 'm'].includes(c.u) ? c.u : 'd',
    th: /^[a-z]{2,16}$/.test(c.th || '') ? c.th : 'classic', c: /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : '', b: /^([0-9a-f]{6}|none)$/i.test(c.b || '') ? c.b : '',
    lang: c.lang === 'en' ? 'en' : c.lang === 'yi' ? 'yi' : 'he', l: c.l === 'stack' ? 'stack' : 'row', fr: ['1', '2'].includes(String(c.fr)) ? String(c.fr) : '0',
    wp: ['bottom', 'none'].includes(c.wp) ? c.wp : 'top', wd: ['h', 'b'].includes(c.wd) ? c.wd : 'g', wh: ['o', 'c'].includes(c.wh) ? c.wh : 's', ww: String(c.ww) === '0' ? '0' : '1', wt: String(c.wt) === '0' ? '0' : '1', ns: String(c.ns) === '1' ? '1' : '0',
    p: okImg(c.p) ? c.p : '', ps: ['rect', 'wide'].includes(c.ps) ? c.ps : 'circle',
    /* דף הזמנה */
    inv: okImg(c.inv) ? c.inv : '', et: /^[a-z]{2,5}$/.test(c.et || '') ? c.et : '', n1: str(c.n1, 60), n2: str(c.n2, 60), f1: str(c.f1, 120), f2: str(c.f2, 120), it: str(c.it, 1500), pt: str(c.pt, 300), venue: str(c.venue, 120), addr: str(c.addr, 200),
    tr: /^\d{1,2}:\d{2}$/.test(c.tr || '') ? c.tr : '', tl: str(c.tl, 40), ...(c.trl != null ? { trl: str(c.trl, 30) } : {}), ...(Array.isArray(c.ag) ? { ag: c.ag.slice(0, 12).map(x => ({ h: /^\d{1,2}:\d{2}$/.test((x && x.h) || '') ? x.h : '', t: str(x && x.t, 60) })).filter(x => x.h && x.t) } : {}), bgm: ['glass', 'open'].includes(c.bgm) ? c.bgm : '', rv: c.rv ? 1 : 0, rm: c.rm ? 1 : 0, wl: c.wl ? 1 : 0, vm: ['tts', 'name', 'full'].includes(c.vm) ? c.vm : 'tts', wan: c.wan ? 1 : 0, wsec: c.wsec ? 1 : 0, wim: c.wim ? 1 : 0, wmv: c.wmv === 0 || c.wmv === '0' ? 0 : 1, wpub: c.wpub === 0 || c.wpub === '0' ? 0 : 1, gpub: c.gpub === 0 || c.gpub === '0' ? 0 : 1, wlay: ['side', 'left', 'bottom'].includes(c.wlay) ? c.wlay : 'side', gmin: Math.max(0, Math.min(100000, Math.round(+c.gmin || 0))), tp: c.tp ? 1 : 0, tpt: str(c.tpt, 120),
    gift: /^https:\/\/[^\s<>"']{6,300}$/.test(String(c.gift || '')) ? String(c.gift) : '', gl: str(c.gl, 40),
    /* אפשרויות לבחירת בעל האירוע: תזכורת למי שלא ענה (ימים לפני), תזכורת ביום האירוע, תודה אחרי, שאלות נוספות, גלריה, מתנה באשראי, SMS */
    nr: Math.max(0, Math.min(30, parseInt(c.nr, 10) || 0)), dr: c.dr ? 1 : 0, ty: c.ty ? 1 : 0, tyt: str(c.tyt, 600), ...(Array.isArray(c.nrs) ? { nrs: sched(c.nrs, 5, 60) } : {}), ...(Array.isArray(c.drs) ? { drs: sched(c.drs, 3, 14) } : {}), tyd: clampI(c.tyd, 1, 14, 1), tyh: clampI(c.tyh, 6, 22, 10),
    qs: (Array.isArray(c.qs) ? c.qs : []).slice(0, 10).map(x => ({ q: str(x && x.q, 80).replace(/[<>]/g, ''), o: (Array.isArray(x && x.o) ? x.o : []).slice(0, 12).map(v => str(v, 40).replace(/[<>]/g, '')).filter(Boolean) })).filter(x => x.q),
    gal: c.gal ? 1 : 0, gc: c.gc ? 1 : 0, sms: c.sms ? 1 : 0, ml: ['he', 'en', 'yi'].includes(c.ml) ? c.ml : '', vt: str(c.vt, 600).replace(/[<>]/g, ''), vrt: str(c.vrt, 600).replace(/[<>]/g, ''), clk: c.clk === 0 || c.clk === '0' ? 0 : 1,
    bgi: okImg(c.bgi) ? c.bgi : '', bgv: okMedia(c.bgv, 'video') ? c.bgv : '', mus: okMedia(c.mus, 'audio') ? c.mus : '', bgo: Math.max(0, Math.min(80, parseInt(c.bgo, 10) || 0))
  };
}
async function get(s) {
  const R2 = require('./_r2'); if (!R2.on()) throw new Error('storage');
  await loadFree();
  const r = await fetch(R2.presign('GET', key(s), 120)); if (r.status === 404) return null; if (!r.ok) throw new Error('r2 ' + r.status);
  return r.json();
}
async function put(s, obj) {
  const R2 = require('./_r2');
  const r = await fetch(R2.presign('PUT', key(s), 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
  if (!r.ok) throw new Error('r2 put ' + r.status);
  await evIndex(s, obj).catch(() => {});
}
/* אינדקס האירועים לניהול (טבלת timer_event): רק כתובות עם דף הזמנה או תשלום */
const INVF = ['et', 'inv', 'it', 'venue', 'addr', 'rv', 'wl', 'tp', 'gift'];
async function evIndex(s, o) {
  const c = (o && o.cfg) || {}, P = o && o.paid, inv = INVF.some(k => c[k]);
  if (!inv && !P) return;
  const row = { slug: s, title: String(c.t || '').slice(0, 120), date: /^\d{4}-\d{2}-\d{2}$/.test(c.d || '') ? c.d : null, kind: c.et || null, lang: c.lang || 'he',
    plan: P ? (P.free ? 'free' : 'full') : null, email: (P && P.email) || null, emails: P ? +P.emails || 0 : 0, sms: P ? +P.sms || 0 : 0, calls: P ? +P.calls || 0 : 0, calls_used: P ? +P.callsUsed || 0 : 0,
    disabled: !!o.disabled, updated_at: new Date().toISOString() };
  await db('timer_event?on_conflict=slug', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
}
/* אורחים: אישור הגעה וברכה. בעל האירוע (עם קוד העריכה): רשימות, הסתרה ומחיקה */
const { db } = require('./_lib');
/* ברכה / מתנה: מי רואה. vis = all (כולם, עם שם) / anon (כולם, בלי שם) / host (רק בעלי השמחה). noname = גם בעלי השמחה לא רואים את השם
   (רק אם בעל האירוע אפשר: wan = עילום שם לכולם, wsec = הסתרה גם ממנו) */
function wishVis(c, b) {
  let vis = ['all', 'anon', 'host'].includes(b.vis) ? b.vis : (b.pub === false ? 'host' : 'all');
  if (vis === 'anon' && !c.wan) vis = 'all';
  const noname = !!b.noname && !!c.wsec && vis !== 'all';
  return { vis, noname };
}
/* תמונה של ברכה: רק מהאחסון שלנו, בתיקייה של האירוע */
function okWishImg(u, s) { u = String(u || ''); const M = (() => { try { return require('./_r2').media(); } catch (e) { return null; } })(); return M && u.indexOf(M.url + '/timers/wish/' + s + '/') === 0 && /^[\w:/.-]+\.jpg$/.test(u) ? u : ''; }
/* מה מוצג לכולם: ברכות ומתנות פומביות (בלי שם כשביקשו) */
async function publicWall(s, c) {
  c = c || {}; const W = c.wpub !== 0, G = c.gpub !== 0; if (!W && !G) return [];
  const L = await db('timer_wall?slug=eq.' + s + '&public=is.true&hidden=is.false&select=id,name,text,created_at,vis,style,img,gift&order=created_at.desc&limit=500')
    .catch(() => db('timer_wall?slug=eq.' + s + '&public=is.true&hidden=is.false&select=id,name,text,created_at&order=created_at.desc&limit=300').catch(() => []));
  /* בעל האירוע בחר לא לפרסם ברכות ו/או מתנות: מורידים את מה שלא מתפרסם */
  return (L || []).map(w => ({ id: w.id, name: w.vis === 'anon' ? '' : w.name, text: W ? w.text : '', t: w.created_at, style: W ? w.style || '' : '', img: W ? w.img || '' : '', gift: G && w.gift ? +w.gift : 0 }))
    .filter(w => w.text || w.img || w.gift);
}
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
/* יכולת במסלול של האירוע (rem, seat, gal, media, gift, voice, sms). אירוע ישן בלי רשימת יכולות: הכל פתוח */
/* יכולות המסלול החינמי: נקבעות בניהול האירועים (נשמרות בזיכרון חצי דקה) */
let FREEF = {}, FREEAT = 0;
async function loadFree() { if (Date.now() - FREEAT < 30000) return; FREEAT = Date.now(); try { FREEF = (await require('./_eventpay').prices()).freeFeats || {}; } catch (e) {} }
const feat = (cur, k) => !!(cur && cur.paid) && (isFull(cur) ? (!cur.paid.feats || !!cur.paid.feats[k]) : !!FREEF[k]);
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
const YWD = ['זונטאג', 'מאנטאג', 'דינסטאג', 'מיטוואך', 'דאנערשטאג', 'פרייטאג', 'שבת קודש'], YMO = ['יאנואר', 'פעברואר', 'מערץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אויגוסט', 'סעפטעמבער', 'אקטאבער', 'נאוועמבער', 'דעצעמבער'];
function inviteMail(slug, cur, r, site, mode) {
  const c = cur.cfg || {}, th = THC[c.th] || THC.classic, acc = /^[0-9a-f]{6}$/i.test(c.c || '') ? c.c : th[0], bg = /^[0-9a-f]{6}$/i.test(c.b || '') ? c.b : th[1], dark = c.th === 'elegant' || c.th === 'digital';
  const ink = dark ? 'f3efe6' : '1a232c', mute = dark ? 'b8ae9c' : '5d6873', ML = c.ml || c.lang || 'he', EN = ML === 'en', YI = ML === 'yi', page = site + '/t/' + slug + '?' + (r.name ? 'to=' + encodeURIComponent(r.name) + '&' : '') + 'r=' + r.token;
  const title = c.t || (EN ? 'You are invited' : YI ? 'הזמנה' : 'הזמנה');
  let when = c.d; try { const d = new Date(c.d + 'T12:00:00Z');
    when = YI ? (c.ww !== '0' ? YWD[d.getUTCDay()] + ', ' : '') + d.getUTCDate() + 'טן ' + YMO[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
      : (c.ww !== '0' ? new Intl.DateTimeFormat(EN ? 'en-US' : 'he-IL', { weekday: 'long', timeZone: 'UTC' }).format(d) + ', ' : '') + new Intl.DateTimeFormat(EN ? 'en-US' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    if (c.wd === 'h' || c.wd === 'b') { const [y, mo, da] = c.d.split('-').map(Number), hm = /^(\d{1,2}):(\d{2})$/.exec(c.h || ''), ss = hm && c.wh !== 'c' ? sunsetH(y, mo, da, c.z || 'Asia/Jerusalem') : null, after = ss != null && (+hm[1] + hm[2] / 60) >= ss;
      const p = {}; new Intl.DateTimeFormat(EN ? 'en-u-ca-hebrew' : 'he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(d.getTime() + (after ? 864e5 : 0))).forEach(x => { p[x.type] = x.value; });
      let hd = EN ? p.day + ' ' + p.month + ' ' + p.year : gemN(+p.day) + (YI ? ' ' : ' ב') + p.month + ' ' + gemN(+p.year); if (after && c.wh === 'o') hd = (EN ? 'Eve of ' : 'אור ל') + hd;
      when = c.wd === 'h' ? hd : when + ' · ' + hd; } } catch (e) {}
  if (c.h) when += (EN || YI ? ' · ' : ' · בשעה ') + c.h;
  const greet = r.name ? String(c.pt || (EN ? 'Dear {name}, we would be delighted to celebrate with you!' : YI ? 'לכבוד {שם}, מיר וועלן זיך זייער פרייען אייך צו זען ביי אונזער שמחה!' : 'לכבוד {שם}, נשמח מאוד לראותך בשמחתנו!')).replace(/\{(שם|name)\}/g, r.name) : '';
  const img = site + '/api/pricing?c=_cdimg&d=' + c.d + (c.h ? '&h=' + encodeURIComponent(c.h) : '') + '&u=' + (c.u || 'd') + '&fg=' + acc + '&bg=' + bg + (c.z && c.z !== 'Asia/Jerusalem' ? '&z=' + encodeURIComponent(c.z) : '') + '&a=1';
  const btn = (href, label, pri) => '<a href="' + H(href) + '" target="_blank" style="display:inline-block;margin:4px;padding:10px 18px;border-radius:999px;border:2px solid #' + acc + ';' + (pri ? 'background:#' + acc + ';color:#' + bg : 'color:#' + acc) + ';font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">' + label + '</a>';
  const loc = [c.venue, c.addr].filter(Boolean).join(', '), dir = EN ? 'ltr' : 'rtl', unsub = site + '/api/pricing?c=_timer&unsub=' + r.token;
  const L = EN ? { rsvp: '✅ RSVP', wish: '✍️ Write a blessing', cal: '📅 Add to calendar', waze: '🚗 Waze', maps: '📍 Maps', gift: '🎁 ' + (c.gl || 'Gift'), rec: 'Reception', open: 'Open the invitation', un: 'Unsubscribe', me: 'Update or delete my email' }
                 : YI ? { rsvp: '✅ באשטעטיגן קומען', wish: '✍️ שרייבן א ברכה', cal: '📅 צולייגן צום קאלענדאר', waze: '🚗 וועיז', maps: '📍 מאפע', gift: '🎁 ' + (c.gl || 'מתנה'), rec: 'קבלת פנים', open: 'צו דער הזמנה', un: 'אראפנעמען פון דער ליסטע', me: 'טוישן אדער אויסמעקן מיין אימעיל' }
                 : { rsvp: '✅ אישור הגעה', wish: '✍️ כתיבת ברכה', cal: '📅 הוספה ליומן', waze: '🚗 וייז', maps: '📍 מפות', gift: '🎁 ' + (c.gl || 'מתנה'), rec: 'קבלת פנים', open: 'לדף ההזמנה', un: 'הסרה מרשימת התפוצה', me: 'עדכון או מחיקה של המייל שלי' };
  const trl = c.trl != null ? c.trl : (/^(wed|eng|sheva)$/.test(c.et || '') ? L.rec : '');
  const row = x => '<tr><td style="padding:8px 18px;text-align:center">' + x + '</td></tr>';
  let h = '<!doctype html><html dir="' + dir + '"><body style="margin:0;padding:0;background:#f4f2ee"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:16px 8px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#' + bg + ';border-radius:16px;overflow:hidden;direction:' + dir + ';font-family:Arial,sans-serif;color:#' + ink + '">';
  if (/^https:\/\//.test(c.inv || '')) h += '<tr><td><a href="' + H(page) + '" target="_blank"><img src="' + H(c.inv) + '" width="600" alt="' + H(title) + '" style="display:block;width:100%;height:auto;border:0"></a></td></tr>';
  const MH = { nr: EN ? 'We haven’t heard from you yet. Will you join us? Please reply with one click.' : YI ? 'מיר האבן נאך נישט באקומען אייער באשטעטיגונג. מיר וועלן זיך פרייען צו וויסן צי איר קומט, מיט איין קליק.' : 'עוד לא קיבלנו ממך אישור הגעה. נשמח לדעת אם תגיעו, בלחיצה אחת.', dr: EN ? 'Today is the day! Looking forward to seeing you.' : YI ? 'היינט איז די שמחה! מיר ווארטן אייך צו זען.' : 'היום זה קורה! מחכים לראותכם.', ty: c.tyt || (EN ? 'Thank you for celebrating with us!' : YI ? 'א הארציגן דאנק פארן מיטפרייען זיך מיט אונז!' : 'תודה רבה שהשתתפתם בשמחתנו!') };
  if (mode && MH[mode]) h += row('<div style="font-size:19px;font-weight:bold;color:#' + acc + ';white-space:pre-line">' + H(MH[mode]) + '</div>');
  if (greet && mode !== 'ty') h += row('<div style="font-size:21px;font-weight:bold;color:#' + acc + '">' + H(greet) + '</div>');
  if (cur.mail && cur.mail.note && !mode) h += row('<div style="font-size:16px;white-space:pre-line">' + H(cur.mail.note) + '</div>');
  if (c.it && !mode) h += row('<div style="font-size:16px;white-space:pre-line">' + H(c.it) + '</div>');
  h += row('<div style="font-size:22px;font-weight:bold;color:#' + acc + '">' + H(title) + '</div><div style="font-size:14px;color:#' + mute + ';margin-top:4px">' + H(when) + '</div>');
  const U = (c.u === 'm' ? ['months'] : c.u === 'w' ? ['weeks'] : []).concat(['days', 'hours', 'minutes', 'seconds']), UL = EN ? { months: 'months', weeks: 'weeks', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds' } : YI ? { months: 'חדשים', weeks: 'וואכן', days: 'טעג', hours: 'שעות', minutes: 'מינוט', seconds: 'סעקונדעס' } : { months: 'חודשים', weeks: 'שבועות', days: 'ימים', hours: 'שעות', minutes: 'דקות', seconds: 'שניות' };
  if (mode !== 'ty' && c.clk !== 0) h += row('<a href="' + H(page) + '" target="_blank"><img src="' + H(img) + '" width="420" alt="" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0"></a><table role="presentation" width="420" align="center" cellpadding="0" cellspacing="0" style="max-width:100%;direction:ltr;font-size:13px;color:#' + mute + ';text-align:center"><tr>' + U.map(k => '<td>' + UL[k] + '</td>').join('') + '</tr></table>');
  if (loc || c.tr || (c.ag && c.ag.length)) h += row('<div style="font-size:15px">' + (c.venue ? '<b style="color:#' + acc + '">' + H(c.venue) + '</b><br>' : '') + (c.addr ? H(c.addr) + '<br>' : '') + (Array.isArray(c.ag) ? c.ag.slice().sort((a, b) => agKey(a.h) - agKey(b.h)).map(x => H(x.h) + ' ' + H(x.t)).join('<br>') : (c.tr ? (trl ? H(trl) + ': ' : '') + H(c.tr) : '') + (c.tr && c.h && c.tl ? '<br>' : '') + (c.h && c.tl ? H(c.tl) + ': ' + H(c.h) : '')) + '</div>' +
    (c.addr ? '<div style="margin-top:6px">' + btn('https://waze.com/ul?q=' + encodeURIComponent(c.addr) + '&navigate=yes', L.waze) + btn('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc), L.maps) + '</div>' : ''));
  h += row((mode === 'ty' ? btn(page, L.open, true) + (c.gal ? btn(page + '&go=gal', EN ? '📷 Share your photos' : YI ? '📷 ארויפלייגן בילדער פון דער שמחה' : '📷 להעלאת תמונות מהאירוע') : '') : (c.rv && mode !== 'dr' ? btn(page + '&go=rsvp', L.rsvp, true) : btn(page, L.open, true)) + btn(page + '&go=cal', L.cal)) + (c.wl ? btn(page + '&go=wish', L.wish) : '') + (/^https:\/\//.test(c.gift || '') ? btn(c.gift, L.gift) : ''));
  h += '<tr><td style="padding:14px 18px 16px;text-align:center;font-size:11px;color:#' + mute + '"><a href="' + H(unsub) + '" style="color:#' + mute + '">' + L.un + '</a> · <a href="' + site + '/dir/" style="color:#' + mute + '">' + L.me + '</a> · <a href="' + site + '/invite" style="color:#' + mute + ';text-decoration:none">myluach.org</a></td></tr></table></td></tr></table></body></html>';
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
  const per = ((await require('./_eventpay').prices().catch(() => ({}))).mailsPerGuest) || 2, xm = +(cur.paid || {}).xm || 0;
  let room = Math.max(0, (+(cur.paid || {}).emails || 0) - sentN - Math.max(0, xm - (per - 1) * sentN));
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
/* תזכורות ומייל תודה אוטומטיים. כל אחד הוא "משימה" עם זמן: תאריך האירוע פחות N ימים, בשעה H (שעון ישראל).
   משימה שהגיע זמנה (בחלון של 36 שעות) נשלחת פעם אחת למי שמתאים. מה שכבר נשלח נשמר באירוע (rjobs), כדי שלא יישלח פעמיים.
   מקבלים: nr = מי שעוד לא ענה, dr = מי שאישר (לפני האירוע), ty = מי שאישר (אחרי האירוע).
   מכסה: כל מוזמן שנשלחה לו הזמנה מקבל מייל נוסף אחד כלול (mailsPerGuest = 2 כולל ההזמנה). מעבר לזה כל מייל מנצל מייל מהחבילה. */
const ILP = ms => { const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; }); return p; };
const ilOff = x => { const p = ILP(x); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - x; };
const ilMs = (y, m, d, h, mi) => { const g = Date.UTC(y, m - 1, d, h, mi || 0); return g - ilOff(g - ilOff(g)); };
function mailJobs(c) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.d || '')) return [];
  const [y, m, d] = c.d.split('-').map(Number), hm = /^(\d{1,2}):(\d{2})$/.exec(c.h || '');
  const start = hm ? ilMs(y, m, d, +hm[1], +hm[2]) : ilMs(y, m, d + 1, 0), jobs = [];
  const nrs = Array.isArray(c.nrs) ? c.nrs : (c.nr > 0 ? [{ d: +c.nr, h: 10 }] : []);
  const drs = Array.isArray(c.drs) ? c.drs : (c.dr ? [{ d: 0, h: 8 }] : []);
  nrs.forEach(x => { if (c.rv) jobs.push({ key: 'nr:' + x.d + ':' + x.h, kind: 'nr', at: ilMs(y, m, d - x.d, x.h), end: start }); });
  drs.forEach(x => jobs.push({ key: 'dr:' + x.d + ':' + x.h, kind: 'dr', at: ilMs(y, m, d - x.d, x.h), end: start }));
  if (c.ty) jobs.push({ key: 'ty', kind: 'ty', at: ilMs(y, m, d + (c.tyd || 1), c.tyh == null ? 10 : c.tyh), end: Infinity });
  return jobs;
}
async function autoMails(cover, max) {
  const idx = (await require('./_lib').loadSetting('evpaid').catch(() => null)) || {}, out = { nr: 0, dr: 0, ty: 0 };
  if (await holyAt(Date.now())) return { ...out, shabbat: true };
  const now = Date.now(), lo = new Date(now - 20 * 864e5).toISOString().slice(0, 10), hi = new Date(now + 62 * 864e5).toISOString().slice(0, 10);
  const site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, ''), { sendMail } = require('./_mail');
  const per = ((await require('./_eventpay').prices().catch(() => ({}))).mailsPerGuest) || 2; let budget = max;
  for (const s of Object.keys(idx)) {
    if (budget <= 0) break;
    if (!idx[s] || idx[s] < lo || idx[s] > hi) continue;
    let cur = await get(s).catch(() => null); if (!feat(cur, 'rem') || cur.disabled) continue; const c = cur.cfg || {};
    const rj = cur.rjobs || {}, due = mailJobs(c).filter(j => now >= j.at && now < j.at + 36 * 3600e3 && now < j.end && !(rj[j.key] && rj[j.key].done));
    if (!due.length) continue;
    const R = await db('timer_recip?slug=eq.' + s + '&status=eq.sent&select=id,name,email,token&limit=10000').catch(() => []);
    const ans = await db('timer_rsvp?slug=eq.' + s + '&rtok=not.is.null&select=rtok,status&limit=10000').catch(() => []), A = {}; (ans || []).forEach(x => { A[x.rtok] = x.status; });
    const P = cur.paid, invited = R.length, incl = (per - 1) * invited;
    for (const job of due) {
      const st = rj[job.key] || { ids: [] }, did = new Set(st.ids), who = R.filter(r => !did.has(r.id) && (job.kind === 'nr' ? !A[r.token] : A[r.token] === 'yes'));
      let extra = +P.xm || 0, over = Math.max(0, extra - incl), room = Math.max(0, incl - extra) + Math.max(0, (+P.emails || 0) - invited - over), sentNow = 0;
      for (const r of who) {
        if (budget <= 0 || room <= 0) break;
        const mm = inviteMail(s, cur, r, site, job.kind), ML = c.ml || c.lang || 'he';
        const subj = { nr: (ML === 'en' ? 'Reminder: please RSVP · ' : ML === 'yi' ? 'דערמאנונג: ביטע באשטעטיגט · ' : 'תזכורת: נשמח לאישור הגעה · '), dr: (ML === 'en' ? 'Reminder · ' : ML === 'yi' ? 'דערמאנונג · ' : 'תזכורת לאירוע · '), ty: (ML === 'en' ? 'Thank you · ' : ML === 'yi' ? 'א דאנק · ' : 'תודה · ') }[job.kind] + (c.t || '');
        try { await sendMail({ to: r.email, subject: subj, html: mm.html, text: mm.text, replyTo: P.email || undefined, headers: { 'List-Unsubscribe': '<' + mm.unsub + '>' } }, 'invite-' + job.kind); did.add(r.id); budget--; room--; sentNow++; out[job.kind]++; }
        catch (e) { if (/no mail provider/.test(e.message)) { budget = 0; break; } }
      }
      if (sentNow) await db('timer_recip?id=in.(' + [...did].slice(-sentNow).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ [job.kind + '_at']: new Date().toISOString() }) }).catch(() => {});
      const finished = who.every(r => did.has(r.id));
      rj[job.key] = { at: new Date().toISOString(), ids: finished ? [] : [...did], done: finished };
      cur = { ...cur, rjobs: rj, paid: { ...P, xm: (+P.xm || 0) + sentNow } }; P.xm = cur.paid.xm;
      await put(s, cur).catch(e => console.error('autoMails put', s, e.message));
    }
  }
  return out;
}
/* תזכורת קולית אוטומטית לפני האירוע (אם הופעלה בניהול האירועים ← תזמון): למי שביקש בשלוחה "לתזכורת הקישו 1" (call_rem=1).
   daysBefore ימים לפני האירוע, מהיתרה של שיחות האירוע. אחרי השיחה call_rem=2, כדי שלא יתקשרו שוב */
async function autoCalls(cover, daysBefore) {
  const EP = await require('./_eventpay').prices().catch(() => ({})), V = require('./_ivoice'), out = { events: 0, calls: 0, noQuota: 0 };
  if (!EP.voiceOn || !(await V.ready().catch(() => false))) return { off: true };
  const idx = (await require('./_lib').loadSetting('evpaid').catch(() => null)) || {}, { addD, iso, todayIL } = require('./_rem'), today = todayIL();
  const covered = cover.map(k => iso(addD(today, k))), site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  for (const s of Object.keys(idx)) {
    const cur = await get(s).catch(() => null); if (!feat(cur, 'voice') || cur.disabled) continue; const c = cur.cfg || {}; if (!/^\d{4}-\d{2}-\d{2}$/.test(c.d || '')) continue;
    const [y, m, d] = c.d.split('-').map(Number); if (!covered.includes(iso(addD(new Date(y, m - 1, d, 12), -Math.max(0, daysBefore))))) continue;
    let L = await db('timer_recip?slug=eq.' + s + '&call_rem=eq.1&phone=not.is.null&status=neq.unsub&select=id,name,phone&limit=5000').catch(() => []); if (L && L.length) L = await V.drop(L); if (!L || !L.length) continue;
    const P = { ...cur.paid }, left = (+P.calls || 0) - (+P.callsUsed || 0); if (left <= 0) { out.noQuota++; continue; }
    if (L.length > left) { out.noQuota++; L = L.slice(0, left); }
    try {
      const x = await V.sendTTS(L, c.vrt || V.defText(c, 'rem', EP), site + '/api/pricing?c=_ivrcb&k=' + EP.vkey + '&s=' + s), now = new Date().toISOString();
      P.callsUsed = (+P.callsUsed || 0) + x.n; const calls = [{ id: x.id, at: now, n: x.n, mode: 'rem', auto: 1, tts: 1, fin: 1 }].concat(cur.calls || []).slice(0, 30);
      await put(s, { ...cur, paid: P, calls });
      const ids = L.map(r => r.id); for (let i = 0; i < ids.length; i += 200) await db('timer_recip?slug=eq.' + s + '&id=in.(' + ids.slice(i, i + 200).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_rem: 2, call_at: now, call_st: 'ממתין', call_cid: x.id }) }).catch(() => {});
      out.events++; out.calls += x.n;
    } catch (e) { console.error('auto calls', s, e.message); }
  }
  return out;
}
/* מחיקת סרטונים ומוזיקה של אירועים שלא שולמו תוך שבוע מההעלאה */
async function cleanMedia() {
  const { loadSetting, saveSetting } = require('./_lib'), M = (await loadSetting('mediapend').catch(() => null)) || {}, R2 = require('./_r2'), MB = R2.media(); if (!MB) return { deleted: 0 };
  let del = 0, kept = 0, changed = false; const MD = ((await require('./_eventpay').prices().catch(() => ({}))).mediaDays) || 7;
  for (const path of Object.keys(M)) {
    const x = M[path]; if (Date.now() - x.at < MD * 864e5) continue;
    const cur = await get(x.s).catch(() => null);
    if (feat(cur, 'media')) { delete M[path]; changed = true; kept++; continue; }
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
  if (cur.disabled && b.act !== 'owner') return json(res, 410, { error: 'disabled' });
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
      const rtok = /^[0-9a-f]{24}$/.test(String(b.r || '')) ? String(b.r) : null, ans = (Array.isArray(b.ans) ? b.ans : []).slice(0, 10).map(v => clean1(v, 100));
      const row = { slug: s, name, phone: clean1(b.phone, 30), status: st, adults: st === 'no' ? 0 : n(b.adults) || 1, kids: st === 'no' ? 0 : n(b.kids), note: clean1(b.note, 300), rtok, ans: ans.length ? ans : null };
      /* מי שהגיע מקישור אישי: עדכון של התשובה הקודמת שלו, לא שורה חדשה */
      const prev = rtok ? await db('timer_rsvp?slug=eq.' + s + '&rtok=eq.' + rtok + '&select=id&limit=1').catch(() => []) : [];
      if (prev && prev[0]) await db('timer_rsvp?id=eq.' + prev[0].id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      else await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(async e => { if (/rtok|ans|column/.test(e.message)) { delete row.rtok; delete row.ans; await db('timer_rsvp', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); } else throw e; });
      return json(res, 200, { ok: true });
    }
    if (b.act === 'gal') {
      if (!c.gal || !feat(cur, 'gal')) return json(res, 403, { error: 'off' });
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
      const name = clean1(b.name, 80), text = clean1(b.text, 1000), img = okWishImg(b.img, s); if (!name || (!text && !img)) return json(res, 400, { error: 'text' });
      if (await recent('timer_wall', s, meta.ip) >= 10) return json(res, 429, { error: 'rate' });
      const V = wishVis(c, b), row = { slug: s, name, text, public: V.vis !== 'host', vis: V.vis, noname: V.noname, style: /^[a-z0-9-]{1,20}$/.test(String(b.style || '')) ? b.style : null, img: img || null };
      await db('timer_wall', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) })
        .catch(async e => { if (!/vis|noname|style|img|column/.test(e.message)) throw e; await db('timer_wall', { meta, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug: s, name, text: text || '🖼', public: row.public }) }); });
      return json(res, 200, { ok: true });
    }
    /* תמונה אישית לברכה (מוקטנת בדפדפן), אם בעל האירוע אפשר */
    if (b.act === 'wimg' || b.act === 'wdes') {
      if (!c.wl || (b.act === 'wimg' && !c.wim)) return json(res, 403, { error: 'off' });
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || '')); if (!m) return json(res, 400, { error: 'type' });
      const buf = Buffer.from(m[1], 'base64'); if (buf.length > 900000) return json(res, 413, { error: 'big' });
      if (await recent('timer_wall', s, meta.ip) >= 10) return json(res, 429, { error: 'rate' });
      const R2 = require('./_r2'); if (!R2.media()) return json(res, 503, { error: 'storage' });
      const P = R2.mediaPut('timers/wish/' + s + '/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.jpg');
      const r = await fetch(P.upload, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf }); if (!r.ok) throw new Error('r2 ' + r.status);
      return json(res, 200, { ok: true, url: P.url });
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
      const EPf = await require('./_eventpay').prices().catch(() => ({})); if (mine.length >= (EPf.freeMax || 3)) return json(res, 429, { error: 'max' });
      F[user.id] = mine.concat(s); await saveSetting('evfree', F);
      await put(s, { ...cur, paid: { free: true, emails: EPf.freeEmails || 20, sms: 0, email: user.email || '', orders: [], at: new Date().toISOString() } });
      await require('./_eventpay').index(s, c.d).catch(() => {});
      return json(res, 200, { ok: true });
    }
    if (b.act === 'owner') {
      /* הודעות קוליות: עדכון הסטטוס של כל מוזמן מהקמפיינים של הימים האחרונים */
      const open = (cur.calls || []).filter(x => !x.fin && Date.now() - Date.parse(x.at) < 4 * 864e5).slice(0, 3);
      if (open.length) { try { const V = require('./_ivoice'); let ch = false;
        for (const k of open) { const st = await V.status(k.id), by = {}; st.entries.forEach(e => { if (e.phone) (by[e.st] = by[e.st] || []).push(e.phone); });
          for (const [t2, ph] of Object.entries(by)) for (let i = 0; i < ph.length; i += 150) await db('timer_recip?slug=eq.' + s + '&call_cid=eq.' + encodeURIComponent(k.id) + '&phone=in.(' + ph.slice(i, i + 150).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: t2 }) }).catch(() => {});
          if (/FINISHED|STOPPED/.test(st.st || '')) { k.fin = 1; k.price = st.price; ch = true; } }
        if (ch) await put(s, cur); } catch (e) {} }
      const [t, r, w] = await Promise.all([db('timer_teh?slug=eq.' + s + '&select=round,chapter,name,created_at&order=round.asc,chapter.asc&limit=3000').catch(() => null),db('timer_rsvp?slug=eq.' + s + '&select=id,name,phone,status,adults,kids,note,created_at&order=created_at.desc&limit=2000').catch(() => null),
        db('timer_wall?slug=eq.' + s + '&select=id,name,text,public,hidden,created_at,vis,noname,style,img,gift&order=created_at.desc&limit=1000').catch(() => db('timer_wall?slug=eq.' + s + '&select=id,name,text,public,hidden,created_at&order=created_at.desc&limit=1000').catch(() => null))]);
      /* ברכה / מתנה שהנותן ביקש להסתיר את שמו גם מבעלי השמחה */
      (w || []).forEach(x => { if (x.noname) x.name = ''; });
      const R = await db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at,opened_at,last_open,opens,call_at,call_st,call_rem,dir_id,email_src&order=id.asc&limit=10000').catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at,opened_at,last_open,opens,call_at,call_st,call_rem&order=id.asc&limit=10000')).catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at,opened_at,last_open,opens&order=id.asc&limit=10000')).catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err,grp,cnt,phone,token,nr_at,dr_at,ty_at,sms_at&order=id.asc&limit=10000')).catch(() => db('timer_recip?slug=eq.' + s + '&select=id,name,email,status,sent_at,err&order=id.asc&limit=10000').catch(() => null));
      /* פרטיות: טלפון ומייל מספרי הטלפונים, ומייל שהמוזמן מסר בטלפון / באזור האישי, לא מוצגים לבעל האירוע (רק שיש) */
      /* לזיהוי (כשיש שמות זהים): שם האב, החותן והכתובת מהמאגר */
      const DI = [...new Set((R || []).map(x => x.dir_id).filter(Boolean))], DM = {};
      for (let i = 0; i < DI.length; i += 200) ((await db('dir_person?id=in.(' + DI.slice(i, i + 200).join(',') + ')&select=id,father,fil,street,city&limit=200').catch(() => [])) || []).forEach(p => { DM[p.id] = p; });
      (R || []).forEach(x => { const p = DM[x.dir_id]; if (p) x.dinfo = [p.father ? 'בן ' + p.father : '', p.fil ? 'חתן ' + p.fil : '', [p.street, p.city].filter(Boolean).join(', ')].filter(Boolean).join(' · '); });
      (R || []).forEach(x => { if (x.dir_id) { x.hp = x.phone ? 1 : 0; x.phone = null; x.dir = 1; }
        if ((x.dir_id || /^(phone|self|dir)$/.test(x.email_src || '')) && x.email && !/@phone\.invalid$/.test(x.email)) { x.hm = 1; x.email = 'hidden@mail.invalid'; }
        delete x.dir_id; delete x.email_src; });
      const G = await db('timer_gift?slug=eq.' + s + '&status=eq.paid&amount=gt.0&select=id,name,msg,amount,fee,net,payout,paid_at,vis,noname&order=paid_at.desc&limit=2000').catch(() => db('timer_gift?slug=eq.' + s + '&status=eq.paid&select=id,name,msg,amount,fee,net,payout,paid_at&order=paid_at.desc&limit=2000').catch(() => null));
      (G || []).forEach(x => { if (x.noname) x.name = ''; });
      const EP = await require('./_eventpay').prices().catch(() => ({}));
      const stale = (R || []).filter(x => x.call_st === 'ממתין' && x.call_at && Date.now() - Date.parse(x.call_at) > 2 * 3600e3);
      if (stale.length) { stale.forEach(x => { x.call_st = 'לא ענה'; }); const sid = stale.map(x => x.id); for (let i = 0; i < sid.length; i += 200) await db('timer_recip?slug=eq.' + s + '&call_st=eq.' + encodeURIComponent('ממתין') + '&id=in.(' + sid.slice(i, i + 200).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: 'לא ענה' }) }).catch(() => {}); }
      const sent = (R || []).filter(x => x.status === 'sent').length;
      if (r) { const R2x = await db('timer_rsvp?slug=eq.' + s + '&select=id,rtok,ans,seat&limit=2000').catch(() => null); if (R2x) { const m = {}; R2x.forEach(x => { m[x.id] = x; }); r.forEach(x => Object.assign(x, m[x.id] || {})); } }
      return json(res, 200, { gifts: G, seat: cur.seat || null, gal: cur.cfg && cur.cfg.gal ? await galList(s).catch(() => []) : [], consent: cur.consent ? { at: cur.consent.at, v: cur.consent.v } : null, flags: { mpg: EP.mailsPerGuest || 2, giftOn: !!EP.giftOn, smsOn: !!EP.smsOn, giftPct: EP.giftPct, giftFixed: EP.giftFixed, voiceOn: !!EP.voiceOn, voiceInv: !!(EP.voiceTpl || EP.voicePath) }, vaudio: cur.vaudio || {}, vbridge: !!EP.voicePath, voice: cur.paid ? { calls: +cur.paid.calls || 0, used: +cur.paid.callsUsed || 0, tests: +cur.paid.vtests || 0, camps: (cur.calls || []).slice(0, 10), def: require('./_ivoice').defText(c, 'inv', EP), defRem: require('./_ivoice').defText(c, 'rem', EP), defTy: require('./_ivoice').defText(c, 'ty', EP) } : null, sms: cur.paid ? +cur.paid.sms || 0 : 0, rsvp: r, wall: w, teh: t, recip: R, paid: cur.paid ? { emails: +cur.paid.emails || 0, xm: +cur.paid.xm || 0, sent, at: cur.paid.at, free: !!cur.paid.free, plan: cur.paid.plan || '', planPrice: cur.paid.planPrice, feats: cur.paid.feats || null } : null, mail: cur.mail || null, setup: r === null || w === null, rsetup: R === null });
    }
    /* רשימת נמענים */
    /* ספרי טלפונים: המאגרים שמותרים לבעל האירוע, חיפוש (בלי טלפון ומייל), והוספה לרשימת המוזמנים */
    if (b.act === 'dirbooks' || b.act === 'dirsearch' || b.act === 'diradd') {
      const D = require('./_dir'), DC = await D.cfg();
      if (!DC.on || !(DC.voice || DC.mail)) return json(res, 403, { error: 'off' });
      const em = String((cur.paid && cur.paid.email) || '').toLowerCase();
      /* המסלול של האירוע צריך לפתוח את המאגרים (בהגדרת המסלולים), ומאגר בתשלום צריך להיפתח (קנייה) */
      const EB = await D.eventBooks(cur, em);
      if (b.act === 'dirbooks') {
        if (!EB) { const E = await require('./_eventpay').prices().catch(() => ({ plans: [] })), ok = E.plans.filter(p => !p.hidden && p.feats && p.feats.dir).map(p => p.name);
          return json(res, 402, { error: 'plan', plans: ok, any: (await D.books(em)).length > 0 }); }
        return json(res, 200, { books: EB, voice: DC.voice, mail: DC.mail, max: DC.maxAdd });
      }
      const bk = EB && EB.find(x => x.id === parseInt(b.book, 10));
      if (!bk) return json(res, 403, { error: 'book' }); if (!bk.open) return json(res, 402, { error: 'locked', price: bk.price });
      const need = DC.voice && DC.mail ? '' : DC.voice ? 'phone' : 'email', F0 = { book: b.book, city: b.city, q: b.q, need };
      if (b.act === 'dirsearch') { const r = await D.search(em, { ...F0, off: b.off }); return json(res, r.error ? 403 : 200, r); }
      if (!cur.paid) return json(res, 402, { error: 'unpaid' });
      const have = (await db('timer_recip?slug=eq.' + s + '&select=email,phone,dir_id&limit=10000').catch(() => db('timer_recip?slug=eq.' + s + '&select=email,phone&limit=10000'))) || [];
      const HE = new Set(have.map(x => x.email)), HP = new Set(have.map(x => x.phone).filter(Boolean)), HD = new Set(have.map(x => x.dir_id).filter(Boolean));
      const room = Math.min(DC.maxAdd - HD.size, 10000 - have.length); if (room <= 0) return json(res, 400, { error: 'max', max: DC.maxAdd });
      const L = await D.resolve(em, { ...F0, ids: Array.isArray(b.ids) ? b.ids : null }, Math.min(room + HD.size, 20000)); if (!L) return json(res, 403, { error: 'book' });
      const grp = clean1(b.grp, 40), add = [];
      for (const p of L) {
        if (add.length >= room) break; if (HD.has(p.id)) continue;
        const phone = DC.voice ? (p.phone || p.mobile) : null, mail = DC.mail && p.email ? p.email : null;
        const email = mail || (phone ? 'sms-' + phone + '@phone.invalid' : ''); if (!email || HE.has(email) || (phone && HP.has(phone))) continue;
        HE.add(email); if (phone) HP.add(phone);
        add.push({ slug: s, name: D.inviteName(p) || D.nameOf(p) || '', email, token: crypto.randomBytes(12).toString('hex'), status: 'new', dir_id: p.id, ...(mail ? { email_src: 'dir' } : {}), ...(phone ? { phone } : {}), ...(grp ? { grp } : {}) });
      }
      for (let i = 0; i < add.length; i += 500) await db('timer_recip', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(add.slice(i, i + 500)) });
      return json(res, 200, { ok: true, added: add.length, skipped: L.length - add.length });
    }
    /* פנקס הכתובות: המוזמנים מאירועים קודמים של אותו בעל אירוע (לפי המייל של החשבון ששילם) */
    if (b.act === 'rprev' || b.act === 'rcopy') {
      const em = String((cur.paid && cur.paid.email) || '').toLowerCase(); if (!em) return json(res, 200, { events: [] });
      const E = ((await db('timer_event?email=eq.' + encodeURIComponent(em) + '&slug=neq.' + s + '&select=slug,title,date&order=date.desc.nullslast&limit=50').catch(() => [])) || []);
      if (b.act === 'rprev') { const out = []; for (const e of E) { const n = ((await db('timer_recip?slug=eq.' + e.slug + '&status=neq.unsub&select=id&limit=10000').catch(() => [])) || []).length; if (n) out.push({ ...e, n }); } return json(res, 200, { events: out }); }
      const from = E.find(e => e.slug === String(b.from || '')); if (!from) return json(res, 403, { error: 'from' });
      const src = (await db('timer_recip?slug=eq.' + from.slug + '&status=neq.unsub&select=name,email,phone,grp,cnt,dir_id,email_src&order=id.asc&limit=10000').catch(() => db('timer_recip?slug=eq.' + from.slug + '&status=neq.unsub&select=name,email,phone,grp,cnt&order=id.asc&limit=10000'))) || [];
      const have = (await db('timer_recip?slug=eq.' + s + '&select=email,phone&limit=10000')) || [], HE = new Set(have.map(x => x.email)), HP = new Set(have.map(x => x.phone).filter(Boolean));
      const add = [];
      for (const x of src) { if (have.length + add.length >= 10000) break; if (HE.has(x.email) || (x.phone && HP.has(x.phone))) continue; HE.add(x.email); if (x.phone) HP.add(x.phone);
        add.push({ slug: s, name: x.name, email: x.email, token: crypto.randomBytes(12).toString('hex'), status: 'new', ...(x.phone ? { phone: x.phone } : {}), ...(x.grp ? { grp: x.grp } : {}), ...(x.cnt ? { cnt: x.cnt } : {}), ...(x.dir_id ? { dir_id: x.dir_id } : {}), ...(x.email_src ? { email_src: x.email_src } : {}) }); }
      for (let i = 0; i < add.length; i += 500) await db('timer_recip', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(add.slice(i, i + 500)) });
      return json(res, 200, { ok: true, added: add.length, skipped: src.length - add.length });
    }
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
    /* הצהרת בעל האירוע לפני שליחה: מכיר את כל הנמענים והם מכירים אותו, ושימוש רק להזמנות לאירוע שלו */
    if (b.act === 'consent') {
      const c2 = b.off ? null : { at: new Date().toISOString(), v: 1 };
      await put(s, { ...cur, consent: c2 }); return json(res, 200, { ok: true, consent: c2 });
    }
    if (['send', 'smsnext', 'voice'].includes(b.act) && !(cur.consent && cur.consent.v >= 1)) return json(res, 400, { error: 'consent', message: 'לפני שליחה צריך לאשר את ההצהרה על הנמענים' });
    if (b.act === 'send') {
      if (!cur.paid) return json(res, 402, { error: 'unpaid' });
      const R = (await db('timer_recip?slug=eq.' + s + '&select=id,status,email&limit=10000')).filter(x => !/@phone\.invalid$/.test(x.email));
      const sent = R.filter(x => x.status === 'sent').length, left = Math.max(0, (+cur.paid.emails || 0) - sent - R.filter(x => x.status === 'queued').length);
      const ids = Array.isArray(b.ids) && b.ids.length ? new Set(b.ids.map(Number)) : null;
      const pick = R.filter(x => (x.status === 'new' || x.status === 'fail' || (b.again && x.status === 'sent')) && (!ids || ids.has(x.id))).slice(0, left).map(x => x.id);
      let at = null;
      if (b.at) { at = Date.parse(b.at); if (!isFinite(at)) return json(res, 400, { error: 'at' }); if (at < Date.now() + 2 * 60e3) at = null; else if (at > Date.now() + 400 * 864e5) return json(res, 400, { error: 'far' }); }
      const hz = await holyAt(at || Date.now()); if (hz) return json(res, 400, { error: 'shabbat', end: hz.end });
      await T_put_mail(s, cur, { subject: clean1(b.subject, 140) || ((c.ml || c.lang) === 'yi' ? 'הזמנה: ' : (c.ml || c.lang) === 'en' ? 'Invitation: ' : 'הזמנה: ') + (c.t || ''), note: clean1(b.note, 600), at: at ? new Date(at).toISOString() : null });
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
    if (['tables', 'seatset', 'seatbulk'].includes(b.act) && !feat(cur, 'seat')) return json(res, 402, { error: 'full' });
    if (b.act === 'smsnext' && !feat(cur, 'sms')) return json(res, 402, { error: 'full' });
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
    /* הודעה קולית (ימות המשיח, אם הופעל בניהול): הזמנה עם אישור הגעה בהקשה, או תזכורת למי שאישר */
    if (b.act === 'voice' || b.act === 'voicetest') {
      const EP = await require('./_eventpay').prices(), V = require('./_ivoice');
      if (!EP.voiceOn || !(await V.ready())) return json(res, 403, { error: 'voice off' });
      /* קבצי שמע של האירוע (הקלטה או קובץ): השם, ההזמנה כולה, פתיחה וסיום. כבר מומרים בדפדפן לאיכות של טלפון (WAV, 8kHz, מונו).
         נשמרים באחסון שלנו (להשמעה מקדימה) ובשלוחת האישור בימות (להשמעה בשיחה). עובד רק כשמוגדרת שלוחת אישור (voicePath) */
      if (b.act === 'vaudio' || b.act === 'vaudiodel') {
        if (!feat(cur, 'voice')) return json(res, 402, { error: 'full' });
        if (!EP.voicePath) return json(res, 403, { error: 'path' });
        const kind = ['name', 'full', 'intro', 'outro'].includes(b.kind) ? b.kind : null; if (!kind) return json(res, 400, { error: 'kind' });
        const VA = { ...(cur.vaudio || {}) };
        if (b.act === 'vaudiodel') { delete VA[kind]; await put(s, { ...cur, vaudio: VA }); return json(res, 200, { ok: true, vaudio: VA }); }
        const m = /^data:audio\/wav;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.wav || '')); if (!m) return json(res, 400, { error: 'type' });
        const buf = Buffer.from(m[1], 'base64'); if (buf.length < 1000 || buf.length > 2600000 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return json(res, 400, { error: 'wav' });
        const nm = 'ev' + crypto.createHash('sha1').update(s).digest('hex').slice(0, 10) + kind.charAt(0) + Date.now().toString(36);
        try { await V.upload('ivr2:/' + EP.voicePath + '/' + nm + '.wav', buf); } catch (e) { console.error('vaudio upload', e.message); return json(res, 502, { error: 'yemot', message: String(e.message).slice(0, 120) }); }
        let url = ''; try { const R2 = require('./_r2'); if (R2.media()) { const P2 = R2.mediaPut('timers/voice/' + s + '/' + nm + '.wav'); const r2 = await fetch(P2.upload, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: buf }); if (r2.ok) url = P2.url; } } catch (e) {}
        VA[kind] = { y: nm, url, sec: Math.round((buf.length - 44) / 16000 * 10) / 10, at: new Date().toISOString() };
        await put(s, { ...cur, vaudio: VA }); return json(res, 200, { ok: true, vaudio: VA });
      }
      if (!feat(cur, 'voice')) return json(res, 402, { error: 'full' });
      if (b.mode !== 'rem' && b.mode !== 'ty' && !EP.voiceTpl && !EP.voicePath) return json(res, 403, { error: 'tpl' });
      const hz = await holyAt(Date.now()); if (hz) return json(res, 400, { error: 'shabbat' });
      const hr = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Jerusalem' }).format(new Date()); if (hr < (EP.vFrom || 8) || hr >= (EP.vTo || 22)) return json(res, 400, { error: 'night', from: EP.vFrom || 8, to: EP.vTo || 22 });
      const mode = b.mode === 'rem' ? 'rem' : b.mode === 'ty' ? 'ty' : 'inv', text = str(b.text, 600).replace(/[<>]/g, ''), P = cur.paid, now = new Date().toISOString();
      if (b.act === 'voicetest') { const ph = V.phone(b.phone); if (!ph) return json(res, 400, { error: 'phone' }); if ((+P.vtests || 0) >= (EP.vTests || 5)) return json(res, 429, { error: 'tests' });
        const site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
        if (mode === 'rem' || mode === 'ty') await V.sendTTS([{ phone: ph }], text || V.defText(c, mode, EP)); else await V.run(cur, [{ phone: ph, name: clean1(b.name, 40) }], mode, text); P.vtests = (+P.vtests || 0) + 1; await put(s, { ...cur, paid: P }); return json(res, 200, { ok: true }); }
      let L = await db('timer_recip?slug=eq.' + s + '&phone=not.is.null&status=neq.unsub&select=id,name,phone,token,grp,opened_at,call_at,call_rem&order=id.asc&limit=20000').catch(() => db('timer_recip?slug=eq.' + s + '&phone=not.is.null&status=neq.unsub&select=id,name,phone,token,grp,opened_at&order=id.asc&limit=20000'));
      const A = {}; ((await db('timer_rsvp?slug=eq.' + s + '&rtok=not.is.null&select=rtok,status&limit=20000').catch(() => [])) || []).forEach(x => { A[x.rtok] = x.status; });
      if (mode === 'rem') L = L.filter(r => A[r.token] === 'yes' || r.call_rem);
      /* תודה אחרי האירוע: למי שאישר הגעה (באתר או בטלפון), או לכולם */
      else if (mode === 'ty') { if (String(b.who || 'yes') !== 'all') L = L.filter(r => A[r.token] === 'yes'); }
      else { const w = String(b.who || 'all'); if (w === 'noans') L = L.filter(r => !A[r.token]); else if (w === 'noopen') L = L.filter(r => !r.opened_at && !A[r.token]); else if (w === 'nocall') L = L.filter(r => !r.call_at); }
      if (b.grp) L = L.filter(r => r.grp === String(b.grp));
      if (Array.isArray(b.ids) && b.ids.length) { const I = new Set(b.ids.map(Number)); L = L.filter(r => I.has(r.id)); }
      L = await V.drop(L);
      if (!L.length) return json(res, 200, { sent: 0, empty: true });
      const left = (+P.calls || 0) - (+P.callsUsed || 0); if (L.length > left) return json(res, 402, { error: 'quota', need: L.length, left });
      const site = (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
      const x = mode === 'rem' || mode === 'ty' ? await V.sendTTS(L, text || V.defText(c, mode, EP), site + '/api/pricing?c=_ivrcb&k=' + EP.vkey + '&s=' + s) : await V.run(cur, L, mode, text);
      P.callsUsed = (+P.callsUsed || 0) + x.n; const calls = [{ id: x.id, at: now, n: x.n, mode, ...(mode === 'rem' || mode === 'ty' || x.bridge ? { tts: mode === 'rem' || mode === 'ty' ? 1 : 0, bridge: x.bridge ? 1 : 0, fin: 1 } : {}) }].concat(cur.calls || []).slice(0, 30);
      await put(s, { ...cur, paid: P, calls });
      const ids = L.map(r => r.id); for (let i = 0; i < ids.length; i += 200) await db('timer_recip?slug=eq.' + s + '&id=in.(' + ids.slice(i, i + 200).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_at: now, call_st: 'ממתין', call_cid: x.id }) }).catch(() => {});
      return json(res, 200, { sent: x.n });
    }
    /* SMS (רק בארץ, אם הופעל בניהול): שליחה לנמענים עם טלפון, ביתרת ה-SMS של האירוע */
    if (b.act === 'smsnext') {
      const EP = await require('./_eventpay').prices(); if (!EP.smsOn || !(await require('./_sms').ready())) return json(res, 403, { error: 'sms off' });
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
    if (b.act === 'redit') {
      /* שורה מהמאגר / מייל מוסתר: בעל האירוע משנה רק שם, קבוצה ומספר מוזמנים */
      const old = ((await db('timer_recip?id=eq.' + id + '&slug=eq.' + s + '&select=dir_id,email_src,email,phone&limit=1').catch(() => [])) || [])[0];
      if (old && (old.dir_id || /^(phone|self|dir)$/.test(old.email_src || ''))) {
        await db('timer_recip?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: clean1(b.name, 80), grp: clean1(b.grp, 40) || null, cnt: Math.max(0, Math.min(99, parseInt(b.cnt, 10) || 0)) || null }) });
        return json(res, 200, { ok: true });
      }
      let v = String(b.phone || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); const phone = /^0(5\d{8}|[2-9]\d{7})$/.test(v) ? v : '';
      const up = { name: clean1(b.name, 80), grp: clean1(b.grp, 40) || null, cnt: Math.max(0, Math.min(99, parseInt(b.cnt, 10) || 0)) || null, phone: phone || null };
      const em = str(b.email, 200).trim().toLowerCase(); if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) up.email = em; else if (phone && b.email === '') up.email = 'sms-' + phone + '@phone.invalid';
      await db('timer_recip?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) }).catch(() => db('timer_recip?id=eq.' + id + '&slug=eq.' + s, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: up.name, ...(up.email ? { email: up.email } : {}) }) }));
      return json(res, 200, { ok: true });
    }
    if (b.act === 'rdel') { await db('timer_rsvp?id=eq.' + id + '&slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
  } catch (e) { console.error('timer guest', e.message); return json(res, 500, { error: /relation|does not exist|42P01/.test(e.message) ? 'setup' : 'server' }); }
  return json(res, 400, { error: 'act' });
}
/* שלוחת API בימות המשיח: אישור הגעה בהקשות. מזהים את המוזמן לפי מספר הטלפון (הקמפיין האחרון שנשלח אליו) */
async function ivr(req, res) {
  const q = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) }, out = t => { res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(t); };
  const EP = await require('./_eventpay').prices().catch(() => ({}));
  if (!EP.vkey || String(q.k || '') !== EP.vkey) return out('id_list_message=t-השלוחה לא מוגדרת&go_to_folder=hangup');
  if (q.hangup === 'yes') return out('');
  const V = require('./_ivoice'), ph = V.phone(q.ApiPhone), say = t => 't-' + V.tts(t), bye = t => out('id_list_message=' + say(t) + '&go_to_folder=hangup');
  const rd = (t, k, max, min, ok, nz) => out('read=' + say(t) + '=' + k + ',no,' + max + ',' + min + ',10,NO,yes,' + (nz ? 'yes' : 'no') + ',,' + (ok || ''));
  if (!ph) return bye('לא זוהה מספר הטלפון');
  let L = await db('timer_recip?phone=eq.' + ph + '&call_at=not.is.null&select=id,slug,name,token,call_st,email,status&order=call_at.desc&limit=3').catch(() => []);
  if (!L || !L.length) L = await db('timer_recip?phone=eq.' + ph + '&select=id,slug,name,token,email,status&order=id.desc&limit=5').catch(() => []);
  const today = new Date(Date.now() - 864e5).toISOString().slice(0, 10); let r = null, cur = null;
  for (const x of L || []) { const o = await get(x.slug).catch(() => null); if (o && isFull(o) && (o.cfg || {}).d >= today) { r = x; cur = o; break; } }
  if (!r) return bye(V.ivrT(EP, 'he').notFound);
  const c = cur.cfg || {}, I = V.ivrT(EP, c.lang), QS = (c.qs || []).map((x, i) => ({ ...x, i })).filter(x => x.o && x.o.length >= 2 && x.o.length <= 9);
  const save = async (st, n) => { const ans = (c.qs || []).map((x, i) => { const v = +q['Q' + i]; return v && x.o && x.o[v - 1] ? x.o[v - 1] : ''; });
    const row = { slug: r.slug, name: r.name || ph, phone: ph, status: st, adults: st === 'no' ? 0 : Math.max(1, Math.min(50, n || 1)), kids: 0, note: 'אישור בטלפון', rtok: r.token, ans: ans.some(Boolean) ? ans : null };
    const prev = await db('timer_rsvp?slug=eq.' + r.slug + '&rtok=eq.' + r.token + '&select=id&limit=1').catch(() => []);
    if (prev && prev[0]) await db('timer_rsvp?id=eq.' + prev[0].id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    else await db('timer_rsvp', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: st === 'yes' ? 'אישר בטלפון' : st === 'maybe' ? 'מתלבט (טלפון)' : 'לא מגיע (טלפון)' }) }).catch(() => {}); };
  /* בקמפיין שמוגדר כשיחה נכנסת: ההזמנה עצמה מושמעת מכאן (הנוסח של בעל האירוע, בלי "הקישו 1") */
  const direct = !!(EP.voiceDirect || EP.voicePath);
  const intro = direct ? String(c.vt || V.defText(c, 'ivr', EP)).replace(/[^.]*(הקישו|דריקט)[^.]*\.?/g, '').replace(/\{(שם|name)\}/g, r.name || '') : V.fillT(I.hello, { 'שם': r.name || '' }) + ' ' + (c.t || '') + '.';
  /* קבצי השמע של האירוע: פתיחה, ההזמנה (קובץ מלא / הקלטת השם + הקראה / הקראה), סיום */
  const VA = cur.vaudio || {}, fp = k => EP.voicePath && VA[k] && VA[k].y ? 'f-/' + EP.voicePath + '/' + VA[k].y + '.' : '';
  let pre = '';
  if (direct) {
    pre += fp('intro');
    if (c.vm === 'full' && fp('full')) pre += fp('full');
    else if (c.vm === 'name' && fp('name')) { const rest = V.defText({ ...c }, 'ivr', { vtxt: { ivr: I.rest } }).replace(/\{(שם|name)\}/g, ''); pre += say(V.fillT(I.fromName, { 'שם': r.name || '' })) + '.' + fp('name') + say(String(c.vt || rest).replace(/\{(שם|name)\}/g, r.name || '')) + '.'; }
    else pre += say(intro) + '.';
    pre += fp('outro');
  }
  if (!q.A && (!r.call_st || /ממתין|לא ענה|תפוס|תא קולי/.test(r.call_st))) await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: 'ענה' }) }).catch(() => {});
  /* מתנה בטלפון: מעבר לשלוחת הסליקה (מהניהול), אם האירוע מקבל מתנות */
  const giftOk = !!EP.vGiftPath && !!c.gc && feat(cur, 'gift') && !!EP.giftOn;
  const goGift = () => out('id_list_message=' + say(I.toGift) + '&go_to_folder=/' + EP.vGiftPath);
  /* תשובה אחרי "לא מגיעים" / "מתלבטים" (ימות שולחים שוב את כל ההקשות הקודמות) */
  if (q.R === '4' && giftOk) return goGift();
  /* ספרי הטלפונים: 7 = לקבל את ההזמנה במייל (רק אם אין מייל ויש יתרת מיילים), 9 = הסרה קבועה מהשיחות */
  const DC = await require('./_dir').cfg().catch(() => ({})), realMail = r.email && !/@phone\.invalid$/.test(r.email);
  const mailOpt = !!DC.ivrMail && !realMail && (+(cur.paid || {}).emails || 0) > 0, remOpt = !!DC.ivrRemove;
  const askAll = m => I.askA + '. ' + I.askMaybe + (giftOk ? '. ' + I.askGift : '') + (m && mailOpt ? '. ' + I.askMail : '') + (remOpt ? '. ' + I.askRemove : '');
  const keys = m => '1.2.3' + (giftOk ? '.4' : '') + (m && mailOpt ? '.7' : '') + (remOpt ? '.9' : '');
  if (q.A === '7' && mailOpt) {
    if (q.E == null) return out('read=' + say(I.mailAsk) + '=E,no,100,5,60,GetMail');
    if (q.B == null) {
      const e = require('./_dir').okMail(q.E); let msg = I.mailBad;
      if (e) { msg = I.mailSaved;
        const up = { email: e, email_src: 'phone', ...(r.status === 'new' || r.status === 'fail' || !r.status ? { status: 'queued' } : {}) };
        const ok = await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) }).then(() => true)
          .catch(() => { const u2 = { ...up }; delete u2.email_src; return db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(u2) }).then(() => true).catch(() => false); });
        await require('./_dir').linkEmail(ph, e).catch(() => {});
        if (ok && up.status) await sendBatch(r.slug, cur, 5).catch(err => console.error('ivr mail', err.message)); }
      return out('read=' + say(msg + '. ' + askAll(false)) + '=B,no,1,1,10,NO,yes,no,,' + keys(false));
    }
  }
  const A = q.A === '7' ? q.B : q.A;
  if (A === '9' && remOpt) { await require('./_dir').block(ph, 'ivr').catch(() => {}); return bye(I.removed); }
  if ((A === '2' || A === '3') && q.R != null) return bye(I.bye);
  if (!q.A) { const ask = askAll(true); if (!direct) return rd(intro + ' ' + ask, 'A', 1, 1, keys(true));
    return out('read=' + pre + say(ask) + '=A,no,1,1,10,NO,yes,no,,' + keys(true)); }
  if (A === '4' && giftOk) return goGift();
  if (A === '3') { await save('maybe'); return giftOk ? rd(I.maybeThanks + '. ' + I.askGift + '. ' + I.end, 'R', 1, 1, '2.4') : bye(I.maybeThanks); }
  if (A === '2') { await save('no'); return giftOk ? rd(I.noThanks + '. ' + I.askGift + '. ' + I.end, 'R', 1, 1, '2.4') : bye(I.noThanks); }
  if (!q.N) return rd(I.askN, 'N', 2, 1, '', true);
  for (const x of QS) if (q['Q' + x.i] == null) return rd(x.q + ' ' + x.o.map((v, j) => v + ', ' + I.press + ' ' + (j + 1)).join('. '), 'Q' + x.i, 1, 1, x.o.map((v, j) => j + 1).join('.'));
  if (q.R == null) { await save('yes', +q.N); return rd(V.fillT(I.saved, { 'מספר': +q.N }) + (giftOk ? '. ' + I.askGift : ''), 'R', 1, 1, giftOk ? '1.2.4' : '1.2'); }
  if (q.R === '1') await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_rem: 1 }) }).catch(() => {});
  return bye(q.R === '1' ? I.remYes : I.bye);
}
/* SendTTS: סטטוס שיחות בזמן אמת מימות */
async function ivrcb(req, res) {
  const q = req.query || {}, b = readBody(req) || {}, done = () => json(res, 200, { ok: true });
  const EP = await require('./_eventpay').prices().catch(() => ({})); if (!EP.vkey || String(q.k || '') !== EP.vkey) return json(res, 401, { error: 'auth' });
  const s = str(q.s, 40).toLowerCase(), ph = require('./_ivoice').phone(b.Number), cid = str(b.CampaignId, 120); if (!SLUG.test(s) || !ph || !cid) return done();
  const st = b.Status === 'UP' ? 'ענה' : b.Status === 'DOWN' ? (+b.CallTimeMS > 0 ? 'ענה' : null) : b.Status === 'FAILD' || b.Status === 'FAILED' ? 'לא ענה' : null;
  if (st) await db('timer_recip?slug=eq.' + s + '&call_cid=eq.' + encodeURIComponent(cid) + '&phone=eq.' + ph, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: st }) }).catch(() => {});
  return done();
}
module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    if (req.method === 'GET' && q.unsub) return unsub(req, res, str(q.unsub, 40));
    /* שליחה מתוזמנת: ה-Worker קורא לזה כל שעה (עם CRON_SECRET) */
    if (req.method === 'GET' && q.cron) { const sec = require('./_lib').env('CRON_SECRET'); if (!sec || String(req.headers.authorization || '') !== 'Bearer ' + sec) return json(res, 401, { error: 'auth' });
      /* גם: תזכורות בשעות שנקבעו בניהול (מייל / שיחה, לוח / אירועים) */
      const inv = await cronSend(120); try { inv.auto = await autoMails(0, 60); } catch (e) { inv.autoErr = String(e.message).slice(0, 100); } let slots = null; try { slots = await require('./cron-reminders').slots(); } catch (e) { slots = { error: String(e.message).slice(0, 120) }; }
      return json(res, 200, { ...inv, slots }); }
    if (req.method === 'GET' && q.prices) { const E = require('./_eventpay'), P = await E.prices(); return json(res, 200, { on: P.on, prices: P.prices, tiers: E.TIERS, plans: P.plans.filter(x => !x.hidden), feats: (await require('./_dir').cfg().catch(() => ({}))).on ? E.FEATS : E.FEATS.filter(f => f[0] !== 'dir'), mailpk: E.MAILPK, freeEmails: P.freeEmails, agFree: P.agFree, agMax: P.agMax, freeFeats: P.freeFeats, freeName: P.freeName, freeDesc: P.freeDesc, mailsPerGuest: P.mailsPerGuest, sms: E.SMS, smsOn: P.smsOn, voice: E.VOICE, voiceOn: !!P.voiceOn, giftOn: P.giftOn, giftMin: P.giftMin, giftMax: P.giftMax, giftPct: P.giftPct, giftFixed: P.giftFixed }); }
    if (req.method === 'GET') {
      const s = str(q.s, 40).toLowerCase(); if (!SLUG.test(s)) return json(res, 400, { error: 'slug' });
      /* קיר הברכות הציבורי */
      /* חלוקת תהילים: הסבב הנוכחי ומי לקח כל פרק */
      if (q.teh) { res.setHeader('Cache-Control', 'no-store'); return json(res, 200, await tehState(s)); }
      if (q.gal) { const cur = await get(s); if (!feat(cur, 'gal') || !(cur.cfg || {}).gal) return json(res, 200, { gal: [] }); res.setHeader('Cache-Control', 'no-store'); return json(res, 200, { gal: (await galList(s).catch(() => [])).map(x => x.url) }); }
      if (q.wall) { res.setHeader('Cache-Control', 'no-store'); const cw = await get(s).catch(() => null); return json(res, 200, { wall: await publicWall(s, (cw && cw.cfg) || {}) }); }
      const o = RESERVED.has(s) ? { reserved: true } : await get(s);
      if (q.check) return json(res, 200, { free: !o });
      if (!o || o.reserved) return json(res, 404, { error: 'not found' });
      if (o.disabled) return json(res, 410, { error: 'disabled' });
      res.setHeader('Cache-Control', 'public, max-age=60');
      let gcOn = false, agL = 12; try { const EPx = await require('./_eventpay').prices(); agL = o.paid ? (isFull(o) ? EPx.agMax : EPx.agFree) : EPx.agMax; if (feat(o, 'gift') && o.cfg && o.cfg.gc) gcOn = !!EPx.giftOn; } catch (e) {}
      const pubCfg = o.cfg && Array.isArray(o.cfg.ag) ? { ...o.cfg, ag: o.cfg.ag.slice(0, agL) } : o.cfg;
      return json(res, 200, { cfg: pubCfg, paid: !!o.paid, full: isFull(o), gal: feat(o, 'gal'), gcOn });
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

module.exports.ivr = ivr; module.exports.feat = feat; module.exports.evIndex = evIndex; module.exports.key = key; module.exports.ivrcb = ivrcb; module.exports.get = get; module.exports.put = put; module.exports.own = own; module.exports.isFull = isFull;
module.exports.cronSend = cronSend; module.exports.autoCalls = autoCalls; module.exports.holyAt = holyAt; module.exports.inviteMail = inviteMail;
module.exports.autoMails = autoMails; module.exports.cleanMedia = cleanMedia;
