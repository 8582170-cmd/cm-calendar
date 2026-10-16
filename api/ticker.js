/* מבזקי "היום בתולדות ישראל" ללוח המקוון: האירועים של התאריך העברי של היום שנבחרו בדף הניהול */
'use strict';
const { loadConfig, json } = require('./_lib');
const { loadYZ } = require('./_yz');
const { todayIL } = require('./_rem');
module.exports = async (req, res) => {
  try {
    const sq = String((req.query || {}).q || '').trim();
    if (sq) { /* חיפוש באירועים, כדי להוסיף תזכורת */
      if (sq.length < 2) return json(res, 200, { items: [] });
      const { list } = loadYZ();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return json(res, 200, { items: list.filter(e => e.t.includes(sq)).slice(0, 30).map(e => ({ m: e.m, d: e.d, y: e.y, t: e.t })) });
    }
    const cfg = await loadConfig(), tk = cfg.ticker || { mode: 'auto', ids: [] };
    if (tk.mode === 'off') return json(res, 200, { items: [] });
    const { HDate } = await import('./_hdate/index.js');
    const q = String((req.query || {}).d || '');
    const d = /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(+q.slice(0, 4), +q.slice(5, 7) - 1, +q.slice(8, 10), 12) : todayIL();
    const h = new HDate(d), m = h.getMonth(), day = h.getDate(), leap = HDate.isLeapYear(h.getFullYear());
    const ok = e => e.d === day && (e.m === m || (!leap && m === 12 && e.m === 13));
    const ids = new Set(tk.ids || []);
    const { list } = loadYZ();
    let items = list.filter(ok);
    items = tk.mode === 'selected' ? items.filter(e => ids.has(e.id)) : items.filter(e => !(tk.hide || []).includes(e.id));
    res.setHeader('Cache-Control', 'public, max-age=600');
    json(res, 200, { date: h.renderGematriya(true), items: items.slice(0, 40).map(e => ({ m: e.m, d: e.d, y: e.y, t: e.t })) });
  } catch (e) { console.error('ticker', e); json(res, 200, { items: [] }); }
};
