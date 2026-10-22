/* סימון הזמנה כשולמה (מכל דרך תשלום: נדרים פלוס, פייפל, קופון 100%), ושליחת המיילים:
   ללקוח: אישור רכישה. לבעל האתר: הודעה על כל רכישה (OWNER_EMAIL, ואם אין: ALERT_EMAIL). */
'use strict';
const { db, env, PLAN_NAMES } = require('./_lib');

const site = () => (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');

async function markPaid(o, extra, via) {
  if (!o || !o.id) return false;
  const first = o.status !== 'paid';
  const upd = { ...(extra || {}), status: 'paid', paid_at: first ? new Date().toISOString() : o.paid_at };
  await db('orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify(upd) });
  if (first) await notify({ ...o, ...upd, via: via || 'נדרים פלוס' }).catch(e => console.error('paid mail', e.message));
  return first;
}

/* תוכן המיילים (גם לתצוגה מקדימה בניהול) */
function build(o) {
  const { frame, escH } = require('./_mail');
  const isDon = o.plan === 'donation', name = isDon ? 'תרומה' : 'מסלול ' + (PLAN_NAMES[o.plan] || o.plan);
  const amt = (+o.amount || 0).toLocaleString('he-IL') + ' ₪', short = String(o.id).slice(0, 8);
  const customer = {
    subject: isDon ? 'תודה על התרומה ל־MyLuach' : 'הרכישה הושלמה: ' + name + ' ב־MyLuach',
    html: frame({
      title: isDon ? 'תודה רבה על התרומה!' : 'תודה! ' + escH(name) + ' פעיל',
      body: isDon ? 'קיבלנו את תרומתך על סך ' + amt + '. תודה שאתם עוזרים לנו להמשיך.' :
        'הרכישה הושלמה בהצלחה (' + (+o.amount ? amt : 'בחינם') + (o.coupon ? ', קופון ' + escH(o.coupon) : '') + ').<br>כדי להשתמש במסלול, התחברו בבונה הלוח עם כתובת המייל הזאת. אפשר להוריד ולהדפיס את הלוח לפי מספר ההורדות שבמסלול.',
      button: isDon ? null : 'לבונה הלוח', url: site() + '/app.html',
      foot: 'מספר הזמנה: ' + short + '. שאלות? פשוט עונים למייל הזה.'
    }),
    text: (isDon ? 'תודה על התרומה: ' : 'הרכישה הושלמה: ') + name + ' · ' + amt + ' · הזמנה ' + short
  };
  const owner = {
    subject: '💰 ' + (isDon ? 'תרומה' : 'רכישה') + ' חדשה: ' + name + ' · ' + amt,
    html: frame({ title: (isDon ? 'תרומה' : 'רכישה') + ' חדשה', body: escH(name) + '<br>סכום: ' + amt + (o.coupon ? '<br>קופון: ' + escH(o.coupon) : '') + '<br>לקוח: <span dir="ltr">' + escH(o.email || 'לא ידוע') + '</span><br>אמצעי תשלום: ' + escH(o.via || 'נדרים פלוס') + '<br>מספר הזמנה: ' + short, button: 'לדף הניהול', url: site() + '/admin' }),
    text: name + ' · ' + amt + ' · ' + (o.email || '') + ' · ' + short
  };
  return { customer, owner };
}
function welcome() {
  const { frame } = require('./_mail');
  return { subject: 'ברוכים הבאים ל־MyLuach',
    html: frame({ title: 'ברוכים הבאים ל־MyLuach!', body: 'החשבון נפתח. מעכשיו הלוחות שלכם נשמרים בחשבון, ואפשר לחזור אליהם מכל מחשב או טלפון.<br><br>כמה דברים שאפשר לעשות: לוח שנה עברי עם תמונות משפחתיות, ימי הולדת וימי שנה (יארצייט) שחוזרים כל שנה, זמני היום לעיר שלכם, ותזכורות במייל.', button: 'לבונה הלוח', url: site() + '/app.html', foot: 'קיבלתם את המייל כי נרשמתם ל־MyLuach עם הכתובת הזאת.' }),
    text: 'ברוכים הבאים ל־MyLuach! ' + site() + '/app.html' };
}
async function notify(o) {
  const { sendMail } = require('./_mail'), B = build(o);
  if (o.email) { try { await sendMail({ to: o.email, ...B.customer }, 'purchase'); } catch (e) { console.error('customer mail', e.message); } }
  const to = env('OWNER_EMAIL') || env('ALERT_EMAIL');
  if (to) { try { await sendMail({ to, ...B.owner }, 'owner'); } catch (e) { console.error('owner mail', e.message); } }
}
module.exports = { markPaid, notify, build, welcome };
