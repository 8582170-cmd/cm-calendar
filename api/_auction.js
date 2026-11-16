/* מכירה סינית (myluach.org/auction): השרת.
   כתובת: /api/pricing?c=_auction, פעולה בשדה a.
   ציבורי:  sale, checkout, status, progress, rep
   מנהל המכירה (מחובר, בעל המכירה או בעל האתר): mine, create, get, save, products, pkgs, reps, customers, customer,
             orders, order, manual, report, draw, draws, audioUrl, audioSet, close, open
   בעל האתר: site (הגדרות האגף)
   שלוחת הטלפון: /api/pricing?c=_auctionivr&s=<כתובת>&k=<מפתח>, בקובץ _auction_ivr.js
   הטבלאות: tools/supabase_auction.sql */
'use strict';
const crypto = require('node:crypto');
const { db, json, readBody, getUser, env, loadSetting, saveSetting, reqMeta } = require('./_lib');
const C = require('./_auction_core'), PAY = require('./_auction_pay');

const r2 = n => Math.round(n * 100) / 100;
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n || 200);
const phoneN = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0\d{8,9}$/.test(v) ? v : ''; };
const mailN = v => { v = String(v || '').trim().toLowerCase(); return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) && v.length <= 120 ? v : ''; };
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
const SITE = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const enc = encodeURIComponent;

/* כל השורות (Supabase מחזיר עד 1000 בכל פעם) */
async function all(path) {
  const out = []; for (let off = 0; off < 200000; off += 1000) { const L = await db(path + (path.includes('?') ? '&' : '?') + 'limit=1000&offset=' + off); out.push(...(L || [])); if (!L || L.length < 1000) break; }
  return out;
}
/* הגדרות האגף (בעל האתר): open = כל משתמש יכול לפתוח מכירה, sitePay / kehilot = ספקי סליקה נוספים */
async function site() { const s = await loadSetting('auction').catch(() => ({})); return { open: s.open === true, sitePay: s.sitePay === true, kehilot: s.kehilotOff !== true, cancel: s.cancel === true, note: String(s.note || '') }; }
const admins = () => [env('OWNER_EMAIL'), ...env('AUCTION_ADMINS').split(',')].map(s => s.trim().toLowerCase()).filter(Boolean);
const isAdmin = u => !!u && admins().includes(String(u.email || '').toLowerCase());

/* המכירה, עם מטמון קצר לבקשות הציבוריות והטלפון (המהירות חשובה בשיחה) */
const CACHE = new Map();
async function load(slug, fresh) {
  slug = String(slug || '').toLowerCase(); if (!SLUG.test(slug)) return null;
  const c = CACHE.get(slug); if (!fresh && c && Date.now() - c.at < 20000) return c.v;
  const L = await db('auction_sale?slug=eq.' + enc(slug) + '&select=*&limit=1'); const s = L && L[0]; if (!s) { CACHE.delete(slug); return null; }
  const [P, K] = await Promise.all([db('auction_product?sale_id=eq.' + s.id + '&select=*&order=sort.asc,num.asc'), db('auction_pkg?sale_id=eq.' + s.id + '&select=*&order=sort.asc,id.asc')]);
  const v = { ...s, products: P || [], pkgs: K || [] }; CACHE.set(slug, { at: Date.now(), v }); if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value);
  return v;
}
const drop = slug => CACHE.delete(String(slug || '').toLowerCase());
/* האם המכירה פתוחה לרכישה עכשיו */
function isOpen(s) { if (!s || s.status !== 'open') return false; const c = s.cfg || {}; const t = Date.now(); if (c.openAt && Date.parse(c.openAt) > t) return false; if (c.closeAt && Date.parse(c.closeAt) <= t) return false; return true; }
/* ההגדרות עם ברירות מחדל */
function cfgOf(s) {
  const c = s.cfg || {};
  return { title: c.title || s.name || '', sub: c.sub || '', drawAt: c.drawAt || '', drawTime: c.drawTime || '', winners: c.winners !== false, cd: { open: !(c.cd && c.cd.open === false), close: !(c.cd && c.cd.close === false), draw: !(c.cd && c.cd.draw === false) }, openAt: c.openAt || '', closeAt: c.closeAt || '', phoneLine: c.phoneLine || '', goal: +c.goal || 0,
    repWeb: ['start', 'end', 'both', 'off'].includes(c.repWeb) ? c.repWeb : 'end', repPhone: ['start', 'pay', 'both', 'off'].includes(c.repPhone) ? c.repPhone : 'pay',
    repSkip: c.repSkip !== false, priceMode: c.priceMode === 'one' ? 'one' : 'each',
    allowUnpaid: c.allowUnpaid === true, repOrders: ['pending', 'paid'].includes(c.repOrders) ? c.repOrders : 'off',
    progress: { on: !!(c.progress && c.progress.on), amount: !(c.progress && c.progress.amount === false), reps: !(c.progress && c.progress.reps === false), groups: !(c.progress && c.progress.groups === false), products: !(c.progress && c.progress.products === false) },
    color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '', logo: /^https:\/\//.test(c.logo || '') ? c.logo : '', terms: c.terms || '',
    banner: /^https:\/\//.test(c.banner || '') ? c.banner : '', video: /^https:\/\//.test(c.video || '') ? c.video : '', faq: Array.isArray(c.faq) ? c.faq : [], termsAgree: c.termsAgree !== false };
}
/* מה שהציבור רואה על מוצר / חבילה */
const pubProd = p => ({ id: p.id, num: p.num, name: p.name, descr: p.descr || '', price: +p.price, draws: +p.draws || 1, img: p.img || '', audio: p.audio || '', maxPer: +((p.cfg || {}).maxPer) || 0, sponsor: (p.cfg || {}).sponsor || '' });
const pubPkg = k => ({ id: k.id, name: k.name, descr: k.descr || '', kind: k.kind, price: +k.price, qty: +k.qty || 0, credit: +k.credit || 0, products: Array.isArray(k.products) && k.products.length ? k.products : null, comp: Array.isArray(k.comp) && k.comp.length ? k.comp : null, until: (k.cfg || {}).until || '' });
const pkgLive = k => k.active !== false && (!(k.cfg || {}).until || (k.cfg.until + 'T23:59:59+02:00') >= new Date().toISOString());

async function repBy(saleId, code) { code = String(code || '').replace(/\D/g, ''); if (!code) return null; const L = await db('auction_rep?sale_id=eq.' + saleId + '&code=eq.' + code + '&active=is.true&select=id,code,name,grp&limit=1').catch(() => []); return (L && L[0]) || null; }
/* מי מקבל את הרכישה: מי שהגיע מקישור של מגייס, הרכישה שלו בכל מקרה (אי אפשר להחליף בקוד אחר). אחרת: הקוד שהוקש */
async function pickRep(s, link, typed) {
  const a = link ? await repBy(s.id, link) : null;
  if (a) return { rep: a, src: 'link' };
  const b = typed ? await repBy(s.id, typed) : null;
  if (typed && !b) return { error: 'rep', message: 'קוד הנציג לא נמצא' };
  return b ? { rep: b, src: 'code' } : { rep: null };
}
/* לקוח לפי טלפון או מייל במכירה. אין: נוצר */
async function customer(s, o, meta) {
  const ph = phoneN(o.phone), em = mailN(o.email);
  let L = [];
  if (ph) L = await db('auction_customer?sale_id=eq.' + s.id + '&phone=eq.' + ph + '&select=*&limit=1').catch(() => []);
  if ((!L || !L.length) && em) L = await db('auction_customer?sale_id=eq.' + s.id + '&email=eq.' + enc(em) + '&select=*&limit=1').catch(() => []);
  const row = { name: clean(o.name, 80) || null, city: clean(o.city, 60) || null, addr: clean(o.addr, 160) || null };
  if (L && L[0]) {
    const c = L[0], up = {}; Object.keys(row).forEach(k => { if (row[k] && row[k] !== c[k]) up[k] = row[k]; }); if (ph && !c.phone) up.phone = ph; if (em && !c.email) up.email = em;
    if (Object.keys(up).length) await db('auction_customer?id=eq.' + c.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) }).catch(() => {});
    return { ...c, ...up };
  }
  const N = await db('auction_customer', { meta: meta || null, method: 'POST', body: JSON.stringify({ sale_id: s.id, ...row, phone: ph || null, email: em || null }) });
  return N && N[0];
}
const newId = () => 'au' + crypto.randomBytes(11).toString('hex');

