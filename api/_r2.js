/* אחסון הלוחות השמורים של המשתמשים ב-Cloudflare R2 (במקום ב-Supabase Storage).
   כל לוח: cal/<user>/<id>.json (הטקסט וההגדרות, התמונות מוחלפות ב-"r2img:<hash>")
   כל תמונה: img/<user>/<hash>.jpg (קובץ תמונה רגיל, נשמר פעם אחת גם אם מופיע בכמה מקומות)
   הדפדפן מקבל מכאן כתובות חתומות לזמן קצר ומעלה/מוריד ישירות מ-R2, כך שהקבצים לא עוברים דרך השרת.
   בלי משתני הסביבה R2_* הכל ממשיך לעבוד כמו קודם (Supabase). */
'use strict';
const crypto = require('node:crypto');
const { json, getUser, readBody, env } = require('./_lib');

const cfg = () => {
  const a = env('R2_ACCOUNT_ID'), k = env('R2_ACCESS_KEY_ID'), s = env('R2_SECRET_ACCESS_KEY'), b = env('R2_BUCKET');
  return a && k && s && b ? { host: a + '.r2.cloudflarestorage.com', key: k, secret: s, bucket: b } : null;
};
const on = () => !!cfg();
/* דלי ציבורי נפרד לתמונות האתר (רקעים, מדבקות): R2_MEDIA_BUCKET + R2_MEDIA_URL (הכתובת הציבורית שלו).
   נפרד מהדלי של הלוחות, כי הלוחות פרטיים. */
const media = () => { const C = cfg(), b = env('R2_MEDIA_BUCKET'), u = env('R2_MEDIA_URL').replace(/\/$/, ''); return C && b && /^https:\/\//.test(u) ? { ...C, bucket: b, url: u } : null; };
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const sha = d => crypto.createHash('sha256').update(d).digest('hex');

/* חתימה בכתובת לפי AWS Signature V4 (כללי, כדי שאפשר לבדוק מול הדוגמה הרשמית של AWS) */
function sigUrl(o) {
  const d = o.now || new Date(), amz = d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), day = amz.slice(0, 8);
  const scope = day + '/' + o.region + '/s3/aws4_request';
  const q = Object.assign({}, o.query || {}, {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': o.key + '/' + scope, 'X-Amz-Date': amz,
    'X-Amz-Expires': String(o.expires || 900), 'X-Amz-SignedHeaders': 'host'
  });
  const cq = Object.keys(q).sort().map(k => enc(k) + '=' + enc(q[k])).join('&');
  const creq = [o.method, o.path, cq, 'host:' + o.host + '\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const sts = ['AWS4-HMAC-SHA256', amz, scope, sha(creq)].join('\n');
  const kS = hmac(hmac(hmac(hmac('AWS4' + o.secret, day), o.region), 's3'), 'aws4_request');
  return 'https://' + o.host + o.path + '?' + cq + '&X-Amz-Signature=' + crypto.createHmac('sha256', kS).update(sts).digest('hex');
}
/* כתובת חתומה ל-R2: method על key (ריק = הדלי עצמו, לרשימה) */
function presign(method, key, expires, query, bucketCfg) {
  const C = bucketCfg || cfg(); if (!C) throw new Error('r2 off');
  const path = '/' + C.bucket + (key ? '/' + key.split('/').map(enc).join('/') : '');
  return sigUrl({ method, host: C.host, path, query, key: C.key, secret: C.secret, region: 'auto', expires });
}
async function exists(key) { const r = await fetch(presign('HEAD', key, 300), { method: 'HEAD' }); return r.ok; }
async function del(key) { const r = await fetch(presign('DELETE', key, 300), { method: 'DELETE' }); return r.ok || r.status === 404; }
/* כל האובייקטים תחת prefix: [{key,size,at}] */
async function list(prefix, max) {
  const out = []; let token = '';
  for (;;) {
    const q = { 'list-type': '2', prefix: prefix || '', 'max-keys': '1000' }; if (token) q['continuation-token'] = token;
    const r = await fetch(presign('GET', '', 300, q)); if (!r.ok) throw new Error('r2 list ' + r.status);
    const x = await r.text();
    for (const m of x.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const g = t => ((new RegExp('<' + t + '>([^<]*)</' + t + '>').exec(m[1]) || [])[1] || '');
      out.push({ key: g('Key').replace(/&amp;/g, '&'), size: +g('Size') || 0, at: g('LastModified') });
      if (max && out.length >= max) return out;
    }
    const nt = /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(x);
    if (!/<IsTruncated>true<\/IsTruncated>/.test(x) || !nt) return out;
    token = nt[1].replace(/&amp;/g, '&');
  }
}
/* מקביליות מוגבלת */
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const j = i++; out[j] = await fn(items[j]); } })); return out; }

const ID = /^[A-Za-z0-9-]{6,64}$/, HASH = /^[a-f0-9]{32,64}$/;
/* ?fn=r2 (משתמש מחובר) */
async function owner(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const b = readBody(req), op = String(b.op || '');
  if (op === 'status') return json(res, 200, { on: on() });
  if (!on()) return json(res, 200, { on: false });
  const user = await getUser(req); if (!user) return json(res, 401, { error: 'login' });
  const u = user.id, calKey = id => 'cal/' + u + '/' + id + '.json', imgKey = h => 'img/' + u + '/' + h + '.jpg';
  const hashes = (Array.isArray(b.imgs) ? b.imgs : []).filter(h => HASH.test(h)).slice(0, 400);
  try {
    if (op === 'save') {
      if (!ID.test(String(b.id || ''))) return json(res, 400, { error: 'id' });
      /* רק תמונות שעוד לא נמצאות ב-R2 צריך להעלות */
      const have = await pool(hashes, 16, h => exists(imgKey(h)).catch(() => false));
      const put = {}; hashes.forEach((h, i) => { if (!have[i]) put[h] = presign('PUT', imgKey(h), 1800); });
      return json(res, 200, { on: true, cal: presign('PUT', calKey(b.id), 1800), put });
    }
    if (op === 'open') {
      if (!ID.test(String(b.id || ''))) return json(res, 400, { error: 'id' });
      return json(res, 200, { on: true, cal: presign('GET', calKey(b.id), 900) });
    }
    if (op === 'imgs') { const get = {}; hashes.forEach(h => { get[h] = presign('GET', imgKey(h), 900); }); return json(res, 200, { get }); }
    if (op === 'del') {
      if (!ID.test(String(b.id || ''))) return json(res, 400, { error: 'id' });
      await del(calKey(b.id));
      /* אם לא נשארו למשתמש לוחות ב-R2, גם התמונות שלו נמחקות */
      const left = await list('cal/' + u + '/', 1);
      if (!left.length) { const I = await list('img/' + u + '/'); await pool(I, 16, x => del(x.key)); }
      return json(res, 200, { ok: true });
    }
  } catch (e) { return json(res, 502, { error: String(e.message || e).slice(0, 200) }); }
  return json(res, 400, { error: 'op' });
}
/* כתובת העלאה לתמונה ציבורית (מהניהול): מחזיר { upload, url } או null אם הדלי הציבורי לא מוגדר */
function mediaPut(path) { const M = media(); if (!M) return null; return { upload: presign('PUT', path, 1800, null, M), url: M.url + '/' + path.split('/').map(enc).join('/'), store: 'r2' }; }
module.exports = { on, sigUrl, presign, list, del, exists, pool, owner, media, mediaPut };
