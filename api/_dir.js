/* ספרי טלפונים (מאגרים): ייבוא בניהול, בחירת נמענים להזמנות ולברכות, רשימת חסימה קבועה, ואזור אישי לעדכון / מחיקת המייל.
   טבלאות: dir_book (מאגר: שם, עיר, גישה), dir_person (משפחה, משויכת לכמה מאגרים), dir_block (טלפונים שביקשו הסרה, לתמיד).
   פרטיות: בעל אירוע / שולח ברכה אף פעם לא רואה טלפון או מייל מהמאגר. רק שם, עיר, ו"יש טלפון / יש מייל".
   גישה למאגר (access): off = סגור, all = לכל בעלי האירועים, approved = רק למיילים שאושרו בניהול (allow). */
'use strict';
const crypto = require('node:crypto');
const { db, env, loadSetting, saveSetting } = require('./_lib');

const ph = v => { v = String(v == null ? '' : v).replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); if (/^[2-9]\d{7}$/.test(v) || /^5\d{8}$/.test(v)) v = '0' + v; return /^0(5\d{8}|[2-9]\d{7}|7\d{8})$/.test(v) ? v : ''; };
const okMail = v => { v = String(v || '').trim().toLowerCase(); return /^[^@\s,;<>"]+@[^@\s,;<>"]+\.[a-z]{2,}$/.test(v) && v.length <= 120 ? v : ''; };
const T = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 60);
const F = ['title', 'first', 'last', 'wife', 'father', 'fil', 'street', 'city', 'phone', 'mobile', 'email', 'lang', 'notes'];
const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

/* הגדרות (בניהול): on = המאגרים פעילים בכלל, voice = בחירה לשיחות, mail = בחירה למיילי הזמנה, greet = בחירה לשליחת ברכות במייל,
   ivrMail = בשיחה: "לקבלת ההזמנה במייל הקישו 7", ivrRemove = בשיחה: "להסרה הקישו 9", maxAdd = כמה אפשר להוסיף מהמאגר לאירוע אחד */
async function cfg() {
  const c = (await loadSetting('dircfg').catch(() => null)) || {};
  return { on: !!c.on, voice: c.voice !== false, mail: c.mail !== false, greet: !!c.greet, ivrMail: c.ivrMail !== false, ivrRemove: c.ivrRemove !== false, maxAdd: Math.max(10, Math.min(20000, parseInt(c.maxAdd, 10) || 2000)) };
}

/* שם לתצוגה: הרב אברהם כהן */
const nameOf = p => [p.title, p.first, p.last].filter(Boolean).join(' ').trim() || (p.wife ? 'משפחת ' + (p.last || '') : '');
/* שם לפנייה בהזמנה: "ר' אברהם ורעייתו שרה כהן" / "משפחת כהן" */
const inviteName = p => { const n = [p.title, p.first].filter(Boolean).join(' '); return n ? n + (p.last ? ' ' + p.last : '') : p.last ? 'משפחת ' + p.last : ''; };

/* ---------- גישה ---------- */
async function books(email, all) {
  const L = (await db('dir_book?select=id,name,city,note,access,allow,created_at&order=name.asc&limit=500').catch(() => [])) || [];
  if (all) return L;
  email = String(email || '').toLowerCase();
  return L.filter(b => b.access === 'all' || (b.access === 'approved' && email && (b.allow || []).map(x => String(x).toLowerCase()).includes(email)));
}
async function canBook(email, id) { return (await books(email)).some(b => String(b.id) === String(id)); }

/* ---------- רשימת חסימה ---------- */
async function blockedSet(phones) {
  const P = [...new Set((phones || []).map(ph).filter(Boolean))], out = new Set();
  for (let i = 0; i < P.length; i += 150) { const L = await db('dir_block?phone=in.(' + P.slice(i, i + 150).join(',') + ')&select=phone').catch(() => []); (L || []).forEach(x => out.add(x.phone)); }
  return out;
}
async function block(phone, why) {
  const p = ph(phone); if (!p) return false;
  await db('dir_block?on_conflict=phone', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ phone: p, why: T(why, 40) || 'ivr' }) });
  await db('timer_recip?phone=eq.' + p, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ call_st: 'ביקש הסרה' }) }).catch(() => {});
  return true;
}

