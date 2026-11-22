/* זימון תורים: החישובים עצמם, בלי מסד נתונים ובלי רשת (כדי שאפשר לבדוק אותם לבד: node tools/test_book.js).
   - שעות מקומיות: ימים בשבוע לפי אזור הזמן של העסק (ברירת מחדל ירושלים), כולל מעבר שעון קיץ.
   - quote: מחיר תור: מחיר השירות, התאמת קבוצה, התאמת משאב, כללי מחיר לפי ימים ושעות, ותוספות.
   - slots: השעות הפנויות, ואילו משאבים פנויים בכל שעה.
   - pick: הקצאה אוטומטית של משאב.
   כל הזמנים בקלט ובפלט הם מילישניות (UTC), חוץ מ-date ('YYYY-MM-DD') ושעות בדקות מחצות. */
'use strict';

const TZ = 'Asia/Jerusalem';
const r2 = n => Math.round(n * 100) / 100;

/* ===== זמן מקומי ===== */
const FMT = {};
function parts(ms, tz) {
  const f = FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const o = {}; f.formatToParts(new Date(ms)).forEach(x => { o[x.type] = +x.value; }); return o;
}
const tzOffset = (ms, tz) => { const o = parts(ms, tz); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(ms / 1000) * 1000; };
/* תאריך מקומי ('YYYY-MM-DD') ודקות מחצות → מילישניות */
function localToMs(date, min, tz) {
  tz = tz || TZ; const [y, m, d] = date.split('-').map(Number), g = Date.UTC(y, m - 1, d, 0, min, 0);
  let ms = g - tzOffset(g, tz); ms = g - tzOffset(ms, tz); return ms;
}
/* מילישניות → {date, min, dow} מקומיים */
function msToLocal(ms, tz) {
  const o = parts(ms, tz || TZ), pad = n => String(n).padStart(2, '0');
  const date = o.year + '-' + pad(o.month) + '-' + pad(o.day);
  return { date, min: o.hour * 60 + o.minute, dow: new Date(Date.UTC(o.year, o.month - 1, o.day)).getUTCDay() };
}
const dowOf = date => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const addDays = (date, n) => { const [y, m, d] = date.split('-').map(Number), x = new Date(Date.UTC(y, m - 1, d + n)); return x.toISOString().slice(0, 10); };
const toMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? +m[1] * 60 + +m[2] : null; };
const fmtMin = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(Date.parse(s + 'T00:00:00Z'));

/* ===== מחיר ===== */
/* התאמה למחיר: {t:'pct', v:20} = 20% יותר (או -10 = הנחה), {t:'add', v:5} = תוספת קבועה, {t:'set', v:60} = מחיר חדש */
function adjust(p, a) {
  if (!a || typeof a !== 'object' || a.v == null || a.v === '' || isNaN(+a.v)) return p;
  const v = +a.v;
  if (a.t === 'pct') return Math.max(0, p * (1 + v / 100));
  if (a.t === 'add') return Math.max(0, p + v);
  if (a.t === 'set') return Math.max(0, v);
  return p;
}
/* כלל מחיר לפי זמן: date (תאריך מסוים) קודם לכל, ואחריו הכללים לפי הסדר שהמנהל קבע */
function ruleFor(rules, loc) {
  const L = (Array.isArray(rules) ? rules : []).filter(r => r && r.on !== false);
  const hit = r => {
    if (r.date && r.date !== loc.date) return false;
    if (Array.isArray(r.days) && r.days.length && !r.days.includes(loc.dow)) return false;
    const a = toMin(r.from), b = toMin(r.to);
    if (a != null && b != null) { if (a <= b ? !(loc.min >= a && loc.min < b) : !(loc.min >= a || loc.min < b)) return false; }
    return true;
  };
  return L.find(r => r.date && hit(r)) || L.find(r => !r.date && hit(r)) || null;
}
/* מחיר תור.
   o: { svc:{cfg}, group:{adj}|null, res:{cfg}|null, startMs, dur (דקות), addons:[{a:{id,name,cfg}, n}], tz }
   מחזיר { total, base, dur, lines, deposit } */