/* יצירת הזמנה (אתר, טלפון או ידנית). מחזיר את ההזמנה או שגיאה */
async function makeOrder(s, b, channel, meta, id) {
  if (channel !== 'manual' && !isOpen(s)) return { error: 'closed', message: 'המכירה סגורה כרגע' };
  const pkg = b.pkg ? s.pkgs.find(k => String(k.id) === String(b.pkg) && pkgLive(k)) : null;
  if (b.pkg && !pkg) return { error: 'pkg', message: 'החבילה לא זמינה' };
  const pr = C.price(s.products, pkg, b.items);
  if (pr.error) return pr;
  const R = b.repId ? { rep: { id: b.repId }, src: b.repSrc || 'line' } : await pickRep(s, b.link, b.rep);
  if (R.error) return R;
  const c = cfgOf(s);
  if (channel === 'web' && !c.repSkip && !R.rep) return { error: 'rep', message: 'צריך להזין קוד נציג' };
  const cu = await customer(s, b, meta);
  const row = { id: id || newId(), sale_id: s.id, customer_id: cu ? cu.id : null, rep_id: R.rep ? R.rep.id : null, rep_src: R.rep ? R.src : null, channel, pkg_id: pkg ? pkg.id : null,
    items: (b.items || []).filter(i => +i.n > 0).map(i => ({ p: +i.p, n: Math.floor(+i.n) })), lines: pr.lines, pkg_left: pr.left, amount: pr.amount, status: 'pending',
    name: clean(b.name, 80) || (cu && cu.name) || null, phone: phoneN(b.phone) || (cu && cu.phone) || null, email: mailN(b.email) || (cu && cu.email) || null };
  await db('auction_order', { meta: meta || null, method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  return { order: row, price: pr, pkg, rep: R.rep };
}

/* תשלום עבר: מסמנים שולם (פעם אחת בלבד), נותנים מספרים סידוריים לכרטיסים ושולחים מייל ללקוח */
async function markPaid(id, extra) {
  const U = await db('auction_order?id=eq.' + enc(id) + '&status=neq.paid', { method: 'PATCH', body: JSON.stringify({ ...(extra || {}), status: 'paid', paid_at: new Date().toISOString() }) });
  const o = U && U[0]; if (!o) return { already: true };
  const n = (o.lines || []).reduce((t, L) => t + (+L.n || 0), 0);
  if (n > 0) {
    let first = await db('rpc/auction_serials', { method: 'POST', body: JSON.stringify({ p_sale: o.sale_id, p_n: n }) });
    first = +(Array.isArray(first) ? first[0] : first); if (!(first > 0)) throw new Error('serials');
    const T = []; let k = first;
    (o.lines || []).forEach(L => { for (let i = 0; i < +L.n; i++) T.push({ sale_id: o.sale_id, serial: k++, product_id: +L.p, order_id: o.id, customer_id: o.customer_id, pkg: i < (+L.pkg || 0) }); });
    for (let i = 0; i < T.length; i += 500) await db('auction_ticket', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(T.slice(i, i + 500)) });
  }
  mailBuyer(o).catch(e => console.error('auction mail', e.message));
  notifyPaid(o).catch(e => console.error('auction notify', e.message));
  return { ok: true, order: o };
}
/* עדכון מנדרים פלוס (מנותב מ-nedarim-callback.js כש-Param1 מתחיל ב-au) */
async function nedPaid(p, ip) {
  if (ip) p = { ...p, _ip: ip };
  const id = String(p.Param1 || p.param1 || ''); if (!/^au[0-9a-f]{22}$/.test(id)) return { skipped: 'id' };
  const L = await db('auction_order?id=eq.' + id + '&select=id,amount,status,sale_id&limit=1'); const o = L && L[0]; if (!o) return { error: 'no order' };
  if (o.status === 'paid') return { already: true };
  const ok = /^(ok|1|true|success)$/i.test(String(p.Status || p.status || '')), paid = Number(p.Amount || p.amount || 0);
  const txn = String(p.TransactionId || p.TransactionID || p.Id || p.ID || '');
  if (ok && (!paid || paid + 0.001 >= +o.amount)) return markPaid(id, { txn, callback: p });
  await db('auction_order?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: ok ? 'underpaid' : 'failed', txn, callback: p }) });
  if (ok) notifyBySale(o.sale_id, 'תשלום חלקי במכירה', '<p>התקבל תשלום חלקי (' + (+paid) + ' ₪ מתוך ' + (+o.amount) + ' ₪) בהזמנה ' + id.slice(2, 10) + '. ההזמנה לא סומנה כשולמה.</p>').catch(() => {});
  return { ok: true, failed: true };
}
/* המספרים הסידוריים של הכרטיסים בהזמנה, לפי מוצר */
async function ticketsOf(o, s) {
  const T = await db('auction_ticket?order_id=eq.' + enc(o.id) + '&select=serial,product_id&order=serial.asc&limit=5000').catch(() => []);
  const by = {}; (T || []).forEach(t => { (by[t.product_id] = by[t.product_id] || []).push(t.serial); });
  return (s.products || []).filter(p => by[p.id]).map(p => ({ num: p.num, name: p.name, serials: by[p.id] }));
}
async function mailBuyer(o) {
  if (!o.email) return; const S = await db('auction_sale?id=eq.' + o.sale_id + '&select=slug&limit=1'); const s = S && S[0] && await load(S[0].slug); if (!s) return;
  const { sendMail, frame, escH } = require('./_mail'), c = cfgOf(s), T = await ticketsOf(o, s);
  const rows = T.map(t => '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>' + t.num + '</b> · ' + escH(t.name) + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee;direction:ltr;text-align:left">' + t.serials.join(', ') + '</td></tr>').join('');
  const body = '<p>תודה רבה על ההשתתפות במכירה הסינית של ' + escH(c.title) + '.</p><p>סכום ששולם: <b>' + (+o.amount) + ' ₪</b> · מספר הזמנה: ' + o.id.slice(2, 10) + '</p>'
    + '<p style="margin:14px 0 6px"><b>מספרי הכרטיסים שלכם:</b></p><table style="border-collapse:collapse;width:100%;font-size:15px">' + rows + '</table>'
    + (c.drawAt ? '<p style="margin-top:14px">ההגרלה: ' + escH(c.drawAt) + '. בהצלחה!</p>' : '<p style="margin-top:14px">בהצלחה בהגרלה!</p>');
  await sendMail({ to: o.email, subject: 'הכרטיסים שלכם במכירה הסינית של ' + c.title, html: frame({ title: 'הכרטיסים שלכם', body, button: 'לדף המכירה', url: SITE() + '/auction?s=' + s.slug }) }, 'auction');
}

/* ===== התראות למנהלי המכירה (עד 4 כתובות בהגדרות) ===== */
const notifyList = s => (Array.isArray((s.cfg || {}).notify) ? s.cfg.notify : []).map(mailN).filter(Boolean).slice(0, 4);
async function notify(s, subject, body) {
  const to = notifyList(s); if (!to.length) return;
  const { sendMail, frame } = require('./_mail'), c = cfgOf(s);
  const html = frame({ title: subject, body: body + '<p style="color:#666;font-size:13px">המכירה הסינית של ' + require('./_mail').escH(c.title) + '</p>', button: 'לניהול המכירה', url: SITE() + '/auction-manage?s=' + s.slug });
  for (const m of to) await sendMail({ to: m, subject: subject + ' · ' + c.title, html }, 'auction').catch(e => console.error('notify', m, e.message));
}
async function notifyBySale(saleId, subject, body) { const S = await db('auction_sale?id=eq.' + saleId + '&select=slug&limit=1'); const s = S && S[0] && await load(S[0].slug); if (s) await notify(s, subject, body); }
async function notifyPaid(o) {
  const S = await db('auction_sale?id=eq.' + o.sale_id + '&select=slug&limit=1'); const s = S && S[0] && await load(S[0].slug); if (!s || !notifyList(s).length) return;
  const { escH } = require('./_mail'), n = (o.lines || []).reduce((t, L) => t + (+L.n || 0), 0);
  const rep = o.rep_id ? (await db('auction_rep?id=eq.' + o.rep_id + '&select=name,code&limit=1').catch(() => []))[0] : null;
  const pk = o.pkg_id ? s.pkgs.find(k => k.id === o.pkg_id) : null;
  const lines = (o.lines || []).map(L => { const p = s.products.find(x => x.id === +L.p) || {}; return L.n + ' × ' + p.num + ' ' + escH(p.name || ''); }).join('<br>');
  await notify(s, 'רכישה חדשה: ' + (+o.amount) + ' ₪', '<p><b>' + escH(o.name || o.phone || 'רוכש') + '</b> · ' + ({ web: 'באתר', phone: 'בטלפון', manual: 'ידנית', rep: 'דרך נציג' }[o.channel] || '') + '</p><p>סכום: <b>' + (+o.amount) + ' ₪</b> · ' + n + ' כרטיסים' + (pk ? ' · חבילה: ' + escH(pk.name) : '') + (rep ? ' · מגייס: ' + escH(rep.name || rep.code) : '') + '</p><p style="font-size:14px">' + lines + '</p>' + (o.phone ? '<p>טלפון: ' + escH(o.phone) + '</p>' : '') + (o.email ? '<p>מייל: ' + escH(o.email) + '</p>' : ''));
}

/* קשר / קהילות: בדיקת עסקה שחזרה מדף התשלום, וסימון ההזמנה כשולמה */
async function kesherPaid(s, id, num) {
  const L = await db('auction_order?id=eq.' + enc(id) + '&sale_id=eq.' + s.id + '&select=id,amount,status,callback&limit=1'), o = L && L[0];
  if (!o) return { status: 404, error: 'no order' };
  if (o.status === 'paid') return { status: 200, already: true };
  num = String(num || '').replace(/\D/g, ''); if (!num) return { status: 400, error: 'num', message: 'חסר מספר עסקה' };
  const used = await db('auction_order?txn=eq.K-' + num + '&select=id&limit=1').catch(() => []);
  if (used && used[0] && used[0].id !== o.id) return { status: 409, error: 'used', message: 'העסקה הזאת כבר שויכה להזמנה אחרת' };
  const r = await PAY.kesherCheck(s, num);
  if (!r.ok) return { status: 402, error: 'notpaid', message: r.msg || 'העסקה לא אושרה בקשר' };
  if (r.amount + 0.01 < +o.amount) return { status: 402, error: 'amount', message: 'הסכום בעסקה (' + r.amount + ' ₪) קטן מסכום ההזמנה' };
  const m = await markPaid(o.id, { txn: 'K-' + r.num, callback: { ...(o.callback || {}), kesher: r.raw } });
  return { status: 200, ok: true, ...m };
}

/* ===== ניהול ===== */
/* מי מנהל את המכירה: מי שפתח אותה, המיילים שבעל האתר / המנהל הוסיף (cfg.managers), ובעלי האתר */
const managersOf = s => (Array.isArray((s.cfg || {}).managers) ? s.cfg.managers : []).map(mailN).filter(Boolean);
const canManage = (s, u) => !!u && (s.user_id === u.id || isAdmin(u) || managersOf(s).includes(String(u.email || '').toLowerCase()));
async function inviteManagers(s, list, by) {
  const { sendMail, frame, escH } = require('./_mail'), c = cfgOf(s);
  for (const m of list) await sendMail({ to: m, subject: 'הוזמנתם לנהל את המכירה הסינית של ' + c.title, html: frame({ title: 'ניהול המכירה הסינית', body: '<p>' + escH(by || 'מנהל האתר') + ' הוסיף אתכם כמנהלים של המכירה הסינית <b>' + escH(c.title) + '</b>.</p><p>הכניסה לניהול היא עם כתובת המייל הזאת (' + escH(m) + '): בכניסה הראשונה שולחים לכם קישור למייל, ואפשר גם לקבוע סיסמה.</p>', button: 'לניהול המכירה', url: SITE() + '/auction-manage?s=' + s.slug }) }, 'auction').catch(e => console.error('invite', m, e.message));
}
async function mineOr403(req, res, b) {
  const u = await getUser(req); if (!u) { json(res, 401, { error: 'login' }); return null; }
  const s = await load(b.s, true); if (!s) { json(res, 404, { error: 'no sale' }); return null; }
  if (!canManage(s, u)) { json(res, 403, { error: 'not yours' }); return null; }
  return { u, s };
}
/* ההגדרות כפי שמנהל המכירה רואה אותן (בלי הטוקן של ימות) */
function mgrView(s, S) {
  const c = { ...(s.cfg || {}) }, iv = { ...(c.ivr || {}) }; const hasTok = !!iv.token; delete iv.token; c.ivr = { ...iv, hasToken: hasTok };
  if (iv.cc) { const cc = { ...iv.cc }; const hp = !!cc.password; delete cc.password; c.ivr.cc = { ...cc, hasPassword: hp }; }
  if (c.pay && c.pay.kesher) { const k = { ...c.pay.kesher }; const hp = !!k.password; delete k.password; c.pay = { ...c.pay, kesher: { ...k, hasPassword: hp } }; }
  return { id: s.id, slug: s.slug, name: s.name, status: s.status, open: isOpen(s), cfg: c, eff: cfgOf(s), products: s.products, pkgs: s.pkgs, provs: PAY.provs(s, S),
    ivrUrl: SITE() + '/api/pricing?c=_auctionivr&s=' + s.slug + '&k=' + (iv.key || ''), site: S, managers: managersOf(s), ivrDefaults: require('./_auction_ivr').MSG };
}
function cleanCfg(old, b) {
  const c = { ...(old || {}) }, str = (k, n) => { if (b[k] != null) c[k] = clean(b[k], n); }, iso = k => { if (b[k] != null) c[k] = b[k] && !isNaN(Date.parse(b[k])) ? new Date(b[k]).toISOString() : ''; };
  str('title', 120); str('sub', 600); str('drawAt', 120); str('phoneLine', 30); str('terms', 20000); str('color', 7); str('logo', 400); str('banner', 400); str('video', 400);
  if (b.termsAgree != null) c.termsAgree = !!b.termsAgree;
  if (Array.isArray(b.faq)) c.faq = b.faq.map(x => ({ q: clean(x && x.q, 300), a: clean(x && x.a, 3000) })).filter(x => x.q && x.a).slice(0, 60);
  iso('openAt'); iso('closeAt'); iso('drawTime');
  if (b.winners != null) c.winners = !!b.winners;
  if (b.cd && typeof b.cd === 'object') c.cd = { open: b.cd.open !== false, close: b.cd.close !== false, draw: b.cd.draw !== false };
  if (b.goal != null) c.goal = Math.max(0, Math.min(1e9, +b.goal || 0));
  ['repWeb', 'repPhone', 'priceMode'].forEach(k => { if (b[k] != null) c[k] = clean(b[k], 10); });
  if (b.repSkip != null) c.repSkip = !!b.repSkip;
  if (b.allowCancel != null) c.allowCancel = !!b.allowCancel;
  if (b.phoneCart != null) c.phoneCart = !!b.phoneCart;
  if (b.allowUnpaid != null) c.allowUnpaid = !!b.allowUnpaid;
  if (b.ivrtxt && typeof b.ivrtxt === 'object') { const K = require('./_auction_ivr').MSG, o = {}; Object.keys(K).forEach(k => { const v = clean(b.ivrtxt[k], 400).replace(/[.=&"<>-]/g, ' ').trim(); if (v) o[k] = v; }); c.ivrtxt = o; }
  if (b.repOrders != null) c.repOrders = ['pending', 'paid'].includes(b.repOrders) ? b.repOrders : 'off';
  if (b.progress && typeof b.progress === 'object') c.progress = { on: !!b.progress.on, amount: b.progress.amount !== false, reps: b.progress.reps !== false, groups: b.progress.groups !== false, products: b.progress.products !== false };
  if (b.pay && typeof b.pay === 'object') { const p = { ...(c.pay || {}) }; if (b.pay.prov != null) p.prov = ['nedarim', 'kehilot', 'site'].includes(b.pay.prov) ? b.pay.prov : 'nedarim';
    if (b.pay.mosad != null) p.mosad = String(b.pay.mosad).replace(/\D/g, '').slice(0, 10); if (b.pay.apiValid != null) p.apiValid = clean(b.pay.apiValid, 60); if (b.pay.groupe != null) p.groupe = clean(b.pay.groupe, 60); c.pay = p; }
  if (Array.isArray(b.notify)) c.notify = [...new Set(b.notify.map(mailN).filter(Boolean))].slice(0, 4);
  if (b.pay && b.pay.kesher && typeof b.pay.kesher === 'object') { const k = { ...((c.pay || {}).kesher || {}) }, K = b.pay.kesher;
    if (K.pageUrl != null) k.pageUrl = /^https:\/\/[^\s"<>]+$/.test(String(K.pageUrl).trim()) ? String(K.pageUrl).trim().slice(0, 400) : '';
    if (K.pageId != null) k.pageId = String(K.pageId).replace(/[^\w-]/g, '').slice(0, 40); if (K.userName != null) k.userName = clean(K.userName, 80);
    if (K.password) k.password = String(K.password).trim().slice(0, 200); if (K.clearPassword) delete k.password;
    c.pay = { ...(c.pay || {}), kesher: k }; }
  if (b.ivr && b.ivr.cc && typeof b.ivr.cc === 'object') { const v0 = { ...(c.ivr || {}) }, cc = { ...(v0.cc || {}) }, X = b.ivr.cc;
    if (X.on != null) cc.on = !!X.on; ['type', 'register', 'user', 'terminal', 'okCodes'].forEach(k => { if (X[k] != null) cc[k] = String(X[k]).replace(/[,&=\s]/g, k === 'okCodes' ? '' : '').replace(/[^\w.:;|-]/g, k === 'okCodes' ? ',' : '').slice(0, 60); });
    if (X.okCodes != null) cc.okCodes = String(X.okCodes).split(/[,\s]+/).map(x => x.replace(/[^\w-]/g, '')).filter(Boolean).slice(0, 10).join(',');
    if (X.password) cc.password = String(X.password).trim().replace(/[,&=]/g, '').slice(0, 120); if (X.clearPassword) delete cc.password;
    c.ivr = { ...v0, cc }; delete b.ivr.cc; }
  if (b.ivr && typeof b.ivr === 'object') { const v = { ...(c.ivr || {}) }; if (!v.key) v.key = crypto.randomBytes(8).toString('hex');
    if (b.ivr.path != null) v.path = String(b.ivr.path).replace(/[^\d/]/g, '').replace(/^\/+|\/+$/g, '').slice(0, 40); if (b.ivr.payPath != null) v.payPath = String(b.ivr.payPath).replace(/[^\d/]/g, '').replace(/^\/+|\/+$/g, '').slice(0, 40);
    if (b.ivr.token) v.token = String(b.ivr.token).trim().slice(0, 200); if (b.ivr.clearToken) delete v.token; if (b.ivr.on != null) v.on = !!b.ivr.on; if (b.ivr.newKey) v.key = crypto.randomBytes(8).toString('hex'); c.ivr = v; }
  return c;
}
/* מוצרים / חבילות / מגייסים: שמירה של כל הרשימה. שורה בלי id נוצרת, שורה עם del נמחקת (רק אם אין עליה כרטיסים) */
async function saveList(table, s, list, mk) {
  const out = []; let sort = 0;
  for (const x of (Array.isArray(list) ? list : []).slice(0, 500)) {
    if (x.id && x.del) {
      if (table === 'auction_product') { const t = await db('auction_ticket?product_id=eq.' + (+x.id) + '&select=id&limit=1'); if (t && t.length) { out.push({ id: x.id, error: 'יש כרטיסים על המוצר הזה. אפשר להסתיר אותו במקום למחוק' }); continue; } }
      if (table === 'auction_rep') { const t = await db('auction_order?rep_id=eq.' + (+x.id) + '&select=id&limit=1'); if (t && t.length) { out.push({ id: x.id, error: 'יש רכישות על שם המגייס. אפשר להשבית אותו במקום למחוק' }); continue; } }
      await db(table + '?id=eq.' + (+x.id) + '&sale_id=eq.' + s.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); continue;
    }
    const row = mk(x, sort++); if (row.error) { out.push({ id: x.id || null, error: row.error }); continue; }
    try {
      if (x.id) await db(table + '?id=eq.' + (+x.id) + '&sale_id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      else await db(table, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sale_id: s.id, ...row }) });
    } catch (e) { out.push({ id: x.id || null, error: /duplicate|23505/.test(e.message) ? 'המספר / הקוד כבר קיים במכירה' : 'שגיאה בשמירה' }); }
  }
  drop(s.slug); return out;
}
const mkProduct = (x, i) => {
  const num = Math.floor(+x.num); if (!(num > 0 && num < 100000)) return { error: 'מק"ט חייב להיות מספר בין 1 ל-99999' };
  if (!clean(x.name, 120)) return { error: 'חסר שם מוצר' };
  const cf = x.cfg || {};
  return { num, name: clean(x.name, 120), descr: clean(x.descr, 600) || null, price: Math.max(0, r2(+x.price || 0)), draws: Math.max(1, Math.min(100, Math.floor(+x.draws || 1))), img: /^https:\/\//.test(x.img || '') ? String(x.img).slice(0, 400) : null,
    cfg: { maxPer: Math.max(0, Math.floor(+cf.maxPer || 0)), repeatWin: !!cf.repeatWin, reserves: Math.max(0, Math.min(20, Math.floor(+cf.reserves || 0))), sponsor: clean(cf.sponsor, 120), y: cf.y || '' }, sort: i, active: x.active !== false };
};
const mkPkg = (x, i) => {
  if (!['free', 'fixed', 'credit'].includes(x.kind)) return { error: 'סוג חבילה לא תקין' };
  if (!clean(x.name, 80)) return { error: 'חסר שם חבילה' };
  const ids = a => Array.isArray(a) ? a.map(v => +v).filter(v => v > 0).slice(0, 500) : null;
  const cf = x.cfg || {};
  return { name: clean(x.name, 80), descr: clean(x.descr, 300) || null, kind: x.kind, price: Math.max(0, r2(+x.price || 0)), qty: Math.max(0, Math.floor(+x.qty || 0)), credit: Math.max(0, r2(+x.credit || 0)),
    products: ids(x.products) && ids(x.products).length ? ids(x.products) : null, comp: Array.isArray(x.comp) && x.comp.length ? x.comp.map(c => ({ p: +c.p, n: Math.max(1, Math.floor(+c.n || 1)) })).filter(c => c.p > 0).slice(0, 500) : null,
    cfg: { until: /^\d{4}-\d{2}-\d{2}$/.test(cf.until || '') ? cf.until : '', key: Math.max(0, Math.min(9, Math.floor(+cf.key || 0))) }, sort: i, active: x.active !== false };
};
const mkRep = x => {
  const code = String(x.code || '').replace(/\D/g, ''); if (!(code.length >= 2 && code.length <= 8)) return { error: 'קוד נציג: 2 עד 8 ספרות' };
  const pin = String(x.pin || '').replace(/\D/g, '');
  if (pin && (pin.length < 4 || pin.length > 6)) return { error: 'קוד כניסה של נציג: 4 עד 6 ספרות' };
  return { code, name: clean(x.name, 80) || null, phone: phoneN(x.phone) || null, email: mailN(x.email) || null, grp: clean(x.grp, 60) || null, goal: Math.max(0, +x.goal || 0), active: x.active !== false,
    perm: ['off', 'pending', 'paid'].includes(x.perm) ? x.perm : null,
    ...(pin ? { pin } : x.id ? {} : { pin: String(1000 + crypto.randomBytes(2).readUInt16BE(0) % 9000) }), ...(x.id ? {} : { token: crypto.randomBytes(12).toString('hex') }) };
};

/* ===== דוחות ===== */
async function report(s) {
  const [O, T, R, CU] = await Promise.all([
    all('auction_order?sale_id=eq.' + s.id + '&select=id,customer_id,rep_id,channel,pkg_id,lines,pkg_left,amount,status,created_at,paid_at&order=created_at.asc'),
    all('auction_ticket?sale_id=eq.' + s.id + '&void=is.false&select=product_id,customer_id,order_id,pkg'),
    db('auction_rep?sale_id=eq.' + s.id + '&select=id,code,name,grp,goal,active&order=code.asc&limit=2000'),
    all('auction_customer?sale_id=eq.' + s.id + '&select=id,city')]);
  const paid = O.filter(o => o.status === 'paid'), oById = new Map(paid.map(o => [o.id, o])), city = new Map(CU.map(c => [c.id, c.city || '']));
  const sum = a => r2(a.reduce((t, o) => t + (+o.amount || 0), 0));
  const P = {}; s.products.forEach(p => { P[p.id] = { id: p.id, num: p.num, name: p.name, price: +p.price, draws: +p.draws || 1, tickets: 0, buyers: new Set(), web: 0, phone: 0, manual: 0, pkg: 0, revenue: 0 }; });
  T.forEach(t => { const x = P[t.product_id], o = oById.get(t.order_id); if (!x || !o) return; x.tickets++; if (t.customer_id) x.buyers.add(t.customer_id); x[o.channel] = (x[o.channel] || 0) + 1; if (t.pkg) x.pkg++; else x.revenue += x.price; });
  const reps = {}; (R || []).forEach(r => { reps[r.id] = { ...r, amount: 0, orders: 0, tickets: 0 }; });
  const groups = {}, pk = {}, ch = {}, day = {}, cities = {};
  s.pkgs.forEach(k => { pk[k.id] = { id: k.id, name: k.name, kind: k.kind, sold: 0, amount: 0, leftTickets: 0, leftCredit: 0 }; });
  paid.forEach(o => {
    const n = (o.lines || []).reduce((t, L) => t + (+L.n || 0), 0);
    if (o.rep_id && reps[o.rep_id]) { const r = reps[o.rep_id]; r.amount += +o.amount; r.orders++; r.tickets += n; }
    if (o.pkg_id && pk[o.pkg_id]) { const k = pk[o.pkg_id]; k.sold++; k.amount += +(s.pkgs.find(x => x.id === o.pkg_id) || {}).price || 0; if (o.pkg_left) { k.leftTickets += +o.pkg_left.tickets || 0; k.leftCredit += +o.pkg_left.credit || 0; } }
    const c = ch[o.channel] = ch[o.channel] || { channel: o.channel, orders: 0, amount: 0 }; c.orders++; c.amount += +o.amount;
    const d = new Date(o.paid_at || o.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); const D = day[d] = day[d] || { day: d, orders: 0, amount: 0 }; D.orders++; D.amount += +o.amount;
    const ci = city.get(o.customer_id) || 'לא ידוע'; const Ci = cities[ci] = cities[ci] || { city: ci, orders: 0, amount: 0, buyers: new Set() }; Ci.orders++; Ci.amount += +o.amount; if (o.customer_id) Ci.buyers.add(o.customer_id);
  });
  Object.values(reps).forEach(r => { const g = r.grp || 'ללא קבוצה'; const G = groups[g] = groups[g] || { grp: g, amount: 0, orders: 0, reps: 0, goal: 0 }; G.amount += r.amount; G.orders += r.orders; G.reps++; G.goal += +r.goal || 0; });
  const noRep = paid.filter(o => !o.rep_id);
  const fix = o => { Object.keys(o).forEach(k => { if (typeof o[k] === 'number') o[k] = r2(o[k]); }); return o; };
  return {
    totals: { amount: sum(paid), orders: paid.length, tickets: T.filter(t => oById.has(t.order_id)).length, buyers: new Set(paid.map(o => o.customer_id).filter(Boolean)).size, pending: O.filter(o => o.status === 'pending').length, failed: O.filter(o => /failed|underpaid/.test(o.status)).length, refunded: O.filter(o => o.status === 'refunded').length, goal: cfgOf(s).goal, noRep: { orders: noRep.length, amount: sum(noRep) } },
    products: Object.values(P).map(x => fix({ ...x, buyers: x.buyers.size })),
    reps: Object.values(reps).map(fix).sort((a, b) => b.amount - a.amount),
    groups: Object.values(groups).map(fix).sort((a, b) => b.amount - a.amount),
    pkgs: Object.values(pk).map(fix), channels: Object.values(ch).map(fix),
    days: Object.values(day).map(fix).sort((a, b) => a.day < b.day ? -1 : 1),
    cities: Object.values(cities).map(x => fix({ ...x, buyers: x.buyers.size })).sort((a, b) => b.amount - a.amount)
  };
}

/* ===== הגרלה ===== */
async function doDraw(s, u, b) {
  const p = s.products.find(x => String(x.id) === String(b.product)); if (!p) return { status: 404, error: 'product' };
  if (isOpen(s)) return { status: 409, error: 'open', message: 'קודם סוגרים את המכירה, כדי שרשימת הכרטיסים תינעל' };
  const kind = b.kind === 'reserve' ? 'reserve' : 'win';
  const W = await db('auction_draw?product_id=eq.' + p.id + '&select=*&order=id.asc&limit=500') || [];
  const wins = W.filter(w => w.kind === 'win'), res = W.filter(w => w.kind === 'reserve'), draws = +p.draws || 1, rf = +((p.cfg || {}).reserves) || 0;
  if (kind === 'win' && wins.length >= draws) return { status: 409, error: 'done', message: 'כל ההגרלות במוצר הזה כבר בוצעו' };
  if (kind === 'reserve' && rf && res.length >= rf) return { status: 409, error: 'done', message: 'כל הזוכים החלופיים כבר הוגרלו' };
  const T = await all('auction_ticket?product_id=eq.' + p.id + '&void=is.false&select=id,serial,customer_id&order=serial.asc');
  const E = C.eligible(T, W, !!(p.cfg || {}).repeatWin);
  const d = C.draw(E.map(t => t.serial), 3); if (!d) return { status: 409, error: 'empty', message: 'אין כרטיסים שמשתתפים בהגרלה הזאת' };
  const t = E.find(x => x.serial === d.serial);
  const row = { sale_id: s.id, product_id: p.id, round: kind === 'win' ? wins.length + 1 : res.length + 1, kind, ticket_id: t.id, serial: t.serial, customer_id: t.customer_id, pool: d.pool, pool_hash: d.hash, shuffles: d.shuffles, by_email: u.email };
  try { await db('auction_draw', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); }
  catch (e) { if (/duplicate|23505/.test(e.message)) return { status: 409, error: 'race', message: 'ההגרלה הזאת כבר בוצעה עכשיו ממקום אחר. רעננו את הדף' }; throw e; }
  const W1 = await withWho(s, [row]).then(L => L[0]);
  notify(s, 'הגרלה בוצעה: ' + p.num + ' ' + p.name, '<p>' + (kind === 'win' ? 'זוכה בהגרלה ' + row.round + ' מתוך ' + draws : 'זוכה חלופי ' + row.round) + ': כרטיס <b>' + row.serial + '</b> · ' + require('./_mail').escH(W1.name || W1.phone || '') + (W1.city ? ' · ' + require('./_mail').escH(W1.city) : '') + '</p><p style="font-size:13px;color:#666">' + d.pool + ' כרטיסים השתתפו · 3 ערבובים · בוצע על ידי ' + u.email + '</p>').catch(() => {});
  return { status: 200, draw: W1 };
}
async function withWho(s, rows) {
  const cids = [...new Set(rows.map(r => r.customer_id).filter(Boolean))], tids = rows.map(r => r.ticket_id);
  const [CU, TK] = await Promise.all([cids.length ? db('auction_customer?id=in.(' + cids.join(',') + ')&select=id,name,city,phone,email') : [], tids.length ? db('auction_ticket?id=in.(' + tids.join(',') + ')&select=id,order_id') : []]);
  const oids = [...new Set((TK || []).map(t => t.order_id))], O = oids.length ? await db('auction_order?id=in.(' + oids.map(x => '"' + x + '"').join(',') + ')&select=id,channel,rep_id') : [];
  const rids = [...new Set((O || []).map(o => o.rep_id).filter(Boolean))], R = rids.length ? await db('auction_rep?id=in.(' + rids.join(',') + ')&select=id,name') : [];
  const cu = new Map((CU || []).map(c => [c.id, c])), tk = new Map((TK || []).map(t => [t.id, t])), oo = new Map((O || []).map(o => [o.id, o])), rr = new Map((R || []).map(r => [r.id, r]));
  return rows.map(r => { const c = cu.get(r.customer_id) || {}, o = oo.get((tk.get(r.ticket_id) || {}).order_id) || {}; return { ...r, name: c.name || '', city: c.city || '', phone: c.phone || '', email: c.email || '', channel: o.channel || '', rep: (rr.get(o.rep_id) || {}).name || '' }; });
}

/* ===== הכתובת ===== */
module.exports = async (req, res) => {
  const b = readBody(req), a = String(b.a || '');
  try {
    /* --- ציבורי --- */
    if (a === 'sale') {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await load(b.s); if (!s || s.status === 'draft' && !b.preview) return json(res, 404, { error: 'no sale' });
      if (s.status === 'draft') { const u = await getUser(req); if (!u || (u.id !== s.user_id && !isAdmin(u))) return json(res, 404, { error: 'no sale' }); }
      const c = cfgOf(s), S = await site(), rep = b.m ? await repBy(s.id, b.m) : null;
      return json(res, 200, { slug: s.slug, cfg: { title: c.title, sub: c.sub, drawAt: c.drawAt, drawTime: c.drawTime, cd: c.cd, winners: c.winners, openAt: c.openAt, closeAt: c.closeAt, phoneLine: c.phoneLine, repWeb: c.repWeb, repSkip: c.repSkip, color: c.color, logo: c.logo, terms: c.terms, banner: c.banner, video: c.video, faq: c.faq, termsAgree: c.termsAgree, progress: c.progress.on },
        open: isOpen(s), status: s.status, products: s.products.filter(p => p.active !== false).map(pubProd), pkgs: s.pkgs.filter(pkgLive).map(pubPkg), rep: rep ? { name: rep.name || '', code: rep.code } : null, pay: PAY.provs(s, S).length > 0, payVia: PAY.provs(s, S)[0] || '', later: cfgOf(s).allowUnpaid });
    }
    if (a === 'quote') { const s = await load(b.s); if (!s) return json(res, 404, { error: 'no sale' }); const pkg = b.pkg ? s.pkgs.find(k => String(k.id) === String(b.pkg) && pkgLive(k)) : null; return json(res, 200, C.price(s.products, pkg, b.items)); }
    if (a === 'checkout') {
      if (req.method !== 'POST') return json(res, 405, {});
      const s = await load(b.s, true); if (!s) return json(res, 404, { error: 'no sale' });
      if (await require('./_shabbat').closedNow(req, await require('./_lib').loadConfig())) return json(res, 423, { error: 'shabbat', message: 'האתר סגור בשבת ובחג' });
      if (!clean(b.name, 80) || !(phoneN(b.phone) || mailN(b.email))) return json(res, 400, { error: 'details', message: 'צריך שם, וטלפון או מייל' });
      { const c0 = cfgOf(s); if (c0.terms && c0.termsAgree && !b.agree) return json(res, 400, { error: 'agree', message: 'צריך לאשר את תקנון המכירה' }); }
      const S = await site(), later = !!b.later;
      if (later && !cfgOf(s).allowUnpaid) return json(res, 403, { error: 'later', message: 'במכירה הזאת אפשר להזמין רק עם תשלום' });
      if (!later && !PAY.provs(s, S).length) return json(res, 409, { error: 'pay', message: 'התשלום באתר עוד לא הוגדר במכירה הזאת' });
      const r = await makeOrder(s, b, 'web', reqMeta(req)); if (r.error) return json(res, 400, r);
      /* הזמנה בלי תשלום: נשמרת כממתינה. הכרטיסים מקבלים מספרים רק אחרי שמנהל המכירה מסמן שולם */
      if (later) {
        await db('auction_order?id=eq.' + r.order.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { later: true } }) }).catch(() => {});
        notify(s, 'הזמנה בלי תשלום', '<p>' + require('./_mail').escH(r.order.name || '') + ' (' + require('./_mail').escH(r.order.phone || r.order.email || '') + ') הזמין ' + r.price.count + ' כרטיסים בסך ' + (+r.order.amount) + ' ₪, לתשלום מאוחר יותר. אחרי הגבייה מסמנים "שולם" בדף ההזמנות.</p>').catch(() => {});
        return json(res, 200, { id: r.order.id, amount: r.order.amount, count: r.price.count, later: true });
      }
      let tx = null; try { tx = await PAY.webTx(s, r.order, S, 'מכירה סינית: ' + cfgOf(s).title); }
      catch (e) { console.error('auction pay', e.message); return json(res, 502, { error: 'pay', message: 'לא הצלחנו לפתוח את דף התשלום: ' + String(e.message).slice(0, 120) }); }
      if (!tx) return json(res, 409, { error: 'pay', message: 'התשלום באתר עוד לא הוגדר במכירה הזאת' });
      return json(res, 200, { id: r.order.id, amount: r.order.amount, count: r.price.count, ...tx });
    }
    if (a === 'status') {
      const id = String(b.id || ''); if (!/^au[0-9a-f]{22}$/.test(id)) return json(res, 400, { error: 'id' });
      const L = await db('auction_order?id=eq.' + id + '&select=id,sale_id,status,amount&limit=1'); const o = L && L[0]; if (!o) return json(res, 404, { error: 'no order' });
      const S2 = await db('auction_sale?id=eq.' + o.sale_id + '&select=slug&limit=1'), s = S2 && S2[0] && await load(S2[0].slug);
      return json(res, 200, { status: o.status, amount: +o.amount, tickets: o.status === 'paid' && s ? await ticketsOf(o, s) : [] });
    }
    /* בקשה לפתיחת מכירה (כשפתיחה עצמית סגורה): נשמרת לבעל האתר ונשלחת אליו במייל */
    if (a === 'request') {
      if (req.method !== 'POST') return json(res, 405, {});
      const x = { id: crypto.randomBytes(6).toString('hex'), org: clean(b.org, 120), name: clean(b.name, 80), phone: phoneN(b.phone) || clean(b.phone, 20), email: mailN(b.email), note: clean(b.note, 1500), at: new Date().toISOString() };
      if (!x.org || !x.name || !(x.email || x.phone)) return json(res, 400, { error: 'details', message: 'צריך שם ארגון, שם איש קשר, ומייל או טלפון' });
      const R0 = await loadSetting('auctionreq').catch(() => []), RL = (Array.isArray(R0) ? R0 : []).slice(-299);
      if (RL.filter(r => r.email && r.email === x.email && Date.now() - Date.parse(r.at) < 3600e3).length >= 3) return json(res, 429, { error: 'many', message: 'הבקשה כבר נשלחה' });
      RL.push(x); await saveSetting('auctionreq', RL);
      const to = admins()[0]; const { sendMail, frame, escH } = require('./_mail');
      if (to) await sendMail({ to, subject: 'בקשה לפתיחת מכירה סינית: ' + x.org, html: frame({ title: 'בקשה לפתיחת מכירה', body: '<p><b>' + escH(x.org) + '</b></p><p>' + escH(x.name) + ' · ' + escH(x.phone || '') + ' · ' + escH(x.email || '') + '</p>' + (x.note ? '<p style="white-space:pre-line">' + escH(x.note) + '</p>' : ''), button: 'לבקשות', url: SITE() + '/auction-admin' }) }, 'auction').catch(() => {});
      return json(res, 200, { ok: true });
    }
    if (a === 'kcheck') {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await load(b.s); if (!s) return json(res, 404, { error: 'no sale' });
      const id = String(b.id || ''); if (!/^au[0-9a-f]{22}$/.test(id)) return json(res, 400, { error: 'id' });
      try { const r = await kesherPaid(s, id, b.tn); return json(res, r.status, r); } catch (e) { console.error('kcheck', e.message); return json(res, 502, { error: 'kesher', message: 'לא הצלחנו לבדוק את התשלום מול קשר. נסו שוב בעוד רגע' }); }
    }
    /* רשימת הזוכים לציבור: אות ראשונה של השם הפרטי, שם משפחה ועיר. בלי טלפון ומייל */
    if (a === 'winners') {
      const s = await load(b.s); if (!s) return json(res, 404, { error: 'no sale' });
      const c = cfgOf(s); if (!c.winners) return json(res, 404, { error: 'off' });
      const W = await db('auction_draw?sale_id=eq.' + s.id + "&kind=eq.win&select=product_id,round,serial,customer_id,created_at&order=round.asc&limit=5000").catch(() => []) || [];
      if (!W.length) return json(res, 200, { title: c.title, logo: c.logo, products: [] });
      const ids = [...new Set(W.map(w => w.customer_id).filter(Boolean))];
      const CU = ids.length ? await db('auction_customer?id=in.(' + ids.join(',') + ')&select=id,name,city,phone') : [];
      const cu = new Map((CU || []).map(x => [x.id, x]));
      const short = x => { const n = String((x && x.name) || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        if (n.length >= 2) return n[0].charAt(0) + '. ' + n.slice(1).join(' ');
        if (n.length === 1) return n[0];
        const ph = String((x && x.phone) || ''); return ph ? 'רוכש בטלפון (מסתיים ב־' + ph.slice(-3) + ')' : 'רוכש'; };
      const by = {}; W.forEach(w => { (by[w.product_id] = by[w.product_id] || []).push({ round: w.round, serial: w.serial, name: short(cu.get(w.customer_id)), city: (cu.get(w.customer_id) || {}).city || '' }); });
      const products = s.products.filter(p => by[p.id]).sort((x, y) => x.num - y.num).map(p => ({ num: p.num, name: p.name, img: p.img || '', draws: +p.draws || 1, winners: by[p.id] }));
      return json(res, 200, { title: c.title, logo: c.logo, last: W.reduce((m, w) => w.created_at > m ? w.created_at : m, ''), products });
    }
    if (a === 'progress') {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20');
      const s = await load(b.s); if (!s) return json(res, 404, { error: 'no sale' }); const c = cfgOf(s); if (!c.progress.on) return json(res, 403, { error: 'off' });
      const R = await report(s), top = (L, k) => L.filter(x => x[k] > 0).slice(0, 10);
      return json(res, 200, { title: c.title, closeAt: c.closeAt, openAt: c.openAt, drawTime: c.drawTime, drawAt: c.drawAt, cd: c.cd, status: s.status, goal: c.progress.amount ? c.goal : 0, amount: c.progress.amount ? R.totals.amount : null, tickets: R.totals.tickets, buyers: R.totals.buyers,
        reps: c.progress.reps ? top(R.reps, 'amount').map(r => ({ name: r.name || '', amount: c.progress.amount ? r.amount : null, grp: r.grp || '' })) : [],
        groups: c.progress.groups ? top(R.groups.filter(g => g.grp !== 'ללא קבוצה'), 'amount').map(g => ({ grp: g.grp, amount: c.progress.amount ? g.amount : null })) : [],
        products: c.progress.products ? R.products.slice().sort((x, y) => y.tickets - x.tickets).slice(0, 10).map(p => ({ num: p.num, name: p.name, tickets: p.tickets })) : [] });
    }
    if (a === 'repLogin') {
      if (req.method !== 'POST') return json(res, 405, {});
      const s = await load(b.s); if (!s) return json(res, 404, { error: 'no sale' });
      const code = String(b.code || '').replace(/\D/g, ''), pin = String(b.pin || '').replace(/\D/g, '');
      const L = code && pin ? await db('auction_rep?sale_id=eq.' + s.id + '&code=eq.' + code + '&active=is.true&select=token,pin&limit=1').catch(() => []) : [];
      const r = L && L[0]; if (!r || !r.pin || r.pin !== pin) return json(res, 403, { error: 'bad', message: 'קוד הנציג או קוד הכניסה שגויים' });
      return json(res, 200, { t: r.token });
    }
    if (a === 'rep' || a === 'repOrder') {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await load(b.s, a === 'repOrder'); const t = String(b.t || ''); if (!s || !/^[0-9a-f]{24}$/.test(t)) return json(res, 404, { error: 'no' });
      const L = await db('auction_rep?sale_id=eq.' + s.id + '&token=eq.' + t + '&active=is.true&select=id,code,name,grp,goal,perm,pin&limit=1'), r = L && L[0]; if (!r) return json(res, 404, { error: 'no' });
      const c = cfgOf(s), perm = ['off', 'pending', 'paid'].includes(r.perm) ? r.perm : c.repOrders;
      /* נציג רושם הזמנה עבור רוכש שמשלם לו במזומן / צ'ק (אם מנהל המכירה איפשר) */
      if (a === 'repOrder') {
        if (req.method !== 'POST') return json(res, 405, {});
        if (perm === 'off') return json(res, 403, { error: 'off', message: 'אין לך הרשאה לרשום הזמנות במכירה הזאת' });
        if (r.pin && String(b.pin || '').replace(/\D/g, '') !== r.pin) return json(res, 403, { error: 'pin', message: 'קוד הכניסה שגוי' });
        if (!clean(b.name, 80) || !(phoneN(b.phone) || mailN(b.email))) return json(res, 400, { error: 'details', message: 'צריך שם, וטלפון או מייל של הרוכש' });
        const R = await makeOrder(s, { ...b, rep: '', link: '', repId: r.id, repSrc: 'rep' }, 'rep', reqMeta(req)); if (R.error) return json(res, 400, R);
        const how = clean(b.method, 30) || 'מזומן', note = clean(b.note, 300);
        await db('auction_order?id=eq.' + R.order.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { byRep: r.id, method: how, note } }) }).catch(() => {});
        let tickets = [];
        if (perm === 'paid') { await markPaid(R.order.id, { txn: 'rep:' + r.code + ':' + how, callback: { byRep: r.id, method: how, note } }); tickets = await ticketsOf(R.order, s); }
        else notify(s, 'נציג רשם הזמנה', '<p>' + require('./_mail').escH(r.name || r.code) + ' רשם הזמנה עבור ' + require('./_mail').escH(R.order.name || '') + ': ' + R.price.count + ' כרטיסים בסך ' + (+R.order.amount) + ' ₪ (' + require('./_mail').escH(how) + '). ההזמנה ממתינה לאישור קבלת התשלום בדף ההזמנות.</p>').catch(() => {});
        return json(res, 200, { id: R.order.id, amount: R.order.amount, count: R.price.count, paid: perm === 'paid', tickets });
      }
      const O = await all('auction_order?rep_id=eq.' + r.id + '&status=eq.paid&select=amount,lines,channel,name,paid_at&order=paid_at.desc');
      const mine = perm !== 'off' ? await db('auction_order?rep_id=eq.' + r.id + '&channel=eq.rep&select=id,name,phone,amount,status,lines,created_at,callback&order=created_at.desc&limit=200').catch(() => []) : [];
      return json(res, 200, { sale: { title: c.title, slug: s.slug, phoneLine: c.phoneLine, open: isOpen(s) }, rep: { name: r.name || '', code: r.code, grp: r.grp || '', goal: +r.goal || 0 },
        amount: r2(O.reduce((t, o) => t + +o.amount, 0)), orders: O.length, tickets: O.reduce((t, o) => t + (o.lines || []).reduce((x, L) => x + +L.n, 0), 0),
        recent: O.slice(0, 20).map(o => ({ name: String(o.name || '').split(' ')[0] || 'רוכש', amount: +o.amount, channel: o.channel, at: o.paid_at })), link: SITE() + '/auction?s=' + s.slug + '&m=' + r.code,
        canOrder: perm, needPin: !!r.pin, products: perm !== 'off' ? s.products.filter(p => p.active !== false).map(pubProd) : [], pkgs: perm !== 'off' ? s.pkgs.filter(pkgLive).map(pubPkg) : [],
        pending: r2((mine || []).filter(o => o.status === 'pending').reduce((x, o) => x + +o.amount, 0)),
        mine: (mine || []).map(o => ({ id: o.id.slice(2, 10), name: o.name || '', phone: o.phone || '', amount: +o.amount, status: o.status, n: (o.lines || []).reduce((x, L) => x + +L.n, 0), method: (o.callback || {}).method || '', at: o.created_at })) });
    }
    /* --- מנהל המכירה --- */
    if (req.method !== 'POST') return json(res, 405, {});
    res.setHeader('Cache-Control', 'private, no-store');
    if (a === 'site') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, { error: 'admin' });
      if (b.set) { const old = await loadSetting('auction').catch(() => ({})); await saveSetting('auction', { ...old, open: !!b.set.open, sitePay: !!b.set.sitePay, kehilotOff: !b.set.kehilot, cancel: !!b.set.cancel, note: clean(b.set.note, 1000) }); }
      if (b.reqDone != null) { const R0 = await loadSetting('auctionreq').catch(() => []); const RL = Array.isArray(R0) ? R0 : []; const x = RL.find(r => r.id === b.reqDone); if (x) { x.done = x.done || 'נסגר'; await saveSetting('auctionreq', RL); } }
      const RQ = await loadSetting('auctionreq').catch(() => []);
      const R = await db('auction_order?txn=not.is.null&select=callback&order=paid_at.desc.nullslast&limit=300').catch(() => []);
      const ips = [...new Set((R || []).map(o => o.callback && o.callback._ip).filter(Boolean))];
      return json(res, 200, { site: await site(), siteNed: !!PAY.siteNed(), ips, ipsSet: env('NEDARIM_CALLBACK_IPS'), requests: (Array.isArray(RQ) ? RQ : []).slice(-100).reverse() });
    }
    /* בעל האתר: כל המכירות, כמה הזמנות, כמה כסף ובאיזה אמצעי תשלום */
    if (a === 'siteStats') {
      const u = await getUser(req); if (!isAdmin(u)) return json(res, 403, { error: 'admin' });
      const [SL, OL] = await Promise.all([all('auction_sale?select=id,slug,name,status,cfg,email,created_at&order=created_at.desc'), all('auction_order?select=sale_id,amount,status,channel,txn,callback')]);
      const how = o => { const x = String(o.txn || ''), cb = o.callback || {}; if (/^K-/.test(x)) return 'kehilot'; if (/^YM-/.test(x)) return 'phonecc'; if (/^rep:/.test(x) || cb.byRep) return 'rep'; if (/^manual:/.test(x)) return cb.later ? 'later' : 'manual'; if (cb.via === 'site') return 'site'; return 'nedarim'; };
      const by = {}; SL.forEach(s => { by[s.id] = { slug: s.slug, name: s.name, status: s.status, open: isOpen(s), owner: s.email || '', managers: managersOf(s), pay: ((s.cfg || {}).pay || {}).prov || 'nedarim', orders: 0, amount: 0, pending: 0, pendingAmount: 0, tickets: 0, m: {} }; });
      OL.forEach(o => { const x = by[o.sale_id]; if (!x) return; if (o.status === 'paid') { x.orders++; x.amount += +o.amount; const k = how(o); x.m[k] = r2((x.m[k] || 0) + +o.amount); } else if (o.status === 'pending') { x.pending++; x.pendingAmount += +o.amount; } });
      const out = Object.values(by).map(x => ({ ...x, amount: r2(x.amount), pendingAmount: r2(x.pendingAmount) }));
      const tot = out.reduce((t, x) => { t.amount += x.amount; t.orders += x.orders; Object.keys(x.m).forEach(k => { t.m[k] = r2((t.m[k] || 0) + x.m[k]); }); return t; }, { amount: 0, orders: 0, m: {} });
      return json(res, 200, { sales: out, total: { ...tot, amount: r2(tot.amount), sales: out.length, open: out.filter(x => x.open).length } });
    }
    if (a === 'mine') {
      const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' });
      const L = await all('auction_sale?select=id,slug,name,status,cfg,user_id,created_at&order=created_at.desc');
      const mine = L.filter(s => (isAdmin(u) && b.all) || s.user_id === u.id || managersOf(s).includes(String(u.email || '').toLowerCase()));
      return json(res, 200, { sales: mine.map(s => ({ slug: s.slug, name: s.name, status: s.status, open: isOpen(s), closeAt: (s.cfg || {}).closeAt || '', own: s.user_id === u.id })), admin: isAdmin(u), site: await site(), email: u.email });
    }
    if (a === 'create') {
      const u = await getUser(req); if (!u) return json(res, 401, { error: 'login' });
      const S = await site(); if (!S.open && !isAdmin(u)) return json(res, 403, { error: 'closed', message: 'פתיחת מכירות חדשות עוד לא פתוחה לציבור' });
      const slug = String(b.slug || '').toLowerCase().trim(); if (!SLUG.test(slug)) return json(res, 400, { error: 'slug', message: 'כתובת: 3 עד 40 אותיות באנגלית, ספרות ומקף' });
      const name = clean(b.name, 120); if (!name) return json(res, 400, { error: 'name', message: 'חסר שם' });
      const mg = [...new Set((Array.isArray(b.managers) ? b.managers : [b.managers]).map(mailN).filter(Boolean))].slice(0, 5);
      try { await db('auction_sale', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug, name, user_id: u.id, email: u.email, status: 'draft', cfg: { title: name, managers: mg, notify: mg.slice(0, 4), ivr: { key: crypto.randomBytes(8).toString('hex') } } }) }); }
      catch (e) { if (/duplicate|23505/.test(e.message)) return json(res, 409, { error: 'taken', message: 'הכתובת הזאת תפוסה' }); throw e; }
      if (mg.length) { const s1 = await load(slug, true); await inviteManagers(s1, mg.filter(m => m !== u.email), u.email); }
      if (b.req != null) { const R0 = await loadSetting('auctionreq').catch(() => []); const RL = Array.isArray(R0) ? R0 : []; const x = RL.find(r => r.id === b.req); if (x) { x.done = slug; await saveSetting('auctionreq', RL).catch(() => {}); } }
      return json(res, 200, { slug });
    }
    const M = await mineOr403(req, res, b); if (!M) return; const { u, s } = M;
    if (a === 'get') return json(res, 200, mgrView(s, await site()));
    if (a === 'save') {
      const before = managersOf(s), up = { cfg: cleanCfg(s.cfg, b.cfg || {}), updated_at: new Date().toISOString() };
      if (Array.isArray((b.cfg || {}).managers)) { up.cfg.managers = [...new Set(b.cfg.managers.map(mailN).filter(Boolean))].slice(0, 5); const added = up.cfg.managers.filter(m => !before.includes(m) && m !== u.email); if (added.length) inviteManagers({ ...s, cfg: up.cfg }, added, u.email).catch(() => {}); } if (b.name != null && clean(b.name, 120)) up.name = clean(b.name, 120);
      await db('auction_sale?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) }); drop(s.slug);
      return json(res, 200, mgrView(await load(s.slug, true), await site()));
    }
    if (a === 'open' || a === 'close') {
      if (a === 'open') { const S = await site(); if (!PAY.provs(s, S).length && !cfgOf(s).allowUnpaid && cfgOf(s).repOrders === 'off' && !b.force) return json(res, 409, { error: 'pay', message: 'לפני הפתיחה צריך להגדיר סליקה, או לאפשר הזמנה בלי תשלום' }); if (!s.products.some(p => p.active !== false)) return json(res, 409, { error: 'products', message: 'אין מוצרים במכירה' }); }
      await db('auction_sale?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: a === 'open' ? 'open' : 'closed', updated_at: new Date().toISOString() }) }); drop(s.slug);
      notify(s, a === 'open' ? 'המכירה נפתחה' : 'המכירה נסגרה', '<p>' + (a === 'open' ? 'המכירה נפתחה לרכישה' : 'המכירה נסגרה. אי אפשר לרכוש, ורשימת הכרטיסים נעולה להגרלה') + ' (על ידי ' + u.email + ').</p>').catch(() => {});
      return json(res, 200, { status: a === 'open' ? 'open' : 'closed' });
    }
    if (a === 'products') { const errs = await saveList('auction_product', s, b.list, mkProduct); return json(res, 200, { errors: errs, products: (await load(s.slug, true)).products }); }
    if (a === 'pkgs') { const errs = await saveList('auction_pkg', s, b.list, mkPkg); return json(res, 200, { errors: errs, pkgs: (await load(s.slug, true)).pkgs }); }
    if (a === 'reps') {
      if (b.list) { const errs = await saveList('auction_rep', s, b.list, mkRep); if (errs.length) return json(res, 200, { errors: errs, reps: await db('auction_rep?sale_id=eq.' + s.id + '&select=*&order=code.asc&limit=2000') }); }
      const L = await db('auction_rep?sale_id=eq.' + s.id + '&select=*&order=code.asc&limit=2000');
      for (const r of (L || []).filter(r => !r.pin)) { r.pin = String(1000 + crypto.randomBytes(2).readUInt16BE(0) % 9000); await db('auction_rep?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ pin: r.pin }) }).catch(() => {}); }
      return json(res, 200, { reps: (L || []).map(r => ({ ...r, link: SITE() + '/auction?s=' + s.slug + '&m=' + r.code, page: SITE() + '/auction?s=' + s.slug + '&rep=' + r.token })) });
    }
    if (a === 'customers') {
      const [CU, O] = await Promise.all([all('auction_customer?sale_id=eq.' + s.id + '&select=*&order=id.desc'), all('auction_order?sale_id=eq.' + s.id + '&select=customer_id,rep_id,channel,amount,status,lines')]);
      const agg = {}; O.forEach(o => { if (!o.customer_id) return; const A = agg[o.customer_id] = agg[o.customer_id] || { orders: 0, amount: 0, tickets: 0, pending: 0, ch: {}, rep: null };
        if (o.status === 'paid') { A.orders++; A.amount += +o.amount; A.tickets += (o.lines || []).reduce((t, L) => t + +L.n, 0); A.ch[o.channel] = 1; if (o.rep_id) A.rep = o.rep_id; } else if (o.status === 'pending' || o.status === 'failed') A.pending++; });
      return json(res, 200, { customers: CU.map(c => ({ ...c, ...(agg[c.id] || { orders: 0, amount: 0, tickets: 0, pending: 0, ch: {} }), amount: r2((agg[c.id] || {}).amount || 0), ch: Object.keys((agg[c.id] || {}).ch || {}) })) });
    }
    if (a === 'customer') {
      const id = +b.id; if (!(id > 0)) return json(res, 400, { error: 'id' });
      if (b.set) { const up = {}; ['name', 'city', 'addr', 'note'].forEach(k => { if (b.set[k] != null) up[k] = clean(b.set[k], k === 'note' ? 2000 : 160); }); if (b.set.phone != null) up.phone = phoneN(b.set.phone) || null; if (b.set.email != null) up.email = mailN(b.set.email) || null; if (Array.isArray(b.set.tags)) up.tags = b.set.tags.map(t => clean(t, 40)).filter(Boolean).slice(0, 20);
        await db('auction_customer?id=eq.' + id + '&sale_id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) }); }
      const [L, O] = await Promise.all([db('auction_customer?id=eq.' + id + '&sale_id=eq.' + s.id + '&select=*&limit=1'), db('auction_order?customer_id=eq.' + id + '&sale_id=eq.' + s.id + '&select=id,channel,amount,status,lines,pkg_id,rep_id,created_at,paid_at&order=created_at.desc&limit=200')]);
      if (!L || !L[0]) return json(res, 404, { error: 'no' });
      const T = await db('auction_ticket?customer_id=eq.' + id + '&sale_id=eq.' + s.id + '&void=is.false&select=serial,product_id,order_id&order=serial.asc&limit=5000');
      return json(res, 200, { customer: L[0], orders: O || [], tickets: T || [] });
    }
    if (a === 'orders') {
      const st = ['paid', 'pending', 'failed', 'refunded', 'underpaid'].includes(b.status) ? '&status=eq.' + b.status : '';
      const O = await db('auction_order?sale_id=eq.' + s.id + st + '&select=*&order=created_at.desc&limit=' + Math.min(2000, Math.max(1, +b.limit || 500)));
      return json(res, 200, { orders: (O || []).map(o => { const x = { ...o }, cb = o.callback || {}; x.callback = { later: !!cb.later, method: cb.method || '', note: cb.note || '' }; delete x.ua; return x; }) });
    }
    if (a === 'order') {
      const id = String(b.id || ''); if (!/^au[0-9a-f]{22}$/.test(id)) return json(res, 400, { error: 'id' });
      const L = await db('auction_order?id=eq.' + id + '&sale_id=eq.' + s.id + '&select=*&limit=1'), o = L && L[0]; if (!o) return json(res, 404, { error: 'no' });
      if (b.do === 'paid') { if (o.status === 'paid') return json(res, 409, { error: 'already' }); const r = await markPaid(id, { txn: 'manual:' + clean(b.note, 80), callback: { manual: true, by: u.email, note: clean(b.note, 300) } }); drop(s.slug); return json(res, 200, r); }
      if (b.do === 'kcheck') { try { const r = await kesherPaid(s, id, b.tn); return json(res, r.status, r); } catch (e) { return json(res, 502, { error: 'kesher', message: String(e.message).slice(0, 160) }); } }
      if (b.do === 'refund') { if (o.status !== 'paid') return json(res, 409, { error: 'not paid' });
        if (!((await site()).cancel && (s.cfg || {}).allowCancel === true)) return json(res, 403, { error: 'nocancel', message: 'ביטול הזמנות לא מאופשר במכירה הזאת' });
        const D = await db('auction_draw?sale_id=eq.' + s.id + '&select=ticket_id&limit=5000'), T = await db('auction_ticket?order_id=eq.' + id + '&select=id&limit=5000');
        const won = new Set((D || []).map(d => d.ticket_id)); if ((T || []).some(t => won.has(t.id))) return json(res, 409, { error: 'won', message: 'אחד הכרטיסים בהזמנה כבר זכה בהגרלה' });
        await db('auction_ticket?order_id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ void: true }) });
        await db('auction_order?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'refunded', callback: { ...(o.callback || {}), refund: { by: u.email, at: new Date().toISOString(), note: clean(b.note, 300) } } }) });
        notify(s, 'הזמנה בוטלה', '<p>ההזמנה ' + id.slice(2, 10) + ' (' + require('./_mail').escH(o.name || o.phone || '') + ', ' + (+o.amount) + ' ₪) בוטלה על ידי ' + u.email + '. הכרטיסים הוצאו מההגרלה.</p>').catch(() => {});
        return json(res, 200, { ok: true }); }
      const tk = o.status === 'paid' ? await ticketsOf(o, s) : []; delete o.ua; return json(res, 200, { order: o, tickets: tk });
    }
    if (a === 'manual') {
      if (!clean(b.name, 80)) return json(res, 400, { error: 'details', message: 'חסר שם' });
      const r = await makeOrder(s, { ...b, rep: b.rep || '', link: '' }, 'manual', null); if (r.error) return json(res, 400, r);
      if (b.paid !== false) await markPaid(r.order.id, { txn: 'manual:' + clean(b.method, 40), callback: { manual: true, by: u.email, method: clean(b.method, 40), note: clean(b.note, 300) } });
      return json(res, 200, { id: r.order.id, amount: r.order.amount });
    }
    if (a === 'report') return json(res, 200, await report(s));
    if (a === 'tickets') {
      const T = await all('auction_ticket?sale_id=eq.' + s.id + '&void=is.false&select=serial,product_id,customer_id,order_id,pkg&order=serial.asc'), CU = await all('auction_customer?sale_id=eq.' + s.id + '&select=id,name,phone,city');
      const cu = new Map(CU.map(c => [c.id, c])), pn = new Map(s.products.map(p => [p.id, p]));
      return json(res, 200, { tickets: T.map(t => { const c = cu.get(t.customer_id) || {}, p = pn.get(t.product_id) || {}; return { serial: t.serial, num: p.num, product: p.name, name: c.name || '', phone: c.phone || '', city: c.city || '', order: t.order_id.slice(2, 10), pkg: t.pkg }; }) });
    }
    if (a === 'draw') { const r = await doDraw(s, u, b); return json(res, r.status, r); }
    if (a === 'draws') {
      const W = await db('auction_draw?sale_id=eq.' + s.id + '&select=*&order=id.asc&limit=5000') || [];
      const cnt = await all('auction_ticket?sale_id=eq.' + s.id + '&void=is.false&select=product_id'), by = {}; cnt.forEach(t => { by[t.product_id] = (by[t.product_id] || 0) + 1; });
      return json(res, 200, { open: isOpen(s), draws: await withWho(s, W), counts: by });
    }
    if (a === 'mediaUrl') {
      /* העלאת תמונה / לוגו / סרטון / תמונת מוצר ישירות מהדפדפן לאחסון הציבורי של האתר */
      const K = { logo: /^(png|jpe?g|webp|svg)$/, banner: /^(png|jpe?g|webp)$/, product: /^(png|jpe?g|webp)$/, video: /^(mp4|webm|mov)$/ }, kind = String(b.kind || ''), ext = String(b.ext || '').toLowerCase();
      if (!K[kind] || !K[kind].test(ext)) return json(res, 400, { error: 'type', message: 'סוג קובץ לא נתמך' });
      const M = require('./_r2').mediaPut('auction/' + s.id + '/' + kind + '-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex') + '.' + ext);
      if (!M) return json(res, 503, { error: 'storage', message: 'אחסון הקבצים לא מוגדר באתר' }); return json(res, 200, M);
    }
    if (a === 'audioUrl') {
      const p = s.products.find(x => String(x.id) === String(b.product)); if (!p) return json(res, 404, { error: 'product' });
      const ext = /^(mp3|wav|m4a|ogg)$/.test(String(b.ext || '')) ? b.ext : 'mp3', R = require('./_r2'), M = R.mediaPut('auction/' + s.id + '/p' + p.num + '-' + Date.now().toString(36) + '.' + ext);
      if (!M) return json(res, 503, { error: 'storage', message: 'אחסון הקבצים לא מוגדר באתר' }); return json(res, 200, M);
    }
    if (a === 'audioSet') {
      const p = s.products.find(x => String(x.id) === String(b.product)); if (!p) return json(res, 404, { error: 'product' });
      const MD = require('./_r2').media(), url = String(b.url || '');
      if (url && !(MD && url.indexOf(MD.url + '/auction/' + s.id + '/') === 0)) return json(res, 400, { error: 'url' });
      const cf = { ...(p.cfg || {}) }; let warn = '';
      const iv = (s.cfg || {}).ivr || {};
      if (url && iv.token && iv.path) {
        try { const f = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!f.ok) throw new Error('fetch ' + f.status); const buf = await f.arrayBuffer(); const nm = 'au' + s.id + 'p' + p.num;
          await ymUpload(iv.token, 'ivr2:/' + iv.path + '/' + nm + '.wav', buf); cf.y = nm; }
        catch (e) { warn = 'הקובץ נשמר באתר, אבל ההעלאה לימות המשיח נכשלה: ' + String(e.message).slice(0, 120); }
      } else if (url) warn = 'הקובץ נשמר באתר. כדי שיושמע בטלפון, צריך להזין בהגדרות הטלפון את הטוקן של ימות ואת מספר השלוחה';
      if (!url) delete cf.y;
      await db('auction_product?id=eq.' + p.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ audio: url || null, cfg: cf }) }); drop(s.slug);
      return json(res, 200, { ok: true, warn, y: cf.y || '' });
    }
    return json(res, 400, { error: 'act' });
  } catch (e) {
    console.error('auction', a, e.message);
    return json(res, 500, { error: /relation|does not exist|42P01|42883/.test(e.message) ? 'setup' : 'server', message: /relation|does not exist|42P01|42883/.test(e.message) ? 'צריך להריץ את tools/supabase_auction.sql ב-Supabase' : 'שגיאה בשרת' });
  }
};
/* העלאת קובץ שמע למערכת של הארגון בימות (עם הטוקן של המכירה) */
async function ymUpload(token, path, buf) {
  const fd = new FormData(); fd.append('token', token); fd.append('path', path); fd.append('convertAudio', '1'); fd.append('file', new Blob([buf]), path.split('/').pop());
  const r = await fetch('https://www.call2all.co.il/ym/api/UploadFile', { method: 'POST', body: fd, signal: AbortSignal.timeout(40000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!j || (j.responseStatus && j.responseStatus !== 'OK')) throw new Error((j && (j.message || j.responseStatus)) || r.status + ' ' + t.slice(0, 80));
}
module.exports.nedPaid = nedPaid; module.exports.notify = notify; module.exports.load = load; module.exports.makeOrder = makeOrder; module.exports.cfgOf = cfgOf; module.exports.isOpen = isOpen; module.exports.repBy = repBy; module.exports.customer = customer; module.exports.markPaid = markPaid; module.exports.pkgLive = pkgLive;
