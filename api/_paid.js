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
    body: '{מסלול}\nסכום: {סכום}{קופון}\nלקוח: {מייל}\nאמצעי תשלום: {אמצעי}\nמספר הזמנה: {הזמנה}', button: 'לדף הניהול', foot: '' },
  /* מיילים של מוצרים נוספים (עד עכשיו הנוסח היה קבוע בקוד) */
  event: { subject: 'דף ההזמנה לאירוע פעיל ✓', title: 'תודה! דף ההזמנה פעיל',
    body: 'דף ההזמנה בכתובת **{כתובת}** פתוח עכשיו לאורחים.{מיילים}\nאת הניהול (רשימת נמענים, שליחה, אישורי הגעה) עושים מאותו דפדפן שבו נשמרה הכתובת.', button: 'לניהול האירוע', foot: '' },
  gift: { subject: '🎁 קיבלתם מתנה: {שם} · {סכום}', title: 'קיבלתם מתנה 🎁',
    body: '**{שם}** שלח/ה מתנה של {סכום}{ברכה}\n\nמגיע לכם (אחרי עמלה): {נטו}', button: 'לניהול האירוע', foot: '' },
  greet: { subject: 'התשלום התקבל: {עיצוב} · MyLuach', title: 'העיצוב שלכם מוכן',
    body: 'התשלום התקבל, תודה!\n\nזה הקישור האישי לעיצוב "{עיצוב}".\nאפשר לפתוח אותו מכל מחשב או טלפון, לשנות את הטקסט עד {עריכה}, ולהוריד את הקובץ בכל גודל עד {הורדה}.',
    button: 'לפתיחת העיצוב', foot: 'מספר הזמנה: {הזמנה}. לא לשתף את הקישור: מי שיש לו אותו יכול לשנות את העיצוב.' },
  greetlink: { subject: 'הקישור לעיצוב: {עיצוב} · MyLuach', title: 'הקישור לעיצוב שלכם',
    body: 'זה הקישור האישי לעיצוב "{עיצוב}".\nאפשר לפתוח אותו מכל מחשב או טלפון, לשנות את הטקסט עד {עריכה}, ולהוריד את הקובץ בכל גודל עד {הורדה}.',
    button: 'לפתיחת העיצוב', foot: 'מספר הזמנה: {הזמנה}. לא לשתף את הקישור: מי שיש לו אותו יכול לשנות את העיצוב.' },
  remconfirm: { subject: 'אישור תזכורות במייל מ־MyLuach', title: 'לאשר תזכורות במייל?',
    body: 'ביקשתם לקבל במייל הזה תזכורת: **{שם}**.\nלחצו כדי לאשר. אם לא ביקשתם, אפשר להתעלם מהמייל הזה, ולא יישלח אליכם כלום.', button: 'לאישור התזכורות',
    foot: 'אם לא ביקשתם, אפשר להתעלם מהמייל הזה ולא יישלח אליכם דבר.' },
  subbuy: { subject: 'תודה! {מסלול} פעיל', title: '{מסלול} פעיל',
    body: 'הרכישה הושלמה בהצלחה ({סכום}{קופון}).\n{הסבר}\nבתוקף עד: {עד}.', button: '{כפתור}', foot: 'מספר הזמנה: {הזמנה}. שאלות? פשוט עונים למייל הזה.' },
  cardfail: { subject: 'החיוב החודשי לא עבר: {מנוי}', title: 'צריך לעדכן את כרטיס האשראי',
    body: 'ניסינו לחייב את החיוב החודשי של **{מנוי}**, וחברת האשראי לא אישרה ({סיבה}).\nכדי שהמנוי ימשיך בלי הפסקה, אפשר לעדכן את פרטי הכרטיס בקישור המאובטח (של נדרים פלוס, תקף 14 יום).', button: 'לעדכון הכרטיס', foot: 'אם תרצו לבטל את המנוי, אפשר לעשות את זה באזור האישי באתר.' },
  renew: { subject: 'המנוי שלכם מסתיים בעוד {ימים} ימים', title: 'הגיע הזמן לחדש',
    body: '**{מנוי}** בתוקף עד {תאריך}.\nכדי להמשיך בלי הפסקה, אפשר לחדש עכשיו. החידוש מתחיל מיום התשלום.', button: 'לחידוש המנוי', foot: 'קיבלתם את המייל כי יש לכם מנוי ב־MyLuach. אם לא תחדשו, המנוי פשוט יסתיים.' },
  reminder: { subject: 'תזכורת: {שם} {מתי}', title: '{שם}', body: '**{מתי}**, יום {יום}\n{תאריך עברי} · {תאריך}', button: '{כפתור}',
    foot: 'קיבלתם את המייל כי ביקשתם תזכורת בלוח השנה של MyLuach.' }
};
const KINDS = { welcome: 'ללקוח אחרי הרשמה', purchase: 'ללקוח אחרי רכישה', donation: 'לתורם אחרי תרומה', refund: 'ללקוח אחרי החזר תשלום', owner: 'אליך על כל רכישה ותרומה',
  event: 'לבעל אירוע אחרי תשלום על דף הזמנה', gift: 'לבעל אירוע כשאורח שולח מתנה', greet: 'ללקוח אחרי תשלום על ברכה / הזמנה מעוצבת', greetlink: 'ללקוח שמבקש שוב את הקישור לעיצוב', remconfirm: 'אישור הרשמה לתזכורות במייל', subbuy: 'ללקוח אחרי קניית מנוי או חבילה', cardfail: 'ללקוח כשחיוב חודשי של מנוי נכשל', renew: 'ללקוח לפני סוף מנוי (חידוש)', reminder: 'התזכורת עצמה (מהלוח המקוון)' };

