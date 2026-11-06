/* יצירת הזמנה והחזרת פרטי התשלום.
   נדרים פלוס: פרטי העסקה לטופס המוטמע (iframe). פייפל: מספר הזמנה בפייפל, ואחר כך גבייה (action=ppcapture).
   קופון של 100%: ההזמנה מסומנת כשולמה מיד, בלי תשלום. לקוח חוזר: הנחה לפי ההגדרה בניהול. */
'use strict';
const crypto = require('node:crypto');
const { getUser, PLAN_NAMES, PAID, loadConfig, publicPricing, checkCoupon, finalPrice, env, db, readBody, json } = require('./_lib');

const MSG = {
  shabbat: 'האתר שומר שבת וחג: אי אפשר לשלם עכשיו. נשמח לראותכם במוצאי השבת או החג.',
  config: 'התשלום באתר עדיין לא פעיל. נסו שוב בקרוב.',
  low: 'הסכום אחרי ההנחה נמוך מדי לחיוב.',
  server: 'תקלה זמנית. נסו שוב בעוד רגע.'
};
/* באיזה אמצעי תשלום משתמשים: ההגדרה בניהול, ואם הוא לא מוגדר בשרת, האחר */
/* כמה עסקאות עברו ב-SUMIT בתקופה הנוכחית: מתחילת החודש (לפי שעון ישראל) או ב-30 הימים האחרונים */
async function sumitCount(cfg) {
  let since;
  if (cfg.sumitPeriod === 'rolling') since = new Date(Date.now() - 30 * 864e5);
  else { const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).slice(0, 7); since = new Date(d + '-01T00:00:00+02:00'); }
  try { const r = await db('orders?select=id&status=in.(paid,refunded)&paid_at=gte.' + encodeURIComponent(since.toISOString()) + '&callback->sumit=not.is.null&limit=1000'); return (r || []).length; }
  catch (e) { return 0; }
}
/* אמצעי התשלום הזמינים ללקוח הזה, לפי הסדר: ברירת המחדל מהניהול ואחריה "להציע גם".
   avoid: אמצעי שנכשל אצל הלקוח (למשל SUMIT לא נטען) ולכן מדלגים עליו.
   SUMIT שלא מוגדר / שהמכסה שלו נגמרה: במקומו האמצעי שנבחר "אחר כך". */
