/* מד שימוש לדף הניהול: נפח הקבצים בכל דלי, שורות בטבלאות, גודל מסד הנתונים.
   וניקוי דוגמיות הורדה ישנות (רץ מה-cron היומי). */
'use strict';
const { env, db } = require('./_lib');
const base = () => env('SUPABASE_URL').replace(/\/$/, '');
const H = () => { const key = env('SUPABASE_SERVICE_ROLE_KEY'); return { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), 'Content-Type': 'application/json' }; };
async function list(bucket, prefix, offset) {
  const r = await fetch(base() + '/storage/v1/object/list/' + bucket, { method: 'POST', headers: H(), body: JSON.stringify({ prefix: prefix || '', limit: 1000, offset: offset || 0, sortBy: { column: 'name', order: 'asc' } }) });
  if (!r.ok) throw new Error('list ' + r.status); return (await r.json()) || [];
}
/* כל הקבצים בדלי (עם תיקיות), עד max */
async function walk(bucket, prefix, out, max) {
  for (let off = 0; ; off += 1000) {
    const L = await list(bucket, prefix, off);
    for (const x of L) {
      if (out.length >= max) return out;
      const p = (prefix ? prefix + '/' : '') + x.name;
      if (x.id == null && !x.metadata) await walk(bucket, p, out, max);
      else out.push({ path: p, size: +((x.metadata || {}).size || 0), at: x.created_at || x.updated_at || '' });
    }
    if (L.length < 1000) return out;
  }
}
async function usage() {
  const out = { buckets: {}, tables: {}, db: null };
  for (const b of ['calendars', 'samples', 'library']) {
    try { const F = await walk(b, '', [], 20000); out.buckets[b] = { files: F.length, bytes: F.reduce((a, f) => a + f.size, 0), biggest: F.reduce((a, f) => Math.max(a, f.size), 0), capped: F.length >= 20000 }; }
    catch (e) { out.buckets[b] = { error: 'לא נמצא' }; }
  }
  for (const t of ['profiles', 'orders', 'downloads', 'reminders', 'voice_reminders', 'appointments', 'email_log', 'free_lite']) {
    try { const r = await fetch(base() + '/rest/v1/' + t + '?select=*&limit=1', { method: 'HEAD', headers: { ...H(), Prefer: 'count=exact' } });
      const m = /\/(\d+)/.exec(r.headers.get('content-range') || ''); out.tables[t] = r.ok && m ? +m[1] : null; } catch (e) { out.tables[t] = null; }
  }
  try { const r = await fetch(base() + '/rest/v1/rpc/myluach_db_size', { method: 'POST', headers: H(), body: '{}' }); if (r.ok) out.db = +(await r.json()); } catch (e) {}
  return out;
}
/* מחיקת דוגמיות ישנות מ-keepDays ימים (התיקיות בדלי לפי חודש: YYYY-MM) */
async function cleanSamples(keepDays) {
  if (!(keepDays > 0)) return 0;
  const cut = new Date(Date.now() - keepDays * 864e5).toISOString().slice(0, 7);
  let n = 0;
  const months = (await list('samples', '', 0)).filter(x => /^\d{4}-\d{2}$/.test(x.name) && x.name < cut).map(x => x.name);
  for (const m of months) {
    const F = await walk('samples', m, [], 20000);
    for (let i = 0; i < F.length; i += 500) {
      const part = F.slice(i, i + 500).map(f => f.path);
      await fetch(base() + '/storage/v1/object/samples', { method: 'DELETE', headers: H(), body: JSON.stringify({ prefixes: part }) });
      n += part.length;
    }
    try { await db('downloads?snap=like.' + encodeURIComponent(m + '/*'), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ snap: null }) }); } catch (e) {}
  }
  return n;
}
module.exports = { usage, cleanSamples };