/* בונה מייל לפי הנוסח (מהניהול או הרגיל) והנתונים */
function render(kind, vars, tpl, opt) {
  opt = opt || {};
  const { frame, escH } = require('./_mail');
  const T = { ...DEFAULTS[kind] }; const own = (tpl || {})[kind] || {};
  for (const k of ['subject', 'title', 'body', 'button', 'foot']) if (own[k] != null && String(own[k]).trim() !== '') T[k] = String(own[k]);
  const fill = (s, html) => String(s || '').replace(/\{([^{}]{1,12})\}/g, (m, k) => vars[k] != null ? (html ? escH(vars[k]).replace(/\n/g, '<br>') : String(vars[k])) : m);
  /* **מודגש** */
  const h = s => fill(escH(s).replace(/\*\*([^*\n]{1,200})\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'), true);
  const plain = s => fill(s, false).replace(/\*\*([^*\n]{1,200})\*\*/g, '$1');
  const url = opt.url || (kind === 'owner' ? site() + '/admin' : site() + '/app.html');
  const foot = (T.foot ? h(T.foot) : '') + (opt.footHtml ? (T.foot ? ' ' : '') + opt.footHtml : '');
  return { subject: plain(T.subject), html: frame({ title: h(T.title), body: h(T.body), button: T.button ? h(T.button) : null, url, foot }), text: plain(T.title) + '\n\n' + plain(T.body) + (opt.text ? '\n\n' + opt.text : '') };
}
/* שם של מנוי / חבילה (מהגדרות המנויים, שנטענו לזיכרון ב-notify) */
let SUBS = null; const SUBN = p => { try { return require('./_subs').nameOf(p, SUBS); } catch (e) { return null; } };
function vars(o) {
  const isDon = o.plan === 'donation';
  return { 'מסלול': isDon ? 'תרומה' : o.plan === 'greet' ? 'ברכה / הזמנה מעוצבת' : o.plan === 'event' ? 'דף הזמנה לאירוע' : o.plan === 'gift' ? 'מתנה לאירוע' : o.plan === 'wishd' ? 'ברכה מעוצבת לאירוע' : /^(gsub|gpack|rsub):/.test(o.plan) ? (SUBN(o.plan) || 'מנוי') : 'מסלול ' + (PLAN_NAMES[o.plan] || o.plan), 'סכום': +o.amount ? (+o.amount).toLocaleString('he-IL') + ' ₪' : 'בחינם',
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
  if (/^(gsub|gpack|rsub):/.test(o.plan || '')) { try { SUBS = await require('./_subs').cfg(); } catch (e) {} }
  const { sendMail } = require('./_mail'), tpl = (await loadConfig()).mailTpl, V = vars(o), isDon = o.plan === 'donation';
  /* ברכה מעוצבת: הלקוח מקבל מייל עם הקישור האישי לעיצוב (במקום אישור רכישה של מסלול) */
  if (o.plan === 'greet' || o.plan === 'wishd') { try { await require('./_greetpay').paid(o); } catch (e) { console.error('greet paid', e.message); } }
  if (o.plan === 'wishd') { try { await require('./_giftpay').paid(o); } catch (e) { console.error('wishd gift', e.message); } }
  else if (o.plan === 'event') { try { await require('./_eventpay').paid(o); } catch (e) { console.error('event paid', e.message); } }
  if (o.plan === 'gift') { try { await require('./_giftpay').paid(o); } catch (e) { console.error('gift paid', e.message); } }
  else if (o.email && /^(gsub|gpack|rsub):/.test(o.plan || '')) { try { await sendMail({ to: o.email, ...subMail(o, V, tpl) }, 'purchase'); } catch (e) { console.error('sub mail', e.message); } }
  else if (o.email) { try { await sendMail({ to: o.email, ...render(isDon ? 'donation' : 'purchase', V, tpl) }, 'purchase'); } catch (e) { console.error('customer mail', e.message); } }
  const to = env('OWNER_EMAIL') || env('ALERT_EMAIL');
  if (to && !(o.plan === 'greet' && /^(SUB|PACK)$/.test(o.coupon || ''))) { try { await sendMail({ to, ...render('owner', V, tpl) }, 'owner'); } catch (e) { console.error('owner mail', e.message); } }
}
/* שליחה של מייל לפי סוג (עם הנוסח מהניהול). opt: url לכפתור, footHtml (קישור הסרה), text, headers, replyTo */
let TPL = null;
async function send(kind, to, V, opt, logKind) {
  const { sendMail } = require('./_mail'); opt = opt || {};
  /* הנוסח נשמר בזיכרון לדקה (במשימת הלילה נשלחים הרבה מיילים ברצף) */
  if (!TPL || Date.now() - TPL.at > 60000) TPL = { at: Date.now(), v: (await loadConfig()).mailTpl };
  const tpl = TPL.v;
  const m = render(kind, V || {}, tpl, opt);
  return sendMail({ to, ...m, ...(opt.headers ? { headers: opt.headers } : {}), ...(opt.replyTo ? { replyTo: opt.replyTo } : {}) }, logKind || kind);
}
/* מייל אחרי קניית מנוי / חבילה: מה עושים עכשיו, ועד מתי */
function subMail(o, V, tpl) {
  const k = String(o.plan).split(':')[0], S = SUBS || {}, t = Date.parse(o.paid_at || Date.now());
  let end = null; const m = /:([my])$/.exec(o.plan); if (m) end = t + require('./_subs').PER[m[1]] * 864e5;
  if (k === 'gpack') { const x = (S.gpacks || []).find(y => 'gpack:' + y.id === o.plan); if (x && x.months) end = t + x.months * 30.5 * 864e5; }
  const X = { gsub: 'המנוי משויך לחשבון עם המייל הזה. מתחברים באתר עם המייל הזה, ובכל עיצוב בתשלום מופיעה האפשרות לקבל אותו מהמנוי.', gpack: 'החבילה משויכת לחשבון עם המייל הזה. מתחברים באתר עם המייל הזה, ובכל עיצוב בתשלום מופיעה האפשרות לקבל אותו מהחבילה.', rsub: 'ההטבה משויכת לחשבון עם המייל הזה. מעכשיו אפשר להוסיף עוד תזכורות בלוח המקוון.' };
  return render('subbuy', { ...V, 'הסבר': X[k] || '', 'עד': end ? new Date(end).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }) : 'ללא הגבלת זמן', 'כפתור': k === 'rsub' ? 'ללוח המקוון' : 'לברכות והזמנות' }, tpl, { url: site() + (k === 'rsub' ? '/online/' : '/brachot/my.html#subs') });
}
async function welcome() { return render('welcome', {}, (await loadConfig()).mailTpl); }
/* לתצוגה מקדימה בניהול: כל המיילים עם נתוני דוגמה, לפי נוסח נתון (גם לפני שמירה) */
function previews(tpl) {
  const V = vars({ id: 'a1b2c3d4e5f6', plan: 'family', amount: 89, email: 'customer@example.com', coupon: '', via: 'PayPal' });
  const VD = vars({ id: 'a1b2c3d4e5f6', plan: 'donation', amount: 50, email: 'donor@example.com', via: 'נדרים פלוס' });
  const EX = { event: { 'כתובת': 'myluach.org/t/cohen-wedding', 'מיילים': '\nנוספו 250 מיילים לשליחת הזמנות.' },
    gift: { 'שם': 'משפחת לוי', 'סכום': '360 ₪', 'ברכה': '\n\n"מזל טוב! שתזכו לבנות בית נאמן בישראל"', 'נטו': '349.20 ₪' },
    greet: { 'עיצוב': 'הזמנה לבר מצווה', 'עריכה': '20.11, 23:00', 'הורדה': '6.12, 23:00', 'הזמנה': 'a1b2c3d4' },
    reminder: { 'שם': 'יום הולדת לשרה', 'מתי': 'בעוד שבוע', 'יום': 'שלישי', 'תאריך עברי': 'כ״ה בכסלו תשפ״ז', 'תאריך': '5 בדצמבר 2026', 'כפתור': 'ללוח השנה' } };
  EX.subbuy = { ...V, 'מסלול': 'מנוי ברכות והזמנות: בסיסי (חודשי)', 'סכום': '29 ₪', 'הסבר': 'המנוי משויך לחשבון עם המייל הזה. מתחברים באתר עם המייל הזה, ובכל עיצוב בתשלום מופיעה האפשרות לקבל אותו מהמנוי.', 'עד': '6.12.2026', 'כפתור': 'לברכות והזמנות' };
  EX.cardfail = { 'מנוי': 'מנוי ברכות והזמנות: בסיסי (חודשי)', 'סיבה': 'כרטיס חסום' };
  EX.renew = { 'מנוי': 'מנוי ברכות והזמנות: בסיסי (חודשי)', 'תאריך': '5.12.2026', 'ימים': '5' };
  EX.greetlink = EX.greet; EX.remconfirm = { 'שם': 'יום הולדת לשרה' };
  return Object.keys(DEFAULTS).map(k => ({ k, who: KINDS[k], ...render(k, k === 'donation' ? VD : k === 'refund' ? { ...V, 'החזר': '89 ₪' } : EX[k] || V, tpl, k === 'reminder' ? { footHtml: '<a href="#" style="color:#6b7679">להפסקת התזכורת</a>' } : null) }));
}
/* מייל ללקוח על החזר */
async function refundMail(o, amt) {
  if (!o.email) return;
  const { sendMail } = require('./_mail'), tpl = (await loadConfig()).mailTpl;
  try { await sendMail({ to: o.email, ...render('refund', { ...vars(o), 'החזר': (+amt).toLocaleString('he-IL') + ' ₪' }, tpl) }, 'refund'); } catch (e) { console.error('refund mail', e.message); }
}
module.exports = { markPaid, notify, welcome, previews, refundMail, send, render, DEFAULTS, KINDS };