function quote(o) {
  const tz = o.tz || TZ, c = (o.svc && o.svc.cfg) || {}, P = c.price || {}, dur = o.dur, lines = [];
  const adj = (v, at) => { let u = adjust(v, o.group && o.group.adj); u = adjust(u, o.res && o.res.cfg && o.res.cfg.adj); const r = ruleFor(c.rules, msToLocal(at, tz)); return r ? adjust(u, { t: r.t, v: r.v }) : u; };
  let base = 0;
  if (P.fixed != null && P.fixed !== '') base = adj(+P.fixed || 0, o.startMs);
  else {
    const unit = Math.max(1, +P.unit || 15), per = +P.per || 0; let done = 0;
    while (done < dur) { const slice = Math.min(unit, dur - done); base += adj(per, o.startMs + done * 60000) * (slice / unit); done += slice; }
  }
  base = r2(base); lines.push({ k: 'svc', label: (o.svc && o.svc.name) || '', amt: base });
  let total = base;
  (o.addons || []).forEach(x => {
    const ac = x.a.cfg || {}, per = ac.per === 'unit' ? Math.max(1, +ac.unit || 15) : 0, n = x.n;
    const amt = r2((+ac.price || 0) * n * (per ? dur / per : 1));
    lines.push({ k: 'addon', id: x.a.id, label: x.a.name, n, amt }); total += amt;
  });
  total = r2(total);
  let deposit = 0; const d = c.deposit;
  if (d && +d.v > 0) deposit = d.t === 'pct' ? r2(total * Math.min(100, +d.v) / 100) : r2(Math.min(total, +d.v));
  return { total, base, dur, lines, deposit };
}
/* האורך שנבחר: אם הלקוח רשאי לשנות, בטווח ובצעד שהוגדרו. אחרת האורך הקבוע. null = לא תקין */
function pickDur(svc, want) {
  const c = svc.cfg || {}, base = Math.max(5, +c.dur || 30), a = c.adj || {};
  if (!a.on) return base;
  if (want == null || want === '') return base;
  const min = Math.max(5, +a.min || base), max = Math.max(min, +a.max || base), step = Math.max(5, +a.step || 15), d = +want;
  if (!(d >= min && d <= max) || (d - min) % step !== 0) return null;
  return d;
}
/* התוספות שנבחרו: מאמתים כמות מקסימלית וחובה. מחזיר {list:[{a,n}], addMin} או {error} */
function pickAddons(all, svc, want) {
  const allowed = ((svc.cfg || {}).addons || []).map(String), W = {}; (Array.isArray(want) ? want : []).forEach(x => { if (x && x.id != null) W[String(x.id)] = Math.floor(+x.n || 0); });
  const list = []; let addMin = 0;
  for (const a of all) {
    if (a.active === false || !allowed.includes(String(a.id))) continue;
    const c = a.cfg || {}, max = Math.max(1, Math.min(50, +c.max || 1)); let n = W[String(a.id)] || 0;
    if (c.req && n < 1) n = 1;
    if (n < 0 || n > max) return { error: 'addon' };
    if (n > 0) { list.push({ a, n }); addMin += (+c.addMin || 0) * n; }
  }
  for (const k of Object.keys(W)) if (W[k] > 0 && !list.some(x => String(x.a.id) === k)) return { error: 'addon' };
  return { list, addMin };
}

