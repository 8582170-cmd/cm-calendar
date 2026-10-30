/* /cdn/...: גיבוי לספריות ולמודלים חיצוניים (הלוח העברי, התחברות, אקסל, גזירת דמויות, זיהוי פנים) דרך הדומיין של האתר.
   הדפדפן טוען קודם ישירות מהמקור, ורק אם זה נכשל (סינון וכו') פונה לכאן.
   כך הגולש פונה רק ל-myluach.org (חשוב למסננים כמו נטפרי ורימון), והשרת מביא את הקובץ מהמקור ושומר אותו במטמון של Cloudflare.
   /cdn/npm/<חבילה@גרסה>/...  ←  cdn.jsdelivr.net/npm/...   ·   /cdn/hf/<מודל>/...  ←  huggingface.co/...
   רק חבילות ומודלים מהרשימה, בגרסה קבועה. */
const NPM = ['@vladmandic/face-api@1.7.15', '@mediapipe/selfie_segmentation@0.1.1675465747', '@huggingface/transformers@3.5.1',
  '@hebcal/core@5.10.1', '@supabase/supabase-js@2.45.4', 'xlsx@0.18.5'];
const HF = ['Xenova/modnet/'];
export async function onRequest({ request, params, waitUntil }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method', { status: 405 });
  const parts = [].concat(params.path || []), kind = parts.shift(), rest = parts.join('/');
  if (rest.includes('..')) return new Response('bad', { status: 400 });
  let up = null;
  if (kind === 'npm' && NPM.some(p => rest === p || rest.startsWith(p + '/'))) up = 'https://cdn.jsdelivr.net/npm/' + rest;
  if (kind === 'hf' && HF.some(p => rest.startsWith(p))) up = 'https://huggingface.co/' + rest;
  if (!up) return new Response('not allowed', { status: 404 });
  const cache = caches.default, key = new Request(new URL(request.url).origin + '/cdn/' + kind + '/' + rest);
  let r = await cache.match(key);
  if (!r) {
    const u = await fetch(up, { redirect: 'follow' });
    if (!u.ok) return new Response('upstream ' + u.status, { status: u.status === 404 ? 404 : 502, headers: cors() });
    const h = new Headers(cors());
    for (const k of ['content-type', 'content-length', 'etag']) { const v = u.headers.get(k); if (v) h.set(k, v); }
    if (/\.wasm$/.test(rest)) h.set('content-type', 'application/wasm');
    h.set('cache-control', 'public, max-age=31536000, immutable');
    r = new Response(u.body, { status: 200, headers: h });
    waitUntil(cache.put(key, r.clone()).catch(() => {}));
  }
  return request.method === 'HEAD' ? new Response(null, { status: r.status, headers: r.headers }) : r;
}
function cors() { return { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' }; }