async function providers(cfg, isDon, avoid) {
  const ned = !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID')), pp = require('./_paypal').ready();
  /* דף התרומות בנוי על הטופס של נדרים פלוס */
  if (isDon) return ned ? ['nedarim'] : [];
  const ok = { nedarim: ned, paypal: pp, sumit: require('./_sumit').ready() };
  if (avoid && ok[avoid] != null) ok[avoid] = false;
  const ALL = ['nedarim', 'paypal', 'sumit'], first = ALL.includes(cfg.pay) ? cfg.pay : 'nedarim';
  const list = [first, ...(Array.isArray(cfg.payAlso) ? cfg.payAlso : [])].filter((x, i, a) => ALL.includes(x) && a.indexOf(x) === i);
  if (ok.sumit && list.includes('sumit')) { /* המכסה בפעולות: כל סליקה = sumitOps פעולות (סליקה + קבלה = 2). עוברים לדרך השנייה כשהסליקה הבאה כבר לא נכנסת */
    const cap = +(cfg.sumitCap || 0), per = Math.max(1, +cfg.sumitOps || 2); if (cap > 0 && (await sumitCount(cfg) + 1) * per > cap) ok.sumit = false; }
  let av = list.filter(x => ok[x]);
  const after = cfg.payAfter === 'nedarim' ? 'nedarim' : 'paypal';
  if (list.includes('sumit') && !ok.sumit && ok[after] && av.indexOf(after) < 0) av.unshift(after);
  if (!av.length) av = ['paypal', 'nedarim', 'sumit'].filter(x => ok[x]).slice(0, 1);
  return av;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const b = readBody(req);
    const cfg = await loadConfig();
    /* מצב תחזוקה (בניהול): לא נפתחות הזמנות חדשות. השלמת תשלום שכבר התחיל ממשיכה כרגיל */
    if (!b.action) { const MT = await require('./_lib').loadSetting('maint').catch(() => null); if (MT && MT.buy) return json(res, 503, { error: 'maint', message: MT.text || 'האתר בתחזוקה קצרה, והרכישה סגורה כרגע. נסו שוב בעוד זמן קצר.' }); }
    /* SUMIT: חיוב לפי האסימון שהדפדפן קיבל מ-SUMIT */
    if (b.action === 'sumitcharge') {
      const id = String(b.id || ''), token = String(b.token || ''); if (!/^[0-9a-f]{24}$/.test(id) || !token || token.length > 400) return json(res, 400, { error: 'bad request' });
      const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
      if (!o) return json(res, 404, { error: 'order' });
      if (o.status === 'paid') return json(res, 200, { status: 'paid', plan: o.plan });
      if (o.status !== 'pending') return json(res, 400, { error: 'state', message: 'ההזמנה כבר לא פתוחה לתשלום. סגרו את החלון ונסו שוב.' });
      const name = String(b.name || '').trim().slice(0, 80), email = (o.email || String(b.email || '').trim().toLowerCase()).slice(0, 200);
      if (!o.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { o.email = email; await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ email }) }); }
      const c = await require('./_sumit').charge({ token, amount: +o.amount, name, email: o.email, ref: id, desc: o.plan === 'donation' ? 'MyLuach · תרומה' : o.plan === 'greet' ? 'MyLuach · ברכה / הזמנה מעוצבת' : o.plan === 'event' ? 'MyLuach · דף הזמנה לאירוע' : o.plan === 'gift' ? 'MyLuach · מתנה לאירוע' : /^(gsub|gpack|rsub):/.test(o.plan) ? 'MyLuach · מנוי / חבילה' : 'MyLuach · מסלול ' + PLAN_NAMES[o.plan] });
      if (!c.ok && c.system) { console.error('sumit system error', JSON.stringify(c.raw)); return json(res, 503, { error: 'provider', fallback: true, message: 'מערכת התשלום לא זמינה כרגע. עוברים לדרך תשלום אחרת…' }); }
      if (!c.ok) { await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ callback: { sumit: c.raw } }) }); return json(res, 402, { error: 'payment', message: c.message ? 'התשלום לא אושר: ' + c.message : 'התשלום לא אושר. בדקו את פרטי הכרטיס ונסו שוב.' }); }
      await require('./_paid').markPaid(o, { txn: String(c.paymentId || ''), callback: { sumit: c.raw } }, 'SUMIT');
      return json(res, 200, { status: 'paid', plan: o.plan, receipt: !!c.documentId });
    }
    /* פייפל, מנוי: אחרי שהלקוח אישר את המנוי */
    if (b.action === 'ppsubok') {
      const id = String(b.id || ''), sid = String(b.sid || ''); if (!/^[0-9a-f]{24}$/.test(id) || !/^I-[A-Z0-9]{6,30}$/.test(sid)) return json(res, 400, { error: 'id' });
      const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0]; if (!o) return json(res, 404, { error: 'order' });
      if (o.status === 'paid') return json(res, 200, { status: 'paid', plan: o.plan });
      try { await require('./_subauto').ppApprove(o, sid); return json(res, 200, { status: 'paid', plan: o.plan }); }
      catch (e) { console.error('ppsubok', e.message); return json(res, 402, { error: 'payment', message: 'לא הצלחנו לאשר את המנוי בפייפל. אם חויבתם, פנו אלינו עם מספר ההזמנה ' + id.slice(0, 8) }); }
    }
    /* פייפל: גבייה אחרי שהלקוח אישר בחלון של פייפל */
    if (b.action === 'ppcapture') {
      const id = String(b.id || ''); if (!/^[0-9a-f]{24}$/.test(id)) return json(res, 400, { error: 'id' });
      const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
      if (!o || !o.txn) return json(res, 404, { error: 'order' });
      if (o.status === 'paid') return json(res, 200, { status: 'paid', plan: o.plan });
      const c = await require('./_paypal').capture(o.txn);
      if (!c.ok || c.currency !== 'ILS' || c.amount + 0.001 < +o.amount) {
        await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ status: c.ok ? 'underpaid' : 'failed', callback: c }) });
        return json(res, 402, { error: 'payment', message: 'התשלום לא הושלם בפייפל. אפשר לנסות שוב.' });
      }
      if (!o.email && c.email) { o.email = c.email.toLowerCase(); await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ email: o.email }) }); }
      await require('./_paid').markPaid(o, { callback: { paypal: c } }, 'PayPal');
      return json(res, 200, { status: 'paid', plan: o.plan });
    }

    let plan = String(b.plan || '');
    const isDon = plan === 'donation';
    const user = await getUser(req);
    const email = (String(b.email || '').trim() || (user ? user.email : '')).toLowerCase().slice(0, 200);
    let amount, coupon = null, info = null, greet = null, ev = null, gift = null, sub = null;
    if (isDon) {
      /* תרומה: הסכום נבחר על ידי התורם (1–100,000 ₪, עד 2 ספרות אחרי הנקודה) */
      amount = Math.round(Number(b.amount) * 100) / 100;
      if (!(amount >= 1 && amount <= 100000)) return json(res, 400, { error: 'bad amount' });
    } else if (plan === 'greet') {
      /* ברכה / הזמנה מעוצבת: המחיר מהניהול, והמייל חובה (לשם נשלח הקישור לעיצוב) */
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'email', message: 'נא למלא כתובת מייל. לשם יישלח הקישור לעיצוב.' });
      greet = await require('./_greetpay').prepare(b);
      if (greet.error) return json(res, 400, { error: 'greet', message: greet.error });
      amount = greet.amount; info = { amount, base: amount, off: 0, why: '' };
    } else if (plan === 'sub') {
      /* מנוי / חבילה (ברכות והזמנות, או תזכורות בלוח): תשלום מראש לתקופה. ההזמנה נשמרת עם plan = gsub:… / gpack:… / rsub:… */
      /* המנוי משויך לחשבון המחובר (user_id). המייל שמולא בתשלום נשמר בהזמנה (לקבלה ולמיילים) */
      if (!user) return json(res, 401, { error: 'login', message: 'כדי לקנות מנוי צריך להיכנס לחשבון (המנוי נשמר בחשבון).' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'email', message: 'נא למלא כתובת מייל.' });
      sub = await require('./_subs').prepare(b);
      if (sub.error) return json(res, 400, { error: 'sub', message: sub.error });
      amount = sub.amount; plan = sub.plan; info = { amount, base: amount, off: 0, why: '' }; sub.auto = !!b.auto;
    } else if (plan === 'gift') {
      /* מתנה לאירוע בכרטיס אשראי: הסכום נבחר על ידי האורח */
      gift = await require('./_giftpay').prepare(b);
      if (gift.error) return json(res, 400, { error: 'gift', message: gift.error });
      amount = gift.amount; info = { amount, base: amount, off: 0, why: '' };
    } else if (plan === 'event') {
      /* דף הזמנה לאירוע (וחבילות מיילים): המחיר מהניהול */
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'email', message: 'נא למלא כתובת מייל. לשם יישלח אישור הרכישה.' });
      ev = await require('./_eventpay').prepare(b);
      if (ev.error) return json(res, 400, { error: 'event', message: ev.error });
      amount = ev.amount; info = { amount, base: amount, off: 0, why: '' };
    } else {
      if (b.coupon) {
        coupon = await checkCoupon(cfg, b.coupon, plan);
        if (coupon && coupon.error) return json(res, 400, { error: 'coupon', message: coupon.error });
      }
      /* לקוח חוזר: מי שכבר שילם על מסלול בעבר */
      let renew = null;
      const R = cfg.renew || {};
      /* האחוז לפי המסלול שקונים עכשיו (אם הוגדר), ואחרת האחוז הכללי */
      const rPct = R.plans && R.plans[plan] != null ? +R.plans[plan] : +R.percent;
      if (R.on && rPct > 0 && (user || email)) {
        try {
          const or = 'or=(' + [user ? 'user_id.eq.' + user.id : '', email ? 'email.eq.' + encodeURIComponent(email) : ''].filter(Boolean).join(',') + ')';
          const prev = await db('orders?select=id&status=eq.paid&plan=in.(' + PAID.join(',') + ')&' + or + '&limit=1');
          if (prev && prev.length) renew = { percent: Math.min(100, rPct), why: 'renew' };
        } catch (e) {}
      }
      if ((cfg.off || []).indexOf(plan) >= 0) return json(res, 400, { error: 'off', message: 'המסלול הזה לא נמכר כרגע' });
      info = finalPrice(publicPricing(cfg), plan, coupon, renew);
      if (!info) return json(res, 400, { error: 'unknown plan', message: 'המסלול לא נמצא' });
      amount = info.amount;
      if (!(amount > 0) && info.off >= 100) {
        /* חינם (קופון או הנחה של 100%): ההזמנה נפתחת מיד */
        const id = crypto.randomBytes(12).toString('hex');
        const o = { id, plan, amount: 0, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: coupon ? coupon.code : null };
        await db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify(o) });
        await require('./_paid').markPaid(o, {}, info.why === 'coupon' ? 'קופון ' + (coupon && coupon.code) : 'הנחה של 100%');
        return json(res, 200, { id, amount: 0, free: true, plan, base: info.base, off: 100, why: info.why, coupon: coupon ? coupon.code : null });
      }
      /* הנחה גבוהה מאוד (למשל 99%): החיוב המינימלי הוא 1 ₪ (מתחת לזה חברות התשלום לא גובות) */
      if (amount > 0 && amount < 1) { amount = 1; info.amount = 1; info.min = true; }
      if (!(amount >= 1)) return json(res, 400, { error: 'low', message: MSG.low });
    }
    /* אתר שומר שבת: לא פותחים תשלום בשבת ובחג (לפי מיקום הגולש) */
    if (await require('./_shabbat').closedNow(req, cfg)) return json(res, 423, { error: 'shabbat', message: MSG.shabbat });
    let provs = await providers(cfg, isDon, String(b.avoid || '')), prov = provs.indexOf(String(b.prov || '')) >= 0 || (b.prov === 'paypal' && !isDon && require('./_paypal').ready()) ? String(b.prov) : (provs[0] || null);
    if (!prov) return json(res, 503, { error: 'payments not configured', message: MSG.config });
    const id = crypto.randomBytes(12).toString('hex');
    if (greet) await require('./_greetpay').create(id, email, greet);
    if (ev) await require('./_eventpay').create(id, email, ev);
    if (gift) await require('./_giftpay').create(id, email, gift, require('./_lib').reqMeta(req));
    const desc = isDon ? 'MyLuach · תרומה' : sub ? 'MyLuach · ' + sub.title : greet ? 'MyLuach · ' + greet.title : ev ? 'MyLuach · ' + ev.title : gift ? 'MyLuach · ' + gift.title : 'MyLuach · מסלול ' + PLAN_NAMES[plan];
    const extra = { base: info ? info.base : amount, off: info ? info.off : 0, why: info ? info.why : '', min: !!(info && info.min), coupon: coupon ? coupon.code : null };

    /* מנוי עם חידוש אוטומטי: פייפל (מנוי) או נדרים פלוס (הוראת קבע, חודשי) */
    if (sub && sub.auto) {
      const AP = require('./_subauto'), per = /:y$/.test(plan) ? 'y' : 'm';
      provs = AP.provs(per); prov = provs.indexOf(String(b.prov || '')) >= 0 ? String(b.prov) : provs[0];
      if (!prov) return json(res, 503, { error: 'auto', message: 'חידוש אוטומטי לא זמין כרגע' + (per === 'y' ? ' במנוי שנתי' : '') + '. אפשר לשלם מראש לתקופה.' });
      const row = A => db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify({ id, plan, amount, status: 'pending', email: email || null, user_id: user ? user.id : null, callback: { auto: A } }) });
      if (prov === 'paypal') { const pp = await AP.ppPlan(plan, sub.title, per, amount); await row({ prov: 'paypal', plan: pp }); return json(res, 200, { id, amount, provider: 'paypal', provs, ppsub: pp, auto: true, ...extra }); }
      await row({ prov: 'nedarim' });
      const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
      const tx = { Mosad: env('NEDARIM_MOSAD'), ApiValid: env('NEDARIM_API_VALID'), Zeout: '', PaymentType: 'HK', Amount: String(amount), Tashlumim: '', Currency: '1',
        FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: email, Groupe: env('NEDARIM_GROUPE') || '', Comment: desc + ' · ' + id.slice(0, 8),
        Param1: id, Param2: plan, CallBack: site + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR') };
      return json(res, 200, { id, amount, provider: 'nedarim', provs, tx, auto: true, ...extra });
    }
    if (prov === 'sumit') {
      const charge = isDon || gift ? amount : (Number(env('SUMIT_TEST_AMOUNT')) || amount);
      await db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: extra.coupon }) });
      return json(res, 200, { id, amount: charge, provider: 'sumit', provs, sumit: require('./_sumit').pub(), email: email || '', ...extra });
    }
    if (prov === 'paypal') {
      const charge = isDon || gift ? amount : (Number(env('PAYPAL_TEST_AMOUNT')) || amount);
      await db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: extra.coupon }) });
      const ppid = await require('./_paypal').create(charge, id, desc + ' · ' + id.slice(0, 8), email);
      await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ txn: ppid }) });
      return json(res, 200, { id, amount: charge, provider: 'paypal', provs, ppid, ...extra });
    }

    const mosad = env('NEDARIM_MOSAD'), apiValid = env('NEDARIM_API_VALID');
    const charge = isDon || gift ? amount : (Number(env('NEDARIM_TEST_AMOUNT')) || amount);
    await db('orders', { meta: require('./_lib').reqMeta(req), method: 'POST', body: JSON.stringify({ id, plan, amount: charge, status: 'pending', email: email || null, user_id: user ? user.id : null, coupon: extra.coupon }) });
    const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
    /* כל 19 השדות חייבים להישלח, גם ריקים (לפי התיעוד של נדרים פלוס). שם, טלפון ומייל ממלא הדפדפן. */
    const tx = {
      Mosad: mosad, ApiValid: apiValid, Zeout: '', PaymentType: 'Ragil',
      Amount: String(charge), Tashlumim: '1', Currency: '1',
      FirstName: '', LastName: '', Street: '', City: '', Phone: '', Mail: email,
      Groupe: (isDon && env('NEDARIM_GROUPE_DONATION')) || env('NEDARIM_GROUPE') || '', Comment: desc + ' · ' + id.slice(0, 8),
      Param1: id, Param2: plan,
      CallBack: site + '/api/nedarim-callback', CallBackMailError: env('NEDARIM_CALLBACK_MAIL_ERROR')
    };
    json(res, 200, { id, amount: charge, provider: 'nedarim', provs, tx, ...extra });
  } catch (e) {
    console.error('checkout', e);
    json(res, 500, { error: 'server error', message: MSG.server });
  }
};
