/* עדכון מאגר דברי הימים מדף הניהול: מקבל את המאגר (אחרי ייבוא אקסל בדפדפן), בונה את הקבצים ושומר אותם ב-GitHub.
   השמירה ב-GitHub מפעילה פריסה מחדש (Vercel / Cloudflare), כך שהאתר מתעדכן תוך דקה-שתיים.
   נדרש משתנה סביבה GITHUB_TOKEN (Fine-grained token עם הרשאת Contents: Read and write למאגר). אופציונלי: GITHUB_REPO. */
'use strict';
const crypto = require('node:crypto');
const { env } = require('./_lib');
const HEAD = '/* תאריכי פטירת גדולי ישראל ודברי ימי עם ישראל, מתוך לוח "עתים לבינה" תשפ"ז, באישור. [חודש, יום, שנה, טקסט, אישיות, מקור] */\n';
function validate(YZ, SEL) {
  if (!Array.isArray(YZ) || YZ.length < 100 || YZ.length > 30000) return 'מאגר לא תקין';
  for (const r of YZ) {
    if (!Array.isArray(r) || r.length < 5 || r.length > 6) return 'שורה לא תקינה';
    const [m, d, y, t, p] = r;
    if (!(m >= 1 && m <= 13) || !(d >= 1 && d <= 30) || typeof y !== 'string' || typeof t !== 'string' || t.length > 6000 || !(p === 0 || p === 1)) return 'ערך לא תקין: ' + JSON.stringify(r).slice(0, 120);
  }
  if (!Array.isArray(SEL) || SEL.some(i => !(i >= 0 && i < YZ.length))) return 'רשימת ברירת מחדל לא תקינה';
  return null;
}
function build(YZ, SEL) {
  const src = HEAD + 'const YZ=[' + YZ.map(r => '[' + r.map(x => JSON.stringify(x)).join(',') + ']').join(',') + '];\nconst YZ_DEFAULT_SEL=' + JSON.stringify(SEL) + ';\n';
  const data = Buffer.from(JSON.stringify({ YZ, SEL }), 'utf8'), key = crypto.randomBytes(29);
  for (let i = 0; i < data.length; i++) data[i] ^= key[i % key.length] ^ ((i * 131) & 255);
  const k64 = key.toString('base64'), d64 = data.toString('base64');
  const js = '/* © MyLuach. מאגר דברי הימים מוגן בזכויות יוצרים; אין להעתיק, לשכפל או להפיץ. */\n' +
    '(function(){var k=Uint8Array.from(atob("' + k64 + '"),function(c){return c.charCodeAt(0)}),' +
    'b=Uint8Array.from(atob("' + d64 + '"),function(c){return c.charCodeAt(0)});' +
    'for(var i=0;i<b.length;i++)b[i]^=k[i%k.length]^((i*131)&255);' +
    'var o=JSON.parse(new TextDecoder().decode(b));window.YZ=o.YZ;window.YZ_DEFAULT_SEL=o.SEL})();\n';
  const node = '/* נוצר אוטומטית מ-tools/build_yz.py */\nmodule.exports = { k: ' + JSON.stringify(k64) + ', d: ' + JSON.stringify(d64) + ' };\n';
  return { 'data-src/yz-data.js': src, 'assets/yz.js': js, 'api/_yzdata.js': node };
}
async function gh(path, opts) {
  const r = await fetch('https://api.github.com/repos/' + (env('GITHUB_REPO') || '8582170-cmd/cm-calendar') + path, { ...(opts || {}),
    headers: { Authorization: 'Bearer ' + env('GITHUB_TOKEN'), Accept: 'application/vnd.github+json', 'User-Agent': 'MyLuach-admin', 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('GitHub ' + r.status + ': ' + (j.message || ''));
  return j;
}
async function save(b) {
  if (!env('GITHUB_TOKEN')) return { error: 'notoken' };
  const YZ = b.YZ, SEL = [...new Set(b.SEL || [])].sort((a, c) => a - c), bad = validate(YZ, SEL);
  if (bad) return { error: bad };
  const files = build(YZ, SEL);
  const ref = await gh('/git/ref/heads/main'), base = await gh('/git/commits/' + ref.object.sha);
  const tree = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding: 'utf-8' }) });
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: 'עדכון מאגר דברי הימים מדף הניהול' + (b.note ? ': ' + String(b.note).slice(0, 100) : ''), tree: t.sha, parents: [ref.object.sha] }) });
  await gh('/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  return { ok: true, commit: c.sha.slice(0, 7), count: YZ.filter(r => r[3]).length };
}
module.exports = { save, build, validate };
