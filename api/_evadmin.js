/* ניהול האירועים (דף admin-events.html, דרך /api/admin עם סיסמת הניהול).
   האינדקס בטבלת timer_event מתעדכן בכל שמירה של אירוע (_timer.put). ev_scan בונה אותו מחדש מתוך R2. */
'use strict';
const { db, loadSetting, saveSetting } = require('./_lib');
const T = () => require('./_timer'), R2 = () => require('./_r2');
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const int = (v, lo, hi) => { v = parseInt(v, 10); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0; };
const today = () => new Date().toISOString().slice(0, 10);

/* מספרים לכל אירוע: מוזמנים, נשלחו, פתחו, שיחות; אישורי הגעה */
async function counts(slugs) {
  const C = {}; slugs.forEach(s => { C[s] = { recip: 0, sent: 0, opened: 0, called: 0, sms: 0, rsvp: 0, yes: 0, ppl: 0, no: 0, maybe: 0, wall: 0 }; });
  if (!slugs.length) return C;
  const inq = 'slug=in.(' + slugs.join(',') + ')';
  const R = await db('timer_recip?' + inq + '&select=slug,status,opened_at,call_at,sms_at&limit=100000').catch(() => db('timer_recip?' + inq + '&select=slug,status&limit=100000').catch(() => []));
  (R || []).forEach(r => { const c = C[r.slug]; if (!c) return; c.recip++; if (r.status === 'sent') c.sent++; if (r.opened_at) c.opened++; if (r.call_at) c.called++; if (r.sms_at) c.sms++; });
  const V = await db('timer_rsvp?' + inq + '&select=slug,status,adults,kids&limit=100000').catch(() => []);
  (V || []).forEach(r => { const c = C[r.slug]; if (!c) return; c.rsvp++; if (r.status === 'yes') { c.yes++; c.ppl += (+r.adults || 0) + (+r.kids || 0); } else if (r.status === 'no') c.no++; else c.maybe++; });
  const W = await db('timer_wall?' + inq + '&select=slug&limit=100000').catch(() => []);
  (W || []).forEach(r => { if (C[r.slug]) C[r.slug].wall++; });
  return C;
}

