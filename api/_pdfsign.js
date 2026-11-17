/* חתימה דיגיטלית מוצפנת על קובצי PDF, ועמוד אימות מסמכים.
   העורך בונה את ה-PDF בדפדפן, מחשב את ה-SHA-256 של הקובץ (בלי שדה החתימה עצמו) ושולח לכאן רק את ה-hash.
   השרת לא רואה את המסמך. הוא חותם על ה-hash בתעודה של האתר (CMS / PKCS#7 מנותק, adbe.pkcs7.detached),
   מוסיף חותמת זמן (RFC 3161) משרת חותמות זמן, ורושם את ה-hash בספר האימות (setting vf:<id> ו-vh:<hash>).
   התעודה עצמית: אדובי יציג אזהרה עד שמייבאים אותה כמהימנה. החתימה כן מגלה כל שינוי בקובץ אחרי החתימה.
   המפתח: משתני סביבה MYLUACH_SIGN_KEY (PKCS#8 PEM) ו-MYLUACH_SIGN_CERT (PEM), או נוצר מהניהול ונשמר ב-setting signkey.
   הגדרות: setting "sign" (signget / signset / signgen ב-admin.js). נקרא דרך /api/pricing?c=_sign. */
'use strict';
const { db, json, readBody, getUser, loadSetting, saveSetting } = require('./_lib');
const subtle = (globalThis.crypto || require('node:crypto').webcrypto).subtle;
const rnd = n => (globalThis.crypto || require('node:crypto').webcrypto).getRandomValues(new Uint8Array(n));
const SIG_BYTES = 14000; /* גודל השמור לחתימה בתוך ה-PDF (בבייטים). הדפדפן משתמש באותו ערך */
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);