/* ---------- חיפוש (לבעל אירוע / שולח ברכה): בלי טלפון ובלי מייל ---------- */
const safeQ = q => String(q || '').replace(/[,()*.:%\\"'`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
function filt(o) {
  let w = 'books=cs.%7B' + parseInt(o.book, 10) + '%7D';
  if (o.city) w += '&city=eq.' + encodeURIComponent(T(o.city, 40));
  /* כל מילה בחיפוש צריכה להופיע באחד השדות (and של כמה or) */
  const q = safeQ(o.q), C = [];
  if (q) q.split(' ').slice(0, 3).forEach(t => { const e = '*' + t + '*'; C.push('or(' + ['first', 'last', 'father', 'fil', 'wife', 'street'].map(k => k + '.ilike.' + e).join(',') + ')'); });
  if (o.need === 'email') w += '&email=not.is.null';
  else if (o.need === 'phone') C.push('or(phone.not.is.null,mobile.not.is.null)');
  if (C.length) w += '&and=' + encodeURIComponent('(' + C.join(',') + ')');
  return w;
}
async function search(email, o, admin) {
  if (!admin && !(await canBook(email, o.book))) return { error: 'book' };
  const off = Math.max(0, parseInt(o.off, 10) || 0), lim = Math.min(admin ? 500 : 200, Math.max(1, parseInt(o.lim, 10) || 100));
  const sel = admin ? '*' : 'id,title,first,last,wife,father,fil,street,city,phone,mobile,email';
  const L = (await db('dir_person?' + filt(o) + '&select=' + sel + '&order=last.asc.nullslast,first.asc&limit=' + lim + '&offset=' + off)) || [];
  /* כמה בסך הכל (עד 20,000) */
  const all = (await db('dir_person?' + filt(o) + '&select=id&limit=20000').catch(() => [])) || [];
  const B = admin ? new Set() : await blockedSet(L.flatMap(p => [p.phone, p.mobile]));
  const rows = admin ? L : L.map(p => ({ id: p.id, name: nameOf(p), father: p.father || '', fil: p.fil || '', street: p.street || '', city: p.city || '',
    tel: !!((p.phone && !B.has(p.phone)) || (p.mobile && !B.has(p.mobile))), mail: !!p.email }));
  /* הערים במאגר (לסינון) */
  let cities = null;
  if (!off && !o.city && !o.q) { const C = (await db('dir_person?books=cs.%7B' + parseInt(o.book, 10) + '%7D&city=not.is.null&select=city&limit=20000').catch(() => [])) || []; const m = {}; C.forEach(x => { m[x.city] = (m[x.city] || 0) + 1; }); cities = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, n]) => ({ k, n })); }
  return { rows, total: all.length, cities };
}
/* הרשומות המלאות (רק בשרת): לפי ids, או כל מי שמתאים לסינון */
async function resolve(email, o, max) {
  if (!(await canBook(email, o.book))) return null;
  let L;
  if (Array.isArray(o.ids) && o.ids.length) { const ids = o.ids.map(x => parseInt(x, 10)).filter(x => x > 0).slice(0, max); L = []; for (let i = 0; i < ids.length; i += 200) L.push(...((await db('dir_person?' + filt(o) + '&id=in.(' + ids.slice(i, i + 200).join(',') + ')&select=*&limit=200')) || [])); }
  else L = (await db('dir_person?' + filt(o) + '&select=*&order=id.asc&limit=' + max)) || [];
  const B = await blockedSet(L.flatMap(p => [p.phone, p.mobile]));
  return L.map(p => ({ ...p, phone: p.phone && !B.has(p.phone) ? p.phone : null, mobile: p.mobile && !B.has(p.mobile) ? p.mobile : null }));
}

/* ---------- מייל שהתקבל בטלפון (GetMail / EmailKeyboard) ---------- */
async function linkEmail(phone, email) {
  const p = ph(phone), e = okMail(email); if (!p || !e) return false;
  await db('dir_person?or=(phone.eq.' + p + ',mobile.eq.' + p + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email: e, email_src: 'phone', updated_at: new Date().toISOString() }) }).catch(() => {});
  return true;
}

