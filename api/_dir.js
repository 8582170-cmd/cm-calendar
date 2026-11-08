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
  return { on: !!c.on, free: !!c.free, voice: c.voice !== false, mail: c.mail !== false, greet: !!c.greet, ivrMail: c.ivrMail !== false, ivrRemove: c.ivrRemove !== false, maxAdd: Math.max(10, Math.min(20000, parseInt(c.maxAdd, 10) || 2000)) };
}

/* שם לתצוגה: הרב אברהם כהן */
const nameOf = p => [p.title, p.first, p.last].filter(Boolean).join(' ').trim() || (p.wife ? 'משפחת ' + (p.last || '') : '');
/* שם לפנייה בהזמנה: "ר' אברהם ורעייתו שרה כהן" / "משפחת כהן" */
const inviteName = p => { const n = [p.title, p.first].filter(Boolean).join(' '); return n ? n + (p.last ? ' ' + p.last : '') : p.last ? 'משפחת ' + p.last : ''; };

/* ---------- גישה ---------- */
async function books(email, all) {
  const L = (await db('dir_book?select=id,name,city,note,access,allow,price,created_at&order=name.asc&limit=500').catch(() => db('dir_book?select=id,name,city,note,access,allow,created_at&order=name.asc&limit=500')).catch(() => [])) || [];
  if (all) return L;
  email = String(email || '').toLowerCase();
  return L.filter(b => b.access === 'all' || (b.access === 'approved' && email && (b.allow || []).map(x => String(x).toLowerCase()).includes(email)));
}
/* אירוע: האם המסלול שלו פותח את המאגרים, ומחיר כל מאגר לפי המסלול (book.price = { <מזהה מסלול>: ₪, _free: ₪ }; 0 / ריק = בלי תשלום).
   מאגר בתשלום נפתח לאירוע אחרי קנייה (cur.paid.dirs) */
async function eventPlan(cur) {
  const P = cur && cur.paid; if (!P) return null;
  if (P.free) return (await cfg()).free ? { pk: '_free', name: 'חינמי' } : null;
  const E = await require('./_eventpay').prices(), plan = E.plans.find(x => x.id === P.plan);
  const ok = (plan && plan.feats && plan.feats.dir) || (P.feats && P.feats.dir) || (!plan && !P.feats);
  return ok ? { pk: P.plan || 'base', name: plan ? plan.name : '' } : null;
}
async function eventBooks(cur, email) {
  const ep = await eventPlan(cur); if (!ep) return null;
  const opened = new Set(((cur.paid || {}).dirs || []).map(Number));
  return (await books(email)).map(b => { const price = Math.max(0, Number((b.price || {})[ep.pk]) || 0); return { id: b.id, name: b.name, city: b.city || '', note: b.note || '', price, open: !price || opened.has(b.id) }; });
}
async function forEvent(cur, id) { const L = await eventBooks(cur, String((cur.paid && cur.paid.email) || '').toLowerCase()); return L && L.find(b => b.id === id) || null; }
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
    /* משפחה שהחליפה מספר באזור האישי: המספר הישן נשמר ב-alias, כדי שהייבוא הבא לא ייצור אותה שוב */
    const miss = part.filter(r => !have[r.pkey]).map(r => r.pkey);
    if (miss.length) ((await db('dir_person?alias=ov.' + encodeURIComponent('{' + miss.map(k => '"' + k + '"').join(',') + '}') + '&select=*&limit=200').catch(() => [])) || []).forEach(p => { (p.alias || []).forEach(k => { if (miss.includes(k)) have[k] = p; }); });
    const up = part.map(r => { const h = have[r.pkey]; if (!h) { R.added++; return { ...r, email_src: r.email ? 'import' : null }; }
      R.updated++; const m = { ...h }; if (!h.self_at) F.forEach(k => { if (r[k]) m[k] = r[k]; });
      /* מייל שהאדם עצמו עדכן או מחק (בטלפון / באזור האישי) לא נדרס מהקובץ */
      if (h.email_src && h.email_src !== 'import') { m.email = h.email; m.email_src = h.email_src; } else if (r.email) m.email_src = 'import';
      m.books = [...new Set((h.books || []).concat(r.books))]; m.updated_at = new Date().toISOString(); delete m.created_at; return m; });
    /* אותה משפחה פעמיים באותה מנה (דרך alias): מאחדים */
    const byId = {}; for (let j = up.length - 1; j >= 0; j--) { const u = up[j]; if (!u.id) continue; if (byId[u.id]) { byId[u.id].books = [...new Set(byId[u.id].books.concat(u.books))]; up.splice(j, 1); R.updated--; } else byId[u.id] = u; }
    const cols = ['pkey', 'books', 'email_src', ...F]; const norm = up.map(u => { const o = {}; cols.forEach(k => { o[k] = u[k] == null ? null : u[k]; }); if (u.id) o.id = u.id; return o; });
    const ins = norm.filter(x => !x.id).map(x => { delete x.id; return x; }), upd = norm.filter(x => x.id);
    if (ins.length) await db('dir_person', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(ins) });
    if (upd.length) await db('dir_person?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(upd.map(x => ({ ...x, updated_at: new Date().toISOString() }))) });
  }
  return R;
}

