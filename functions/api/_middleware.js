/* שומר לכל בקשות /api: כתובות IP חסומות מקבלות 403, וכתובת ששולחת כמות חריגה של בקשות נחסמת אוטומטית לשעה.
   הרשימה נשמרת בהגדרות (settings → ipblock) ונפתחת בדף הניהול, באזור "אבטחה".
   /api/admin לא נחסם כאן (יש לו הגבלת ניסיונות משלו), כדי שבעל האתר תמיד יוכל להיכנס ולפתוח חסימה. */
const FREE = /^\/api\/(admin|nedarim-callback|cron-reminders)(\/|$)/;
const LIMIT = 240, WINDOW = 60e3, AUTO_MS = 3600e3;
let cache = { at: 0, list: {} };
const hits = new Map();

function sb(env, path, opts) {
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, ''), key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return fetch(url + '/rest/v1/' + path, { ...(opts || {}), headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json', ...((opts || {}).headers || {}) } });
}
async function list(env) {
  if (Date.now() - cache.at < 30e3) return cache.list;
  try { const r = await sb(env, 'settings?key=eq.ipblock&select=value'); const j = r && r.ok ? await r.json() : []; cache = { at: Date.now(), list: (j[0] && j[0].value) || {} }; }
  catch (e) { cache.at = Date.now(); }
  return cache.list;
}
async function autoBlock(env, ip, n) {
  try {
    const r = await sb(env, 'settings?key=eq.ipblock&select=value'); const j = r && r.ok ? await r.json() : []; const B = (j[0] && j[0].value) || {};
    if (B[ip]) return;
    B[ip] = { t: new Date().toISOString(), until: Date.now() + AUTO_MS, reason: 'כמות חריגה של בקשות לשרת (' + n + ' בדקה)', auto: true };
    await sb(env, 'settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key: 'ipblock', value: B, updated_at: new Date().toISOString() }) });
    cache = { at: Date.now(), list: B };
  } catch (e) {}
}
const page = until => new Response(JSON.stringify({ error: 'blocked', message: 'הגישה מהכתובת שלכם נחסמה זמנית בגלל פעילות חריגה. אם זו טעות, כתבו לנו: contact@myluach.org', until: until || null }),
  { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequest(context) {
  const { request, env, next, waitUntil } = context, path = new URL(request.url).pathname;
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!ip || FREE.test(path)) return next();
  const B = await list(env), b = B[ip];
  if (b && (!b.until || Date.now() < b.until)) return page(b.until);
  /* ספירת בקשות לכל כתובת (בזיכרון של השרת הזה) */
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > WINDOW) hits.set(ip, { t: now, n: 1 });
  else if (++h.n > LIMIT) { if (!h.blocked) { h.blocked = true; waitUntil(autoBlock(env, ip, h.n)); } return page(now + AUTO_MS); }
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > WINDOW) hits.delete(k);
  return next();
}
