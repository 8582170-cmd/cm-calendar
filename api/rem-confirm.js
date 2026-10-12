/* אישור תזכורות במייל (מהקישור במייל האישור), וגם הפסקה: /api/rem-confirm?t=...&off=1 (&all=1 לכל התזכורות של הכתובת) */
'use strict';
const { db } = require('./_lib');
const page = (title, text) => '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + title + ' · MyLuach</title>' +
  '<style>body{margin:0;font:17px/1.6 Arial,sans-serif;background:#f6f4fb;color:#22223a;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}.c{background:#fff;border:1px solid #e6e2f0;border-radius:16px;padding:28px 24px;max-width:440px;text-align:center}h1{font-size:24px;margin:0 0 8px;color:#21566b}a{color:#2f5f9e;font-weight:bold}</style></head><body><div class="c"><h1>' + title + '</h1><p>' + text + '</p><p><a href="/online/">ללוח השנה המקוון</a></p></div></body></html>';
module.exports = async (req, res) => {
  const q = req.query || {}, t = String(q.t || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
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
