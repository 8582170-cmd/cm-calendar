/* דף הניהול: קריאה ושמירה של המחירים, המבצע והקופונים, ורשימת הזמנות אחרונות.
   הגישה בסיסמה: משתנה הסביבה ADMIN_PASSWORD ב-Vercel. */
'use strict';
const crypto = require('node:crypto');
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
  out.sampleImgRate = Math.max(0, Math.min(100, parseInt(c.sampleImgRate == null ? 20 : c.sampleImgRate, 10) || 0));
  { const sh = c.shabbat || {}; out.shabbat = { on: sh.on !== false, yt: sh.yt !== false, before: Math.max(0, Math.min(120, parseInt(sh.before, 10) || 0)), after: Math.max(0, Math.min(120, parseInt(sh.after, 10) || 0)), deg: Math.max(3, Math.min(20, parseFloat(sh.deg) || 8.5)) }; }
  out.sampleKeepDays = Math.max(0, Math.min(3650, parseInt(c.sampleKeepDays == null ? 365 : c.sampleKeepDays, 10) || 0));
  out.torah = { on: !!(c.torah && c.torah.on) };
  out.sampleImgPx = Math.max(80, Math.min(1600, parseInt(c.sampleImgPx, 10) || 220));
  out.sampleImgQ = Math.max(20, Math.min(95, parseInt(c.sampleImgQ, 10) || 55));
  out.sampleRate = Math.max(0, Math.min(100, parseInt(c.sampleRate == null ? 100 : c.sampleRate, 10) || 0));
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
    /* דפים ומאמרים שנוצרים בניהול */
    if (req.method === 'POST' && /^page(slist|get|save|delete)$/.test(b.action || '')) {
      try { const out = await require('./_pages').adminAction(b); return json(res, out.error ? 400 : 200, out); }
      catch (e) { console.error('pages', e); return json(res, 500, { error: String(e.message || e).slice(0, 200) }); }
    }
    /* מאגר התמונות ללקוחות */
    if (req.method === 'POST' && /^lib(get|upload|import|save|delete)$/.test(b.action || '')) {
      try { const out = await require('./_lib_img').adminAction(b); return json(res, out.error ? 400 : 200, out); }
      catch (e) { console.error('lib', e); return json(res, 500, { error: String(e.message || e).slice(0, 200) }); }
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
      const KEY = 'a0e5a04b6480773e2788f0eb3f1ba9c1', host = 'www.myluach.org';
      let urls = [];
      try { const sm = await (await fetch('https://' + host + '/sitemap.xml')).text(); urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]); } catch (e) {}
      try { urls = urls.concat(await require('./_pages').publicUrls()); } catch (e) {}
      if (!urls.length) urls = ['https://' + host + '/'];
      const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: KEY, keyLocation: 'https://' + host + '/' + KEY + '.txt', urlList: urls.slice(0, 10000) }) });
      return json(res, r.ok || r.status === 202 ? 200 : 502, { status: r.status, count: urls.length });
    }
    /* מאגר דברי הימים: שמירה אחרי ייבוא אקסל */
    if (req.method === 'POST' && b.action === 'yzsave') { try { const out = await require('./_yzadmin').save(b); return json(res, out.error ? (out.error === 'notoken' ? 200 : 400) : 200, out); } catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 300) }); } }
    if (req.method === 'POST' && b.action === 'yzready') return json(res, 200, { ok: !!env('GITHUB_TOKEN') });
    /* גיבוי לגוגל שיטס עכשיו */
    if (req.method === 'POST' && b.action === 'backup') { const B = require('./_backup'); if (!B.ready()) return json(res, 200, { notReady: true }); try { return json(res, 200, await B.run()); } catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 200) }); } }
    /* מד שימוש באחסון ובמסד הנתונים */
    if (req.method === 'POST' && b.action === 'usage') { try { return json(res, 200, await require('./_usage').usage()); } catch (e) { return json(res, 500, { error: String(e.message || e).slice(0, 200) }); } }
    /* דוגמית של לוח שהורד: התוכן המלא (בלי תמונות), לפתיחה בבונה לקריאה בלבד */
    if (req.method === 'POST' && b.action === 'snapget') {
      const p = String(b.path || ''); if (!/^[0-9]{4}-[0-9]{2}\/[a-z0-9]{8,40}\.json$/.test(p)) return json(res, 400, { error: 'path' });
      const url = env('SUPABASE_URL').replace(/\/$/, ''), key = env('SUPABASE_SERVICE_ROLE_KEY');
      const r = await fetch(url + '/storage/v1/object/samples/' + p, { headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }) } });
      if (!r.ok) return json(res, 404, { error: 'הדוגמית לא נמצאה' });
      return json(res, 200, { snap: JSON.parse(await r.text()) });
    }
    /* צפייה במסד הנתונים (קריאה בלבד) */
    if (req.method === 'POST' && b.action === 'table') {
      const T = {
        profiles: { cols: 'email,phone,phone_verified_at,created_at,updated_at', order: 'created_at.desc', search: ['email', 'phone'] },
        reminders: { cols: 'email,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['email', 'name'] },
        appointments: { cols: 'email,date,start_t,title,place,notify,created_at', order: 'created_at.desc', search: ['email', 'title'] },
        voice_reminders: { cols: 'phone,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['phone', 'name'] },
        orders: { cols: 'created_at,plan,amount,status,email,coupon,paid_at,id', order: 'created_at.desc', search: ['email', 'plan', 'coupon'] },
        free_lite: { cols: 'email,used_at', order: 'used_at.desc', search: ['email'] },
        downloads: { cols: 'created_at,email,kind,plan,cal,view,size,pages,page,snap', order: 'created_at.desc', search: ['email', 'kind', 'cal'] },
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
    /* הורדות: 30 הימים האחרונים לפי סוג */
    let dl = null;
    try {
      const since = new Date(Date.now() - 30 * 864e5).toISOString(), day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }), wk = Date.now() - 7 * 864e5;
      const rows = await db('downloads?select=kind,created_at,email&created_at=gte.' + encodeURIComponent(since) + '&limit=50000');
      dl = { today: {}, week: {}, month: {}, users: 0 }; const us = new Set();
      (rows || []).forEach(r => { const t = new Date(r.created_at); dl.month[r.kind] = (dl.month[r.kind] || 0) + 1; if (t.getTime() >= wk) dl.week[r.kind] = (dl.week[r.kind] || 0) + 1;
        if (t.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }) === day) dl.today[r.kind] = (dl.today[r.kind] || 0) + 1; if (r.email) us.add(r.email); });
      dl.users = us.size;
    } catch (e) { dl = { missing: /does not exist|42P01|PGRST205/.test(e.message) }; }
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
    json(res, 200, { config: cfg, defaults, effective: publicPricing(cfg), orders, uses, mail, dl, testAmount: env('NEDARIM_TEST_AMOUNT') || '' });
  } catch (e) {
    console.error('admin', e);
    json(res, 500, { error: 'server error', message: String(e.message || e).slice(0, 200) });
  }
};
