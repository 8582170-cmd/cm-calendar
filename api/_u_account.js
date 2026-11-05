/* האזור האישי (?fn=account): ההזמנות, מצב המסלול, ההורדות, התזכורות, הורדת הנתונים ומחיקת החשבון.
   רק למשתמש מחובר, ורק הנתונים שלו (לפי מזהה המשתמש, ובהזמנות ובתזכורות במייל גם לפי כתובת המייל של החשבון). */
'use strict';
const { db, env, readBody, json, getUser, planInfo, loadConfig, LP, PLAN_NAMES } = require('./_lib');

const enc = encodeURIComponent;
const safe = p => p.catch(e => { console.error('account', e.message); return null; });
const via = c => { c = c || {}; return c.sumit ? 'כרטיס אשראי (SUMIT)' : c.paypal ? 'PayPal' : c.TransactionId || c.TransactionID || c.Mosad || c.MosadNumber ? 'כרטיס אשראי (נדרים פלוס)' : ''; };
const planName = id => id === 'donation' ? 'תרומה' : id === 'greet' ? 'ברכה / הזמנה מעוצבת' : id === 'event' ? 'דף הזמנה לאירוע' : (PLAN_NAMES[id] || (LP.PLANS.find(p => p.id === id) || {}).name || id);

/* הלוח הראשון שהודפס במסגרת המסלול (ההדפסות של מסלול חלות על שנה אחת) */
async function lockedYear(user, since) {
  if (!since) return null;
  const prev = await db('downloads?select=cal&kind=in.(paid,reprint)&user_id=eq.' + user.id + '&created_at=gte.' + enc(since) + '&order=created_at.asc&limit=50').catch(() => []);
  const y = (prev || []).map(r => (/^([hg])(\d{4}) · /.exec(r.cal || '') || [])).find(m => m[1]);
  return y ? { heb: y[1] === 'h', y: +y[2] } : null;
}

async function get(user) {
  await loadConfig();
  const em = (user.email || '').toLowerCase(), or = 'or=(user_id.eq.' + user.id + (em ? ',email.eq.' + enc(em) : '') + ')';
  const [orders, pi, pc, dls, rems, voice] = await Promise.all([
    safe(db('orders?select=id,plan,amount,status,coupon,created_at,paid_at,callback&status=in.(paid,refunded)&' + or + '&order=created_at.desc&limit=100')),
    safe(planInfo(user, false)), safe(planInfo(user, true)),
    safe(db('downloads?select=created_at,kind,plan,cal,view,size,pages,page&user_id=eq.' + user.id + '&order=created_at.desc&limit=60')),
    em ? safe(db('reminders?select=name,rule,notice,status,token,created_at&email=eq.' + enc(em) + '&status=neq.off&order=created_at.desc&limit=200')) : null,
    safe(db('voice_reminders?select=id,name,rule,notice,status,phone,created_at&user_id=eq.' + user.id + '&status=neq.off&order=created_at.desc&limit=200'))
  ]);
  const plan = async p => p && p.plan ? { id: p.plan, name: planName(p.plan), since: p.since, limit: p.limit, used: p.used, left: p.left, year: await lockedYear(user, p.since) } : null;
  return {
    email: user.email,
    orders: (orders || []).map(o => ({ id: o.id, no: String(o.id).slice(0, 8), plan: o.plan, name: planName(o.plan), amount: +o.amount || 0, status: o.status, coupon: o.coupon || '', at: o.paid_at || o.created_at, via: via(o.callback), receipt: !!(o.callback && o.callback.sumit) })),
    plan: await plan(pi), cdPlan: await plan(pc),
    downloads: (dls || []).map(d => ({ at: d.created_at, kind: d.kind, plan: d.plan, cal: d.cal, view: d.view, size: d.size, pages: d.pages, page: d.page })),
    reminders: (rems || []).map(r => ({ name: r.name, rule: r.rule, notice: r.notice, status: r.status, token: r.token })),
    voice: (voice || []).map(v => ({ id: v.id, name: v.name, rule: v.rule, notice: v.notice, phone: v.phone }))
  };
}

