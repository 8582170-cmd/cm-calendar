/* כרטיס לקוח מאוחד בדף הניהול (נוסף על custget/custbonus הקיימים, שלא השתנו).
   cu_extra: אירועים, תזכורות, פניות, הערה פנימית, חסימה וקופונים אישיים של הלקוח.
   cu_grant: מתנה / הארכה של מסלול (הזמנה בסכום 0 עם הקופון ADMIN). cu_note, cu_block, cu_coupon. */
'use strict';
const { db, loadSetting, saveSetting, PAID, PLAN_NAMES } = require('./_lib');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const EM = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* חיפוש לקוחות לפי שם, חלק מהמייל או טלפון: בכל המקומות שיש בהם שם (חשבונות, תשלומים, אירועים, פניות) */
async function search(q0) {
  const q = String(q0 || '').replace(/[,()*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (q.length < 2) return { error: 'צריך לפחות 2 אותיות' };
  const lq = q.toLowerCase(), like = '*' + encodeURIComponent(q) + '*', R = {};
  const add = (email, name, src, extra) => { email = String(email || '').trim().toLowerCase(); if (!EM.test(email) || /@phone\.invalid$/.test(email)) return;
    const r = R[email] || (R[email] = { email, names: [], src: [], phone: '' }); if (name && !r.names.includes(name)) r.names.push(String(name).slice(0, 80)); if (src && !r.src.includes(src)) r.src.push(src); if (extra && extra.phone && !r.phone) r.phone = extra.phone; };
  const has = v => String(v || '').toLowerCase().includes(lq);
  const jobs = [
    /* חשבונות: שם מגוגל או מההרשמה (נשמר אצל Supabase) */
    (async () => { const { env } = require('./_lib'), key = env('SUPABASE_SERVICE_ROLE_KEY'), url = env('SUPABASE_URL').replace(/\/$/, '');
      for (let page = 1; page <= 10; page++) { const r = await fetch(url + '/auth/v1/admin/users?page=' + page + '&per_page=1000', { headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }) } });
        if (!r.ok) break; const j = await r.json(), U = j.users || j || []; if (!Array.isArray(U) || !U.length) break;
        U.forEach(u => { const m = u.user_metadata || {}, nm = m.full_name || m.name || [m.given_name, m.family_name].filter(Boolean).join(' ');
          if (has(nm) || has(u.email) || has(u.phone)) add(u.email, nm, 'חשבון', { phone: u.phone }); });
        if (U.length < 1000) break; } })(),
    db('profiles?select=email,phone&or=(email.ilike.' + like + ',phone.ilike.' + like + ')&limit=200').then(L => (L || []).forEach(x => add(x.email, '', 'חשבון', { phone: x.phone }))),
    db('orders?select=email&email=ilike.' + like + '&limit=200').then(L => (L || []).forEach(x => add(x.email, '', 'הזמנה'))),
    /* השם שהלקוח מילא בתשלום (נדרים פלוס, פייפל) */
    db('orders?select=email,nm:callback->>ClientName&callback->>ClientName=ilike.' + like + '&limit=200').then(L => (L || []).forEach(x => add(x.email, x.nm, 'תשלום'))),
    db('orders?select=email,g:callback->paypal->payer->name->>given_name,f:callback->paypal->payer->name->>surname&or=(callback->paypal->payer->name->>given_name.ilike.' + like + ',callback->paypal->payer->name->>surname.ilike.' + like + ')&limit=200').then(L => (L || []).forEach(x => add(x.email, [x.g, x.f].filter(Boolean).join(' '), 'PayPal'))),
    /* אירועים: השם מופיע בכותרת (למשל "החתונה של אברהם ושרה") */
    db('timer_event?select=email,title,slug&title=ilike.' + like + '&limit=200').then(L => (L || []).forEach(x => add(x.email, x.title, 'אירוע: ' + x.slug))),
    loadSetting('feedback').then(L => (Array.isArray(L) ? L : []).forEach(x => { if (x && (has(x.name) || has(x.email) || has(x.phone) || has(x.pubName))) add(x.email, x.name || x.pubName, x.kind === 'contact' ? 'פנייה' : 'משוב', { phone: x.phone }); }))
  ].map(p => Promise.resolve(p).catch(() => {}));
  await Promise.all(jobs);
  const items = Object.values(R).sort((a, c) => c.src.length - a.src.length).slice(0, 100);
  return { q, items };
}

