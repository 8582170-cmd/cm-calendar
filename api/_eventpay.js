/* דף הזמנה לאירוע בתשלום: חבילה בסיסית (דף ההזמנה לאורחים) וחבילות עם שליחת הזמנות במייל לרשימת נמענים.
   המחירים מהניהול (הגדרה eventpay), עם ברירות מחדל. ההזמנה נוצרת ב-/api/checkout עם plan=event.
   מי שכבר שילם וקונה חבילת מיילים משלם רק את ההפרש מהבסיסית, והמיילים מתווספים ליתרה. */
'use strict';
const { env, loadSetting } = require('./_lib');
const TIERS = [['base', 0], ['e100', 100], ['e250', 250], ['e400', 400], ['e600', 600], ['e1000', 1000], ['e2500', 2500], ['e10000', 10000]];
const DEF = { base: 49, e100: 69, e250: 89, e400: 109, e600: 129, e1000: 169, e2500: 299, e10000: 699, s100: 25, s250: 55, s500: 99, s1000: 179, v100: 39, v250: 89, v500: 159, v1000: 289 };
/* חבילות SMS (רק אם הופעל בניהול): נקנות בנפרד, אחרי הפעלת דף ההזמנה */
const SMS = [['s100', 100], ['s250', 250], ['s500', 500], ['s1000', 1000]];
/* חבילות הודעות קוליות (ימות המשיח, אם הופעל בניהול) */
const VOICE = [['v100', 100], ['v250', 250], ['v500', 500], ['v1000', 1000]];
const emailsOf = t => (TIERS.find(x => x[0] === t) || [0, 0])[1], smsOf = t => (SMS.find(x => x[0] === t) || [0, 0])[1], voiceOf = t => (VOICE.find(x => x[0] === t) || [0, 0])[1];
async function prices() { const s = (await loadSetting('eventpay').catch(() => null)) || {}, P = { ...DEF }; Object.keys(DEF).forEach(k => { const v = Number((s.prices || {})[k]); if (isFinite(v) && v >= 0 && v <= 100000) P[k] = v; });
  const num = (v, a, z, d) => { v = Number(v); return isFinite(v) && v >= a && v <= z ? v : d; };
  return { prices: P, on: s.on === true, smsOn: s.smsOn === true, giftOn: s.giftOn === true, giftPct: num(s.giftPct, 0, 30, 0), giftFixed: num(s.giftFixed, 0, 100, 0), giftMin: num(s.giftMin, 1, 10000, 18), giftMax: num(s.giftMax, 10, 100000, 5000), voiceOn: s.voiceOn === true, freeEmails: num(s.freeEmails, 0, 1000, 20), freeMax: num(s.freeMax, 0, 100, 3), mediaDays: num(s.mediaDays, 1, 90, 7), vFrom: num(s.vFrom, 0, 23, 8), vTo: num(s.vTo, 1, 24, 22), vTests: num(s.vTests, 0, 50, 5), voiceDirect: s.voiceDirect === true, voicePath: String(s.voicePath || '').replace(/[^0-9/]/g, '').replace(/^\/+|\/+$/g, ''), voiceTpl: String(s.voiceTpl || '').replace(/\D/g, ''), voiceTplRem: String(s.voiceTplRem || '').replace(/\D/g, ''), vkey: String(s.vkey || '') }; }