/* כל הנתונים של המשתמש, להורדה כקובץ */
async function exportAll(user) {
  const em = (user.email || '').toLowerCase(), q = (t, f) => safe(db(t + '?select=*&' + f + '&limit=5000'));
  const [profile, orders, downloads, reminders, voice, appts, shares, pub] = await Promise.all([
    q('profiles', 'user_id=eq.' + user.id), q('orders', 'or=(user_id.eq.' + user.id + (em ? ',email.eq.' + enc(em) : '') + ')'),
    q('downloads', 'user_id=eq.' + user.id), em ? q('reminders', 'email=eq.' + enc(em)) : null, q('voice_reminders', 'user_id=eq.' + user.id),
    q('appointments', 'user_id=eq.' + user.id), q('shares', 'user_id=eq.' + user.id), q('public_cals', 'user_id=eq.' + user.id)
  ]);
  const strip = L => (L || []).map(r => { const o = { ...r }; delete o.callback; delete o.token; delete o.code_hash; return o; });
  return { exported_at: new Date().toISOString(), site: 'https://www.myluach.org', account: { id: user.id, email: user.email },
    profile: strip(profile), orders: strip(orders), downloads: strip(downloads), email_reminders: strip(reminders), voice_reminders: strip(voice),
    appointments: strip(appts), family_shares: strip(shares), public_calendars: strip(pub),
    note: 'הלוחות עצמם (העיצוב והתמונות) נשמרים בחשבון, ואפשר לפתוח אותם מהבונה.' };
}

/* מחיקת החשבון: הלוחות, התמונות, התזכורות, הפרטים והחשבון עצמו.
   רשומות התשלום נשמרות (חובה לפי חוק לצורכי הנהלת חשבונות), בלי שיוך לחשבון. */
async function deleteAll(user) {
  const em = (user.email || '').toLowerCase(), url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
  const H = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' };
  const del = t => safe(db(t, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }));
  const patch = (t, body) => safe(db(t, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) }));
  /* לוחות שמורים: Supabase Storage + R2 */
  try {
    const r = await fetch(url + '/storage/v1/object/list/calendars', { method: 'POST', headers: H, body: JSON.stringify({ prefix: user.id + '/', limit: 1000 }) });
    const L = r.ok ? await r.json() : [];
    if (L.length) await fetch(url + '/storage/v1/object/calendars', { method: 'DELETE', headers: H, body: JSON.stringify({ prefixes: L.map(x => user.id + '/' + x.name) }) });
  } catch (e) { console.error('account del storage', e.message); }
  try { const R = require('./_r2'); if (R.on()) for (const p of ['cal/', 'img/']) { const L = await R.list(p + user.id + '/'); await R.pool(L, 16, x => R.del(x.key)); } } catch (e) { console.error('account del r2', e.message); }
  await Promise.all([
    em ? del('reminders?email=eq.' + enc(em)) : null,
    del('voice_reminders?user_id=eq.' + user.id), del('appointments?user_id=eq.' + user.id), del('free_lite?user_id=eq.' + user.id),
    del('phone_codes?user_id=eq.' + user.id), del('public_cals?user_id=eq.' + user.id), del('shares?user_id=eq.' + user.id),
    patch('downloads?user_id=eq.' + user.id, { user_id: null, email: null }),
    patch('orders?user_id=eq.' + user.id, { user_id: null })
  ]);
  await del('profiles?user_id=eq.' + user.id);
  /* החשבון עצמו (כניסה) */
  const r = await fetch(url + '/auth/v1/admin/users/' + user.id, { method: 'DELETE', headers: H }).catch(() => null);
  const to = env('OWNER_EMAIL') || env('ALERT_EMAIL');
  if (to) { try { const { sendMail, frame, escH } = require('./_mail'); await sendMail({ to, subject: 'חשבון נמחק באתר', html: frame({ title: 'משתמש מחק את החשבון', body: 'המייל: ' + escH(user.email || '') + '<br>רשומות התשלום נשמרו בלי שיוך לחשבון.' }), text: 'חשבון נמחק: ' + (user.email || '') }, 'owner'); } catch (e) {} }
  return { ok: !!(r && r.ok) };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const user = await getUser(req); if (!user) return json(res, 401, { error: 'login' });
  const b = readBody(req) || {}, a = String(b.action || 'get');
  try {
    if (a === 'get') return json(res, 200, await get(user));
    if (a === 'remoff') {
      const t = String(b.token || ''); if (!/^[0-9a-f]{32}$/.test(t)) return json(res, 400, { error: 'token' });
      await db('reminders?token=eq.' + t + '&email=eq.' + enc((user.email || '').toLowerCase()), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'off' }) });
      return json(res, 200, { ok: true });
    }
    if (a === 'voiceoff') {
      const id = parseInt(b.id, 10); if (!(id > 0)) return json(res, 400, { error: 'id' });
      await db('voice_reminders?id=eq.' + id + '&user_id=eq.' + user.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'off' }) });
      return json(res, 200, { ok: true });
    }
    if (a === 'export') return json(res, 200, await exportAll(user));
    if (a === 'delete') {
      if (String(b.confirm || '').trim().toLowerCase() !== (user.email || '').toLowerCase()) return json(res, 400, { error: 'confirm' });
      return json(res, 200, await deleteAll(user));
    }
    return json(res, 400, { error: 'action' });
  } catch (e) { console.error('account', e); return json(res, 500, { error: 'server error' }); }
};
