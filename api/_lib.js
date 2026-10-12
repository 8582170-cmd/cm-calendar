/* עזרים משותפים לפונקציות השרת. משתני סביבה (Vercel → Settings → Environment Variables):
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — מסד הנתונים (טבלת orders)
   NEDARIM_MOSAD                           — קוד המוסד בנדרים פלוס
   NEDARIM_API_VALID                       — קוד האימות לטופס המוטמע (בממשק הניהול של נדרים פלוס, תחת "מפתחות API")
   NEDARIM_CALLBACK_MAIL_ERROR             — אופציונלי: מייל לעדכון אם ההודעה לאתר נכשלה
   NEDARIM_TEST_AMOUNT                     — אופציונלי: לבדיקה, כל חיוב יהיה בסכום הזה (למשל 1)
   NEDARIM_CALLBACK_IPS                    — אופציונלי: רשימת כתובות IP מותרות לקריאה החוזרת, מופרדות בפסיק
   SITE_URL                                — אופציונלי, ברירת מחדל https://www.myluach.org */
'use strict';
/* המחירים נקראים מאותו קובץ שהאתר מציג (assets/plans.js), כך שיש מקור אחד בלבד למחירים ולמבצעים. */
global.window = global.window || {};
require('../assets/plans.js');
const LP = global.window.MyLuachPlans;
const PLAN_NAMES = Object.fromEntries(LP.PLANS.filter(p => p.price.ils > 0).map(p => [p.id, p.name]));

function priceFor(plan) {
  const p = LP.PLANS.find(x => x.id === plan);
  if (!p || !(p.price.ils > 0)) return null;
  const off = p.intro || 0;
  return Math.round(p.price.ils * (100 - off)) / 100;
}

function env(k) { return process.env[k] || ''; }

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

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = { PLAN_NAMES, priceFor, env, db, readBody, json };
