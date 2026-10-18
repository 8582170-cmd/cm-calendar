/* עזרים משותפים לפונקציות השרת. משתני סביבה (Vercel → Settings → Environment Variables):
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — מסד הנתונים (טבלת orders)
   NEDARIM_MOSAD                           — קוד המוסד בנדרים פלוס
   NEDARIM_API_VALID                       — קוד האימות לטופס המוטמע (בממשק הניהול של נדרים פלוס, תחת "מפתחות API")
   NEDARIM_CALLBACK_MAIL_ERROR             — אופציונלי: מייל לעדכון אם ההודעה לאתר נכשלה
   NEDARIM_TEST_AMOUNT                     — אופציונלי: לבדיקה, כל חיוב יהיה בסכום הזה (למשל 1)
   NEDARIM_GROUPE                          — אופציונלי: הקטגוריה (Groupe) שתופיע בנדרים פלוס לכל עסקה
   NEDARIM_GROUPE_DONATION                 — אופציונלי: קטגוריה אחרת לתרומות (אם ריק, אותה קטגוריה)
   NEDARIM_CALLBACK_IPS                    — אופציונלי: רשימת כתובות IP מותרות לקריאה החוזרת, מופרדות בפסיק
   SITE_URL                                — אופציונלי, ברירת מחדל https://www.myluach.org */
'use strict';
/* המחירים נקראים מאותו קובץ שהאתר מציג (assets/plans.js), כך שיש מקור אחד בלבד למחירים ולמבצעים. */
globalThis.window = globalThis.window || {};
require('../assets/plans.js');
const LP = globalThis.window.MyLuachPlans;
const PLAN_NAMES = Object.fromEntries(LP.PLANS.filter(p => p.price.ils > 0).map(p => [p.id, p.name]));
const PAID = Object.keys(PLAN_NAMES);

/* הגדרות מדף הניהול (טבלת settings, מפתח 'pricing'). אם אין או שיש תקלה: המחירים שבקובץ. */
async function loadConfig() {
  try {
    const rows = await db('settings?key=eq.pricing&select=value');
    return (rows && rows[0] && rows[0].value) || {};
  } catch (e) { console.error('config', e.message); return {}; }
}

/* הגדרה כללית מטבלת settings לפי מפתח (למשל 'voice', 'content'). אין: {} */
async function loadSetting(key) {
  try { const rows = await db('settings?key=eq.' + encodeURIComponent(key) + '&select=value'); return (rows && rows[0] && rows[0].value) || {}; }
  catch (e) { console.error('setting', key, e.message); return {}; }
}
async function saveSetting(key, value) {
  await db('settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }) });
}

/* היום לפי שעון ישראל, בפורמט YYYY-MM-DD, להשוואה מול תאריכי סיום */
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); }
const live = x => x && (!x.until || today() <= x.until);

const isNum = v => typeof v === 'number' && isFinite(v) && v >= 0;
/* המחירים, הנחות ההיכרות והמבצע הכללי — מה שמוצג לכולם */
function publicPricing(cfg) {
  const plans = {};
  LP.PLANS.forEach(p => {
    const o = (cfg.plans || {})[p.id] || {};
    plans[p.id] = {
      /* במסלול בתשלום מחיר 0 או ריק = המחיר שבקובץ (הגנה מפני שמירה ריקה בניהול) */
      ils: isNum(o.ils) && (o.ils > 0 || !(p.price.ils > 0)) ? +o.ils : p.price.ils,
      usd: isNum(o.usd) && (o.usd > 0 || !(p.price.usd > 0)) ? +o.usd : p.price.usd,
      intro: isNum(o.intro) ? +o.intro : (p.intro || 0)
    };
  });
  const s = cfg.sale;
  const sale = s && s.on && +s.percent > 0 && live(s) ? { percent: +s.percent, plans: s.plans && s.plans.length ? s.plans : PAID, until: s.until || '', label: s.label || '' } : null;
  return { plans, sale, snapImg: cfg.sampleImgRate == null ? 20 : +cfg.sampleImgRate, snapPx: +cfg.sampleImgPx || 220, snapQ: +cfg.sampleImgQ || 55, torah: !!(cfg.torah && cfg.torah.on) };
}

/* קופון בתוקף? מחזיר את הקופון או הודעת שגיאה */
async function checkCoupon(cfg, code, plan) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return null;
  const c = (cfg.coupons || []).find(x => String(x.code || '').toUpperCase() === code);
  if (!c || !c.on || !(+c.percent > 0)) return { error: 'הקוד לא קיים או לא פעיל' };
  if (!live(c)) return { error: 'תוקף הקוד הסתיים' };
  if (c.plans && c.plans.length && c.plans.indexOf(plan) < 0) return { error: 'הקוד לא תקף למסלול הזה' };
  if (+c.max > 0) {
    const used = await db('orders?coupon=eq.' + encodeURIComponent(code) + '&status=eq.paid&select=id');
    if ((used || []).length >= +c.max) return { error: 'הקוד נוצל עד הסוף' };
  }
  return { code, percent: +c.percent };
}

