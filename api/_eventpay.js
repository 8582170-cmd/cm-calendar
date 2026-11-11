/* דף הזמנה לאירוע בתשלום: חבילה בסיסית (דף ההזמנה לאורחים) וחבילות עם שליחת הזמנות במייל לרשימת נמענים.
   המחירים מהניהול (הגדרה eventpay), עם ברירות מחדל. ההזמנה נוצרת ב-/api/checkout עם plan=event.
   מי שכבר שילם וקונה חבילת מיילים משלם רק את ההפרש מהבסיסית, והמיילים מתווספים ליתרה. */
'use strict';
const { env, loadSetting } = require('./_lib');
const TIERS = [['base', 0], ['e100', 100], ['e250', 250], ['e400', 400], ['e600', 600], ['e1000', 1000], ['e2500', 2500], ['e10000', 10000]];
const DEF = { base: 49, e100: 69, e250: 89, e400: 109, e600: 129, e1000: 169, e2500: 299, e10000: 699, s100: 25, s250: 55, s500: 99, s1000: 179, v100: 39, v250: 89, v500: 159, v1000: 289, m100: 20, m250: 40, m500: 69, m1000: 120, m2500: 250 };
/* תוספת מיילים למי שכבר במסלול בתשלום (כמו שהיה: קונים עוד מיילים בלי להחליף מסלול) */
const MAILPK = [['m100', 100], ['m250', 250], ['m500', 500], ['m1000', 1000], ['m2500', 2500]];
const mailOf = t => (MAILPK.find(x => x[0] === t) || [0, 0])[1];
/* חבילות SMS (רק אם הופעל בניהול): נקנות בנפרד, אחרי הפעלת דף ההזמנה */
const SMS = [['s100', 100], ['s250', 250], ['s500', 500], ['s1000', 1000]];
/* חבילות הודעות קוליות (ימות המשיח, אם הופעל בניהול) */
const VOICE = [['v100', 100], ['v250', 250], ['v500', 500], ['v1000', 1000]];
/* מסלולים לאירועים: מוגדרים בניהול (eventpay.plans). בלי הגדרה: נבנים מהחבילות הקבועות (בסיסית + מיילים).
   לכל מסלול: מחיר, מכסות (מיילים, SMS, שיחות) ויכולות. מי שכבר במסלול וקונה מסלול יקר יותר משלם את ההפרש ומקבל את הפרש המכסות */
