/* אישור תזכורות במייל (מהקישור במייל האישור), וגם הפסקה: /api/rem-confirm?t=...&off=1 (&all=1 לכל התזכורות של הכתובת) */
'use strict';
const { db } = require('./_lib');
const page = (title, text) => '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + title + ' · MyLuach</title>' +
  '<style>body{margin:0;font:17px/1.6 Arial,sans-serif;background:#f6f4fb;color:#22223a;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}.c{background:#fff;border:1px solid #e6e2f0;border-radius:16px;padding:28px 24px;max-width:440px;text-align:center}h1{font-size:24px;margin:0 0 8px;color:#21566b}a{color:#2f5f9e;font-weight:bold}</style></head><body><div class="c"><h1>' + title + '</h1><p>' + text + '</p><p><a href="/online/">ללוח השנה המקוון</a></p></div></body></html>';
module.exports = async (req, res) => {
  const q = req.query || {}, t = String(q.t || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  /* הרשמה בלחיצה אחת מתוך מייל ההזמנה: /api/rem-confirm?ev=<slug>&r=<אסימון הנמען>. הנמען לחץ מתוך תיבת המייל שלו, ולכן אין צורך במייל אישור נוסף */
  if (q.ev) {
    try {
      const s = String(q.ev), rt = String(q.r || '');
      if (!/^[a-z0-9-]{3,40}$/.test(s) || !/^[0-9a-zA-Z_-]{8,64}$/.test(rt)) { res.statusCode = 400; return res.end(page('הקישור לא תקין', 'נסו לפתוח שוב את הקישור מהמייל.')); }
      const rc = (await db('timer_recip?slug=eq.' + s + '&token=eq.' + encodeURIComponent(rt) + '&select=email&limit=1'))[0];
      const cur = await require('./_timer').get(s).catch(() => null), c = cur && cur.cfg;
      if (!rc || !rc.email || !c || !/^\d{4}-\d{2}-\d{2}$/.test(c.d || '')) { res.statusCode = 404; return res.end(page('ההזמנה לא נמצאה', 'ייתכן שהאירוע כבר הוסר.')); }
      const back = '<br><a href="/t/' + s + '?r=' + encodeURIComponent(rt) + '">חזרה להזמנה</a>';
      if (c.d < new Date().toISOString().slice(0, 10)) return res.end(page('האירוע כבר עבר', 'אין צורך בתזכורת.' + back));
      const email = String(rc.email).trim().toLowerCase(), url = '/t/' + s;
      const mine = await db('reminders?email=eq.' + encodeURIComponent(email) + '&select=token,status,rule&limit=200');
      const ex = (mine || []).find(x => x.rule && x.rule.url === url);
      if (ex) { if (ex.status !== 'active') await db('reminders?token=eq.' + ex.token, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }); }
      else {
        if ((mine || []).filter(x => x.status !== 'off').length >= 100) { res.statusCode = 429; return res.end(page('יש יותר מדי תזכורות', 'לכתובת הזאת כבר רשומות תזכורות רבות.')); }
        await db('reminders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email, name: String(c.t || 'הזמנה').slice(0, 120), rule: { rec: 'once', d: null, m: null, date: c.d, url }, notice: [0], lang: c.lang === 'en' ? 'en' : 'he', status: 'active', token: require('node:crypto').randomBytes(16).toString('hex') }) });
      }
      return res.end(page('בקשתך התקבלה ✓', 'תזכורת תישלח אליך אי"ה ביום השמחה, לכתובת ' + email.replace(/[<>&]/g, '') + '.' + back));
    } catch (e) { console.error('rem-confirm ev', e); res.statusCode = 500; return res.end(page('תקלה', 'נסו שוב בעוד כמה דקות.')); }
  }
  if (!/^[0-9a-f]{32}$/.test(t)) { res.statusCode = 400; return res.end(page('הקישור לא תקין', 'נסו לפתוח שוב את הקישור מהמייל.')); }
  try {
    const rows = await db('reminders?token=eq.' + t + '&select=email,name,status');
    const r = rows && rows[0];
    if (!r) { res.statusCode = 404; return res.end(page('התזכורת לא נמצאה', 'ייתכן שהיא כבר נמחקה.')); }
    const em = encodeURIComponent(r.email);
    if (q.off) {
      if (q.all) await db('reminders?email=eq.' + em, { method: 'PATCH', body: JSON.stringify({ status: 'off' }) });
      else await db('reminders?token=eq.' + t, { method: 'PATCH', body: JSON.stringify({ status: 'off' }) });
      return res.end(page('התזכורות הופסקו', q.all ? 'לא יישלחו אליכם עוד תזכורות במייל.' : 'התזכורת "' + String(r.name).replace(/[<>&]/g, '') + '" לא תישלח עוד. <br><a href="?t=' + t + '&off=1&all=1">להפסיק את כל התזכורות לכתובת הזו</a>'));
    }
    await db('reminders?email=eq.' + em + '&status=eq.pending', { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
    res.end(page('התזכורות אושרו ✓', 'מעכשיו תקבלו את התזכורות במייל. בכל מייל יש קישור להפסקה.'));
  } catch (e) {
    console.error('rem-confirm', e);
    res.statusCode = 500; res.end(page('תקלה', 'נסו שוב בעוד כמה דקות.'));
  }
};