/* ---------- ייבוא (ניהול) ---------- */
function rowOf(x) {
  const o = {}; F.forEach(k => { o[k] = T(x[k], k === 'notes' ? 300 : k === 'street' ? 80 : 60) || null; });
  o.phone = ph(o.phone) || null; o.mobile = ph(o.mobile) || null;
  /* נייד שנכתב בעמודת הטלפון (ולהפך) */
  if (o.phone && /^05/.test(o.phone) && !o.mobile) { o.mobile = o.phone; o.phone = null; }
  if (o.mobile && !/^05/.test(o.mobile) && !o.phone) { o.phone = o.mobile; o.mobile = null; }
  o.email = okMail(o.email) || null;
  o.lang = /^(yi|אידיש|יידיש|jiddish)/i.test(o.lang || '') ? 'yi' : o.lang ? 'he' : null;
  return o;
}
async function importRows(list, bookIds, byName) {
  const BK = await books('', true), byN = {}; BK.forEach(b => { byN[b.name.trim()] = b.id; });
  const base = (bookIds || []).map(x => parseInt(x, 10)).filter(x => BK.some(b => b.id === x));
  const R = { added: 0, updated: 0, blocked: 0, bad: 0, books: 0, nobook: 0 };
  const rows = []; const seen = {};
  for (const x of (list || []).slice(0, 5000)) {
    const o = rowOf(x || {}); const key = o.mobile || o.phone || (o.email ? 'm:' + o.email : '');
    if (!key || !(o.first || o.last || o.wife)) { R.bad++; continue; }
    let ids = base.slice();
    if (byName && x.books) for (const n of String(x.books).split(/[;|\n]+/).map(s => T(s, 60)).filter(Boolean)) {
      if (!byN[n]) { const c = await db('dir_book', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: n, access: 'off' }) }).catch(() => null); if (c && c[0]) { byN[n] = c[0].id; R.books++; } }
      if (byN[n] && !ids.includes(byN[n])) ids.push(byN[n]);
    }
    if (!ids.length) { R.nobook++; continue; }
    if (seen[key]) { seen[key].books = [...new Set(seen[key].books.concat(ids))]; F.forEach(k => { if (!seen[key][k] && o[k]) seen[key][k] = o[k]; }); continue; }
    seen[key] = { ...o, pkey: key, books: ids }; rows.push(seen[key]);
  }
  /* מספרים שביקשו הסרה לא נכנסים */
  const B = await blockedSet(rows.flatMap(r => [r.phone, r.mobile]));
  const ok = rows.filter(r => { if ((r.mobile && B.has(r.mobile)) || (r.phone && B.has(r.phone))) { R.blocked++; return false; } return true; });
  for (let i = 0; i < ok.length; i += 200) {
    const part = ok.slice(i, i + 200), have = {};
    ((await db('dir_person?pkey=in.(' + part.map(r => encodeURIComponent('"' + r.pkey + '"')).join(',') + ')&select=*&limit=200').catch(() => [])) || []).forEach(p => { have[p.pkey] = p; });
    const up = part.map(r => { const h = have[r.pkey]; if (!h) { R.added++; return { ...r, email_src: r.email ? 'import' : null }; }
      R.updated++; const m = { ...h }; F.forEach(k => { if (r[k]) m[k] = r[k]; });
      /* מייל שהאדם עצמו עדכן או מחק (בטלפון / באזור האישי) לא נדרס מהקובץ */
      if (h.email_src && h.email_src !== 'import') { m.email = h.email; m.email_src = h.email_src; } else if (r.email) m.email_src = 'import';
      m.books = [...new Set((h.books || []).concat(r.books))]; m.updated_at = new Date().toISOString(); delete m.created_at; return m; });
    const cols = ['pkey', 'books', 'email_src', ...F]; const norm = up.map(u => { const o = {}; cols.forEach(k => { o[k] = u[k] == null ? null : u[k]; }); if (u.id) o.id = u.id; return o; });
    const ins = norm.filter(x => !x.id).map(x => { delete x.id; return x; }), upd = norm.filter(x => x.id);
    if (ins.length) await db('dir_person', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(ins) });
    if (upd.length) await db('dir_person?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(upd.map(x => ({ ...x, updated_at: new Date().toISOString() }))) });
  }
  return R;
}