/* ===== שעות פנויות ===== */
/* חלונות העבודה של משאב ביום מסוים, בדקות: חריג לתאריך > שעות המשאב > שעות העסק */
function windows(biz, res, date) {
  const ex = (biz.exc || {})[date];
  if (ex && ex.closed) return [];
  const H = ex && Array.isArray(ex.hours) ? ex.hours : ((res && res.cfg && res.cfg.hours) || biz.hours || {})[dowOf(date)] || [];
  return H.map(w => [toMin(w[0]), toMin(w[1])]).filter(w => w[0] != null && w[1] != null && w[1] > w[0]).sort((a, b) => a[0] - b[0]);
}
/* סדר מיון נוח: ממיינים לפי תחילת ההפסקות של כל משאב */
function busyBy(busy) {
  const M = new Map();
  (busy || []).forEach(b => { if (b.res_id == null) return; const k = String(b.res_id); if (!M.has(k)) M.set(k, []); M.get(k).push(b); });
  M.forEach(v => v.sort((a, b) => a.s - b.s)); return M;
}
const overlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;
/* האם המשאב פנוי בתור [start,end] עם הפסקות. אפשר גם לבדוק חסימות כלליות (שבת, חג) וחסימות המשאב (חופשה) */
function resFree(res, bm, blocks, start, end, bb, ba, tz) {
  for (const b of blocks || []) if (overlap(start, end, b[0], b[1])) return false;
  for (const b of (res.cfg && res.cfg.blocks) || []) {
    const f = String(b.from || ''), t = String(b.to || ''); if (!f || !t) continue;
    const fs = localToMs(f.slice(0, 10), toMin(f.slice(11, 16)) || 0, tz), te = localToMs(t.slice(0, 10), toMin(t.slice(11, 16)) == null ? 1440 : toMin(t.slice(11, 16)), tz);
    if (overlap(start, end, fs, te)) return false;
  }
  const L = bm.get(String(res.id)) || [], s = start - bb * 60000, e = end + ba * 60000;
  for (const b of L) { if (b.s >= e) break; if (overlap(s, e, b.s, b.e)) return false; }
  return true;
}
/* כל ההתחלות האפשריות בימים הנתונים.
   o: { now, tz, biz:{hours,exc,step,minNotice,maxAhead}, dates:[...], dur, bb, ba, res:[{id,cfg}], busy:[{res_id,s,e}], blocks:[[s,e]] }
   מחזיר { 'YYYY-MM-DD': [{ t:'HH:MM', ms, res:[ids] }] } (רק שעות שיש בהן לפחות משאב אחד) */
function slots(o) {
  const tz = o.tz || TZ, b = o.biz || {}, step = [5, 10, 15, 20, 30, 45, 60].includes(+b.step) ? +b.step : 30, bb = Math.max(0, +o.bb || 0), ba = Math.max(0, +o.ba || 0);
  const minAt = o.now + Math.max(0, +b.minNotice || 0) * 60000, maxDate = addDays(msToLocal(o.now, tz).date, Math.max(0, +b.maxAhead == null ? 60 : +b.maxAhead));
  const bm = busyBy(o.busy), out = {};
  for (const date of o.dates) {
    if (!isDate(date) || date > maxDate) { out[date] = []; continue; }
    const by = new Map();
    for (const r of o.res) {
      for (const [w0, w1] of windows(b, r, date)) {
        for (let t = Math.ceil(w0 / step) * step; t + o.dur <= w1; t += step) {
          const start = localToMs(date, t, tz), end = start + o.dur * 60000;
          if (start < minAt) continue;
          if (!resFree(r, bm, o.blocks, start, end, bb, ba, tz)) continue;
          if (!by.has(t)) by.set(t, { t: fmtMin(t), ms: start, res: [] });
          by.get(t).res.push(r.id);
        }
      }
    }
    out[date] = [...by.entries()].sort((a, b2) => a[0] - b2[0]).map(x => x[1]);
  }
  return out;
}
/* הקצאה אוטומטית: מתוך המשאבים הפנויים. rule 'order' = לפי סדר המשאבים, 'least' = הכי פחות עמוס באותו יום */
function pick(freeIds, res, rule, load) {
  const idx = new Map(res.map((r, i) => [String(r.id), i])), L = freeIds.slice();
  L.sort((a, b) => {
    if (rule === 'least') { const d = ((load && load.get(String(a))) || 0) - ((load && load.get(String(b))) || 0); if (d) return d; }
    return idx.get(String(a)) - idx.get(String(b));
  });
  return L;
}
/* כמה משאבים פנויים לפי קבוצה (להצגה "נותרו 2 חדרים") */
function countBy(freeIds, res) {
  const G = {}, byId = new Map(res.map(r => [String(r.id), r]));
  freeIds.forEach(id => { const g = String((byId.get(String(id)) || {}).group_id || 0); G[g] = (G[g] || 0) + 1; });
  return G;
}

module.exports = { TZ, r2, localToMs, msToLocal, dowOf, addDays, toMin, fmtMin, isDate, adjust, ruleFor, quote, pickDur, pickAddons, windows, slots, pick, countBy, resFree, busyBy, parts };
