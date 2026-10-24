/* לוחות ציבוריים מהלוח המקוון: כל משתמש מחובר יכול לפרסם את האירועים שלו בכתובת myluach.org/<שם>.
   owner: ?fn=pubcal (משתמש מחובר): GET = הלוח שלי, POST {action:'check'|'save'|'del'}
   read:  ?c=_pubcal&u=<שם> (לכולם) */
'use strict';
const { db, readBody, json, getUser } = require('./_lib');

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
/* שמות שתפוסים לדפי האתר או שעלולים להטעות */
const RESERVED = new Set(('admin admin-studio api app articles assets brachot calendar countdown countdown-calendar countdown-en data-src donate en functions gallery index '
  + 'new online pricing privacy share simple simple-en terms tools accessibility robots sitemap sitemap-pages favicon p torah u c www mail email login logout signup register '
  + 'account user users me my myluach luach luachot support help about contact blog static cdn img images css js public pub search settings billing pay payment checkout '
  + 'order orders invoice receipt official team staff root system test demo null undefined 404 500').split(' '));
const D = /^\d{4}-\d{2}-\d{2}$/, T = /^([01]\d|2[0-3]):[0-5]\d$/;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

function cleanData(b) {
  const out = { rem: [], appt: [], notes: {} };
  for (const r of (Array.isArray(b.rem) ? b.rem : []).slice(0, 500)) {
    const n = str(r && r.n, 80); if (!n) continue;
    const rec = ['heb', 'greg', 'monthly', 'once'].includes(r.rec) ? r.rec : null; if (!rec) continue;
    const o = { n, rec };
    if (rec === 'once') { if (!D.test(String(r.date || ''))) continue; o.date = r.date; }
    else { o.d = Math.max(1, Math.min(31, parseInt(r.d, 10) || 1)); if (rec !== 'monthly') o.m = Math.max(1, Math.min(13, parseInt(r.m, 10) || 1)); }
    out.rem.push(o);
  }
  for (const a of (Array.isArray(b.appt) ? b.appt : []).slice(0, 2000)) {
    const t = str(a && a.t, 160); if (!t || !D.test(String(a.date || ''))) continue;
    out.appt.push({ date: a.date, t, s: T.test(a.s || '') ? a.s : null, e: T.test(a.e || '') ? a.e : null, p: str(a.p, 120) || null });
  }
  const N = b.notes && typeof b.notes === 'object' ? b.notes : {};
  for (const k of Object.keys(N).slice(0, 1000)) { const v = str(N[k], 200); if (D.test(k) && v) out.notes[k] = v; }
  return out;
}
const free = async (slug, uid) => { const r = await db('public_cals?slug=eq.' + encodeURIComponent(slug) + '&select=user_id'); return !(r && r[0]) || r[0].user_id === uid; };

async function owner(req, res) {
  const user = await getUser(req); if (!user) return json(res, 401, { error: 'login' });
  try {
    if (req.method === 'GET') {
      const r = await db('public_cals?user_id=eq.' + user.id + '&select=slug,title,about,city,updated_at');
      return json(res, 200, { cal: (r && r[0]) || null });
    }
    const b = readBody(req), slug = String(b.slug || '').toLowerCase().trim();
    if (b.action === 'del') { await db('public_cals?user_id=eq.' + user.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
    if (!SLUG.test(slug) || /--/.test(slug)) return json(res, 200, { ok: false, why: 'format' });
    if (RESERVED.has(slug)) return json(res, 200, { ok: false, why: 'taken' });
    if (!(await free(slug, user.id))) return json(res, 200, { ok: false, why: 'taken' });
    if (b.action === 'check') return json(res, 200, { ok: true });
    if (b.action !== 'save') return json(res, 400, { error: 'action' });
    const row = { slug, user_id: user.id, email: user.email || null, title: str(b.title, 60) || slug, about: str(b.about, 200) || null,
      city: /^[a-z0-9_-]{2,40}$/.test(String(b.city || '')) ? b.city : null, data: cleanData(b.data || {}), updated_at: new Date().toISOString() };
    /* שינוי שם: הלוח עובר לכתובת החדשה, והישנה מתפנה */
    await db('public_cals?user_id=eq.' + user.id + '&slug=neq.' + encodeURIComponent(slug), { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    await db('public_cals?on_conflict=slug', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
    return json(res, 200, { ok: true, slug });
  } catch (e) { console.error('pubcal', e.message); return json(res, 500, { error: 'server' }); }
}
async function read(req, res) {
  const slug = String((req.query || {}).u || '').toLowerCase();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
  if (!SLUG.test(slug)) return json(res, 404, { error: 'nf' });
  try {
    const r = await db('public_cals?slug=eq.' + encodeURIComponent(slug) + '&hidden=eq.false&select=slug,title,about,city,data,updated_at');
    if (!r || !r[0]) return json(res, 404, { error: 'nf' });
    return json(res, 200, r[0]);
  } catch (e) { console.error('pubcal read', e.message); return json(res, 500, { error: 'server' }); }
}
module.exports = { owner, read, cleanData, SLUG, RESERVED };
