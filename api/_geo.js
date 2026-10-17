/* חיפוש מיקום ללוח: לפי מיקוד, כתובת או שם יישוב (OpenStreetMap / Nominatim),
   ולנקודה שנבחרה: שם, אזור זמן וגובה (Open-Meteo). */
'use strict';
const UA = { 'User-Agent': 'MyLuach/1.0 (https://www.myluach.org)', Accept: 'application/json' };
const pick = a => a && (a.city || a.town || a.village || a.hamlet || a.suburb || a.municipality || a.county || a.state) || '';
async function nom(params, lang) {
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&' + new URLSearchParams(params).toString();
  const r = await fetch(u, { headers: { ...UA, 'Accept-Language': lang } }); if (!r.ok) return [];
  return (await r.json()) || [];
}
async function search(q, lang) {
  q = String(q || '').trim().slice(0, 120); if (q.length < 2) return [];
  const digits = q.replace(/[\s-]/g, '');
  let rows = [];
  if (/^\d{7}$/.test(digits)) rows = await nom({ postalcode: digits, countrycodes: 'il' }, lang);
  else if (/^\d{5}$/.test(digits)) rows = await nom({ postalcode: digits }, lang);
  if (!rows.length) rows = await nom({ q }, lang);
  if (!rows.length && /^\d{5,7}$/.test(digits)) rows = await nom({ q: digits + ' Israel' }, lang);
  const seen = new Set();
  return rows.map(r => { const a = r.address || {}, place = pick(a), road = a.road ? a.road + (a.house_number ? ' ' + a.house_number : '') : '';
    return { name: (road && place ? road + ', ' + place : place || r.name || String(r.display_name || '').split(',')[0]).slice(0, 80), full: String(r.display_name || '').slice(0, 200), lat: +(+r.lat).toFixed(5), lng: +(+r.lon).toFixed(5), cc: String(a.country_code || '').toLowerCase(), pc: a.postcode || '' }; })
    .filter(x => { const k = x.lat.toFixed(3) + ',' + x.lng.toFixed(3); if (seen.has(k)) return false; seen.add(k); return isFinite(x.lat) && isFinite(x.lng); });
}
async function details(lat, lng, lang) {
  const out = { lat, lng, tz: '', el: 0, name: '', cc: '' };
  const [m, n] = await Promise.all([
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&timezone=auto&current=temperature_2m', { headers: UA }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=' + lat + '&lon=' + lng, { headers: { ...UA, 'Accept-Language': lang } }).then(r => r.ok ? r.json() : null).catch(() => null)]);
  if (m) { out.tz = m.timezone || ''; out.el = Math.max(0, Math.round(+m.elevation || 0)); }
  if (n) { const a = n.address || {}; out.name = pick(a) || n.name || ''; out.cc = String(a.country_code || '').toLowerCase(); }
  return out;
}
module.exports = async function handle(req, res, json) {
  const q = req.query || {}, lang = q.lang === 'en' ? 'en' : 'he,en';
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  try {
    if (q.q) return json(res, 200, { results: await search(q.q, lang) });
    const lat = parseFloat(q.lat), lng = parseFloat(q.lng);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return json(res, 200, await details(+lat.toFixed(4), +lng.toFixed(4), lang));
    return json(res, 400, { error: 'q' });
  } catch (e) { res.setHeader('Cache-Control', 'no-store'); return json(res, 502, { error: 'unavailable' }); }
};
