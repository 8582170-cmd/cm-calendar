/* Cloudflare Pages Functions: מריץ את פונקציות השרת שב-api/ (שנכתבו בסגנון Node/Vercel: req, res)
   בתוך Cloudflare. ככה יש קוד אחד שעובד בשני המקומות. */
const H = {};
export function register(name, fn) { H[name] = fn; }
function setEnv(env) {
  if (typeof process === 'undefined') globalThis.process = { env: {} };
  process.env = process.env || {};
  for (const [k, v] of Object.entries(env || {})) if (typeof v === 'string') process.env[k] = v;
}
export async function run(handler, context, extraQuery) {
  const { request, env } = context;
  setEnv(env);
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  Object.assign(query, extraQuery || {});
  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  /* המיקום והכתובת של הגולש, באותם שמות כמו ב-Vercel */
  const cf = request.cf || {};
  if (cf.latitude != null) headers['x-vercel-ip-latitude'] = String(cf.latitude);
  if (cf.longitude != null) headers['x-vercel-ip-longitude'] = String(cf.longitude);
  if (cf.timezone) headers['x-vercel-ip-timezone'] = String(cf.timezone);
  if (cf.country) headers['x-vercel-ip-country'] = String(cf.country);
  const ip = headers['cf-connecting-ip'];
  if (ip) { headers['x-forwarded-for'] = ip; headers['x-real-ip'] = ip; }
  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const txt = await request.text();
    const ct = headers['content-type'] || '';
    if (/json/.test(ct)) { try { body = JSON.parse(txt || 'null'); } catch (e) { body = txt; } }
    else if (/x-www-form-urlencoded/.test(ct)) body = Object.fromEntries(new URLSearchParams(txt));
    else body = txt;
  }
  const req = { method: request.method, url: url.pathname + url.search, headers, query, body };
  const out = { status: 200, headers: new Headers(), chunks: [] };
  let done; const finished = new Promise(r => { done = r; });
  const res = {
    get statusCode() { return out.status; }, set statusCode(v) { out.status = v; },
    setHeader(k, v) { out.headers.set(k, Array.isArray(v) ? v.join(', ') : String(v)); return res; },
    getHeader(k) { return out.headers.get(k); },
    write(c) { if (c != null) out.chunks.push(c); return true; },
    end(c) { if (c != null) out.chunks.push(c); done(); return res; }
  };
  const p = Promise.resolve(handler(req, res));
  await Promise.race([finished, p.then(() => new Promise(r => setTimeout(r, 0)))]);
  await p.catch(e => { if (!out.chunks.length) { out.status = 500; out.chunks.push(JSON.stringify({ error: 'server error' })); } console.error(e); });
  const body2 = out.chunks.length === 1 ? out.chunks[0] : out.chunks.map(c => typeof c === 'string' ? c : new TextDecoder().decode(c)).join('');
  return new Response(request.method === 'HEAD' ? null : body2, { status: out.status, headers: out.headers });
}
