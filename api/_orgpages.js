/* דפי הארגון למכירה סינית ולקמפיין התרמה: "על הארגון", "יצירת קשר", "הצטרפות לרשימה".
   ההגדרות נשמרות ב-cfg.org של המכירה / הקמפיין, וכל דף כבוי עד שמנהל הארגון מפעיל אותו.
   פניות והרשמות נשמרות בטבלה org_msg (tools/supabase_org_pages.sql). השרת רק שומר; אין שליחה לרשימה מהאתר.
   הצטרפות לרשימה דורשת הסכמה מפורשת. */
'use strict';
const { db } = require('./_lib');
const enc = encodeURIComponent;
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const url = u => { u = String(u || '').trim(); return /^https?:\/\/[^\s<>"']{3,300}$/i.test(u) ? u : ''; };
const mailN = v => { v = String(v || '').trim().toLowerCase(); return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) && v.length <= 120 ? v : ''; };
const phoneN = v => { v = String(v || '').replace(/[^\d+]/g, ''); if (/^\+?972/.test(v)) v = '0' + v.replace(/^\+?972/, ''); return /^0\d{8,9}$/.test(v) ? v : ''; };
const WING = { auction: 'המכירה הסינית', give: 'הקמפיין' };

/* שמירת ההגדרות (מנהל הארגון) */
function clean(b, old) {
  b = b && typeof b === 'object' ? b : {}; const o = { ...(old || {}) };
  const a = b.about, c = b.contact, l = b.list;
  if (a && typeof a === 'object') o.about = { on: !!a.on, text: str(a.text, 4000), email: mailN(a.email), phone: str(a.phone, 30), address: str(a.address, 200), site: url(a.site),
    links: (Array.isArray(a.links) ? a.links : []).map(x => ({ t: str(x && x.t, 60), u: url(x && x.u) })).filter(x => x.t && x.u).slice(0, 8) };
  if (b.faq && typeof b.faq === 'object') o.faq = { on: !!b.faq.on };
  if (c && typeof c === 'object') o.contact = { on: !!c.on, intro: str(c.intro, 500) };
  if (l && typeof l === 'object') o.list = { on: !!l.on, intro: str(l.intro, 500), mode: l.mode === 'contact' ? 'contact' : 'popup' };
  return o;
}
/* איפה מוצגת ההצטרפות: בתוך דף "צור קשר" (תיבת סימון), או בחלון קופץ. אם "צור קשר" כבוי, תמיד חלון קופץ */
const listMode = o => ((o.list || {}).mode === 'contact' && (o.contact || {}).on) ? 'contact' : 'popup';
/* מה מוצג לציבור: רק דפים פעילים */
function pub(o, faq) {
  o = o || {}; const a = o.about || {}, r = {};
  if (a.on && (a.text || a.email || a.phone || a.address || a.site || (a.links || []).length)) r.about = { text: a.text || '', email: a.email || '', phone: a.phone || '', address: a.address || '', site: a.site || '', links: a.links || [] };
  /* שאלות ותשובות כדף נפרד: הנתונים הם אלה שכבר קיימים במכירה / בקמפיין (faq), והם עוברים מהדף הראשי לדף הזה */
  const fq = (Array.isArray(faq) ? faq : []).filter(x => x && x.q && x.a);
  if ((o.faq || {}).on && fq.length) r.faq = { items: fq.map(x => ({ q: x.q, a: x.a })) };
  if ((o.contact || {}).on) r.contact = { intro: o.contact.intro || '' };
  if ((o.list || {}).on) r.list = { intro: o.list.intro || '', mode: listMode(o) };
  return Object.keys(r).length ? r : null;
}
/* פנייה או הצטרפות מהציבור. notify(subject, htmlBody) שולחת למנהלים */
async function submit(wing, s, b, notify) {
  const kind = b.kind === 'list' ? 'list' : b.kind === 'contact' ? 'contact' : '', o = ((s.cfg || {}).org) || {};
  if (!kind || !(o[kind] || {}).on || (kind === 'list' && listMode(o) !== 'popup')) return { status: 400, error: 'off', message: 'הדף הזה לא פעיל' };
  if (str(b.website, 50)) return { status: 200, ok: true };
  const name = str(b.name, 80), email = mailN(b.email), phone = phoneN(b.phone), msg = str(b.msg, 2000);
  if (kind === 'contact' && (!name || !msg || !(email || phone))) return { status: 400, error: 'details', message: 'צריך שם, הודעה, ומייל או טלפון' };
  if (kind === 'list' && (!(email || phone) || b.consent !== true)) return { status: 400, error: 'details', message: 'צריך מייל או טלפון, ולסמן הסכמה לקבלת עדכונים' };
  const base = 'org_msg?wing=eq.' + wing + '&slug=eq.' + enc(s.slug) + '&kind=eq.' + kind, since = new Date(Date.now() - 3600e3).toISOString();
  const recent = await db(base + '&created_at=gte.' + enc(since) + '&select=email,phone&limit=200').catch(() => []);
  if ((recent || []).length >= 60 || (recent || []).filter(x => (email && x.email === email) || (phone && x.phone === phone)).length >= 3) return { status: 429, error: 'many', message: 'נשלחו כבר כמה פניות. נסו שוב מאוחר יותר' };
  /* הצטרפות לרשימה: ללא כפילויות (אותו מייל או טלפון) */
  const join = async () => { const lb = 'org_msg?wing=eq.' + wing + '&slug=eq.' + enc(s.slug) + '&kind=eq.list', ex = await db(lb + '&select=id,email,phone&limit=5000').catch(() => []);
    if ((ex || []).some(x => (email && x.email === email) || (phone && x.phone === phone))) return false;
    await db('org_msg', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ wing, slug: s.slug, kind: 'list', name: name || null, email: email || null, phone: phone || null, msg: null, consent: true }) }); return true; };
  if (kind === 'list') { const added = await join(); return { status: 200, ok: true, already: !added }; }
  await db('org_msg', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ wing, slug: s.slug, kind, name: name || null, email: email || null, phone: phone || null, msg: msg || null, consent: false }) });
  /* תיבת "הצטרפות לרשימה" בתוך טופס יצירת הקשר: רק עם הסכמה מפורשת, ורק כשההצטרפות מוגדרת לדף הזה */
  if (b.consent === true && (o.list || {}).on && listMode(o) === 'contact' && (email || phone)) await join().catch(() => {});
  if (kind === 'contact' && notify) { const { escH } = require('./_mail');
    await notify('פנייה חדשה מדף "צור קשר"', '<p><b>' + escH(name) + '</b></p><p>' + escH(email) + (email && phone ? ' · ' : '') + escH(phone) + '</p><p style="white-space:pre-line">' + escH(msg) + '</p><p style="color:#666;font-size:13px">אפשר לענות ישירות ללקוח במייל או בטלפון שלמעלה.</p>').catch(() => {}); }
  return { status: 200, ok: true };
}
/* למנהל: רשימת הפניות / ההרשמות */
async function list(wing, s) {
  const L = await db('org_msg?wing=eq.' + wing + '&slug=eq.' + enc(s.slug) + '&select=id,kind,name,email,phone,msg,created_at&order=created_at.desc&limit=3000').catch(() => []);
  return { contact: (L || []).filter(x => x.kind === 'contact'), list: (L || []).filter(x => x.kind === 'list') };
}
async function del(wing, s, id) { await db('org_msg?wing=eq.' + wing + '&slug=eq.' + enc(s.slug) + '&id=eq.' + enc(String(id || '')), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); }
module.exports = { clean, pub, submit, list, del, WING };
