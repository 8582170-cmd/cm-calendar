/* קישור בין אירועים (דפי הזמנה) לחשבון משתמש (מייל), כדי שבעל אירוע יראה את כל האירועים שלו מכל מכשיר.
   נשמר בהגדרה אחת (settings.evowners): { כתובת-האירוע: מייל }. */
const { loadSetting, saveSetting } = require('./_lib');
const norm = e => String(e || '').trim().toLowerCase();
async function all() { return (await loadSetting('evowners').catch(() => null)) || {}; }
async function set(slug, email) {
  email = norm(email); if (!slug || !email) return;
  const O = await all(); if (O[slug] === email) return;
  O[slug] = email; await saveSetting('evowners', O);
}
async function of(email) { email = norm(email); const O = await all(); return Object.keys(O).filter(s => O[s] === email); }
module.exports = { set, of, all, norm };
