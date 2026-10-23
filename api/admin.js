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

const num = (v, lo, hi) => { if (v == null || v === '') return null; v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 100) / 100)) : null; };
const date = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const planList = v => (Array.isArray(v) ? v : []).filter(x => PAID.indexOf(x) >= 0);

/* מנקים את מה שהגיע מהדפדפן לפני שמירה */
function clean(c) {
  const out = { plans: {}, sale: null, coupons: [] };
  PAID.forEach(id => {
    const o = (c.plans || {})[id] || {};
    /* מחיר 0 למסלול בתשלום אינו תקף: נשמר כריק, כלומר המחיר שבקובץ */
    const pos = v => { v = num(v, 0, 100000); return v > 0 ? v : null; };
    out.plans[id] = { ils: pos(o.ils), usd: pos(o.usd), intro: num(o.intro, 0, 100) };
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
  out.pay = ['paypal', 'sumit'].includes(c.pay) ? c.pay : 'nedarim';
  out.payAlso = (Array.isArray(c.payAlso) ? c.payAlso : []).filter((x, i, l) => ['nedarim', 'paypal', 'sumit'].includes(x) && x !== out.pay && l.indexOf(x) === i);
  out.sumitCap = Math.max(0, Math.min(100000, parseInt(c.sumitCap, 10) || 0));
  out.sumitOps = Math.max(1, Math.min(20, parseInt(c.sumitOps, 10) || 2));
  out.sumitPeriod = c.sumitPeriod === 'rolling' ? 'rolling' : 'month';
  out.payAfter = c.payAfter === 'nedarim' ? 'nedarim' : 'paypal';
  out.ppAcct = !!c.ppAcct;
  out.ppGpay = !!c.ppGpay;
  /* מסלולים קבועים שהוסתרו מהמכירה */
  out.off = (Array.isArray(c.off) ? c.off : []).filter(x => ['basic', 'family', 'full', 'cdbasic', 'cdfull'].includes(x));
  /* נוסח המיילים */
  { const T = c.mailTpl || {}; out.mailTpl = {};
    for (const k of ['welcome', 'purchase', 'donation', 'owner']) { const t = T[k] || {}, o = {}; for (const f of ['subject', 'title', 'body', 'button', 'foot']) if (t[f] != null && String(t[f]).trim() !== '') o[f] = String(t[f]).slice(0, f === 'body' ? 3000 : 200); if (Object.keys(o).length) out.mailTpl[k] = o; } }
  /* מסלולים נוספים מהניהול */
  out.extra = (Array.isArray(c.extra) ? c.extra : []).slice(0, 20).map(x => ({
    id: /^x[a-z0-9]{1,12}$/.test(String(x.id || '')) ? String(x.id) : 'x' + Math.random().toString(36).slice(2, 8),
    name: String(x.name || '').trim().slice(0, 30) || 'מסלול חדש', base: ['basic', 'family', 'full', 'cdbasic', 'cdfull'].includes(x.base) ? x.base : 'full',
    ils: num(x.ils, 0, 100000) || 0, usd: num(x.usd, 0, 100000) || 0,
    downloads: x.downloads === '' || x.downloads == null ? null : Math.max(0, Math.min(100, parseInt(x.downloads, 10) || 0)),
    events: x.events === '' || x.events == null ? null : Math.max(0, Math.min(100000, parseInt(x.events, 10) || 0)),
    tagline: String(x.tagline || '').slice(0, 80), bullets: (Array.isArray(x.bullets) ? x.bullets : String(x.bullets || '').split('\n')).map(t => String(t).trim().slice(0, 90)).filter(Boolean).slice(0, 8),
    cd: !!x.cd, on: !!x.on
  }));
  { const r = c.renew || {}; out.renew = { on: !!r.on, percent: num(r.percent, 0, 100) || 0 }; }
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
    /* ברכות והזמנות: עיצובים (רקע שהועלה + אזור הטקסט + פסקאות התחלה) וקטגוריות אירועים */
    if (req.method === 'POST' && (b.action === 'greettplget' || b.action === 'greettplsave')) {
      const { loadSetting, saveSetting } = require('./_lib');
      const g = await loadSetting('greettpl');
      if (b.action === 'greettplsave') {
        const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').slice(0, n);
        const num = (v, a, z) => Math.max(a, Math.min(z, Number(v) || 0));
        const col = v => /^(#[0-9a-f]{3,8}|@[A-Z]{1,8})$/i.test(String(v || '')) ? String(v) : '#14213d';
        g.cats = (Array.isArray(b.cats) ? b.cats : []).slice(0, 80).map(c => ({ id: str(c.id, 30).replace(/[^\w-]/g, ''), name: str(c.name, 40) })).filter(c => c.id && c.name);
        g.hideCats = (Array.isArray(b.hideCats) ? b.hideCats : []).slice(0, 80).map(x => str(x, 30));
        g.templates = (Array.isArray(b.templates) ? b.templates : []).slice(0, 600).map(x => ({
          id: str(x.id, 40).replace(/[^\w-]/g, '') || ('u' + Date.now().toString(36)), title: str(x.title, 80), cat: str(x.cat, 30).replace(/[^\w-]/g, ''),
          kind: x.kind === 'invite' ? 'invite' : 'greeting', price: num(x.price, 0, 10000), on: x.on !== false, order: num(x.order, 0, 100000),
          bg: { img: /^https:\/\/[^\s"'<>]+$/.test(String((x.bg || {}).img || '')) ? String(x.bg.img) : '', thumb: /^https:\/\/[^\s"'<>]+$/.test(String((x.bg || {}).thumb || '')) ? String(x.bg.thumb) : '' },
          variants: (Array.isArray(x.variants) ? x.variants : []).slice(0, 40).map(v => ({ cat: str(v.cat, 30).replace(/[^\w-]/g, ''), kind: v.kind === 'invite' ? 'invite' : 'greeting', preset: str(v.preset, 40).replace(/[^\w-]/g, '') })).filter(v => v.cat),
          area: { x: num((x.area || {}).x, 0, 794), y: num((x.area || {}).y, 0, 1123), w: num((x.area || {}).w, 40, 794), h: num((x.area || {}).h, 40, 1123), valign: (x.area || {}).valign === 'top' ? 'top' : 'center' },
          blocks: (Array.isArray(x.blocks) ? x.blocks : []).slice(0, 40).map(k => k.type === 'divider'
            ? { type: 'divider', style: str(k.style, 12), color: col(k.color), width: num(k.width, 0.1, 1), gap: num(k.gap, 0, 300) }
            : { type: 'text', k: str(k.k, 20), text: str(k.text, 3000), text2: str(k.text2, 1000), cols: !!k.cols, font: str(k.font, 60), size: num(k.size, 6, 140), bold: !!k.bold, color: col(k.color), align: ['right', 'center', 'left'].includes(k.align) ? k.align : 'center', lh: num(k.lh, 0.8, 3), gap: num(k.gap, 0, 300) })
        })).filter(x => x.bg.img);
        g.updated = new Date().toISOString();
        await saveSetting('greettpl', g);
      }
      return json(res, 200, { cats: g.cats || [], hideCats: g.hideCats || [], templates: g.templates || [] });
    }
    /* ברכות והזמנות: אילו גופנים מוצגים ללקוחות, השם והסוג של כל גופן */
    if (req.method === 'POST' && (b.action === 'greetfontsget' || b.action === 'greetfontssave')) {
      const { loadSetting, saveSetting } = require('./_lib');
      const g = await loadSetting('greetfonts');
      if (b.action === 'greetfontssave') {
        const CATS = ['STAM', 'CLASSIC', 'HAND', 'OUTLINE', 'DISPLAY', 'FUN', 'NEW', 'SERIF', 'SANS_SERIF', 'HANDWRITING'], out = {};
        Object.entries(b.fonts || {}).slice(0, 3000).forEach(([id, v]) => {
          if (!/^[\w .+-]{1,80}$/.test(id) || !v) return;
          const o = {};
          if (typeof v.on === 'boolean') o.on = v.on;
          if (v.label) o.label = String(v.label).replace(/[<>]/g, '').slice(0, 60);
          if (CATS.includes(v.cat)) o.cat = v.cat;
          if (Object.keys(o).length) out[id] = o;
        });
        g.fonts = out; g.updated = new Date().toISOString();
        await saveSetting('greetfonts', g);
      }
      return json(res, 200, { fonts: g.fonts || {} });
    }
    /* ברכות והזמנות: נוסחים מוכנים */
    if (req.method === 'POST' && (b.action === 'greetget' || b.action === 'greetsave')) {
      const { loadSetting, saveSetting } = require('./_lib');
      const g = await loadSetting('greetings');
      if (b.action === 'greetsave') {
        const str = (v, n) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').slice(0, n);
        const key = /^[a-z][a-zA-Z0-9]{0,20}$/;
        g.presets = (Array.isArray(b.presets) ? b.presets : []).slice(0, 1000).map(p => {
          const fields = {};
          Object.entries(p.fields || {}).slice(0, 30).forEach(([k, v]) => { if (key.test(k) && String(v || '').trim()) fields[k] = str(v, 3000); });
          return { id: str(p.id, 40).replace(/[^\w-]/g, '') || Math.random().toString(36).slice(2, 10), title: str(p.title, 120), cat: str(p.cat, 30).replace(/[^\w]/g, '') || 'all',
            kind: ['greeting', 'invite', 'all'].includes(p.kind) ? p.kind : 'all', on: p.on !== false, fields };
        });
        g.updated = new Date().toISOString();
        await saveSetting('greetings', g);
      }
      return json(res, 200, { presets: g.presets || [] });
    }
    /* מאגר התמונות ללקוחות */
    if (req.method === 'POST' && /^lib(get|upload|import|save|delete|media|cat)$/.test(b.action || '')) {
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
    /* מחיקה ידנית של דוגמיות או של לוחות ישנים של משתמשים (עם בדיקה לפני) */
    if (req.method === 'POST' && b.action === 'purge') { try { const U = require('./_usage'), bk = String(b.bucket || ''), r = await U.purge(bk, b.days, !!b.dry); if (bk === 'calendars') { const x = await U.purgeR2(Math.max(30, parseInt(b.days, 10) || 0), !!b.dry); r.files += x.files; r.bytes += x.bytes; r.deleted += x.deleted; } return json(res, 200, r); } catch (e) { return json(res, 400, { error: String(e.message || e).slice(0, 200) }); } }
    /* החזר תשלום. פייפל: החזר אמיתי דרך פייפל (מלא או חלקי). נדרים פלוס / חינם: רק סימון שההזמנה הוחזרה (ההחזר עצמו נעשה בנדרים פלוס).
       החזר מלא מבטל ללקוח את המסלול (ההזמנה כבר לא "שולם"). */
    if (req.method === 'POST' && b.action === 'refund') {
      const id = String(b.id || ''); if (!/^[0-9a-f]{24}$/.test(id)) return json(res, 400, { error: 'id' });
      const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
      if (!o) return json(res, 404, { error: 'ההזמנה לא נמצאה' });
      if (o.status !== 'paid') return json(res, 400, { error: 'אפשר להחזיר רק הזמנה ששולמה' });
      const cb = o.callback && typeof o.callback === 'object' ? o.callback : {}, pp = cb.paypal || null;
      const done = (cb.refunds || []).reduce((a, r) => a + (+r.amount || 0), 0), left = Math.round(((+o.amount || 0) - done) * 100) / 100;
      let amt = b.amount === '' || b.amount == null ? left : Math.round(Number(b.amount) * 100) / 100;
      if (!(amt > 0) || amt > left + 0.001) return json(res, 400, { error: 'סכום ההחזר לא תקין (נשאר להחזרה: ' + left + ' ₪)' });
      let rec = { at: new Date().toISOString(), amount: amt, via: 'manual', note: String(b.note || '').slice(0, 200) };
      if (pp && pp.txn && b.manual !== true) {
        try { const r = await require('./_paypal').refund(pp.txn, amt, id + '-' + (cb.refunds || []).length, b.note); rec = { ...rec, via: 'paypal', id: r.id, status: r.status }; }
        catch (e) { const M = { CAPTURE_FULLY_REFUNDED: 'התשלום כבר הוחזר במלואו בפייפל', REFUND_AMOUNT_EXCEEDED: 'הסכום גבוה מהסכום שנגבה', REFUND_TIME_LIMIT_EXCEEDED: 'עברו יותר מ־180 יום מהתשלום; החזר רק דרך התמיכה של פייפל', PERMISSION_DENIED: 'לאפליקציה בפייפל אין הרשאה להחזרים' }; return json(res, 502, { error: M[e.issue] || ('פייפל: ' + e.message) }); }
      }
      const full = amt >= left - 0.001;
      await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ callback: { ...cb, refunds: [...(cb.refunds || []), rec] }, ...(full ? { status: 'refunded' } : {}) }) });
      if (b.mail !== false) await require('./_paid').refundMail(o, amt);
      return json(res, 200, { ok: true, via: rec.via, full, amount: amt });
    }
    /* תצוגה מקדימה של המיילים ללקוח ולבעל האתר */
    if (req.method === 'POST' && b.action === 'mailpreview') {
      const P = require('./_paid'), cfg = await loadConfig();
      return json(res, 200, { mails: P.previews(b.tpl || cfg.mailTpl), tpl: cfg.mailTpl || {}, defaults: P.DEFAULTS, kinds: P.KINDS, owner: env('OWNER_EMAIL') || env('ALERT_EMAIL') || '' });
    }
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
        reminders: { cols: 'email,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['email', 'name'], pk: 'id' },
        appointments: { cols: 'email,date,start_t,title,place,notify,created_at', order: 'created_at.desc', search: ['email', 'title'], pk: 'id' },
        voice_reminders: { cols: 'phone,name,rule,notice,status,last_sent,created_at', order: 'created_at.desc', search: ['phone', 'name'], pk: 'id' },
        orders: { cols: 'created_at,plan,amount,status,email,coupon,paid_at,id', order: 'created_at.desc', search: ['email', 'plan', 'coupon'], pk: 'id' },
        free_lite: { cols: 'email,used_at', order: 'used_at.desc', search: ['email'], pk: 'user_id' },
        downloads: { cols: 'created_at,email,kind,plan,cal,view,size,pages,page,snap', order: 'created_at.desc', search: ['email', 'kind', 'cal'], pk: 'id' },
        email_log: { cols: 'created_at,kind,to_email,subject,provider,ok,error', order: 'created_at.desc', search: ['to_email', 'subject', 'kind'], pk: 'id' }
      };
      const t = T[b.name]; if (!t) return json(res, 400, { error: 'table' });
      /* מחיקת שורות לפי המפתח (לא בטבלת המשתמשים) */
      if (b.del) {
        if (!t.pk) return json(res, 400, { error: 'אי אפשר למחוק בטבלה הזאת' });
        const ids = (Array.isArray(b.del) ? b.del : []).map(String).filter(x => /^[A-Za-z0-9-]{1,64}$/.test(x)).slice(0, 1000);
        if (!ids.length) return json(res, 400, { error: 'ids' });
        try { await db(b.name + '?' + t.pk + '=in.(' + ids.map(x => encodeURIComponent('"' + x + '"')).join(',') + ')', { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { deleted: ids.length }); }
        catch (e) { return json(res, 500, { error: String(e.message).slice(0, 200) }); }
      }
      const lim = b.all ? 5000 : 50, off = Math.max(0, parseInt(b.offset, 10) || 0);
      const q = String(b.q || '').trim().replace(/[(),*]/g, ' ').slice(0, 80);
      let path = b.name + '?select=' + t.cols + (t.pk && t.cols.split(',').indexOf(t.pk) < 0 ? ',' + t.pk : '') + '&order=' + t.order + '&limit=' + (lim + 1) + '&offset=' + off;
      if (q) path += '&or=(' + t.search.map(c => c + '.ilike.*' + encodeURIComponent(q) + '*').join(',') + ')';
      try { const rows = await db(path); return json(res, 200, { rows: (rows || []).slice(0, lim), more: (rows || []).length > lim, cols: t.cols.split(','), pk: t.pk || null }); }
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
    const orders = (await db('orders?select=id,plan,amount,status,coupon,email,created_at,paid_at,callback&order=created_at.desc&limit=100') || []).map(o => {
      const cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
      const via = cb.paypal ? 'paypal' : !(+o.amount) ? 'free' : Object.keys(cb).some(k => /^[A-Z]/.test(k)) ? 'nedarim' : '';
      const refunded = (cb.refunds || []).reduce((a, r) => a + (+r.amount || 0), 0); delete o.callback; return { ...o, via, refunded };
    });
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
      const all = await db('email_log?select=created_at,provider,ok,kind&created_at=gte.' + encodeURIComponent(since) + '&order=created_at.desc&limit=20000');
      const byDay = {};
      (all || []).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
        const o = byDay[d] = byDay[d] || { failed: 0 };
        if (l.ok) o[l.provider] = (o[l.provider] || 0) + 1; else o.failed++;
      });
      mail.byDay = byDay;
      const byKind = {}; (all || []).forEach(l => { const k = l.kind || 'other'; const o = byKind[k] = byKind[k] || { ok: 0, failed: 0 }; if (l.ok) o.ok++; else o.failed++; }); mail.byKind = byKind;
      mail.recent = await db('email_log?select=*&order=created_at.desc&limit=200');
      try {
        const pr = await db('profiles?select=phone_verified_at&limit=100000');
        const vr = await db('voice_reminders?status=eq.active&select=id&limit=100000');
        mail.users = { total: (pr || []).length, phones: (pr || []).filter(x => x.phone_verified_at).length, voice: (vr || []).length };
      } catch (e) { mail.users = null; }
    } catch (e) { mail = null; }
    let smUsed = null; try { const mStart = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).slice(0, 7) + '-01T00:00:00+02:00'), since = cfg.sumitPeriod === 'rolling' ? new Date(Date.now() - 30 * 864e5) : mStart;
      smUsed = ((await db('orders?select=id&status=in.(paid,refunded)&paid_at=gte.' + encodeURIComponent(since.toISOString()) + '&callback->sumit=not.is.null&limit=1000')) || []).length; } catch (e) {}
    const payStatus = { smUsed, sumit: require('./_sumit').ready(), smTest: env('SUMIT_TEST_AMOUNT') || '', nedarim: !!(env('NEDARIM_MOSAD') && env('NEDARIM_API_VALID')), paypal: !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET')), mode: env('PAYPAL_MODE') === 'sandbox' ? 'sandbox' : 'live', ppTest: env('PAYPAL_TEST_AMOUNT') || '' };
    json(res, 200, { config: cfg, defaults, effective: publicPricing(cfg), orders, uses, mail, dl, payStatus, testAmount: env('NEDARIM_TEST_AMOUNT') || '' });
  } catch (e) {
    console.error('admin', e);
    json(res, 500, { error: 'server error', message: String(e.message || e).slice(0, 200) });
  }
};