/* ---------- DER ---------- */
const bytes = x => x instanceof Uint8Array ? x : Array.isArray(x) ? (x.every(v => typeof v === 'number') ? Uint8Array.from(x) : cat(...x)) : Uint8Array.from(x);
const cat = (...a) => { a = a.map(bytes); let n = 0; a.forEach(x => n += x.length); const o = new Uint8Array(n); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
const len = n => n < 128 ? [n] : n < 256 ? [0x81, n] : n < 65536 ? [0x82, n >> 8, n & 255] : [0x83, n >> 16, (n >> 8) & 255, n & 255];
const tlv = (t, c) => { c = cat(c); return cat([t], len(c.length), c); };
const seq = (...c) => tlv(0x30, c), set = (...c) => tlv(0x31, c), oct = b => tlv(0x04, b), nul = () => new Uint8Array([5, 0]);
const ctx = (n, ...c) => tlv(0xa0 | n, c);
const oid = s => { const p = s.split('.').map(Number), o = [p[0] * 40 + p[1]]; for (let i = 2; i < p.length; i++) { let v = p[i], t = [v & 127]; while ((v >>= 7)) t.unshift((v & 127) | 128); o.push(...t); } return tlv(6, o); };
const int = v => { if (typeof v === 'number') v = Uint8Array.from(v === 0 ? [0] : (() => { const a = []; while (v) { a.unshift(v & 255); v = Math.floor(v / 256); } return a; })()); v = Array.from(v); while (v.length > 1 && v[0] === 0 && !(v[1] & 128)) v.shift(); if (v[0] & 128) v.unshift(0); return tlv(2, v); };
const utf8 = s => tlv(0x0c, new TextEncoder().encode(s)), ptr = s => tlv(0x13, new TextEncoder().encode(s));
const utc = d => tlv(0x17, new TextEncoder().encode(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
const gen = d => tlv(0x18, new TextEncoder().encode(d.toISOString().replace(/[-:T]/g, '').slice(0, 14) + 'Z'));
const bits = b => tlv(3, cat([0], b));
const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const unhex = s => Uint8Array.from(s.match(/../g) || [], x => parseInt(x, 16));
const b64 = b => Buffer.from(b).toString('base64'), unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));
const pem = (b, label) => '-----BEGIN ' + label + '-----\n' + b64(b).replace(/(.{64})/g, '$1\n') + '\n-----END ' + label + '-----\n';
const unpem = s => unb64(String(s).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
const O = { sha256: '2.16.840.1.101.3.4.2.1', rsa: '1.2.840.113549.1.1.1', sha256rsa: '1.2.840.113549.1.1.11', data: '1.2.840.113549.1.7.1', signed: '1.2.840.113549.1.7.2', ct: '1.2.840.113549.1.9.3', md: '1.2.840.113549.1.9.4', st: '1.2.840.113549.1.9.5', tst: '1.2.840.113549.1.9.16.2.14', cn: '2.5.4.3', org: '2.5.4.10', c: '2.5.4.6', ku: '2.5.29.15', bc: '2.5.29.19', ski: '2.5.29.14' };
const algSha = () => seq(oid(O.sha256), nul());

/* קורא DER מינימלי: מחזיר את הרכיבים הישירים של רצף */
function kids(b, off = 0, end = b.length) {
  const out = [];
  while (off < end) {
    const t = b[off]; let l = b[off + 1], h = 2; if (l & 128) { const n = l & 127; l = 0; for (let i = 0; i < n; i++) l = l * 256 + b[off + 2 + i]; h = 2 + n; }
    out.push({ t, s: off, h, e: off + h + l, raw: b.subarray(off, off + h + l), body: b.subarray(off + h, off + h + l) }); off += h + l;
  }
  return out;
}

/* ---------- תעודה ומפתח ---------- */
async function makeKey(name) {
  const kp = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const spki = new Uint8Array(await subtle.exportKey('spki', kp.publicKey)), pk8 = new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey));
  const top0 = kids(spki)[0], bs = kids(spki, top0.s + top0.h, top0.e)[1];
  const skid = new Uint8Array(await subtle.digest('SHA-1', bs.body.subarray(1)));
  const nm = seq(set(seq(oid(O.c), ptr('IL'))), set(seq(oid(O.org), utf8('MyLuach'))), set(seq(oid(O.cn), utf8(name || 'MyLuach Document Signing'))));
  const from = new Date(Date.now() - 864e5), to = new Date(from.getTime() + 3650 * 864e5);
  const ext = ctx(3, seq(
    seq(oid(O.bc), tlv(1, [255]), oct(seq())),
    seq(oid(O.ku), tlv(1, [255]), oct(tlv(3, [6, 0xc0]))),
    seq(oid(O.ski), oct(oct(skid)))
  ));
  const tbs = seq(ctx(0, int(2)), int(rnd(16).map((x, i) => i ? x : x & 0x7f)), seq(oid(O.sha256rsa), nul()), nm, seq(utc(from), utc(to)), nm, spki, ext);
  const sig = new Uint8Array(await subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, tbs));
  return { key: pem(pk8, 'PRIVATE KEY'), cert: pem(seq(tbs, seq(oid(O.sha256rsa), nul()), bits(sig)), 'CERTIFICATE') };
}
let CACHE = null;
async function loadKey() {
  if (CACHE && Date.now() - CACHE.at < 60000) return CACHE.v;
  let k = process.env.MYLUACH_SIGN_KEY, c = process.env.MYLUACH_SIGN_CERT;
  if (!k || !c) { const s = await loadSetting('signkey'); k = s.key; c = s.cert; }
  let v = null;
  if (k && c) {
    const certDer = unpem(c), top = kids(certDer)[0], tbs = kids(certDer, top.s + top.h, top.e)[0], f = kids(certDer, tbs.s + tbs.h, tbs.e);
    const o = f[0].t === 0xa0 ? 1 : 0;
    v = { priv: await subtle.importKey('pkcs8', unpem(k), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']), certDer, serial: f[o].raw, issuer: f[o + 2].raw, fp: hex(new Uint8Array(await subtle.digest('SHA-256', certDer))), pem: String(c) };
  }
  CACHE = { at: Date.now(), v }; return v;
}

/* ---------- חותמת זמן (RFC 3161) ---------- */
async function stamp(url, digest) {
  const req = seq(int(1), seq(algSha(), oct(digest)), int(rnd(8).map((x, i) => i ? x : x & 0x7f)), tlv(1, [255]));
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' }, body: req, signal: ctl.signal });
    if (!r.ok) throw new Error('tsa ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer()), top = kids(b)[0], f = kids(b, top.s + top.h, top.e), st = kids(b, f[0].s + f[0].h, f[0].e)[0];
    if (!st || st.body[st.body.length - 1] > 1 || !f[1]) throw new Error('tsa status');
    return f[1].raw;
  } finally { clearTimeout(t); }
}

/* ---------- CMS ---------- */
async function cms(K, digest, when, tsaUrl) {
  const attrs = [
    seq(oid(O.ct), set(oid(O.data))),
    seq(oid(O.st), set(utc(when))),
    seq(oid(O.md), set(oct(digest)))
  ].sort((a, b) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; });
  const signedSet = set(...attrs);
  const sig = new Uint8Array(await subtle.sign('RSASSA-PKCS1-v1_5', K.priv, signedSet));
  let ts = null, unsigned = [];
  if (tsaUrl) {
    try { ts = await stamp(tsaUrl, new Uint8Array(await subtle.digest('SHA-256', sig))); unsigned = [tlv(0xa1, seq(oid(O.tst), set(ts)))]; }
    catch (e) { console.error('tsa', e.message); ts = null; }
  }
  const si = seq(int(1), seq(K.issuer, K.serial), algSha(), tlv(0xa0, attrs), seq(oid(O.rsa), nul()), oct(sig), ...unsigned);
  const sd = seq(int(1), set(algSha()), seq(oid(O.data)), tlv(0xa0, K.certDer), set(si));
  return { der: seq(oid(O.signed), ctx(0, sd)), ts: !!ts };
}

/* ---------- הגדרות ---------- */
function clean(s) {
  s = s && typeof s === 'object' ? s : {}; const t = s.tsa && typeof s.tsa === 'object' ? s.tsa : {};
  let url = String(t.url === undefined ? 'https://freetsa.org/tsr' : t.url).trim(); if (!/^https?:\/\/[^\s]+$/i.test(url)) url = '';
  /* כתובת תעודת שרת הזמן (להורדה ולייבוא באדובי). ברירת מחדל: FreeTSA, כשהשרת הוא של FreeTSA */
  let cert = t.cert === undefined ? (/^https:\/\/(www\.)?freetsa\.org\//i.test(url) ? 'https://freetsa.org/files/cacert.pem' : '') : String(t.cert).trim();
  if (!/^https:\/\/[^\s]+$/i.test(cert)) cert = '';
  return { on: !!s.on, need: s.need === 'any' ? 'any' : 'login', cap: Math.max(1, Math.min(1000, Math.round(+s.cap || 20))), tsa: { on: t.on === undefined ? true : !!t.on, url: url.slice(0, 300), cert: cert.slice(0, 300) } };
}
async function cfg() { return clean(await loadSetting('sign').catch(() => ({}))); }
async function pub() { const S = await cfg(), K = S.on ? await loadKey().catch(() => null) : null; return { on: !!(S.on && K), tsa: !!(S.tsa.on && S.tsa.url), tsaCert: !!(S.tsa.on && S.tsa.cert) }; }
const newId = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = rnd(12); return Array.from(r, x => A[x % A.length]).join(''); };
const dayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const rec = r => ({ id: r.id, at: r.at, name: r.name || '', org: r.org || '', ts: !!r.ts, fp: r.fp || '', pages: r.pages || 0, rv: !!r.rv });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const b = req.method === 'POST' ? (readBody(req) || {}) : (req.query || {}), a = String(b.a || '');
    if (a === 'pub') return json(res, 200, await pub());
    /* בדיקה פומבית: לפי מזהה, או לפי hash של טווחי החתימה שבקובץ שהמבקר העלה (הקובץ עצמו לא נשלח) */
    if (a === 'check') {
      const ids = [], found = [];
      if (b.id) { const id = str(b.id, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (id) { const r = await loadSetting('vf:' + id); if (r && r.id) found.push({ ...rec(r), by: 'id' }); } }
      for (const h of (Array.isArray(b.h) ? b.h : []).slice(0, 8)) {
        const hh = String(h).toLowerCase().replace(/[^0-9a-f]/g, ''); if (hh.length !== 64) continue;
        const m = await loadSetting('vh:' + hh); if (m && m.id) { const r = await loadSetting('vf:' + m.id); if (r && r.id) found.push({ ...rec(r), by: 'hash' }); }
      }
      const K = await loadKey().catch(() => null);
      return json(res, 200, { found, fp: K ? K.fp : '' });
    }
    /* תעודת שרת חותמות הזמן, להורדה (מומרת ל-DER כדי שאדובי יוכל לייבא אותה). נטענת מהכתובת שהוגדרה בניהול בלבד */
    if (a === 'tsacert') {
      const S = await cfg(); if (!S.tsa.cert) return json(res, 404, { error: 'none' });
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(S.tsa.cert, { signal: ctl.signal, redirect: 'follow' }); if (!r.ok) throw new Error('http ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 20000) throw new Error('size');
        const txt = buf.toString('latin1'), m = /-----BEGIN CERTIFICATE-----([A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----/.exec(txt);
        const der = m ? Buffer.from(m[1].replace(/\s+/g, ''), 'base64') : (buf[0] === 0x30 ? buf : null); if (!der || !der.length) throw new Error('format');
        res.setHeader('Content-Type', 'application/x-x509-ca-cert'); res.setHeader('Content-Disposition', 'attachment; filename="TSA-certificate.cer"'); res.statusCode = 200;
        return res.end(der);
      } catch (e) { return json(res, 502, { error: 'tsacert', message: 'לא הצלחנו להביא את תעודת שרת הזמן מהכתובת שהוגדרה.' }); }
      finally { clearTimeout(tm) }
    }
    if (a === 'cert') {
      const K = await loadKey().catch(() => null); if (!K) return json(res, 404, { error: 'none' });
      res.setHeader('Content-Type', 'application/x-x509-ca-cert'); res.setHeader('Content-Disposition', 'attachment; filename="MyLuach-signing.cer"'); res.statusCode = 200;
      return res.end(Buffer.from(K.certDer));
    }
    const S = await cfg(); if (!S.on) return json(res, 200, { ok: false, error: 'off', message: 'החתימה המוצפנת לא פעילה כרגע.' });
    const K = await loadKey(); if (!K) return json(res, 200, { ok: false, error: 'nokey', message: 'עדיין לא הוגדרה תעודת חתימה באתר.' });
    const u = await getUser(req);
    if (!u && S.need !== 'any') return json(res, 401, { error: 'login' });
    const who = u ? String(u.email || u.id || '').toLowerCase() : 'anon:' + String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
    if (a === 'prepare') {
      const ck = 'vc:' + who + ':' + dayKey(), c = await loadSetting(ck), n = (+c.n || 0) + 1;
      if (n > S.cap) return json(res, 200, { ok: false, error: 'cap', message: 'הגעתם למכסת החתימות היומית. נסו מחר.' });
      await saveSetting(ck, { n });
      const id = newId(); await saveSetting('vp:' + id, { who, at: Date.now() });
      return json(res, 200, { ok: true, id, sigBytes: SIG_BYTES, tsa: !!(S.tsa.on && S.tsa.url) });
    }
    if (a === 'sign') {
      const id = str(b.id, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''), p = await loadSetting('vp:' + id), d = String(b.digest || '').toLowerCase();
      if (!p || !p.who || p.who !== who || p.used || Date.now() - p.at > 3600e3) return json(res, 200, { ok: false, error: 'id', message: 'הבקשה לא תקפה. נסו שוב.' });
      if (!/^[0-9a-f]{64}$/.test(d)) return json(res, 400, { error: 'digest' });
      await saveSetting('vp:' + id, { ...p, used: 1 });
      const when = new Date(), out = await cms(K, unhex(d), when, S.tsa.on && S.tsa.url ? S.tsa.url : '');
      if (out.der.length * 2 > SIG_BYTES * 2 - 8) return json(res, 200, { ok: false, error: 'size', message: 'החתימה גדולה מהמקום שהוקצה.' });
      const r = { id, at: when.toISOString(), h: d, name: str(b.name, 80), org: str(b.org, 80), pages: Math.max(0, Math.min(99999, +b.pages || 0)), ts: out.ts, fp: K.fp, by: who };
      await saveSetting('vf:' + id, r); await saveSetting('vh:' + d, { id });
      return json(res, 200, { ok: true, sig: hex(out.der), ts: out.ts, at: r.at });
    }
    return json(res, 400, { error: 'unknown' });
  } catch (e) { console.error('pdfsign', e.message); return json(res, 500, { error: 'server', message: 'תקלה זמנית. נסו שוב.' }); }
};
module.exports.clean = clean; module.exports.cfg = cfg; module.exports.pub = pub; module.exports.makeKey = makeKey; module.exports.loadKey = loadKey;
module.exports.reset = () => { CACHE = null; }; module.exports.SIG_BYTES = SIG_BYTES;
