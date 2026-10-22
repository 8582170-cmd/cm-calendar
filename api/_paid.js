/* סימון הזמנה כשולמה (מכל דרך תשלום: נדרים פלוס, פייפל, קופון 100%), ושליחת המיילים:
   ללקוח: אישור רכישה. לבעל האתר: הודעה על כל רכישה (OWNER_EMAIL, ואם אין: ALERT_EMAIL).
   נוסח המיילים ניתן לעריכה בדף הניהול (settings → pricing → mailTpl). שדה ריק = הנוסח הרגיל שכאן. */
'use strict';
const { db, env, PLAN_NAMES, loadConfig } = require('./_lib');

const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

/* הנוסח הרגיל. {סוגריים} = נתון שמתמלא לבד */
const DEFAULTS = {
  welcome: { subject: 'ברוכים הבאים ל־MyLuach', title: 'ברוכים הבאים ל־MyLuach!',
    body: 'החשבון נפתח. מעכשיו הלוחות שלכם נשמרים בחשבון, ואפשר לחזור אליהם מכל מחשב או טלפון.\n\nכמה דברים שאפשר לעשות: לוח שנה עברי עם תמונות משפחתיות, ימי הולדת וימי שנה (יארצייט) שחוזרים כל שנה, זמני היום לעיר שלכם, ותזכורות במייל.',
    button: 'לבונה הלוח', foot: 'קיבלתם את המייל כי נרשמתם ל־MyLuach עם הכתובת הזאת.' },
  purchase: { subject: 'הרכישה הושלמה: {מסלול} ב־MyLuach', title: 'תודה! {מסלול} פעיל',
    body: 'הרכישה הושלמה בהצלחה ({סכום}{קופון}).\nכדי להשתמש במסלול, התחברו בבונה הלוח עם כתובת המייל הזאת. אפשר להוריד ולהדפיס את הלוח לפי מספר ההורדות שבמסלול.',
    button: 'לבונה הלוח', foot: 'מספר הזמנה: {הזמנה}. שאלות? פשוט עונים למייל הזה.' },
  donation: { subject: 'תודה על התרומה ל־MyLuach', title: 'תודה רבה על התרומה!',
    body: 'קיבלנו את תרומתך על סך {סכום}. תודה שאתם עוזרים לנו להמשיך.', button: '', foot: 'מספר הזמנה: {הזמנה}.' },
  refund: { subject: 'החזר תשלום מ־MyLuach', title: 'בוצע החזר תשלום',
    body: 'ביצענו החזר של {החזר} עבור {מסלול} (הזמנה {הזמנה}).\nההחזר יופיע באמצעי התשלום שבו שילמתם, בדרך כלל תוך כמה ימי עסקים.', button: '', foot: 'שאלות? פשוט עונים למייל הזה.' },
  owner: { subject: '💰 {סוג} חדשה: {מסלול} · {סכום}', title: '{סוג} חדשה',
    body: '{מסלול}\nסכום: {סכום}{קופון}\nלקוח: {מייל}\nאמצעי תשלום: {אמצעי}\nמספר הזמנה: {הזמנה}', button: 'לדף הניהול', foot: '' }
};
const KINDS = { welcome: 'ללקוח אחרי הרשמה', purchase: 'ללקוח אחרי רכישה', donation: 'לתורם אחרי תרומה', refund: 'ללקוח אחרי החזר תשלום', owner: 'אליך על כל רכישה ותרומה' };

/* בונה מייל לפי הנוסח (מהניהול או הרגיל) והנתונים */
function render(kind, vars, tpl) {
  const { frame, escH } = require('./_mail');
  const T = { ...DEFAULTS[kind] }; const own = (tpl || {})[kind] || {};
  for (const k of ['subject', 'title', 'body', 'button', 'foot']) if (own[k] != null && String(own[k]).trim() !== '') T[k] = String(own[k]);
  const fill = (s, html) => String(s || '').replace(/\{([^{}]{1,12})\}/g, (m, k) => vars[k] != null ? (html ? escH(vars[k]) : String(vars[k])) : m);
  const h = s => fill(escH(s).replace(/\n/g, '<br>'), true);
  const url = kind === 'owner' ? site() + '/admin' : site() + '/app.html';
  return { subject: fill(T.subject, false), html: frame({ title: h(T.title), body: h(T.body), button: T.button ? h(T.button) : null, url, foot: T.foot ? h(T.foot) : '' }), text: fill(T.title, false) + '\n\n' + fill(T.body, false) };
}
function vars(o) {
  const isDon = o.plan === 'donation';
  return { 'מסלול': isDon ? 'תרומה' : 'מסלול ' + (PLAN_NAMES[o.plan] || o.plan), 'סכום': +o.amount ? (+o.amount).toLocaleString('he-IL') + ' ₪' : 'בחינם',
    'קופון': o.coupon ? ', קופון ' + o.coupon : '', 'הזמנה': String(o.id || '').slice(0, 8), 'מייל': o.email || 'לא ידוע', 'אמצעי': o.via || 'נדרים פלוס', 'סוג': isDon ? 'תרומה' : 'רכישה' };
}

async function markPaid(o, extra, via) {
  if (!o || !o.id) return false;
  const first = o.status !== 'paid';
  const upd = { ...(extra || {}), status: 'paid', paid_at: first ? new Date().toISOString() : o.paid_at };
  await db('orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify(upd) });
  if (first) await notify({ ...o, ...upd, via: via || 'נדרים פלוס' }).catch(e => console.error('paid mail', e.message));
  return first;
}
async function notify(o) {
  const { sendMail } = require('./_mail'), tpl = (await loadConfig()).mailTpl, V = vars(o), isDon = o.plan === 'donation';
  if (o.email) { try { await sendMail({ to: o.email, ...render(isDon ? 'donation' : 'purchase', V, tpl) }, 'purchase'); } catch (e) { console.error('customer mail', e.message); } }
  const to = env('OWNER_EMAIL') || env('ALERT_EMAIL');
  if (to) { try { await sendMail({ to, ...render('owner', V, tpl) }, 'owner'); } catch (e) { console.error('owner mail', e.message); } }
}
async function welcome() { return render('welcome', {}, (await loadConfig()).mailTpl); }
/* לתצוגה מקדימה בניהול: כל המיילים עם נתוני דוגמה, לפי נוסח נתון (גם לפני שמירה) */
function previews(tpl) {
  const V = vars({ id: 'a1b2c3d4e5f6', plan: 'family', amount: 89, email: 'customer@example.com', coupon: '', via: 'PayPal' });
  const VD = vars({ id: 'a1b2c3d4e5f6', plan: 'donation', amount: 50, email: 'donor@example.com', via: 'נדרים פלוס' });
  return Object.keys(DEFAULTS).map(k => ({ k, who: KINDS[k], ...render(k, k === 'donation' ? VD : k === 'refund' ? { ...V, 'החזר': '89 ₪' } : V, tpl) }));
}
/* מייל ללקוח על החזר */
async function refundMail(o, amt) {
  if (!o.email) return;
  const { sendMail } = require('./_mail'), tpl = (await loadConfig()).mailTpl;
  try { await sendMail({ to: o.email, ...render('refund', { ...vars(o), 'החזר': (+amt).toLocaleString('he-IL') + ' ₪' }, tpl) }, 'refund'); } catch (e) { console.error('refund mail', e.message); }
}
module.exports = { markPaid, notify, welcome, previews, refundMail, DEFAULTS, KINDS };
