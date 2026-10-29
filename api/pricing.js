/* המחירים והמבצעים הפעילים, לתצוגה באתר (בלי קופונים) */
'use strict';
const { loadConfig, publicPricing, json } = require('./_lib');
module.exports = async (req, res) => {
  /* תוכן שנערך בדף הניהול לדף מסוים: ?c=index */
  /* דפים ומאמרים שנוצרו בניהול: /p/<slug> */
  if ((req.query || {}).pg) return require('./_pages').handle(req, res);
  const cp = String((req.query || {}).c || '');
  /* מאגר התמונות (רק תמונות פעילות) */
  if (cp === '_lib') {
    let lib = { items: [], hideSeed: [] };
    try { lib = await require('./_lib_img').publicList(); } catch (e) { console.error('lib', e.message); }
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return json(res, 200, lib);
  }
  /* ברכות והזמנות: נוסחים מוכנים */
  if (cp === '_greetings') return require('./_greetings')(req, res);
  /* ברכות בתשלום: הקישור האישי, שמירה בזמן העריכה ושליחת הקישור למייל */
  if (cp === '_greetpay') { res.setHeader('Cache-Control', 'private, no-store'); return require('./_greetpay')(req, res); }
  /* חיפוש מיקום (מיקוד / כתובת / נקודה) */
  if (cp === '_geo') return require('./_geo')(req, res, json);
  /* אתר שומר שבת: האם עכשיו שבת או חג במיקום של הגולש */
  if (cp === '_shabbat') {
    res.setHeader('Cache-Control', 'private, no-store');
    try { const S = require('./_shabbat'); return json(res, 200, await S.status(Date.now(), S.placeOf(req), await loadConfig())); }
    catch (e) { console.error('shabbat', e.message); return json(res, 200, { on: false, closed: false }); }
  }
  /* המיקום המשוער של הגולש לפי הרשת (בלי לשאול), להצעת עיר בבונה. לא נשמר בשום מקום */
  if (cp === '_ipgeo') {
    res.setHeader('Cache-Control', 'private, no-store');
    const H = req.headers || {}, cf = req.cf || {};
    const lat = parseFloat(H['x-vercel-ip-latitude'] || cf.latitude), lng = parseFloat(H['x-vercel-ip-longitude'] || cf.longitude);
    const ok = Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    let city = String(H['x-vercel-ip-city'] || cf.city || ''); try { city = decodeURIComponent(city); } catch (e) {}
    return json(res, 200, ok ? { lat, lng, cc: String(H['x-vercel-ip-country'] || cf.country || ''), city: city.slice(0, 60), tz: String(H['x-vercel-ip-timezone'] || cf.timezone || '') } : {});
  }
  /* משוב על בניית הלוח, וטופס פנייה מהדף הראשי: נשמר לדף הניהול ונשלח במייל לבעל האתר */
  if (cp === '_contact') {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const { readBody, env, loadSetting, saveSetting } = require('./_lib'), b = readBody(req) || {};
    if (b.hp) return json(res, 200, { ok: true });
    const cl = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const kind = b.kind === 'contact' ? 'contact' : 'feedback', R = {};
    for (const k of ['opt', 'design', 'ease']) { const v = parseInt((b.r || {})[k], 10); if (v >= 1 && v <= 5) R[k] = v; }
    const it = { t: new Date().toISOString(), kind, r: R, text: cl(b.text, 2000), name: cl(b.name, 80), email: cl(b.email, 120), phone: cl(b.phone, 30), page: cl(b.page, 60), plan: cl(b.plan, 20) };
    if (kind === 'contact' && (it.text.length < 3 || !(it.email || it.phone))) return json(res, 400, { error: 'bad' });
    if (kind === 'feedback' && !Object.keys(R).length && it.text.length < 2) return json(res, 400, { error: 'bad' });
    try { const L = (await loadSetting('feedback')) || []; await saveSetting('feedback', [it].concat(Array.isArray(L) ? L : []).slice(0, 500)); } catch (e) { console.error('feedback save', e.message); }
    const to = env('OWNER_EMAIL') || env('ALERT_EMAIL');
    if (to) {
      const { sendMail, frame, escH } = require('./_mail'), NM = { opt: 'אפשרויות', design: 'עיצובים', ease: 'נוחות' };
      const st = Object.entries(R).map(([k, v]) => NM[k] + ': ' + '★'.repeat(v) + '☆'.repeat(5 - v)).join('<br>');
      const avg = Object.keys(R).length ? (Object.values(R).reduce((a, x) => a + x, 0) / Object.keys(R).length).toFixed(1) : '';
      const who = [it.name, it.email, it.phone].filter(Boolean).map(escH).join(' · ');
      const body = (st ? st + '<br><br>' : '') + (it.text ? '<b>' + (kind === 'contact' ? 'ההודעה' : 'הצעות לשיפור') + ':</b><br>' + escH(it.text).replace(/\n/g, '<br>') + '<br><br>' : '') + (who ? '<b>מאת:</b> ' + who + '<br>' : '') + '<small>' + escH(it.page) + (it.plan ? ' · מסלול ' + escH(it.plan) : '') + '</small>';
      const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(it.email);
      try { await sendMail({ to, subject: kind === 'contact' ? 'פנייה מהאתר' + (it.name ? ': ' + it.name : '') : 'משוב על בניית לוח' + (avg ? ' ★' + avg : ''), html: frame({ title: kind === 'contact' ? 'פנייה חדשה מהאתר' : 'משוב חדש', body, foot: kind === 'contact' ? 'אפשר להשיב ישירות למייל הזה' + (okMail ? '' : ' (לא נמסר מייל: ' + escH(it.phone) + ')') : 'נשלח מטופס המשוב בבונה הלוח' }), text: it.text, ...(okMail ? { replyTo: it.email } : {}) }, kind === 'contact' ? 'contact' : 'feedback'); } catch (x) { console.error('contact mail', x.message); }
    }
    return json(res, 200, { ok: true });
  }
  /* שיתוף לוח עם המשפחה: המשתתפים (בלי הרשמה) */
  if (cp === '_share') return require('./_share').pub(req, res);
  /* לוח ציבורי מהלוח המקוון: myluach.org/<שם> */
  if (cp === '_pubcal') return require('./_pubcal').read(req, res);
  if (cp) {
    const { loadSetting } = require('./_lib');
    const all = await loadSetting('content'), c = ((all && all.pages) || {})[cp] || null;
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
    return json(res, 200, { content: c });
  }
  const pub = publicPricing(await loadConfig());
  /* אילו שירותים פעילים (למשל תזכורות קוליות, שאפשר לכבות לגמרי בדף הניהול) */
  try { pub.voice = await require('./_voice').ready(); } catch (e) { pub.voice = false; }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(pub));
};