/* ---------- אזור אישי (/dir/): קישור חתום למייל, ואז עדכון / מחיקה של המייל, והסרה מהשיחות ---------- */
/* זהות בקישור: e:<מייל> (קישור שנשלח למייל) או p:<טלפון> (קוד שהוקרא בשיחה) */
const sig = (e, exp) => crypto.createHmac('sha256', env('SUPABASE_SERVICE_ROLE_KEY') || 'myluach').update('dirme:' + e + ':' + exp).digest('hex').slice(0, 32);
const mkTok = e => { const exp = Date.now() + 2 * 864e5; return Buffer.from(e).toString('base64url') + '.' + exp + '.' + sig(e, exp); };
function readTok(t) { const [a, exp, s] = String(t || '').split('.'); let e = ''; try { e = Buffer.from(a || '', 'base64url').toString(); } catch (x) {} if (!e || !(+exp > Date.now()) || sig(e, exp) !== s) return null;
  if (!/^[ep]:/.test(e)) e = 'e:' + e; return { kind: e[0], v: e.slice(2) }; }
const EDIT = ['title', 'first', 'last', 'wife', 'father', 'fil', 'street', 'city', 'phone', 'mobile', 'email', 'lang'];
async function mine(id) {
  const P = (await db('dir_person?' + (id.kind === 'e' ? 'email=eq.' + encodeURIComponent(id.v) : 'or=(phone.eq.' + id.v + ',mobile.eq.' + id.v + ')') + '&select=*&limit=20').catch(() => [])) || [];
  const R = (await db('timer_recip?' + (id.kind === 'e' ? 'email=eq.' + encodeURIComponent(id.v) : 'phone=eq.' + id.v) + '&select=id,slug,phone,email&limit=200').catch(() => [])) || [];
  const phones = [...new Set(P.flatMap(p => [p.phone, p.mobile]).concat(R.map(r => r.phone)).concat(id.kind === 'p' ? [id.v] : []).filter(Boolean))];
  const B = await blockedSet(phones);
  return { P, R, phones, blocked: phones.filter(p => B.has(p)) };
}
const mask = p => p.slice(0, 3) + '-•••' + p.slice(-4);
const hid = p => crypto.createHash('sha256').update(p).digest('hex').slice(0, 10);
const nightOrHoly = async () => { const hr = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Jerusalem' }).format(new Date()); if (hr < 8 || hr >= 22) return 'night'; try { if (await require('./_timer').holyAt(Date.now())) return 'shabbat'; } catch (e) {} return ''; };
async function me(b) {
  /* כניסה עם מייל: קישור אישי למייל */
  if (b.act === 'req') {
    const e = okMail(b.email); if (!e) return { status: 400, error: 'email' };
    const RQ = (await loadSetting('dirmereq').catch(() => null)) || {}, now0 = Date.now();
    Object.keys(RQ).forEach(k => { if (now0 - RQ[k] > 600e3) delete RQ[k]; });
    if (RQ[e]) return { ok: true };
    RQ[e] = now0; await saveSetting('dirmereq', RQ).catch(() => {});
    const M = await mine({ kind: 'e', v: e });
    /* תמיד אותה תשובה (לא מגלים אם המייל קיים) */
    if (M.P.length || M.R.length) { const url = site() + '/dir/?t=' + mkTok('e:' + e); await require('./_paid').send('dirme', e, {}, { url, text: url }, 'dirme').catch(err => console.error('dirme', err.message)); }
    return { ok: true };
  }
  /* כניסה עם טלפון: שיחה שמקריאה קוד של 4 ספרות (לא בלילה ולא בשבת וחג). מספר אחד: פעם ב-10 דקות; בסך הכל עד 300 ביום */
  if (b.act === 'preq') {
    const p = ph(b.phone); if (!p) return { status: 400, error: 'phone' };
    const w = await nightOrHoly(); if (w) return { status: 400, error: w };
    const V = require('./_ivoice'); if (!(await V.ready().catch(() => false))) return { status: 503, error: 'voice' };
    const C = (await loadSetting('dirmecode').catch(() => null)) || {}, now0 = Date.now(), day = new Date().toISOString().slice(0, 10);
    Object.keys(C).forEach(k => { if (k !== '_' && now0 - C[k].at > 3600e3) delete C[k]; });
    const D0 = C._ && C._.day === day ? C._ : { day, n: 0 }; if (D0.n >= 300) return { status: 429, error: 'busy' };
    if (C[p] && now0 - C[p].at < 600e3) return { ok: true };
    const M = await mine({ kind: 'p', v: p });
    if ((M.P.length || M.R.length) && !M.blocked.includes(p)) {
      const code = String(crypto.randomInt(1000, 10000)); C[p] = { c: code, at: now0, n: 0 }; D0.n++; C._ = D0; await saveSetting('dirmecode', C).catch(() => {});
      const say = code.split('').join(' ');
      await V.sendTTS([{ phone: p }], 'שלום. הקוד שלכם לכניסה לאזור האישי של מיי לוח הוא: ' + say + '. שוב: ' + say + '.').catch(e => console.error('dirme call', e.message));
    } else { C[p] = { c: null, at: now0, n: 0 }; await saveSetting('dirmecode', C).catch(() => {}); }
    return { ok: true };
  }
  if (b.act === 'pver') {
    const p = ph(b.phone), C = (await loadSetting('dirmecode').catch(() => null)) || {}, x = p && C[p];
    if (!x || !x.c || Date.now() - x.at > 900e3 || x.n >= 5) return { status: 403, error: 'code' };
    if (String(b.code || '').trim() !== x.c) { x.n++; await saveSetting('dirmecode', C).catch(() => {}); return { status: 403, error: 'code' }; }
    delete C[p]; await saveSetting('dirmecode', C).catch(() => {});
    return { ok: true, t: mkTok('p:' + p) };
  }
  const id = readTok(b.t); if (!id) return { status: 403, error: 'token' };
  const M = await mine(id), now = new Date().toISOString();
  if (b.act === 'get') return { by: id.kind === 'e' ? 'email' : 'phone', who: id.kind === 'e' ? id.v : mask(id.v), events: new Set(M.R.map(r => r.slug)).size,
    people: M.P.map(p => { const o = { id: p.id }; EDIT.forEach(k => { o[k] = p[k] || ''; }); o.lang = p.lang || ''; return o; }),
    phones: M.phones.map(p => ({ p: mask(p), id: hid(p), blocked: M.blocked.includes(p) })) };
  /* עריכת כל הפרטים של משפחה שלי במאגר. מה שנערך כאן לא נדרס בייבוא הבא */
  if (b.act === 'pset') {
    const cur = M.P.find(p => String(p.id) === String(b.id)); if (!cur) return { status: 403, error: 'id' };
    const o = rowOf(b.p || {}), up = {}; EDIT.forEach(k => { up[k] = o[k]; });
    if (!(up.first || up.last || up.wife)) return { status: 400, error: 'name' };
    if (!(up.phone || up.mobile || up.email)) return { status: 400, error: 'contact' };
    up.pkey = up.mobile || up.phone || 'm:' + up.email;
    const alias = up.pkey !== cur.pkey ? [...new Set((cur.alias || []).concat([cur.pkey]))].slice(-10) : null;
    if ((up.email || null) !== (cur.email || null)) up.email_src = up.email ? 'self' : 'deleted';
    up.updated_at = now;
    const B = await blockedSet([up.phone, up.mobile]); if ((up.phone && B.has(up.phone) && up.phone !== cur.phone && up.phone !== cur.mobile) || (up.mobile && B.has(up.mobile) && up.mobile !== cur.mobile && up.mobile !== cur.phone)) return { status: 400, error: 'blocked' };
    const send = body => db('dir_person?id=eq.' + cur.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) });
    try { await send({ ...up, self_at: now, ...(alias ? { alias } : {}) }); }
    catch (e) { if (/duplicate|23505|pkey/i.test(e.message)) return { status: 409, error: 'dup' }; try { await send(up); } catch (e2) { if (/duplicate|23505/i.test(e2.message)) return { status: 409, error: 'dup' }; throw e2; } }
    /* המייל החדש גם ברשימות המוזמנים של האירועים שהגיעו מהמאגר */
    if (up.email_src) await db('timer_recip?dir_id=eq.' + cur.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(up.email ? { email: up.email, email_src: 'self' } : { email_src: 'deleted' }) }).catch(() => {});
    return { ok: true };
  }
  /* מחיקה מספרי הטלפונים לגמרי */
  if (b.act === 'pdel') {
    const cur = M.P.find(p => String(p.id) === String(b.id)); if (!cur) return { status: 403, error: 'id' };
    await db('dir_person?id=eq.' + cur.id, { method: 'DELETE' });
    if (b.block) for (const p of [cur.phone, cur.mobile].filter(Boolean)) await block(p, 'self').catch(() => {});
    return { ok: true };
  }
  if (b.act === 'del' || b.act === 'set') {
    if (id.kind !== 'e') return { status: 400, error: 'act' };
    const e = id.v, ne = b.act === 'set' ? okMail(b.email) : null; if (b.act === 'set' && !ne) return { status: 400, error: 'email' };
    await db('dir_person?email=eq.' + encodeURIComponent(e), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email: ne, email_src: ne ? 'self' : 'deleted', updated_at: now }) }).catch(() => {});
    /* ברשימות של אירועים: מייל שנמחק → הסרה מרשימת התפוצה. עדכון → הכתובת החדשה */
    for (const r of M.R) {
      if (ne) await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ email: ne, email_src: 'self' }) }).catch(() => {});
      else await db('timer_recip?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(r.phone ? { email: 'sms-' + r.phone + '@phone.invalid', email_src: 'deleted' } : { status: 'unsub' }) }).catch(() => {});
    }
    return { ok: true, email: ne };
  }
  if (b.act === 'block' || b.act === 'unblock') {
    const p = M.phones.find(x => hid(x) === String(b.id)); if (!p) return { status: 400, error: 'phone' };
    if (b.act === 'block') await block(p, 'self'); else await db('dir_block?phone=eq.' + p + '&why=in.(self,ivr)', { method: 'DELETE' }).catch(() => {});
    return { ok: true };
  }
  return { status: 400, error: 'act' };
}

