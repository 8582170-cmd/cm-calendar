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
