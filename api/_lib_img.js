/* מאגר התמונות: שמירה ב-Supabase Storage (דלי ציבורי library) ורשימה ב-settings → library */
'use strict';
const { env, loadSetting, saveSetting } = require('./_lib');
const CATS = ['nature', 'holy', 'mikdash', 'chagim', 'shabbat', 'tzadikim', 'bg'];
const base = () => env('SUPABASE_URL').replace(/\/$/, '');
async function put(path, buf, type) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(base() + '/storage/v1/object/library/' + path, { method: 'POST',
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': type, 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' }, body: buf });
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return base() + '/storage/v1/object/public/library/' + path;
}
async function remove(path) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  await fetch(base() + '/storage/v1/object/library', { method: 'DELETE', headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) }).catch(() => {});
}
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
/* קטגוריות: הקבועות (CATS) ועוד קטגוריות שנוספו בניהול (L.cats = [{id, name}]) */
let ALLOWED = CATS.slice();
const cleanItem = x => ({ id: String(x.id), url: String(x.url), path: String(x.path || ''), cat: ALLOWED.includes(x.cat) ? x.cat : 'nature',
  title: String(x.title || '').slice(0, 80), credit: String(x.credit || '').slice(0, 160), on: x.on !== false, at: x.at || new Date().toISOString() });
async function load() { const v = await loadSetting('library');
  const cats = (Array.isArray(v.cats) ? v.cats : []).filter(c => c && /^c[a-z0-9]{3,12}$/.test(c.id) && c.name).map(c => ({ id: c.id, name: String(c.name).slice(0, 40) }));
  ALLOWED = CATS.concat(cats.map(c => c.id));
  return { items: Array.isArray(v.items) ? v.items : [], hideSeed: Array.isArray(v.hideSeed) ? v.hideSeed : [], cats }; }
async function addImage(buf, type, meta) {
  const ext = TYPES[type]; if (!ext) throw new Error('type');
  if (buf.length > 8 * 1024 * 1024) throw new Error('size');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), path = id + '.' + ext;
  const url = await put(path, buf, type);
  const L = await load(); const it = cleanItem({ ...meta, id, url, path }); L.items.unshift(it); await saveSetting('library', L);
  return it;
}
/* פעולות מדף הניהול */
/* העלאת קובץ למאמר (תמונה, שמע, וידאו, PDF): כתובת העלאה חתומה, והדפדפן מעלה ישירות ל-Supabase (בלי מגבלת הגודל של השרת) */
const MEDIA = /^(image\/(jpeg|png|webp|gif|svg\+xml)|audio\/[\w.+-]+|video\/(mp4|webm|ogg|quicktime)|application\/pdf)$/;
async function mediaSign(b) {
  const type = String(b.type || ''), size = +b.size || 0;
  if (!MEDIA.test(type)) return { error: 'סוג קובץ לא נתמך (תמונה, שמע, וידאו או PDF)' };
  if (!(size > 0) || size > 50 * 1024 * 1024) return { error: 'הקובץ גדול מ-50MB (המגבלה של האחסון החינמי)' };
  const ext = (String(b.name || '').match(/\.([a-z0-9]{1,5})$/i) || [, type.split('/')[1].replace(/\W.*/, '')])[1].toLowerCase();
  const path = 'media/' + new Date().toISOString().slice(0, 7) + '/' + require('node:crypto').randomBytes(8).toString('hex') + '.' + ext;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(base() + '/storage/v1/object/upload/sign/library/' + path, { method: 'POST', headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' }, body: '{}' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) return { error: 'storage ' + r.status + ' ' + (j.message || j.error || '') };
  return { upload: base() + '/storage/v1' + j.url, url: base() + '/storage/v1/object/public/library/' + path };
}
async function adminAction(b) {
  if (b.action === 'libmedia') return mediaSign(b);
  const L = await load();
  if (b.action === 'libget') return { ...L, fixed: CATS };
  /* קטגוריה חדשה, שינוי שם או מחיקה (תמונות מקטגוריה שנמחקה עוברות ל"טבע ונופים") */
  if (b.action === 'libcat') {
    const name = String(b.name || '').trim().slice(0, 40);
    if (b.op === 'add') { if (!name) return { error: 'name' }; if (L.cats.length >= 30) return { error: 'too many' }; L.cats.push({ id: 'c' + Date.now().toString(36).slice(-8), name }); }
    else { const c = L.cats.find(x => x.id === b.id); if (!c) return { error: 'id' };
      if (b.op === 'rename') { if (!name) return { error: 'name' }; c.name = name; }
      else if (b.op === 'delete') { L.cats = L.cats.filter(x => x !== c); L.items.forEach(x => { if (x.cat === c.id) x.cat = 'nature'; }); } }
    await saveSetting('library', L); await load(); return { ok: true, ...L, fixed: CATS };
  }
  if (b.action === 'libupload') {
    const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(String(b.data || '')); if (!m) return { error: 'data' };
    return { item: await addImage(Buffer.from(m[2], 'base64'), m[1], b) };
  }
  if (b.action === 'libimport') {
    const u = String(b.url || ''); if (!/^https:\/\//.test(u)) return { error: 'url' };
    const r = await fetch(u, { headers: { 'User-Agent': 'MyLuach-Library/1.0 (admin import)' }, redirect: 'follow' });
    if (!r.ok) return { error: 'fetch ' + r.status };
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!TYPES[type]) return { error: 'not an image (' + type + ')' };
    return { item: await addImage(Buffer.from(await r.arrayBuffer()), type, { ...b, credit: b.credit || u }) };
  }
  if (b.action === 'libsave') {
    const upd = Array.isArray(b.items) ? b.items : [];
    L.items = L.items.map(x => { const n = upd.find(y => String(y.id) === String(x.id)); return n ? cleanItem({ ...x, cat: n.cat, title: n.title, credit: n.credit, on: n.on }) : x; });
    if (Array.isArray(b.hideSeed)) L.hideSeed = b.hideSeed.map(String).slice(0, 500);
    await saveSetting('library', L); return { ok: true, ...L };
  }
  if (b.action === 'libdelete') {
    const it = L.items.find(x => String(x.id) === String(b.id)); if (!it) return { error: 'id' };
    if (it.path) await remove(it.path);
    L.items = L.items.filter(x => x !== it); await saveSetting('library', L); return { ok: true };
  }
  return { error: 'action' };
}
async function publicList() { const L = await load(); return { items: L.items.filter(x => x.on).map(({ id, url, cat, title, credit }) => ({ id, url, cat, title, credit })), hideSeed: L.hideSeed, cats: L.cats }; }
module.exports = { adminAction, publicList, CATS };
