/* עזרים משותפים לפונקציות השרת. משתני סביבה (Vercel → Settings → Environment Variables):
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — מסד הנתונים (טבלת orders)
   NEDARIM_MOSAD                           — קוד המוסד בנדרים פלוס
   NEDARIM_TEST_AMOUNT                     — אופציונלי: לבדיקה, כל חיוב יהיה בסכום הזה (למשל 1)
   NEDARIM_CALLBACK_IPS                    — אופציונלי: רשימת כתובות IP מותרות לקריאה החוזרת, מופרדות בפסיק
   SITE_URL                                — אופציונלי, ברירת מחדל https://www.myluach.org */
'use strict';
/* המחירים בשקלים. חייבים להתאים ל-assets/plans.js (המחיר שהלקוח רואה). */
const PRICES = { basic: 19, family: 49, full: 99 };
const INTRO = { family: 50 };            // אחוז הנחה ברכישה הראשונה
const PLAN_NAMES = { basic: 'בסיסי', family: 'משפחתי', full: 'מלא' };

function priceFor(plan) {
  const p = PRICES[plan];
  if (!p) return null;
  const off = INTRO[plan] || 0;
  return Math.round(p * (100 - off)) / 100;
}

function env(k) { return process.env[k] || ''; }

async function db(path, opts = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(url + '/rest/v1/' + path, {
    ...opts,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) }
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

module.exports = { PRICES, INTRO, PLAN_NAMES, priceFor, env, db, readBody, json };
