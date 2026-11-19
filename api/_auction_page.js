/* שליטה בדף המכירה: דפים מותאמים (עם HTML), הודעות לגולשים ולטלפון, שדות רכישה, והצפייה החיה בהגרלות.
   כל ההגדרות נשמרות ב-cfg של המכירה. ברירת המחדל: הכול כבוי / כמו עד עכשיו. */
'use strict';
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const line = (v, n) => str(v, n).replace(/[<>]/g, '');
const ID = /^[a-z0-9]{3,12}$/;
const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

/* ניקוי HTML של דף: מסירים סקריפטים, מסגרות, טפסים, מאפייני אירועים וקישורי javascript. הדף מוצג בכל מקרה במסגרת מבודדת (sandbox) בלי הרצת סקריפטים */
function cleanHtml(h) {
  h = String(h == null ? '' : h).slice(0, 60000);
  h = h.replace(/<!--[\s\S]*?-->/g, '').replace(/<\s*(script|iframe|object|embed|form|meta|link|base|frame|frameset|applet)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '').replace(/<\s*(script|iframe|object|embed|form|meta|link|base|frame|input|button|textarea|select)\b[^>]*>/gi, '');
  h = h.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/\s(href|src|action|formaction|xlink:href|srcdoc)\s*=\s*("\s*(javascript|vbscript|data:text)[^"]*"|'\s*(javascript|vbscript|data:text)[^']*')/gi, ' $1="#"');
  return h.trim();
}

/* דפים: [{id, title, kind: text|html, body, on, h}] */
function pagesOf(l) {
  const seen = new Set();
  return (Array.isArray(l) ? l : []).slice(0, 12).map(x => {
    x = x || {}; let id = ID.test(String(x.id || '')) ? String(x.id) : newId(); while (seen.has(id)) id = newId(); seen.add(id);
    const kind = x.kind === 'html' ? 'html' : 'text', body = kind === 'html' ? cleanHtml(x.body) : str(x.body, 12000);
    return { id, title: line(x.title, 40), kind, body, on: x.on !== false, h: Math.max(200, Math.min(3000, Math.floor(+x.h) || 600)) };
  }).filter(x => x.title);
}
/* הודעות לגולשים: [{id, text, tone: info|ok|warn, on, from, to, phone}] phone = להשמיע גם בתחילת שיחת הטלפון. phoneText = נוסח מותאם לטלפון */
const iso = v => v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : '';
function notesOf(l) {
  const seen = new Set();
  return (Array.isArray(l) ? l : []).slice(0, 8).map(x => {
    x = x || {}; let id = ID.test(String(x.id || '')) ? String(x.id) : newId(); while (seen.has(id)) id = newId(); seen.add(id);
    return { id, text: str(x.text, 600), tone: ['ok', 'warn'].includes(x.tone) ? x.tone : 'info', on: x.on !== false, from: iso(x.from), to: iso(x.to), phone: !!x.phone, phoneText: str(x.phoneText, 400).replace(/[.=&"<>-]/g, ' ') };
  }).filter(x => x.text);
}
const noteLive = (n, t) => n.on && (!n.from || Date.parse(n.from) <= t) && (!n.to || Date.parse(n.to) > t);

/* שדות הרכישה. std: '' = כבוי, opt = אופציונלי, req = חובה. phoneMail: either (כמו עד עכשיו) | phone | email | both
   extra: שדות נוספים [{id,label,type: text|textarea|select|checkbox,opts,req}] */
function fieldsOf(f) {
  f = f && typeof f === 'object' ? f : {}; const m = v => ['', 'opt', 'req'].includes(v) ? v : null, seen = new Set();
  return { city: m(f.city) == null ? 'opt' : m(f.city), addr: m(f.addr) || '', phoneMail: ['phone', 'email', 'both'].includes(f.phoneMail) ? f.phoneMail : 'either',
    extra: (Array.isArray(f.extra) ? f.extra : []).slice(0, 10).map(x => {
      x = x || {}; let id = ID.test(String(x.id || '')) ? String(x.id) : newId(); while (seen.has(id)) id = newId(); seen.add(id);
      const type = ['textarea', 'select', 'checkbox'].includes(x.type) ? x.type : 'text', opts = type === 'select' ? (Array.isArray(x.opts) ? x.opts : String(x.opts || '').split('\n')).map(o => line(o, 60)).filter(Boolean).slice(0, 20) : [];
      return { id, label: line(x.label, 80), type, opts, req: !!x.req, help: line(x.help, 120) };
    }).filter(x => x.label && (x.type !== 'select' || x.opts.length)) };
}
/* בדיקת תשובות הרוכש מול ההגדרות. מחזיר {error,message} או {answers} */
function checkAnswers(F, b) {
  const a = b.fx && typeof b.fx === 'object' ? b.fx : {}, out = {};
  if (F.city === 'req' && !line(b.city, 60)) return { error: 'field', message: 'נא למלא עיר' };
  if (F.addr === 'req' && !line(b.addr, 160)) return { error: 'field', message: 'נא למלא כתובת' };
  for (const x of F.extra) {
    let v = a[x.id];
    if (x.type === 'checkbox') { v = v === true || v === 'true'; if (x.req && !v) return { error: 'field', message: 'נא לסמן: ' + x.label }; if (v) out[x.id] = true; continue; }
    v = line(v, x.type === 'textarea' ? 500 : 200);
    if (x.type === 'select' && v && !x.opts.includes(v)) return { error: 'field', message: 'בחירה לא תקינה: ' + x.label };
    if (x.req && !v) return { error: 'field', message: 'נא למלא: ' + x.label };
    if (v) out[x.id] = v;
  }
  return { answers: out };
}
/* תשובות כטקסט קריא לפי התוויות הנוכחיות (לניהול, למייל ולייצוא) */
function answersText(F, ans) { ans = ans || {}; return F.extra.filter(x => ans[x.id] != null && ans[x.id] !== '').map(x => ({ label: x.label, value: ans[x.id] === true ? 'כן' : String(ans[x.id]) })); }

/* צפייה חיה: on, names = full | short */
function liveOf(l) { l = l && typeof l === 'object' ? l : {}; return { on: l.on === true, names: l.names === 'full' ? 'full' : 'short', conf: l.conf !== false, sound: l.sound === true }; }

/* הדפים המותאמים נכנסים לאובייקט org הציבורי, כדי להופיע בתפריט הדפים */
function withPages(org, pages) { const L = (pages || []).filter(x => x.on).map(x => ({ id: x.id, title: x.title, kind: x.kind, body: x.body, h: x.h })); if (!L.length) return org; return { ...(org || {}), custom: L }; }

module.exports = { withPages, cleanHtml, pagesOf, notesOf, noteLive, fieldsOf, checkAnswers, answersText, liveOf };
