/* הרצה מקומית של זימון התורים עם מסד נתונים בזיכרון: node tools/book_dev.js [port]
   נפתח ב-http://localhost:8787/book/studio (ללקוח) וב-/book-manage?s=studio (לניהול, מחובר אוטומטית כבעל העסק בהרצה הזאת בלבד). */
'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const M = require('./_book_mockdb'); const BOOK = require('../api/_book'); const K = require('../api/_book_core');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 8787;
const run = (body, ip) => new Promise(async resolve => { const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(d) { resolve({ st: this.statusCode, h: this.headers, raw: d }); } }; await BOOK({ method: 'POST', headers: { 'cf-connecting-ip': ip || 'x' }, body }, res); if (res.body !== undefined) resolve({ st: res.statusCode, json: res.body }); });
async function seed() {
  M.SETTINGS.book = { open: true, sms: false }; const A = b => run(b).then(r => { if (r.st !== 200) throw new Error(JSON.stringify(b) + JSON.stringify(r.json)); return r.json; });
  await A({ a: 'create', name: 'סטודיו לדוגמה', slug: 'studio' }); const g = await A({ a: 'get', s: 'studio' });
  const f1 = (await A({ a: 'put', s: 'studio', kind: 'group', item: { name: 'קומה 1', descr: 'חדרים קטנים ושקטים' } })).item, f2 = (await A({ a: 'put', s: 'studio', kind: 'group', item: { name: 'קומה 2', descr: 'חדרים גדולים עם נוף', adj: { t: 'pct', v: 20 } } })).item;
  await A({ a: 'put', s: 'studio', kind: 'res', item: { id: g.res[0].id, name: 'חדר 1', group_id: f1.id } }); await A({ a: 'put', s: 'studio', kind: 'res', item: { name: 'חדר 2', group_id: f1.id, sort: 2 } }); await A({ a: 'put', s: 'studio', kind: 'res', item: { name: 'חדר 3', group_id: f2.id, sort: 3 } });
  const proj = (await A({ a: 'put', s: 'studio', kind: 'addon', item: { name: 'מקרן', descr: 'כולל מסך', cfg: { price: 30, max: 1 } } })).item, snack = (await A({ a: 'put', s: 'studio', kind: 'addon', item: { name: 'כיבוד קל', cfg: { price: 12, max: 6 } } })).item;
  const form = (await A({ a: 'put', s: 'studio', kind: 'form', item: { name: 'פרטים', fields: [{ type: 'text', label: 'שם הקבוצה', req: true, perm: true }, { type: 'select', label: 'מספר משתתפים', opts: ['עד 10', 'עד 20'], req: true }, { type: 'long', label: 'הערות' }, { type: 'yn', label: 'צריך נגישות?' }] } })).item;
  await A({ a: 'put', s: 'studio', kind: 'svc', item: { id: g.svcs[0].id, name: 'השכרת חדר', descr: 'חדר ישיבות לפי שעה', cfg: { dur: 60, adj: { on: true, min: 30, max: 180, step: 30 }, ba: 15, price: { unit: 15, per: 40 }, alloc: 'group', groups: [f1.id, f2.id], addons: [proj.id, snack.id], form: form.id, rules: [{ days: [4], from: '18:00', to: '23:00', t: 'set', v: 60 }] } } });
  await A({ a: 'put', s: 'studio', kind: 'svc', item: { name: 'ייעוץ אישי', descr: 'שיחה של חצי שעה', cfg: { dur: 30, price: { fixed: 100 }, alloc: 'pick', res: [g.res[0].id], approval: true } } });
  if (process.env.DEV_SITEPAY) { process.env.NEDARIM_MOSAD = '1234567'; process.env.NEDARIM_API_VALID = 'x'; M.SETTINGS.book = { sitePay: true, plans: [{ id: 'sp', name: 'סליקה באתר', mode: 'site', monthly: 50, perBooking: 1, pct: 2, pub: true, on: true }] }; g.biz.cfg.plan = 'sp'; g.biz.cfg.pay = { mode: 'site', require: 'full', holdMin: 10 }; }
  await A({ a: 'save', s: 'studio', status: 'open', cfg: { ...g.biz.cfg, minNotice: 30, texts: { intro: 'קובעים תור בקלות, בכל שעה', address: 'רחוב הדוגמה 1, ירושלים', phone: '02-5000000', thanks: 'מחכים לראותכם!' }, consents: [{ text: 'קראתי ואני מאשר את התקנון', link: 'https://example.com/terms', req: true }, { text: 'אשמח לקבל עדכונים', req: false, mkt: true }], hours: { 0: [['09:00', '18:00']], 1: [['09:00', '18:00']], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '23:00']], 5: [], 6: [] } } });
  const today = K.msToLocal(Date.now(), K.TZ).date; let d = K.addDays(today, 1); while ([5, 6].includes(K.dowOf(d))) d = K.addDays(d, 1);
  await A({ a: 'manual', s: 'studio', svc: g.svcs[0].id, start: d + ' 10:00', res: g.res[0].id, name: 'דנה לוי', phone: '0521234567', price: 40 });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
seed().then(() => { if (process.env.DEV_ADMIN) M.STATE.user = { id: 'u-admin', email: 'site@example.com' }; }).then(() => http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x'); let p = u.pathname;
  if (p === '/api/pricing') { let b = ''; q.on('data', c => b += c); q.on('end', async () => { let j = {}; try { j = JSON.parse(b || '{}'); } catch (e) {} const r = await run(j, q.socket.remoteAddress); s.statusCode = r.st; if (r.json !== undefined) { s.setHeader('Content-Type', 'application/json'); s.end(JSON.stringify(r.json)); } else { Object.entries(r.h).forEach(([k, v]) => s.setHeader(k, v)); s.end(r.raw); } }); return; }
  if (p === '/book' || p.startsWith('/book/')) p = '/book.html'; else if (p === '/book-manage' || p === '/book-admin') p += '.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end('404'); }
  s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f));
}).listen(PORT, () => console.log('http://localhost:' + PORT + '/book/studio')));
