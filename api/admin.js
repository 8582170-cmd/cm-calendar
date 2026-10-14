/* דף הניהול: קריאה ושמירה של המחירים, המבצע והקופונים, ורשימת הזמנות אחרונות.
   הגישה בסיסמה: משתנה הסביבה ADMIN_PASSWORD ב-Vercel. */
'use strict';
const crypto = require('crypto');
const { LP, PAID, loadConfig, publicPricing, env, db, readBody, json } = require('./_lib');

function okPass(given) {
  const real = env('ADMIN_PASSWORD');
  if (!real || real.length < 8) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

const num = (v, lo, hi) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 100) / 100)) : null; };
const date = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const planList = v => (Array.isArray(v) ? v : []).filter(x => PAID.indexOf(x) >= 0);

/* מנקים את מה שהגיע מהדפדפן לפני שמירה */
function clean(c) {
  const out = { plans: {}, sale: null, coupons: [] };
  PAID.forEach(id => {
    const o = (c.plans || {})[id] || {};
    out.plans[id] = { ils: num(o.ils, 0, 100000), usd: num(o.usd, 0, 100000), intro: num(o.intro, 0, 100) };
  });
  const s = c.sale || {};
  out.sale = { on: !!s.on, percent: num(s.percent, 0, 100) || 0, plans: planList(s.plans), until: date(s.until), label: String(s.label || '').slice(0, 60) };
  const seen = {};
  (c.coupons || []).forEach(x => {
    const code = String(x.code || '').trim().toUpperCase().replace(/[^A-Z0-9א-ת_-]/g, '').slice(0, 30);
    if (!code || seen[code]) return; seen[code] = 1;
    out.coupons.push({ code, percent: num(x.percent, 0, 100) || 0, plans: planList(x.plans), until: date(x.until), max: Math.max(0, parseInt(x.max, 10) || 0), on: !!x.on, note: String(x.note || '').slice(0, 80) });
  });
  const t = c.ticker || {};
  const ints = v => [...new Set((Array.isArray(v) ? v : []).map(x => parseInt(x, 10)).filter(x => x >= 0 && x < 100000))].slice(0, 20000);
  out.ticker = { mode: ['auto', 'selected', 'off'].includes(t.mode) ? t.mode : 'auto', ids: ints(t.ids), hide: ints(t.hide) };
  return out;
}

