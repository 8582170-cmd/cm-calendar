/* מטבעות באתר: שער יומי אוטומטי משער היציג של בנק ישראל (₪ לכל יחידה של מטבע חוץ).
   המקור: https://boi.org.il/PublicApi/GetExchangeRates?asJson=true. השער נשמר בהגדרה `fx` ומתעדכן פעם ביום.
   אם המקור לא זמין משתמשים בשער האחרון שנשמר (עד 5 ימים), ואם אין, בשער ידני שבעל האתר הזין. בלי שער תקף אין מטבע חוץ.
   כל הסכומים בבסיס הנתונים נשארים בשקלים, ומטבע חוץ נשמר רק בתור תשלום (מטבע, שער נעול, סכום במטבע). */
'use strict';
const { loadSetting, saveSetting } = require('./_lib');

const CUR = { ILS: { sym: '₪', name: 'שקל', code: 'ILS' }, USD: { sym: '$', name: 'דולר', code: 'USD' }, EUR: { sym: '€', name: 'אירו', code: 'EUR' }, GBP: { sym: '£', name: 'פאונד', code: 'GBP' } };
const FOREIGN = ['USD', 'EUR', 'GBP'];
/* אילו מטבעות כל חברת סליקה יודעת לגבות. פייפל תומך בכולם. SUMIT: הקודים 0-3 לפי הידוע לי ולא נבדקו מול חשבון אמיתי.
   נדרים פלוס וקשר נשארים בשקלים בלבד עד שיאומת מול החברה שהן מקבלות מטבע חוץ (אחרת נגבה סכום שגוי). */
const PROV_CUR = { nedarim: ['ILS'], kesher: ['ILS'], sumit: ['ILS', 'USD', 'EUR', 'GBP'], paypal: ['ILS', 'USD', 'EUR', 'GBP'] };
const SUMIT_CODE = { ILS: 0, USD: 1, EUR: 2, GBP: 3 }, NED_CODE = { ILS: '1', USD: '2' };
const r2 = v => Math.round(+v * 100) / 100;
const DAY = 864e5, MAXAGE = 5 * DAY;
let MEM = null;

/* מפענח את התשובה של בנק ישראל. מקבל כמה צורות כדי לא להישבר אם המבנה משתנה מעט */
function parseBoi(j) {
  const L = Array.isArray(j) ? j : Array.isArray(j && j.exchangeRates) ? j.exchangeRates : [], out = {};
  for (const x of L) {
    const k = String(x.key || x.currencyCode || x.code || '').toUpperCase(), v = +(x.currentExchangeRate != null ? x.currentExchangeRate : x.rate != null ? x.rate : x.value), unit = +(x.unit || 1) || 1;
    if (FOREIGN.includes(k) && v > 0) out[k] = Math.round(v / unit * 10000) / 10000;
  }
  return out;
}
async function fetchBoi() {
  const r = await fetch('https://boi.org.il/PublicApi/GetExchangeRates?asJson=true', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('boi ' + r.status);
  const o = parseBoi(await r.json()); if (!o.USD || !o.EUR) throw new Error('boi shape'); return o;
}
/* השערים הנוכחיים: { USD, EUR, GBP, at, stale }. null אם אין שום שער תקף */
async function rates(opt) {
  const now = Date.now(); if (MEM && now - MEM.t < 3600e3 && !(opt && opt.fresh)) return MEM.v;
  let S = {}; try { S = (await loadSetting('fx')) || {}; } catch (e) { S = {}; }
  let cur = S.rates && S.at ? { ...S.rates, at: S.at } : null;
  if (!cur || now - Date.parse(cur.at) > DAY - 3600e3 || (opt && opt.fresh)) {
    try { const f = await fetchBoi(); cur = { ...f, at: new Date().toISOString() }; await saveSetting('fx', { ...S, rates: f, at: cur.at }).catch(() => {}); }
    catch (e) { console.error('fx', e.message); }
  }
  const man = S.manual || {};
  if (!cur || now - Date.parse(cur.at) > MAXAGE) { const m = {}; FOREIGN.forEach(k => { if (+man[k] > 0) m[k] = +man[k]; }); cur = m.USD || m.EUR || m.GBP ? { ...m, at: S.manualAt || new Date().toISOString(), manual: true } : null; }
  else if (cur) cur.stale = now - Date.parse(cur.at) > 2 * DAY;
  MEM = { t: now, v: cur }; return cur;
}
const reset = () => { MEM = null; };
/* שער נעילה לתשלום במטבע: ₪ ליחידה. ILS = 1. null אם אין */
async function rateOf(cur) { if (cur === 'ILS') return 1; const R = await rates(); return R && R[cur] > 0 ? R[cur] : null; }
const toCur = (ils, rate) => r2(ils / rate);
const toIls = (amt, rate) => r2(amt * rate);
const fmt = (n, cur) => (cur === 'ILS' || !cur ? '' : (CUR[cur] || {}).sym || '') + (Math.round(+n * 100) / 100).toLocaleString('he-IL') + (cur === 'ILS' || !cur ? ' ₪' : '');
/* מטבעות שמותר להציע: מה שהוגדר ושעוד יש לו גם שער וגם ספק סליקה שיודע לגבות בו */
async function offer(allowed, provs) {
  const R = await rates(), ok = ['ILS'];
  for (const c of FOREIGN) if ((allowed || []).includes(c) && R && R[c] > 0 && (provs || []).some(p => (PROV_CUR[p] || []).includes(c))) ok.push(c);
  return ok;
}
const cleanAllowed = a => (Array.isArray(a) ? a : []).map(x => String(x).toUpperCase()).filter((x, i, l) => FOREIGN.includes(x) && l.indexOf(x) === i);
const provsFor = (provs, cur) => (provs || []).filter(p => (PROV_CUR[p] || []).includes(cur));
module.exports = { CUR, FOREIGN, PROV_CUR, SUMIT_CODE, NED_CODE, rates, rateOf, reset, toCur, toIls, fmt, offer, cleanAllowed, provsFor, parseBoi, r2 };