/* ---------- אזור אישי (/dir/): קישור חתום למייל, ואז עדכון / מחיקה של המייל, והסרה מהשיחות ---------- */
const sig = (e, exp) => crypto.createHmac('sha256', env('SUPABASE_SERVICE_ROLE_KEY') || 'myluach').update('dirme:' + e + ':' + exp).digest('hex').slice(0, 32);
const mkTok = e => { const exp = Date.now() + 2 * 864e5; return Buffer.from(e).toString('base64url') + '.' + exp + '.' + sig(e, exp); };
function readTok(t) { const [a, exp, s] = String(t || '').split('.'); let e = ''; try { e = Buffer.from(a || '', 'base64url').toString(); } catch (x) {} if (!e || !(+exp > Date.now()) || sig(e, exp) !== s) return null; return e; }
async function mine(e) {
  const P = (await db('dir_person?email=eq.' + encodeURIComponent(e) + '&select=id,title,first,last,city,phone,mobile,books&limit=20').catch(() => [])) || [];
  const R = (await db('timer_recip?email=eq.' + encodeURIComponent(e) + '&select=id,slug,phone&limit=200').catch(() => [])) || [];
  const phones = [...new Set(P.flatMap(p => [p.phone, p.mobile]).concat(R.map(r => r.phone)).filter(Boolean))];
  const B = await blockedSet(phones);
  return { P, R, phones, blocked: phones.filter(p => B.has(p)) };
}
const mask = p => p.slice(0, 3) + '-•••' + p.slice(-4);
async function me(b) {
  if (b.act === 'req') {
    const e = okMail(b.email); if (!e) return { status: 400, error: 'email' };
    /* לכל מייל: קישור אחד בכל 10 דקות */
    const RQ = (await loadSetting('dirmereq').catch(() => null)) || {}, now0 = Date.now();
    Object.keys(RQ).forEach(k => { if (now0 - RQ[k] > 600e3) delete RQ[k]; });
    if (RQ[e]) return { ok: true };
    RQ[e] = now0; await saveSetting('dirmereq', RQ).catch(() => {});
    const M = await mine(e);
    /* תמיד אותה תשובה (לא מגלים אם המייל קיים) */
    if (M.P.length || M.R.length) {
      const url = site() + '/dir/?t=' + mkTok(e);
      await require('./_paid').send('dirme', e, {}, { url, text: url }, 'dirme').catch(err => console.error('dirme', err.message));
    }
    return { ok: true };
  }
  const e = readTok(b.t); if (!e) return { status: 403, error: 'token' };
  if (b.act === 'get') { const M = await mine(e); return { email: e, people: M.P.map(p => ({ name: nameOf(p), city: p.city || '' })), events: new Set(M.R.map(r => r.slug)).size, phones: M.phones.map(p => ({ p: mask(p), id: crypto.createHash('sha256').update(p).digest('hex').slice(0, 10), blocked: M.blocked.includes(p) })) }; }
  const M = await mine(e), now = new Date().toISOString();
  if (b.act === 'del' || b.act === 'set') {
    const ne = b.act === 'set' ? okMail(b.email) : null; if (b.act === 'set' && !ne) return { status: 400, error: 'email' };
    await db('dir_person?email=eq.' + encodeURIComponent(e), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email: ne, email_src: ne ? 'self' : 'deleted', updated_at: now }) }).catch(() => {});
    /* ברשימות של אירועים: מייל שמוחק → הסרה מרשימת התפוצה (לא שולחים לו יותר). עדכון → הכתובת החדשה */
    for (const r of M.R) {
      if (ne) await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email: ne, email_src: 'self' }) }).catch(() => {});
      else await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(r.phone ? { email: 'sms-' + r.phone + '@phone.invalid', email_src: 'deleted' } : { status: 'unsub' }) }).catch(() => {});
    }
    return { ok: true, email: ne };
  }
  if (b.act === 'block' || b.act === 'unblock') {
    const p = M.phones.find(x => crypto.createHash('sha256').update(x).digest('hex').slice(0, 10) === String(b.id)); if (!p) return { status: 400, error: 'phone' };
    if (b.act === 'block') await block(p, 'self'); else await db('dir_block?phone=eq.' + p + '&why=in.(self,ivr)', { method: 'DELETE' }).catch(() => {});
    return { ok: true };
  }
  return { status: 400, error: 'act' };
}