module.exports = async (req, res) => {
  const b = readBody(req);
  if (!okPass(req.headers['x-admin-password'] || b.password)) {
    await new Promise(r => setTimeout(r, 800));
    return json(res, env('ADMIN_PASSWORD') ? 401 : 503, { error: env('ADMIN_PASSWORD') ? 'wrong password' : 'ADMIN_PASSWORD not set' });
  }
  try {
    if (req.method === 'POST' && b.action === 'save') {
      const value = clean(b.config || {});
      await db('settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ key: 'pricing', value, updated_at: new Date().toISOString() }) });
      return json(res, 200, { ok: true, config: value });
    }
    /* עריכת טקסטים וצבעים של דפי האתר */
    if (req.method === 'POST' && ['contentget', 'contentsave', 'contentreset'].includes(b.action)) {
      const { loadSetting, saveSetting } = require('./_lib');
      const page = String(b.page || '').replace(/[^\w-]/g, '').slice(0, 40); if (!page) return json(res, 400, { error: 'page' });
      const all = await loadSetting('content'); all.pages = all.pages || {};
      if (b.action === 'contentsave') {
        const d = b.data || {}, texts = {}, vars = {};
        Object.entries(d.texts || {}).slice(0, 2000).forEach(([k, v]) => { if (/^[a-z0-9]+-[a-z0-9]+$/.test(k)) texts[k] = String(v).replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '').replace(/\son\w+="[^"]*"/gi, '').slice(0, 5000); });
        Object.entries(d.vars || {}).slice(0, 60).forEach(([k, v]) => { if (/^--[\w-]+$/.test(k) && /^#[0-9a-f]{3,8}$/i.test(v)) vars[k] = v; });
        all.pages[page] = { texts, vars, updated: new Date().toISOString() }; await saveSetting('content', all);
      }
      if (b.action === 'contentreset') { delete all.pages[page]; await saveSetting('content', all); }
      return json(res, 200, { data: all.pages[page] || null });
    }
    /* IndexNow: מודיע לבינג (ולמנועים נוספים) על כל דפי האתר מתוך מפת האתר */
    if (req.method === 'POST' && b.action === 'indexnow') {
      const fs = require('fs'), path = require('path');
      const KEY = 'a0e5a04b6480773e2788f0eb3f1ba9c1', host = 'www.myluach.org';
      let urls = [];
      try { urls = [...fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]); } catch (e) {}
      if (!urls.length) urls = ['https://' + host + '/'];
      const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: KEY, keyLocation: 'https://' + host + '/' + KEY + '.txt', urlList: urls.slice(0, 10000) }) });
      return json(res, r.ok || r.status === 202 ? 200 : 502, { status: r.status, count: urls.length });
    }
    /* צפייה במסד הנתונים (קריאה בלבד) */
    if (req.method === 'POST' && b.action === 'table') {
      const T = {
        profiles: { cols: 'email,phone,phone_verified_at,created_at,updated_at', order: 'created_at.desc', search: ['email', 'phone'] },
        reminders: { cols: 'email,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['email', 'name'] },
        voice_reminders: { cols: 'phone,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['phone', 'name'] },
        orders: { cols: 'created_at,plan,amount,status,email,coupon,paid_at,id', order: 'created_at.desc', search: ['email', 'plan', 'coupon'] },
        free_lite: { cols: 'email,used_at', order: 'used_at.desc', search: ['email'] },
        email_log: { cols: 'created_at,kind,to_email,subject,provider,ok,error', order: 'created_at.desc', search: ['to_email', 'subject', 'kind'] }
      };
      const t = T[b.name]; if (!t) return json(res, 400, { error: 'table' });
      const lim = b.all ? 5000 : 50, off = Math.max(0, parseInt(b.offset, 10) || 0);
      const q = String(b.q || '').trim().replace(/[(),*]/g, ' ').slice(0, 80);
      let path = b.name + '?select=' + t.cols + '&order=' + t.order + '&limit=' + (lim + 1) + '&offset=' + off;
      if (q) path += '&or=(' + t.search.map(c => c + '.ilike.*' + encodeURIComponent(q) + '*').join(',') + ')';
      try { const rows = await db(path); return json(res, 200, { rows: (rows || []).slice(0, lim), more: (rows || []).length > lim, cols: t.cols.split(',') }); }
      catch (e) { return json(res, 200, { rows: [], cols: t.cols.split(','), error: /does not exist|42P01|PGRST205/.test(e.message) ? 'הטבלה עוד לא נוצרה ב-Supabase' : String(e.message).slice(0, 200) }); }
    }
    /* הגדרות תזכורות קוליות (ימות המשיח). הטוקן לא חוזר לדפדפן במלואו */
    if (req.method === 'POST' && ['voiceget', 'voicesave', 'voicetest'].includes(b.action)) {
      const V = require('./_voice'); const { loadSetting, saveSetting } = require('./_lib');
      if (b.action === 'voicesave') {
        const cur = await loadSetting('voice'), v = b.voice || {}, out = {};
        const str = (k, n) => { out[k] = String(v[k] == null ? '' : v[k]).slice(0, n || 400); };
        ['callerId', 'smsFrom', 'smsMethod', 'smsPhones', 'smsText', 'smsFromParam', 'ttsMethod', 'ttsPhones', 'ttsText', 'ttsCallerParam'].forEach(k => str(k, 80));
        ['codeSms', 'codeCall', 'remCall'].forEach(k => str(k, 400)); str('base', 200);
        out.enabled = !!v.enabled; out.codeVia = ['sms', 'call', 'both'].includes(v.codeVia) ? v.codeVia : 'both';
        out.max = Math.max(1, Math.min(500, parseInt(v.max, 10) || 50));
        out.token = v.token && !/^•+/.test(v.token) ? String(v.token).trim().slice(0, 200) : (cur.token || '');
        if (v.clearToken) out.token = '';
        await saveSetting('voice', out); V.clearCache();
      }
      if (b.action === 'voicetest') {
        V.clearCache(); const ph = V.normPhone(b.phone); if (!ph) return json(res, 400, { error: 'מספר טלפון לא תקין' });
        if (!(await V.cfg()).token) return json(res, 400, { error: 'לא הוגדר טוקן' });
        try { if (b.kind === 'call') await V.callTTS(ph, 'זוהי שיחת בדיקה ממיי לוח. ההגדרות עובדות.'); else await V.sendSms(ph, 'MyLuach: הודעת בדיקה. ההגדרות עובדות.'); return json(res, 200, { ok: true }); }
        catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 300) }); }
      }
      const c = { ...V.DEF, ...(await loadSetting('voice')) };
      const t = c.token || ''; c.hasToken = !!t; c.token = t ? '••••••' + t.slice(-3) : ''; c.envToken = !!env('YEMOT_TOKEN');
      return json(res, 200, { voice: c });
    }
    /* מבזקי דברי הימים: אירועים של תאריך עברי מסוים, או חיפוש */
    if (req.method === 'POST' && (b.action === 'yzday' || b.action === 'yzsearch')) {
      const { loadYZ } = require('./_yz'); const { list } = loadYZ();
      if (b.action === 'yzsearch') { const q = String(b.q || '').trim(); if (q.length < 2) return json(res, 200, { items: [] }); return json(res, 200, { items: list.filter(e => e.t.includes(q)).slice(0, 200) }); }
      const { HDate } = await import('./_hdate/index.js'); const ds = String(b.date || '');
      const d = /^\d{4}-\d{2}-\d{2}$/.test(ds) ? new Date(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10), 12) : new Date();
      const h = new HDate(d), m = h.getMonth(), day = h.getDate(), leap = HDate.isLeapYear(h.getFullYear());
      return json(res, 200, { heb: h.renderGematriya(true), items: list.filter(e => e.d === day && (e.m === m || (!leap && m === 12 && e.m === 13))) });
    }
    if (req.method === 'POST' && b.action === 'mailtest') {
      const { sendMail, frame, configured } = require('./_mail');
      const to = String(b.to || '').trim(), prov = String(b.provider || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json(res, 400, { error: 'כתובת מייל לא תקינה' });
      if (!configured()[prov]) return json(res, 400, { error: 'הספק ' + prov + ' לא מוגדר ב-Vercel' });
      try {
        await sendMail({ to, subject: 'בדיקת שליחה דרך ' + prov, text: 'מייל בדיקה מ-MyLuach דרך ' + prov,
          html: frame({ title: 'בדיקת שליחה', body: 'המייל הזה נשלח דרך <b>' + prov + '</b>. אם קיבלתם אותו, הספק עובד.' }) }, 'test', prov);
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 300) }); }
    }
    const cfg = await loadConfig();
    const orders = await db('orders?select=id,plan,amount,status,coupon,email,created_at,paid_at&order=created_at.desc&limit=100');
    const uses = {};
    (orders || []).forEach(o => { if (o.coupon && o.status === 'paid') uses[o.coupon] = (uses[o.coupon] || 0) + 1; });
    const defaults = {};
    LP.PLANS.filter(p => PAID.indexOf(p.id) >= 0).forEach(p => { defaults[p.id] = { name: p.name, ils: p.price.ils, usd: p.price.usd, intro: p.intro || 0 }; });
    /* מיילים היום (לפי שעון ישראל) ותזכורות פעילות. אם הטבלאות עוד לא נוצרו: ריק */
    let mail = null;
    try {
      const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      const logs = await db('email_log?select=provider,kind,ok&created_at=gte.' + day + 'T00:00:00%2B03:00&limit=5000');
      const rem = await db('reminders?select=status&limit=20000');
      mail = { providers: require('./_mail').configured(), today: {}, failed: 0, reminders: { active: 0, pending: 0, off: 0 } };
      (logs || []).forEach(l => { if (l.ok) mail.today[l.provider] = (mail.today[l.provider] || 0) + 1; else mail.failed++; });
      (rem || []).forEach(r => { mail.reminders[r.status] = (mail.reminders[r.status] || 0) + 1; });
      /* דוח: 30 ימים אחרונים לפי יום ושרת, ו-200 המיילים האחרונים */
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const all = await db('email_log?select=created_at,provider,ok&created_at=gte.' + encodeURIComponent(since) + '&order=created_at.desc&limit=20000');
      const byDay = {};
      (all || []).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
        const o = byDay[d] = byDay[d] || { failed: 0 };
        if (l.ok) o[l.provider] = (o[l.provider] || 0) + 1; else o.failed++;
      });
      mail.byDay = byDay;
      mail.recent = await db('email_log?select=*&order=created_at.desc&limit=200');
      try {
        const pr = await db('profiles?select=phone_verified_at&limit=100000');
        const vr = await db('voice_reminders?status=eq.active&select=id&limit=100000');
        mail.users = { total: (pr || []).length, phones: (pr || []).filter(x => x.phone_verified_at).length, voice: (vr || []).length };
      } catch (e) { mail.users = null; }
    } catch (e) { mail = null; }
    json(res, 200, { config: cfg, defaults, effective: publicPricing(cfg), orders, uses, mail, testAmount: env('NEDARIM_TEST_AMOUNT') || '' });
  } catch (e) {
    console.error('admin', e);
    json(res, 500, { error: 'server error', message: String(e.message || e).slice(0, 200) });
  }
};