module.exports = async function (b) {
  const a = b.action;
  if (a === 'ev_scan') return module.exports.scan();
  /* לוח בקרה */
  if (a === 'ev_stats') {
    const L = await db('timer_event?select=slug,date,plan,disabled,emails,calls,calls_used,sms,updated_at&limit=50000').catch(e => ({ err: e.message }));
    if (L && L.err) return { setup: true, error: /timer_event|42P01|PGRST205/.test(L.err) ? '' : L.err };
    const t = today(), in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), wk = new Date(Date.now() - 7 * 864e5).toISOString();
    const S = { total: L.length, full: 0, free: 0, none: 0, upcoming: 0, next30: 0, past: 0, disabled: 0, newWeek: 0, emails: 0, calls: 0, callsUsed: 0, sms: 0 };
    L.forEach(e => { S[e.plan || 'none']++; if (e.disabled) S.disabled++; if (e.date && e.date >= t) { S.upcoming++; if (e.date <= in30) S.next30++; } else if (e.date) S.past++;
      if (e.updated_at >= wk) S.newWeek++; S.emails += +e.emails || 0; S.calls += +e.calls || 0; S.callsUsed += +e.calls_used || 0; S.sms += +e.sms || 0; });
    const O = await db('orders?select=amount,created_at&plan=eq.event&status=eq.paid&order=created_at.desc&limit=2000').catch(() => null);
    let rev = null; if (Array.isArray(O)) { rev = { total: 0, month: 0, n: O.length }; const m0 = t.slice(0, 7); O.forEach(o => { const v = +o.amount || 0; rev.total += v; if (String(o.created_at || '').slice(0, 7) === m0) rev.month += v; }); }
    const soon = L.filter(e => e.date && e.date >= t && e.date <= in30 && e.plan).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 12).map(e => e.slug);
    const SN = soon.length ? await db('timer_event?slug=in.(' + soon.join(',') + ')&select=slug,title,date,plan,email').catch(() => []) : [];
    const SC = await counts(soon);
    return { stats: S, rev, soon: (SN || []).sort((x, y) => String(x.date).localeCompare(String(y.date))).map(e => ({ ...e, c: SC[e.slug] })) };
  }
  /* רשימה עם סינון וחיפוש */
  if (a === 'ev_list') {
    const f = str(b.filter, 20), q = str(b.q, 60).trim().toLowerCase().replace(/[^a-z0-9@._\-א-ת ]/g, ''), page = int(b.page, 0, 1000), per = 50, t = today();
    let w = '';
    if (f === 'upcoming') w += '&date=gte.' + t; else if (f === 'past') w += '&date=lt.' + t;
    else if (f === 'full' || f === 'free') w += '&plan=eq.' + f; else if (f === 'none') w += '&plan=is.null'; else if (f === 'disabled') w += '&disabled=is.true';
    if (q) w += '&or=(slug.ilike.*' + encodeURIComponent(q) + '*,title.ilike.*' + encodeURIComponent(q) + '*,email.ilike.*' + encodeURIComponent(q) + '*)';
    const ord = f === 'upcoming' ? 'date.asc' : b.sort === 'date' ? 'date.desc.nullslast' : 'updated_at.desc';
    const L = await db('timer_event?select=*' + w + '&order=' + ord + '&limit=' + (per + 1) + '&offset=' + page * per).catch(e => ({ err: e.message }));
    if (L && L.err) return { setup: /timer_event|42P01|PGRST205/.test(L.err), error: /timer_event|42P01|PGRST205/.test(L.err) ? '' : L.err };
    const rows = L.slice(0, per), C = await counts(rows.map(r => r.slug));
    return { rows: rows.map(r => ({ ...r, c: C[r.slug] })), more: L.length > per, page };
  }
  const s = str(b.slug, 40).toLowerCase(); if (!SLUG.test(s)) return { error: 'slug' };
  const cur = await T().get(s).catch(() => null);
  if (a === 'ev_get') {
    if (!cur) return { error: 'not found' };
    const C = (await counts([s]))[s];
    const G = await db('timer_gift?slug=eq.' + s + '&status=eq.paid&select=amount,fee,net,payout&limit=2000').catch(() => []);
    const gifts = (G || []).reduce((x, g) => ({ n: x.n + 1, amount: x.amount + (+g.amount || 0), net: x.net + (+g.net || 0) }), { n: 0, amount: 0, net: 0 });
    const c = cur.cfg || {};
    return { slug: s, cfg: c, paid: cur.paid || null, mail: cur.mail || null, calls: cur.calls || [], seat: cur.seat ? (cur.seat.tables || []).length : 0, disabled: !!cur.disabled, note: cur.adminNote || '', token: cur.token, c: C, gifts,
      media: ['bgi', 'bgv', 'mus', 'inv', 'p'].filter(k => c[k]).map(k => ({ k, url: c[k] })) };
  }
  if (!cur) return { error: 'not found' };
  const save = async o => { await T().put(s, o); return { ok: true }; };
  /* הוספת יתרה (מיילים, SMS, שיחות). אירוע שלא שולם מקבל חבילה מלאה */
  if (a === 'ev_credit') {
    const P = cur.paid ? { ...cur.paid } : { emails: 0, orders: [], at: new Date().toISOString() };
    const add = { emails: int(b.emails, -100000, 100000), sms: int(b.sms, -100000, 100000), calls: int(b.calls, -100000, 100000) };
    P.emails = Math.max(0, (+P.emails || 0) + add.emails); P.sms = Math.max(0, (+P.sms || 0) + add.sms); P.calls = Math.max(0, (+P.calls || 0) + add.calls);
    P.log = (P.log || []).concat({ at: new Date().toISOString(), by: 'admin', ...add, why: str(b.why, 200) }).slice(-50);
    await save({ ...cur, paid: P }); if (cur.cfg && cur.cfg.d) await require('./_eventpay').index(s, cur.cfg.d).catch(() => {});
    return { ok: true, paid: P };
  }
  /* שינוי מסלול: full / free / none */
  if (a === 'ev_plan') {
    const p = b.plan; let P = cur.paid ? { ...cur.paid } : null;
    if (p === 'none') P = null;
    else if (p === 'free') P = { ...(P || {}), free: true, emails: Math.max(+((P || {}).emails) || 0, (await require('./_eventpay').prices()).freeEmails || 20), orders: (P || {}).orders || [], at: (P || {}).at || new Date().toISOString() };
    else if (p === 'full') { P = { ...(P || { emails: 0, orders: [], at: new Date().toISOString() }) }; delete P.free; }
    else return { error: 'plan' };
    if (P) P.log = (P.log || []).concat({ at: new Date().toISOString(), by: 'admin', plan: p, why: str(b.why, 200) }).slice(-50);
    const o = { ...cur }; if (P) o.paid = P; else delete o.paid;
    await save(o); if (P && cur.cfg && cur.cfg.d) await require('./_eventpay').index(s, cur.cfg.d).catch(() => {});
    return { ok: true };
  }
  if (a === 'ev_disable') { const o = { ...cur, disabled: !!b.on }; if (!b.on) delete o.disabled; return save(o); }
  if (a === 'ev_note') return save({ ...cur, adminNote: str(b.note, 2000) });
  /* מחיקת קובץ מדיה (תמונת רקע, סרטון, מוזיקה, תמונת הזמנה) */
  if (a === 'ev_media') {
    const k = str(b.k, 4); if (!['bgi', 'bgv', 'mus', 'inv', 'p'].includes(k)) return { error: 'k' };
    const c = { ...(cur.cfg || {}) }, u = c[k]; if (!u) return { ok: true };
    const M = R2().media(); if (M && u.indexOf(M.url + '/') === 0) { const path = u.slice(M.url.length + 1); await fetch(R2().presign('DELETE', path, 120, null, M), { method: 'DELETE' }).catch(() => {}); }
    c[k] = ''; return save({ ...cur, cfg: c });
  }
  /* החלפת קוד העריכה: בעל האירוע הקודם לא יוכל לנהל יותר (למשל כשהקוד דלף) */
  if (a === 'ev_retoken') { const tok = require('node:crypto').randomBytes(16).toString('hex'); await save({ ...cur, token: tok }); return { ok: true, token: tok }; }
  /* מחיקה מלאה: הקובץ, כל הנתונים בטבלאות והאינדקס */
  if (a === 'ev_delete') {
    if (b.confirm !== s) return { error: 'confirm' };
    for (const t of ['timer_recip', 'timer_rsvp', 'timer_wall', 'timer_teh', 'timer_event']) await db(t + '?slug=eq.' + s, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {});
    await R2().del(T().key(s)).catch(() => {});
    const I = (await loadSetting('evpaid').catch(() => null)) || {}; if (I[s] != null) { delete I[s]; await saveSetting('evpaid', I).catch(() => {}); }
    return { ok: true, deleted: true };
  }
  return { error: 'unknown action' };
};

/* בנייה מחדש של האינדקס מתוך R2 (פעם אחת, או אם משהו התפספס) */
module.exports.scan = async function () {
  const L = (await R2().list('timers/')).filter(x => /^timers\/[a-z0-9-]+\.json$/.test(x.key));
  let n = 0;
  await R2().pool(L, 12, async x => { const s = x.key.slice(7, -5); const o = await T().get(s).catch(() => null); if (!o) return; try { await T().evIndex(s, o); n++; } catch (e) {} });
  return { ok: true, files: L.length, indexed: n };
};