/* המחיר הסופי: ההנחה הגבוהה מבין היכרות, מבצע וקופון (לא מצטברות) */
function finalPrice(pub, plan, coupon) {
  const p = pub.plans[plan];
  if (!p || !(p.ils > 0) || PAID.indexOf(plan) < 0) return null;
  let off = p.intro || 0, why = off ? 'intro' : '';
  if (pub.sale && pub.sale.plans.indexOf(plan) >= 0 && pub.sale.percent > off) { off = pub.sale.percent; why = 'sale'; }
  if (coupon && coupon.percent > off) { off = coupon.percent; why = 'coupon'; }
  off = Math.min(100, Math.max(0, off));
  return { amount: Math.round(p.ils * (100 - off)) / 100, base: p.ils, off, why };
}

function priceFor(plan) { const r = finalPrice(publicPricing({}), plan); return r && r.amount; }

function env(k) { return String(process.env[k] || '').trim(); }

async function db(path, opts = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(url + '/rest/v1/' + path, {
    ...opts,
    /* מפתח מהסוג החדש (sb_secret_...) עובר רק בכותרת apikey; מפתח JWT ישן עובר גם כ-Bearer */
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) }
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + txt.slice(0, 300));
  return txt ? JSON.parse(txt) : null;
}

/* גוף הבקשה בכל צורה: JSON (גם בלי Content-Type), טופס, או פרמטרים בכתובת */
function readBody(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    const s = b.trim();
    try { b = JSON.parse(s); } catch (e) { b = Object.fromEntries(new URLSearchParams(s)); }
  }
  return { ...(req.query || {}), ...(b && typeof b === 'object' ? b : {}) };
}

/* המשתמש המחובר, לפי אסימון הכניסה שהדפדפן שולח (Authorization: Bearer ...). אין אסימון או לא תקף: null */
async function getUser(req) {
  const h = String(req.headers.authorization || req.headers.Authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  try {
    const r = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: u.id, email: String(u.email || '').toLowerCase() } : null;
  } catch (e) { return null; }
}

/* המסלול הגבוה ביותר ששולם ב-400 הימים האחרונים (לפי חשבון או מייל) */
async function bestPlan(user) {
  const since = new Date(Date.now() - 400 * 864e5).toISOString();
  const or = 'or=(user_id.eq.' + user.id + (user.email ? ',email.eq.' + encodeURIComponent(user.email) : '') + ')';
  const rows = await db('orders?select=plan&status=eq.paid&paid_at=gte.' + encodeURIComponent(since) + '&' + or);
  const rank = id => LP.PLANS.findIndex(p => p.id === id);
  let plan = null; (rows || []).forEach(o => { if (PAID.indexOf(o.plan) >= 0 && (!plan || rank(o.plan) > rank(plan))) plan = o.plan; });
  return plan;
}
/* המסלול ששולם, ממתי, וכמה הורדות בתשלום נוצלו מאז (טבלת downloads; אם עוד לא נוצרה: used=null) */
async function planInfo(user) {
  const since = new Date(Date.now() - 400 * 864e5).toISOString();
  const or = 'or=(user_id.eq.' + user.id + (user.email ? ',email.eq.' + encodeURIComponent(user.email) : '') + ')';
  const rows = await db('orders?select=plan,paid_at&status=eq.paid&paid_at=gte.' + encodeURIComponent(since) + '&' + or + '&order=paid_at.asc');
  const rank = id => LP.PLANS.findIndex(p => p.id === id);
  let best = null; (rows || []).forEach(o => { if (PAID.indexOf(o.plan) >= 0 && (!best || rank(o.plan) >= rank(best.plan))) best = o; });
  if (!best) return { plan: null, limit: 0, used: 0, left: 0 };
  const limit = (LP.PLANS.find(p => p.id === best.plan) || {}).downloads || 0;
  let used = null;
  try { const d = await db('downloads?select=id&kind=eq.paid&user_id=eq.' + user.id + '&created_at=gte.' + encodeURIComponent(best.paid_at) + '&limit=1000'); used = (d || []).length; } catch (e) { used = null; }
  return { plan: best.plan, since: best.paid_at, limit, used, left: used == null ? null : Math.max(0, limit - used) };
}
/* רישום המשתמש במאגר (מייל, ובהמשך טלפון) */
async function upsertProfile(user, extra) {
  try { await db('profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, email: user.email, updated_at: new Date().toISOString(), ...(extra || {}) }) }); } catch (e) { console.error('profile', e.message); }
}

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = { loadSetting, saveSetting, bestPlan, planInfo, upsertProfile, getUser, PLAN_NAMES, PAID, LP, priceFor, loadConfig, publicPricing, checkCoupon, finalPrice, today, env, db, readBody, json };
