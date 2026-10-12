/* חישוב מתי תזכורת חלה (אותו היגיון כמו בלוח המקוון) */
'use strict';
let H = null;
async function hd() { if (!H) H = await import('./_hdate/index.js'); return H; }
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
async function hits(r, d) {
  const { HDate } = await hd();
  if (r.rec === 'once') return r.date === iso(d);
  if (r.rec === 'greg') return d.getDate() === +r.d && d.getMonth() + 1 === +r.m;
  const h = new HDate(d);
  if (r.rec === 'monthly') return h.getDate() === +r.d;
  const y = h.getFullYear(), len = HDate.daysInMonth(h.getMonth(), y), day = (+r.d === 30 && len === 29) ? 29 : +r.d, m = +r.m;
  const leap = HDate.isLeapYear(y);
  const mm = m === 13 ? (leap ? 13 : 12) : (m === 12 && leap ? 12 : m);
  return h.getMonth() === mm && h.getDate() === day;
}
async function hebStr(d) { const { HDate } = await hd(); return new HDate(d).renderGematriya(true); }
/* "היום" לפי שעון ישראל, בצהריים (כדי שחישובי תאריך לא יזוזו) */
function todayIL() { const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).split('-').map(Number); return new Date(y, m - 1, d, 12); }
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
module.exports = { hits, hebStr, todayIL, addD, iso };