const FEATS = [['rem', 'תזכורות אוטומטיות ומייל תודה'], ['seat', 'סידורי הושבה'], ['gal', 'גלריית תמונות לאורחים'], ['media', 'סרטון רקע ומוזיקה'], ['gift', 'מתנה באשראי'], ['voice', 'הודעות קוליות (בישראל)'], ['sms', 'SMS (בישראל)'], ['dir', 'בחירת מוזמנים מספרי הטלפונים']];
const ALLF = () => Object.fromEntries(FEATS.map(f => [f[0], true]));
const cleanFeats = o => Object.fromEntries(FEATS.map(([k]) => [k, !!(o && o[k])]));
function defaultPlans(P) { return TIERS.map(([id, n]) => ({ id, name: id === 'base' ? 'חבילה מלאה' : 'חבילה מלאה + ' + n.toLocaleString('he-IL') + ' מיילים', price: P[id], emails: n, sms: 0, calls: 0, feats: ALLF(), desc: '', best: id === 'e250', hidden: false })); }
function cleanPlans(L) {
  const seen = {}, n = (v, a, z) => { v = Math.round(Number(v)); return isFinite(v) ? Math.max(a, Math.min(z, v)) : 0; };
  return (Array.isArray(L) ? L : []).slice(0, 30).map(x => {
    let id = String((x && x.id) || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24); if (!id || seen[id] || /^[svm]\d+$/.test(id)) id = 'p' + Math.random().toString(36).slice(2, 8); seen[id] = 1;
    const f = {}; FEATS.forEach(([k]) => { f[k] = !!(x.feats && x.feats[k]); });
    return { id, name: String(x.name || '').replace(/[<>]/g, '').slice(0, 60) || id, price: n(x.price, 0, 100000), emails: n(x.emails, 0, 1000000), sms: n(x.sms, 0, 100000), calls: n(x.calls, 0, 100000), feats: f,
      desc: String(x.desc || '').replace(/[<>]/g, '').slice(0, 400), best: !!x.best, hidden: !!x.hidden };
  }).filter(x => x.name);
}
const emailsOf = t => (TIERS.find(x => x[0] === t) || [0, 0])[1], smsOf = t => (SMS.find(x => x[0] === t) || [0, 0])[1], voiceOf = t => (VOICE.find(x => x[0] === t) || [0, 0])[1];
async function prices() { const s = (await loadSetting('eventpay').catch(() => null)) || {}, P = { ...DEF }; Object.keys(DEF).forEach(k => { const v = Number((s.prices || {})[k]); if (isFinite(v) && v >= 0 && v <= 100000) P[k] = v; });
  const num = (v, a, z, d) => { v = Number(v); return isFinite(v) && v >= a && v <= z ? v : d; };
  const plans = Array.isArray(s.plans) && s.plans.length ? cleanPlans(s.plans) : defaultPlans(P);
  return { plans, prices: P, on: s.on === true, smsOn: s.smsOn === true, giftOn: s.giftOn === true, giftPct: num(s.giftPct, 0, 30, 0), giftFixed: num(s.giftFixed, 0, 100, 0), giftMin: num(s.giftMin, 1, 10000, 18), giftMax: num(s.giftMax, 10, 100000, 5000), voiceOn: s.voiceOn === true, freeEmails: num(s.freeEmails, 0, 1000, 20), freeMax: num(s.freeMax, 0, 100, 3), agFree: num(s.agFree, 0, 12, 1), agMax: num(s.agMax, 1, 12, 8), freeFeats: cleanFeats(s.freeFeats), freeName: String(s.freeName || '').replace(/[<>]/g, '').trim().slice(0, 40) || 'מסלול חינמי', freeDesc: String(s.freeDesc || '').replace(/[<>]/g, '').trim().slice(0, 300), mailsPerGuest: num(s.mailsPerGuest, 1, 10, 2), mediaDays: num(s.mediaDays, 1, 90, 7), vFrom: num(s.vFrom, 0, 23, 8), vTo: num(s.vTo, 1, 24, 22), vTests: num(s.vTests, 0, 50, 5), voiceDirect: s.voiceDirect === true, voicePath: String(s.voicePath || '').replace(/[^0-9/]/g, '').replace(/^\/+|\/+$/g, ''), voiceTpl: String(s.voiceTpl || '').replace(/\D/g, ''), voiceTplRem: String(s.voiceTplRem || '').replace(/\D/g, ''), vkey: String(s.vkey || ''), vtxt: vtxtClean(s.vtxt), ivrtxt: ivrClean(s.ivrtxt), vGiftPath: String(s.vGiftPath || '').replace(/[^0-9/]/g, '').replace(/^\/+|\/+$/g, '').slice(0, 30) }; }
