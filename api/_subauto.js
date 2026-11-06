/* מנוי עם חידוש אוטומטי: PayPal (Subscriptions) ונדרים פלוס (הוראת קבע באשראי, חודשי בלבד).
   ההזמנה הראשונה נשמרת כרגיל (plan = gsub:… / rsub:…), ובשדה callback.auto: { prov, sid (פייפל) / kid (נדרים), state, until, paid }.
   until = עד מתי ההטבה בתוקף. משימת הבוקר (sync) בודקת מול הספק: פעיל → until = מועד החיוב הבא + 3 ימי חסד; בוטל / נכשל → לא מתארך.
   כל חיוב חודשי שנמצא נרשם כהזמנה נוספת ששולמה (coupon AUTO), כדי שהדוחות הכספיים יהיו נכונים.
   משתני סביבה: פייפל כמו בתשלום רגיל. נדרים: NEDARIM_MOSAD, NEDARIM_API_VALID, ובשביל ניהול ההוראות NEDARIM_API_PASSWORD (מפתח npk_ ממסך הגדרות > API). */
'use strict';
const { db, env, loadSetting, saveSetting } = require('./_lib');
const DAY = 864e5, GRACE = 3 * DAY;
const PP = () => require('./_paypal');

function ready(prov, per) {
  if (prov === 'paypal') return PP().ready();
  if (prov === 'nedarim') return per !== 'y' && !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID') && env('NEDARIM_API_PASSWORD'));
  return false;
}
function provs(per) { return ['nedarim', 'paypal'].filter(p => ready(p, per)); }

/* פייפל: מוצר אחד לאתר, ותוכנית לכל מנוי + תקופה + מחיר (מחיר חדש = תוכנית חדשה). נשמר ב-settings → ppsubs */
async function ppPlan(planKey, name, per, amount) {
  const S = (await loadSetting('ppsubs').catch(() => ({}))) || {}, key = planKey + ':' + amount + ':' + (env('PAYPAL_MODE') || 'live');
  S.plans = S.plans || {};
  if (S.plans[key]) return S.plans[key];
  const mode = env('PAYPAL_MODE') || 'live';
  if (!S.product || S.productMode !== mode) {
    const p = await PP().api('POST', '/v1/catalogs/products', { name: 'MyLuach', type: 'SERVICE', category: 'SOFTWARE', description: 'מנויים באתר MyLuach' });
    S.product = p.id; S.productMode = mode;
  }
  const pl = await PP().api('POST', '/v1/billing/plans', { product_id: S.product, name: String(name || planKey).slice(0, 120), status: 'ACTIVE',
    billing_cycles: [{ frequency: { interval_unit: per === 'y' ? 'YEAR' : 'MONTH', interval_count: 1 }, tenure_type: 'REGULAR', sequence: 1, total_cycles: 0, pricing_scheme: { fixed_price: { value: (Math.round(amount * 100) / 100).toFixed(2), currency_code: 'ILS' } } }],
    payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CANCEL', payment_failure_threshold: 2 } });
  S.plans[key] = pl.id; await saveSetting('ppsubs', S);
  return pl.id;
}
const ppSub = sid => PP().api('GET', '/v1/billing/subscriptions/' + encodeURIComponent(sid));

/* נדרים פלוס: Manage3 (תשובה JSON או טקסט) */
async function ned(action, params) {
  const q = new URLSearchParams({ Action: action, MosadId: env('NEDARIM_MOSAD'), ApiPassword: env('NEDARIM_API_PASSWORD'), ...params });
  const r = await fetch('https://matara.pro/nedarimplus/Reports/Manage3.aspx?' + q.toString());
  const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { text: t.trim() }; }
}
const ddmm = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '')); return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], 10) : null; };

/* אחרי שהלקוח אישר מנוי בפייפל: בדיקה שהמנוי שייך להזמנה, וסימון כשולם */
async function ppApprove(o, sid) {
  const s = await ppSub(sid);
  const A = (o.callback && o.callback.auto) || {};
  if (s.custom_id !== o.id || (A.plan && s.plan_id !== A.plan)) throw new Error('mismatch');
  if (!/^(ACTIVE|APPROVED)$/.test(s.status)) throw new Error('status ' + s.status);
  const per = /:y$/.test(o.plan) ? 366 : 31, next = Date.parse((s.billing_info || {}).next_billing_time || '') || Date.now() + per * DAY;
  const auto = { ...A, prov: 'paypal', sid, state: 'active', until: next + GRACE, paid: 1, email: (s.subscriber && s.subscriber.email_address) || '' };
  await require('./_paid').markPaid(o, { txn: sid, callback: { auto } }, 'PayPal (מנוי)');
  return auto;
}

