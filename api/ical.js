/* יומן אישי להרשמה (יומן גוגל / אייפון): ימי הולדת, ימי שנה ותזכורות מהלוח של המשתמש.
   הדפדפן של המשתמש מכין את הקובץ ושומר אותו בחשבון (calendars/<user>/feed-<token>.ics); כאן רק מגישים אותו.
   הכתובת: /api/ical?u=<user id>&t=<token> */
'use strict';
const { env } = require('./_lib');

module.exports = async (req, res) => {
  const q = req.query || {};
  const u = String(q.u || ''), t = String(q.t || '').replace(/\.ics$/, '');
  if (!/^[0-9a-f-]{36}$/.test(u) || !/^[0-9a-f]{32}$/.test(t)) { res.statusCode = 404; return res.end('not found'); }
  try {
    const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
    const r = await fetch(url + '/storage/v1/object/calendars/' + u + '/feed-' + t + '.ics', {
      headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }) }
    });
    if (!r.ok) { res.statusCode = 404; return res.end('not found'); }
    const body = await r.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="myluach.ics"');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800');
    res.end(body);
  } catch (e) {
    console.error('ical', e);
    res.statusCode = 500; res.end('error');
  }
};
