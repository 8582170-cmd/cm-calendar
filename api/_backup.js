/* גיבוי יומי של הטבלאות לגוגל שיטס, דרך Apps Script שמחובר לגיליון (הקוד בקובץ tools/sheets-backup.gs).
   ב-Vercel: SHEETS_BACKUP_URL (כתובת ה-Web App) ו-SHEETS_BACKUP_TOKEN (סיסמה שמוגדרת גם בסקריפט). */
'use strict';
const { env, db } = require('./_lib');
const TABLES = [
  ['orders', 'created_at,id,plan,amount,status,email,coupon,paid_at,user_id', 'created_at.desc'],
  ['profiles', 'user_id,email,phone,phone_verified_at,created_at,updated_at', 'created_at.desc'],
  ['downloads', 'created_at,email,kind,plan,cal,view,size,pages,page,snap,user_id', 'created_at.desc'],
  ['reminders', 'id,email,name,rule,notice,lang,status,last_sent,created_at', 'id.desc'],
  ['voice_reminders', 'id,user_id,phone,name,rule,notice,status,last_sent,created_at', 'id.desc'],
  ['appointments', 'id,user_id,email,date,start_t,end_t,title,place,note,color,notify,last_sent,created_at', 'id.desc'],
  ['free_lite', 'user_id,email,used_at', 'used_at.desc'],
  ['settings', 'key,value,updated_at', 'key.asc']
];
const ready = () => !!(env('SHEETS_BACKUP_URL') && env('SHEETS_BACKUP_TOKEN'));
async function run() {
  if (!ready()) return { skipped: 'not configured' };
  const tables = {};
  for (const [name, cols, order] of TABLES) {
    try { const rows = await db(name + '?select=' + cols + '&order=' + order + '&limit=20000'); tables[name] = { cols: cols.split(','), rows: (rows || []).map(r => cols.split(',').map(c => r[c] == null ? '' : typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])) }; }
    catch (e) { tables[name] = { error: /does not exist|42P01|PGRST205/.test(e.message) ? 'missing' : String(e.message).slice(0, 120) }; }
  }
  const r = await fetch(env('SHEETS_BACKUP_URL'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: env('SHEETS_BACKUP_TOKEN'), at: new Date().toISOString(), tables }), redirect: 'follow' });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!r.ok || !j || !j.ok) throw new Error('sheets ' + r.status + ' ' + (j && j.error || txt.slice(0, 120)));
  return { ok: true, tables: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.rows ? v.rows.length : v.error])) };
}
module.exports = { run, ready };