/* משימת הבוקר: עדכון כל המנויים האוטומטיים מול הספקים */
async function sync() {
  const out = { checked: 0, renewed: 0, ended: 0, errors: 0 };
  const L = (await db('orders?select=id,plan,amount,email,user_id,paid_at,callback&status=eq.paid&callback->auto=not.is.null&limit=2000').catch(() => [])) || [];
  for (const o of L) {
    const A = { ...((o.callback || {}).auto || {}) }; if (!A.prov || A.state === 'ended') continue;
    out.checked++;
    try {
      let next = null, active = false, paidCount = null, amount = +o.amount;
      if (A.prov === 'paypal' && A.sid && PP().ready()) {
        const s = await ppSub(A.sid); active = s.status === 'ACTIVE';
        next = Date.parse((s.billing_info || {}).next_billing_time || '') || null;
        const cyc = ((s.billing_info || {}).cycle_executions || []).find(c => c.tenure_type === 'REGULAR'); paidCount = cyc ? +cyc.cycles_completed : null;
        const lp = (s.billing_info || {}).last_payment; if (lp && lp.amount) amount = +lp.amount.value || amount;
        if (/CANCELLED|EXPIRED|SUSPENDED/.test(s.status)) A.state = A.state === 'cancelled' ? 'cancelled' : 'stopped';
      } else if (A.prov === 'nedarim' && A.kid && env('NEDARIM_API_PASSWORD')) {
        const k = await ned('GetKevaId', { KevaId: String(A.kid) }); const st = +k.KevaStatus;
        active = st === 1; next = ddmm(k.KevaNextDate); paidCount = k.KevaSuccess == null ? null : +k.KevaSuccess; if (k.KevaAmount) amount = +k.KevaAmount || amount;
        if (st === 2 || st === 3) A.state = A.state === 'cancelled' ? 'cancelled' : 'stopped';
      } else continue;
      /* כל חיוב חדש שנמצא: הזמנה ששולמה (לדוחות), והארכת התוקף */
      if (paidCount != null) {
        const was = +A.paid || 0;
        for (let i = was; i < paidCount; i++) {
          if (i === 0) continue; /* החיוב הראשון הוא ההזמנה עצמה */
          const nid = require('node:crypto').randomBytes(12).toString('hex'), now = new Date().toISOString();
          await db('orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: nid, plan: o.plan, amount, status: 'paid', email: o.email, user_id: o.user_id || null, coupon: 'AUTO', created_at: now, paid_at: now, callback: { renewOf: o.id, prov: A.prov } }) }).catch(() => {});
          out.renewed++;
        }
        if (paidCount > was) A.paid = paidCount;
      }
      if (active && next) A.until = Math.max(+A.until || 0, next + GRACE);
      if (!active && (+A.until || 0) < Date.now()) { A.state = 'ended'; out.ended++; }
      A.checked = new Date().toISOString();
      await db('orders?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...(o.callback || {}), auto: A } }) });
    } catch (e) { out.errors++; console.error('subauto sync', o.id, e.message); }
  }
  return out;
}

/* ביטול החידוש (מהאזור האישי או מהניהול): התוקף נשאר עד סוף התקופה ששולמה */
async function cancel(o) {
  const A = { ...((o.callback || {}).auto || {}) }; if (!A.prov) throw new Error('not auto');
  if (A.prov === 'paypal' && A.sid) await PP().api('POST', '/v1/billing/subscriptions/' + encodeURIComponent(A.sid) + '/cancel', { reason: 'ביטול מהאתר' }).catch(e => { if (e.status !== 422) throw e; });
  if (A.prov === 'nedarim' && A.kid) { const r = await ned('DeleteKeva', { KevaId: String(A.kid) }); if (r.text && r.text !== 'OK' && !/נמחק/.test(r.text)) throw new Error(r.text.slice(0, 120)); }
  A.state = 'cancelled'; A.cancelledAt = new Date().toISOString();
  await db('orders?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...(o.callback || {}), auto: A } }) });
  return A;
}
module.exports = { ready, provs, ppPlan, ppApprove, sync, cancel, ddmm, GRACE };