const R2 = () => require('./_r2');
async function pjson(key) { const r = await fetch(R2().presign('GET', key, 120)); return r.ok ? r.json() : null; }
async function pput(key, o) { const r = await fetch(R2().presign('PUT', key, 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }); if (!r.ok) throw new Error('r2 ' + r.status); }
/* לפני התשלום: בודקים שהכתובת קיימת ושייכת למשלם (קוד העריכה), ומחשבים מחיר */
async function prepare(b) {
  const T = require('./_timer'), s = String(b.slug || '').toLowerCase(), tier = String(b.tier || '');
  const isSms = SMS.some(x => x[0] === tier), isVoice = VOICE.some(x => x[0] === tier);
  if (!TIERS.some(x => x[0] === tier) && !isSms && !isVoice) return { error: 'החבילה לא נמצאה' };
  const cur = await T.get(s).catch(() => null); if (!cur) return { error: 'הכתובת של האירוע לא נמצאה. שמרו אותה קודם.' };
  if (!T.own(cur, b.token)) return { error: 'אפשר לשלם רק מהדפדפן שבו נשמרה הכתובת.' };
  const { prices: P, on, smsOn, voiceOn } = await prices(); if (!on) return { error: 'הרכישה סגורה כרגע' };
  const paid = !!(cur.paid && !cur.paid.free);
  if (isVoice) { if (!voiceOn) return { error: 'הודעות קוליות לא זמינות כרגע' }; if (!paid) return { error: 'קודם מפעילים חבילה מלאה' }; return { amount: P[tier], slug: s, tier, title: voiceOf(tier) + ' הודעות קוליות (' + s + ')' }; }
  if (isSms) { if (!smsOn) return { error: 'SMS לא זמין כרגע' }; if (!paid) return { error: 'קודם מפעילים את דף ההזמנה' }; return { amount: P[tier], slug: s, tier, title: smsOf(tier) + ' הודעות SMS (' + s + ')' }; }
  if (paid && tier === 'base') return { error: 'דף ההזמנה כבר פעיל' };
  const amount = paid ? Math.max(1, P[tier] - P.base) : P[tier];
  return { amount, slug: s, tier, title: (paid ? 'תוספת ' + emailsOf(tier) + ' מיילים' : 'דף הזמנה לאירוע' + (emailsOf(tier) ? ' + ' + emailsOf(tier) + ' מיילים' : '')) + ' (' + s + ')' };
}
async function create(id, email, ev) { await pput('timers/pay/' + id + '.json', { slug: ev.slug, tier: ev.tier, email, at: new Date().toISOString() }); }
/* אחרי התשלום: מפעילים את דף ההזמנה ומוסיפים מיילים */
async function paid(o) {
  const p = await pjson('timers/pay/' + o.id + '.json'); if (!p) throw new Error('no pay file ' + o.id);
  const T = require('./_timer'), cur = await T.get(p.slug); if (!cur) throw new Error('no timer ' + p.slug);
  const P = cur.paid || { emails: 0, orders: [] }; delete P.free;
  if ((P.orders || []).includes(o.id)) return;
  P.emails = (+P.emails || 0) + emailsOf(p.tier); P.sms = (+P.sms || 0) + smsOf(p.tier); P.calls = (+P.calls || 0) + voiceOf(p.tier); P.orders = (P.orders || []).concat(o.id); P.email = P.email || p.email || o.email || ''; P.at = P.at || new Date().toISOString();
  await T.put(p.slug, { ...cur, paid: P });
  await index(p.slug, (cur.cfg || {}).d).catch(() => {});
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  if (o.email) { const { sendMail, frame } = require('./_mail');
    await sendMail({ to: o.email, subject: 'דף ההזמנה לאירוע פעיל ✓', html: frame({ title: 'תודה! דף ההזמנה פעיל', body: 'דף ההזמנה בכתובת <b dir="ltr">myluach.org/t/' + p.slug + '</b> פתוח עכשיו לאורחים.' + (emailsOf(p.tier) ? '<br>נוספו ' + emailsOf(p.tier) + ' מיילים לשליחת הזמנות.' : '') + '<br>את הניהול (רשימת נמענים, שליחה, אישורי הגעה) עושים מאותו דפדפן שבו נשמרה הכתובת.', button: 'לניהול האירוע', url: site + '/invite?s=' + p.slug }) }, 'purchase').catch(e => console.error('event paid mail', e.message)); }
}
/* רשימת האירועים ששולמו (לשליחות האוטומטיות היומיות): כתובת ← תאריך. אירוע שעבר לפני יותר מחודש יוצא מהרשימה */
async function index(slug, date) { const { loadSetting, saveSetting } = require('./_lib'), I = (await loadSetting('evpaid').catch(() => null)) || {}; I[slug] = date || I[slug] || '';
  const cut = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10); Object.keys(I).forEach(k => { if (I[k] && I[k] < cut) delete I[k]; }); await saveSetting('evpaid', I); }
module.exports = { TIERS, SMS, VOICE, voiceOf, DEF, prices, prepare, create, paid, emailsOf, index };
