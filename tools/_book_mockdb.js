/* מסד נתונים מדומה בזיכרון לבדיקות ולהרצה מקומית של זימון התורים (מחקה את PostgREST, כולל האילוץ נגד תורים חופפים). */
'use strict';
const path = require('node:path');
/* ===== מסד נתונים מדומה ===== */
const T = {}, SEQ = {}; const sent = { sms: [], mail: [] };
const cmp = (a, b) => { if (a == null || b == null) return a === b ? 0 : (a == null ? -1 : 1); const da = typeof a === 'string' && /^\d{4}-\d\d-\d\dT/.test(a), db2 = typeof b === 'string' && /^\d{4}-\d\d-\d\dT/.test(b); if (da && db2) return Date.parse(a) - Date.parse(b); if (!isNaN(+a) && !isNaN(+b) && a !== '' && b !== '') return +a - +b; return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0; };
function match(row, k, v) {
  const m = /^(eq|neq|gt|gte|lt|lte|in|is|ilike|cs)\.(.*)$/.exec(v); if (!m) return true; const [, op, val] = m, x = row[k];
  switch (op) { case 'eq': return String(x) === val; case 'neq': return String(x) !== val; case 'gt': return cmp(x, val) > 0; case 'gte': return cmp(x, val) >= 0; case 'lt': return cmp(x, val) < 0; case 'lte': return cmp(x, val) <= 0;
    case 'in': return val.replace(/^\(|\)$/g, '').split(',').includes(String(x)); case 'is': return val === 'null' ? x == null : x != null; case 'cs': { const has = (h, n) => n && typeof n === 'object' ? (Array.isArray(n) ? n.every(e => Array.isArray(h) && h.some(y => has(y, e))) : h && typeof h === 'object' && Object.keys(n).every(k => has(h[k], n[k]))) : h === n; try { return has(x, JSON.parse(val)); } catch (e) { return false; } } default: return true; }
}
function overlapErr(table, row, rows, self) {
  if (table !== 'book_appt' || row.res_id == null || !['held', 'pending', 'confirmed'].includes(row.status)) return;
  for (const o of rows) if (o !== self && o.res_id === row.res_id && ['held', 'pending', 'confirmed'].includes(o.status) && Date.parse(row.busy_start) < Date.parse(o.busy_end) && Date.parse(row.busy_end) > Date.parse(o.busy_start)) throw new Error('db 409 {"code":"23P01","message":"conflicting key value violates exclusion constraint"}');
}
async function db(p, opts = {}) {
  const [table, qs] = p.split('?'), Q = new URLSearchParams(qs || ''); const rows = T[table] || (T[table] = []), method = opts.method || 'GET', body = opts.body ? JSON.parse(opts.body) : null;
  const min = /return=minimal/.test((opts.headers || {}).Prefer || '');
  const orOk = r => { const o = Q.get('or'); if (!o || !/^\(.*\)$/.test(o)) return true; return o.slice(1, -1).split(',').some(c => { const m = /^([a-z_]+)\.(.*)$/.exec(c); return m && match(r, m[1], m[2]); }); };
  const sel = () => { let L = rows.filter(r => orOk(r) && [...Q.entries()].every(([k, v]) => ['select', 'order', 'limit', 'offset', 'or'].includes(k) || match(r, k, v)));
    const o = Q.get('order'); if (o) { const [col, dir] = o.split(',')[0].split('.'); L = L.slice().sort((a, b) => (cmp(a[col], b[col])) * (dir === 'desc' ? -1 : 1)); } const lim = +Q.get('limit') || 1e9; return L.slice(0, lim); };
  if (method === 'GET') return JSON.parse(JSON.stringify(sel()));
  if (method === 'POST') { const row = { ...body }; if (row.id == null && table !== 'book_appt') row.id = SEQ[table] = (SEQ[table] || 0) + 1; if (table === 'book_biz' && rows.some(r => r.slug === row.slug)) throw new Error('db 409 duplicate'); if (table === 'book_cust' && rows.some(r => r.biz_id === row.biz_id && r.phone === row.phone)) throw new Error('db 409 23505 duplicate');
    if (table === 'book_appt') overlapErr(table, row, rows); rows.push(row); return min ? null : [JSON.parse(JSON.stringify(row))]; }
  if (method === 'PATCH') { const L = sel(); for (const r of L) { const n = { ...r, ...body }; overlapErr(table, n, rows, r); } L.forEach(r => Object.assign(r, body)); return min ? null : JSON.parse(JSON.stringify(L)); }
  if (method === 'DELETE') { const L = sel(); L.forEach(r => rows.splice(rows.indexOf(r), 1)); return null; }
}
const STATE = { user: { id: 'u-owner', email: 'owner@example.com' } }; const SETTINGS = { book: { open: true, sms: true } };
const lib = { db, json: (res, st, o) => { res.statusCode = st; res.body = o; }, readBody: r => r.body || {}, getUser: async () => STATE.user, env: k => (k === 'OWNER_EMAIL' ? 'site@example.com' : ''), loadSetting: async k => SETTINGS[k] || {}, saveSetting: async (k, v) => { SETTINGS[k] = v; }, reqMeta: () => ({ ip: '1.2.3.4' }) };
const put = (rel, exp) => { const f = require.resolve(path.join('..', rel)); require.cache[f] = { id: f, filename: f, loaded: true, exports: exp }; };
put('api/_lib.js', lib);
put('api/_sms.js', { send: async (p, t) => { sent.sms.push([p, t]); }, ready: async () => true });
put('api/_mail.js', { sendMail: async m => { sent.mail.push(m); }, frame: x => x.title + '|' + x.body, escH: s => String(s) });
module.exports = { T, sent, SETTINGS, STATE, db };