/* ---------- ניהול (admin.js, פעולות dir_*) ---------- */
async function admin(b) {
  const a = b.action;
  if (a === 'dir_cfgget') return { cfg: await cfg() };
  if (a === 'dir_cfgset') { const c = b.cfg || {}; await saveSetting('dircfg', { on: !!c.on, free: !!c.free, voice: !!c.voice, mail: !!c.mail, greet: !!c.greet, ivrMail: !!c.ivrMail, ivrRemove: !!c.ivrRemove, maxAdd: parseInt(c.maxAdd, 10) || 2000 }); return { cfg: await cfg() }; }
  if (a === 'dir_books') {
    const L = await books('', true), out = [];
    for (const k of L) { const n = (await db('dir_person?books=cs.%7B' + k.id + '%7D&select=id&limit=50000').catch(() => [])) || []; out.push({ ...k, n: n.length }); }
    const tot = (await db('dir_person?select=id&limit=100000').catch(() => [])) || [], bl = (await db('dir_block?select=phone&limit=100000').catch(() => [])) || [];
    const EP = await require('./_eventpay').prices().catch(() => ({ plans: [] }));
    return { books: out, total: tot.length, blocked: bl.length, cfg: await cfg(), plans: EP.plans.filter(p => !p.hidden || (p.feats && p.feats.dir)).map(p => ({ id: p.id, name: p.name, dir: !!(p.feats && p.feats.dir) })) };
  }
  if (a === 'dir_bookset') {
    const row = { name: T(b.name, 60), city: T(b.city, 40) || null, note: T(b.note, 200) || null, access: ['off', 'all', 'approved'].includes(b.access) ? b.access : 'off',
      allow: String(b.allow || '').split(/[\s,;]+/).map(okMail).filter(Boolean).slice(0, 500) };
    /* מחיר לפי מסלול (ריק / 0 = בלי תשלום) */
    if (b.price && typeof b.price === 'object') { const pr = {}; Object.keys(b.price).slice(0, 40).forEach(k => { const v = Math.round(Number(b.price[k]) * 100) / 100; if (/^[a-z0-9_-]{1,24}$/.test(k) && v > 0 && v <= 10000) pr[k] = v; }); row.price = pr; }
    if (!row.name) return { error: 'name' };
    const W = r => b.id ? db('dir_book?id=eq.' + parseInt(b.id, 10), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(r) }) : db('dir_book', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(r) });
    try { await W(row); } catch (e) { if (row.price && /price/.test(e.message)) { delete row.price; await W(row); return { ok: true, warn: 'price' }; } throw e; }
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

module.exports = { cfg, books, eventPlan, eventBooks, forEvent, canBook, search, resolve, blockedSet, block, linkEmail, importRows, admin, me, nameOf, inviteName, ph, okMail };