module.exports = async function (b) {
  if (b.action === 'cu_search') return search(b.q);
  const em = str(b.email, 200).trim().toLowerCase();
  if (!EM.test(em)) return { error: 'כתובת מייל לא תקינה' };
  const M = (await loadSetting('custmeta').catch(() => ({}))) || {}, me = M[em] || {};
  const saveMeta = async v => { const X = (await loadSetting('custmeta').catch(() => ({}))) || {}; const n = { ...(X[em] || {}), ...v, at: new Date().toISOString() };
    if (!n.note && !n.blocked) delete X[em]; else X[em] = n; await saveSetting('custmeta', X); blockCache = null; return n; };

  if (b.action === 'cu_note') return { ok: true, meta: await saveMeta({ note: str(b.note, 3000) }) };
  if (b.action === 'cu_block') return { ok: true, meta: await saveMeta({ blocked: !!b.on, blockWhy: str(b.why, 200) }) };

  /* מסלול במתנה או הארכה: הזמנה ששולמה בסכום 0. נספרת כמו כל הזמנה (גם לתוקף של 13 חודשים מהיום) */
  if (b.action === 'cu_grant') {
    const plan = str(b.plan, 30); if (PAID.indexOf(plan) < 0) return { error: 'מסלול לא קיים' };
    const prof = await db('profiles?select=user_id&email=eq.' + encodeURIComponent(em) + '&limit=1').catch(() => []);
    const uid = prof && prof[0] && prof[0].user_id, now = new Date().toISOString();
    const row = { id: require('node:crypto').randomBytes(12).toString('hex'), plan, amount: 0, status: 'paid', email: em, coupon: 'ADMIN', created_at: now, paid_at: now,
      callback: { admin: true, why: str(b.why, 200) } };
    if (uid) row.user_id = uid;
    await db('orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) })
      .catch(async e => { if (!uid) throw e; delete row.user_id; await db('orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); });
    return { ok: true, id: row.id, plan, name: PLAN_NAMES[plan] || plan };
  }

  /* קופון אישי: נוסף לרשימת הקופונים (בהגדרות המחירים), לשימוש אחד, עם הערה שמזהה את הלקוח */
  if (b.action === 'cu_coupon') {
    const pct = Math.max(1, Math.min(100, parseInt(b.percent, 10) || 0));
    const plans = (Array.isArray(b.plans) ? b.plans : []).filter(x => PAID.indexOf(x) >= 0);
    const until = /^\d{4}-\d{2}-\d{2}$/.test(String(b.until || '')) ? String(b.until) : '';
    const cfg = (await loadSetting('pricing').catch(() => ({}))) || {}; cfg.coupons = Array.isArray(cfg.coupons) ? cfg.coupons : [];
    let code = str(b.code, 30).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!code) code = (em.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 8).toUpperCase() || 'VIP') + Math.floor(100 + Math.random() * 900);
    if (cfg.coupons.some(c => String(c.code || '').toUpperCase() === code)) return { error: 'הקוד הזה כבר קיים' };
    const c = { code, percent: pct, plans, until, max: Math.max(0, parseInt(b.max, 10) || 1), on: true, note: ('לקוח: ' + em).slice(0, 80) };
    cfg.coupons.push(c); await saveSetting('pricing', cfg);
    return { ok: true, coupon: c };
  }

  /* ביטול מסלול שניתן במתנה (הזמנה בסכום 0). הזמנה ששולמה בכסף מבטלים עם "החזר" הרגיל */
  if (b.action === 'cu_cancel') {
    const id = str(b.id, 40); if (!/^[0-9a-f]{24}$/.test(id)) return { error: 'id' };
    const o = ((await db('orders?id=eq.' + id + '&select=id,email,amount,status,callback')) || [])[0];
    if (!o || String(o.email || '').toLowerCase() !== em) return { error: 'ההזמנה לא נמצאה' };
    if (+o.amount > 0) return { error: 'הזמנה ששולמה בכסף מבטלים עם כפתור ההחזר' };
    if (o.status !== 'paid') return { error: 'ההזמנה כבר לא פעילה' };
    const cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
    await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', callback: { ...cb, cancelled: new Date().toISOString(), cancelWhy: str(b.why, 200) } }) });
    return { ok: true };
  }

  if (b.action !== 'cu_extra') return { error: 'unknown action' };
  const prof = await db('profiles?select=user_id&email=eq.' + encodeURIComponent(em) + '&limit=1').catch(() => []);
  const uid = prof && prof[0] && prof[0].user_id;
  const [events, rem, vrem, fbL, cfg] = await Promise.all([
    db('timer_event?select=slug,title,date,kind,lang,plan,emails,sms,calls,calls_used,disabled,updated_at&email=eq.' + encodeURIComponent(em) + '&order=date.desc.nullslast&limit=50').catch(() => null),
    db('reminders?select=id,name,status,last_sent,created_at&email=eq.' + encodeURIComponent(em) + '&order=created_at.desc&limit=100').catch(() => []),
    uid ? db('voice_reminders?select=id,name,phone,status,last_sent,created_at&user_id=eq.' + uid + '&order=created_at.desc&limit=100').catch(() => []) : [],
    loadSetting('feedback').catch(() => []),
    loadSetting('pricing').catch(() => ({}))]);
  const fb = (Array.isArray(fbL) ? fbL : []).filter(x => x && String(x.email || '').toLowerCase() === em).slice(0, 30)
    .map(x => ({ at: x.at || x.t, kind: x.kind, text: str(x.text, 600), r: x.r || x.ratings || null, page: x.page || '' }));
  const coupons = ((cfg && cfg.coupons) || []).filter(c => String(c.note || '').toLowerCase().indexOf(em) >= 0);
  /* שימוש בקופונים האלה בהזמנות */
  let used = {}; if (coupons.length) { const R = await db('orders?select=coupon&status=eq.paid&coupon=in.(' + coupons.map(c => encodeURIComponent(c.code)).join(',') + ')').catch(() => []); (R || []).forEach(o => { used[o.coupon] = (used[o.coupon] || 0) + 1; }); }
  let ent = null; try { const SB = require('./_subs'), S = await SB.cfg(), who = { id: uid, email: em }; ent = { g: await SB.greetEnt(who, S), r: await SB.remEnt(who, S), names: {} }; } catch (e) {}
  return { email: em, ent, meta: me, events, reminders: rem || [], voice: vrem || [], feedback: fb, coupons: coupons.map(c => ({ ...c, used: used[c.code] || 0 })), plans: PAID.map(id => [id, PLAN_NAMES[id] || id]) };
};

/* חסימה: getUser ב-_lib בודק כאן (עם זיכרון של דקה), כך שלקוח חסום לא מזוהה בשרת: לא קונה, לא מוריד ולא שומר */
let blockCache = null, blockAt = 0;
module.exports.blocked = async function (email) {
  if (!email) return false;
  if (!blockCache || Date.now() - blockAt > 60000) {
    try { const M = (await loadSetting('custmeta')) || {}; blockCache = new Set(Object.keys(M).filter(k => M[k] && M[k].blocked)); } catch (e) { blockCache = new Set(); }
    blockAt = Date.now();
  }
  return blockCache.has(String(email).toLowerCase());
};