/* ---------- ניהול (admin.js, פעולות dir_*) ---------- */
async function admin(b) {
  const a = b.action;
  if (a === 'dir_cfgget') return { cfg: await cfg() };
  if (a === 'dir_cfgset') { const c = b.cfg || {}; await saveSetting('dircfg', { on: !!c.on, voice: !!c.voice, mail: !!c.mail, greet: !!c.greet, ivrMail: !!c.ivrMail, ivrRemove: !!c.ivrRemove, maxAdd: parseInt(c.maxAdd, 10) || 2000 }); return { cfg: await cfg() }; }
  if (a === 'dir_books') {
    const L = await books('', true), out = [];
    for (const k of L) { const n = (await db('dir_person?books=cs.%7B' + k.id + '%7D&select=id&limit=50000').catch(() => [])) || []; out.push({ ...k, n: n.length }); }
    const tot = (await db('dir_person?select=id&limit=100000').catch(() => [])) || [], bl = (await db('dir_block?select=phone&limit=100000').catch(() => [])) || [];
    return { books: out, total: tot.length, blocked: bl.length, cfg: await cfg() };
  }
  if (a === 'dir_bookset') {
    const row = { name: T(b.name, 60), city: T(b.city, 40) || null, note: T(b.note, 200) || null, access: ['off', 'all', 'approved'].includes(b.access) ? b.access : 'off',
      allow: String(b.allow || '').split(/[\s,;]+/).map(okMail).filter(Boolean).slice(0, 500) };
    if (!row.name) return { error: 'name' };
    if (b.id) await db('dir_book?id=eq.' + parseInt(b.id, 10), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    else await db('dir_book', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    return { ok: true };
  }
  if (a === 'dir_bookdel') {
    const id = parseInt(b.id, 10); if (!id) return { error: 'id' };
    /* מוציאים את המאגר מהמשפחות. משפחה שלא נשארה בשום מאגר נמחקת */
    const L = (await db('dir_person?books=cs.%7B' + id + '%7D&select=id,books&limit=50000').catch(() => [])) || [];
    const gone = L.filter(p => (p.books || []).length <= 1).map(p => p.id), keep = L.filter(p => (p.books || []).length > 1);
    for (let i = 0; i < gone.length; i += 200) await db('dir_person?id=in.(' + gone.slice(i, i + 200).join(',') + ')', { method: 'DELETE' });
    for (const p of keep) await db('dir_person?id=eq.' + p.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ books: p.books.filter(x => x !== id) }) });
    await db('dir_book?id=eq.' + id, { method: 'DELETE' });
    return { ok: true, deleted: gone.length };
  }
  if (a === 'dir_import') return importRows(b.rows, b.books, !!b.byName);
  if (a === 'dir_search') { if (!b.book) { const L = (await db('dir_person?select=*&order=id.desc&limit=100' + (safeQ(b.q) ? '&or=(first.ilike.' + encodeURIComponent('*' + safeQ(b.q) + '*') + ',last.ilike.' + encodeURIComponent('*' + safeQ(b.q) + '*') + ',phone.ilike.' + encodeURIComponent('*' + safeQ(b.q) + '*') + ',mobile.ilike.' + encodeURIComponent('*' + safeQ(b.q) + '*') + ',email.ilike.' + encodeURIComponent('*' + safeQ(b.q) + '*') + ')' : '')).catch(() => [])) || []; return { rows: L, total: L.length }; }
    return search('', b, true); }
  if (a === 'dir_pset') {
    const id = parseInt(b.id, 10); if (!id) return { error: 'id' };
    const o = rowOf(b.p || {}), up = {}; F.forEach(k => { up[k] = o[k]; });
    if (Array.isArray(b.p && b.p.books)) up.books = b.p.books.map(x => parseInt(x, 10)).filter(Boolean);
    up.updated_at = new Date().toISOString(); up.email_src = up.email ? 'admin' : 'deleted';
    await db('dir_person?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up) });
    return { ok: true };
  }
  if (a === 'dir_pdel') { const id = parseInt(b.id, 10); if (!id) return { error: 'id' }; await db('dir_person?id=eq.' + id, { method: 'DELETE' }); return { ok: true }; }
  if (a === 'dir_blocklist') { const L = (await db('dir_block?select=phone,why,created_at&order=created_at.desc&limit=5000').catch(() => [])) || []; return { rows: L }; }
  if (a === 'dir_blockadd') { const L = String(b.phones || '').split(/[\s,;]+/).map(ph).filter(Boolean); for (const p of L) await block(p, 'admin'); return { ok: true, n: L.length }; }
  if (a === 'dir_blockdel') { const p = ph(b.phone); if (!p) return { error: 'phone' }; await db('dir_block?phone=eq.' + p, { method: 'DELETE' }); return { ok: true }; }
  return { error: 'action' };
}

module.exports = { cfg, books, canBook, search, resolve, blockedSet, block, linkEmail, importRows, admin, me, nameOf, inviteName, ph, okMail };