function ivrClean(v) { const o = {}; ['he', 'yi'].forEach(l => { const s = (v || {})[l] || {}, x = {}; Object.keys(require('./_ivoice').IVR[l]).forEach(k => { const t = String(s[k] || '').replace(/[<>=&]/g, ' ').trim().slice(0, 300); if (t) x[k] = t; }); if (Object.keys(x).length) o[l] = x; }); return o; }
/* נוסחי ההודעה הקולית מהניהול (ריק = הנוסח הרגיל ב-_ivoice) */
function vtxtClean(v) { const o = {}; ['inv', 'ivr', 'rem', 'ty'].forEach(k => { const t = String((v || {})[k] || '').replace(/[<>]/g, '').trim().slice(0, 400); if (t) o[k] = t; }); return o; }
const R2 = () => require('./_r2');
async function pjson(key) { const r = await fetch(R2().presign('GET', key, 120)); return r.ok ? r.json() : null; }
async function pput(key, o) { const r = await fetch(R2().presign('PUT', key, 120), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }); if (!r.ok) throw new Error('r2 ' + r.status); }
/* לפני התשלום: בודקים שהכתובת קיימת ושייכת למשלם (קוד העריכה), ומחשבים מחיר */
async function prepare(b) {
  const T = require('./_timer'), s = String(b.slug || '').toLowerCase(), tier = String(b.tier || '');
  /* פתיחת מאגר בתשלום (tier = d<מספר המאגר>): המחיר לפי המסלול של האירוע, מהגדרות המאגר */
  if (/^d\d{1,9}$/.test(tier)) {
    const cur = await T.get(s).catch(() => null); if (!cur) return { error: 'הכתובת של האירוע לא נמצאה. שמרו אותה קודם.' };
    if (!T.own(cur, b.token)) return { error: 'אפשר לשלם רק מהדפדפן שבו נשמרה הכתובת.' };
    if (!(await prices()).on) return { error: 'הרכישה סגורה כרגע' };
    const D = require('./_dir'), x = await D.forEvent(cur, +tier.slice(1)); if (!x) return { error: 'המאגר לא זמין לאירוע הזה' };
    if (!(x.price > 0)) return { error: 'המאגר הזה בלי תשלום' }; if (x.open) return { error: 'המאגר כבר פתוח לאירוע הזה' };
    return { amount: x.price, slug: s, tier, title: 'ספר טלפונים: ' + x.name + ' (' + s + ')' };
  }
  const isSms = SMS.some(x => x[0] === tier), isVoice = VOICE.some(x => x[0] === tier), isMail = MAILPK.some(x => x[0] === tier);
  const E = await prices(), plan = E.plans.find(x => x.id === tier && !x.hidden);
  if (!plan && !isSms && !isVoice && !isMail) return { error: 'החבילה לא נמצאה' };
  const cur = await T.get(s).catch(() => null); if (!cur) return { error: 'הכתובת של האירוע לא נמצאה. שמרו אותה קודם.' };
  if (!T.own(cur, b.token)) return { error: 'אפשר לשלם רק מהדפדפן שבו נשמרה הכתובת.' };
  const { prices: P, on, smsOn, voiceOn } = E; if (!on) return { error: 'הרכישה סגורה כרגע' };
  const paid = !!(cur.paid && !cur.paid.free);
  if (isMail) { if (!paid) return { error: 'קודם מפעילים מסלול בתשלום' }; return { amount: P[tier], slug: s, tier, title: 'תוספת ' + mailOf(tier) + ' מיילים (' + s + ')' }; }
  if (isVoice) { if (!voiceOn) return { error: 'הודעות קוליות לא זמינות כרגע' }; if (!paid) return { error: 'קודם מפעילים חבילה מלאה' }; return { amount: P[tier], slug: s, tier, title: voiceOf(tier) + ' הודעות קוליות (' + s + ')' }; }
  if (isSms) { if (!smsOn) return { error: 'SMS לא זמין כרגע' }; if (!paid) return { error: 'קודם מפעילים את דף ההזמנה' }; return { amount: P[tier], slug: s, tier, title: smsOf(tier) + ' הודעות SMS (' + s + ')' }; }
  const have = paid ? curPrice(cur, E) : 0;
  if (paid && plan.price <= have) return { error: 'המסלול הזה לא גבוה מהמסלול הנוכחי' };
  return { amount: Math.max(1, plan.price - have), slug: s, tier, title: (paid ? 'שדרוג ל' : '') + plan.name + ' (' + s + ')' };
}
/* כמה שילם בעל האירוע על המסלול הנוכחי (לחישוב ההפרש בשדרוג). אירוע ישן בלי מסלול: המחיר של הבסיסית */
function curPrice(cur, E) { const P = cur.paid || {}; if (P.planPrice != null) return +P.planPrice || 0; const b = E.plans.find(x => x.id === 'base'); return b ? b.price : (E.prices.base || 0); }
function curQuota(cur, E) { const P = cur.paid || {}, p = E.plans.find(x => x.id === P.plan); return p ? p : { emails: P.plan ? 0 : 0, sms: 0, calls: 0 }; }
async function create(id, email, ev) { await pput('timers/pay/' + id + '.json', { slug: ev.slug, tier: ev.tier, email, at: new Date().toISOString() }); }
/* אחרי התשלום: מפעילים את דף ההזמנה ומוסיפים מיילים */
async function paid(o) {
  const p = await pjson('timers/pay/' + o.id + '.json'); if (!p) throw new Error('no pay file ' + o.id);
  const T = require('./_timer'), cur = await T.get(p.slug); if (!cur) throw new Error('no timer ' + p.slug);
  const P = cur.paid || { emails: 0, orders: [] };
  if ((P.orders || []).includes(o.id)) return;
  /* פתיחת מאגר: לא משנה את המסלול (גם אירוע חינמי נשאר חינמי) */
  if (/^d\d+$/.test(p.tier)) { P.dirs = [...new Set((P.dirs || []).concat(+p.tier.slice(1)))]; P.orders = (P.orders || []).concat(o.id); await T.put(p.slug, { ...cur, paid: P }); return; }
  delete P.free;
  const E = await prices(), plan = E.plans.find(x => x.id === p.tier); let added = { emails: 0 };
  if (plan) { const was = curQuota(cur, E); added = { emails: Math.max(0, plan.emails - (was.emails || 0)), sms: Math.max(0, plan.sms - (was.sms || 0)), calls: Math.max(0, plan.calls - (was.calls || 0)) };
    P.emails = (+P.emails || 0) + added.emails; P.sms = (+P.sms || 0) + added.sms; P.calls = (+P.calls || 0) + added.calls;
    const F = { ...(P.feats || {}) }; Object.keys(plan.feats).forEach(k => { if (plan.feats[k]) F[k] = true; }); P.feats = F; P.plan = plan.id; P.planPrice = Math.max(+P.planPrice || 0, plan.price); }
  else { P.sms = (+P.sms || 0) + smsOf(p.tier); P.calls = (+P.calls || 0) + voiceOf(p.tier); added.emails = mailOf(p.tier); P.emails = (+P.emails || 0) + added.emails; } P.orders = (P.orders || []).concat(o.id); P.email = P.email || p.email || o.email || ''; P.at = P.at || new Date().toISOString();
  await T.put(p.slug, { ...cur, paid: P });
  await index(p.slug, (cur.cfg || {}).d).catch(() => {});
  if (P.email) await require('./_evowners').set(p.slug, P.email).catch(() => {});
  const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
  /* הנוסח: בניהול ← המיילים שהלקוחות מקבלים ← event */
  if (o.email) await require('./_paid').send('event', o.email, { 'כתובת': site.replace(/^https?:\/\/(www\.)?/, '') + '/t/' + p.slug, 'מיילים': added.emails ? '\nנוספו ' + added.emails + ' מיילים לשליחת הזמנות.' : '' }, { url: site + '/invite?s=' + p.slug + (cur.token ? '#k=' + cur.token : '') }, 'invite-owner').catch(e => console.error('event paid mail', e.message));
}
/* רשימת האירועים ששולמו (לשליחות האוטומטיות היומיות): כתובת ← תאריך. אירוע שעבר לפני יותר מחודש יוצא מהרשימה */
async function index(slug, date) { const { loadSetting, saveSetting } = require('./_lib'), I = (await loadSetting('evpaid').catch(() => null)) || {}; I[slug] = date || I[slug] || '';
  const cut = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10); Object.keys(I).forEach(k => { if (I[k] && I[k] < cut) delete I[k]; }); await saveSetting('evpaid', I); }
module.exports = { cleanFeats, vtxtClean, ivrClean, TIERS, SMS, VOICE, MAILPK, FEATS, cleanPlans, voiceOf, DEF, prices, prepare, create, paid, emailsOf, index };
