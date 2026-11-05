/* תמונת ספירה לאחור למייל (PNG): שעון דיגיטלי שמראה כמה נשאר ליעד, נכון לרגע שבו המייל נפתח.
   /api/pricing?c=_cdimg&d=YYYY-MM-DD&h=HH:MM&z=Asia/Jerusalem&u=d|w|m&fg=1e5a63&bg=ffffff&s=2
   מייל לא יכול להריץ קוד, ולכן כל פתיחה של המייל מבקשת את התמונה מחדש ומקבלת את הזמן המעודכן.
   הציור: ספרות של "שעון דיגיטלי" (7 מקטעים), שני צבעים, PNG של סיבית אחת לפיקסל (קובץ קטן מאוד). */
'use strict';

/* זמן היעד (מילישניות) לפי תאריך, שעה ואזור זמן */
function target(d, h, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); if (!m) return null;
  const t = /^(\d{1,2}):(\d{2})$/.exec(String(h || '')) || [0, 0, 0];
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const off = ms => { const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms; };
    let u = guess - off(guess); u = guess - off(u); return u;
  } catch (e) { return guess; }
}
/* פירוק הזמן שנשאר: [{v, k}] לפי היחידות (d = ימים, w = שבועות וימים, m = חודשים וימים) + שעות דקות שניות */
function parts(ms, unit, tz) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const out = [];
  let days = Math.floor(s / 86400); s -= days * 86400;
  if (unit === 'm' && days >= 28) {
    /* חודשים: סופרים חודשים קלנדריים מהיום */
    const now = new Date(), end = new Date(now.getTime() + ms); let mo = 0;
    const add = k => { const x = new Date(now); x.setMonth(x.getMonth() + k); return x; };
    while (add(mo + 1) <= end) mo++;
    const rest = Math.floor((end - add(mo)) / 1000); days = Math.floor(rest / 86400); s = rest - days * 86400;
    out.push({ v: mo, k: 'months' });
  } else if (unit === 'w' && days >= 7) { out.push({ v: Math.floor(days / 7), k: 'weeks' }); days %= 7; }
  out.push({ v: days, k: 'days' }, { v: Math.floor(s / 3600), k: 'hours' }, { v: Math.floor(s / 60) % 60, k: 'minutes' }, { v: s % 60, k: 'seconds' });
  return out;
}

/* --- ציור --- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function draw(groups, k) {
  const DW = 34 * k, DH = 62 * k, T = 7 * k, GAP = 7 * k, COL = 20 * k, PAD = 14 * k;
  const digits = groups.map(g => String(g.v).padStart(2, '0')), maxLen = Math.max(...digits.map(d => d.length));
  /* כל התאים באותו רוחב, כדי שהתוויות מתחת (ימים, שעות…) יתיישרו בדיוק */
  const CELL = maxLen * DW + (maxLen - 1) * GAP;
  const W = PAD * 2 + digits.length * CELL + (digits.length - 1) * COL, H = PAD * 2 + DH;
  const px = new Uint8Array(W * H);
  const rect = (x, y, w, h) => { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) px.fill(1, j * W + Math.max(0, x), j * W + Math.min(W, x + w)); };
  const digit = (x, y, n) => {
    const on = SEG[n] || '', mid = y + (DH - T) / 2 | 0, half = (DH - T) / 2 | 0;
    if (on.includes('a')) rect(x + T, y, DW - 2 * T, T);
    if (on.includes('g')) rect(x + T, mid, DW - 2 * T, T);
    if (on.includes('d')) rect(x + T, y + DH - T, DW - 2 * T, T);
    if (on.includes('f')) rect(x, y + T - (T / 2 | 0), T, half);
    if (on.includes('b')) rect(x + DW - T, y + T - (T / 2 | 0), T, half);
    if (on.includes('e')) rect(x, mid + T - (T / 2 | 0), T, half);
    if (on.includes('c')) rect(x + DW - T, mid + T - (T / 2 | 0), T, half);
  };
  let x = PAD; const centers = [];
  digits.forEach((d, i) => {
    const x0 = x, w = d.length * DW + (d.length - 1) * GAP; let dx = x0 + ((CELL - w) / 2 | 0);
    for (const ch of d) { digit(dx, PAD, +ch); dx += DW + GAP; }
    x = x0 + CELL; centers.push(x0 + CELL / 2);
    if (i < digits.length - 1) { const cx = x + (COL - T) / 2 | 0; rect(cx, PAD + DH * 0.28 | 0, T, T); rect(cx, PAD + DH * 0.66 | 0, T, T); x += COL; }
  });
  return { W, H, px, centers };
}

/* --- PNG (פלטה של 2 צבעים, סיבית לפיקסל) --- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
}
function zlibStored(raw) { /* בלי דחיסה (אם zlib לא זמין): בלוקים "שמורים" */
  const blocks = [Buffer.from([0x78, 0x01])]; let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  for (let i = 0; i < raw.length || i === 0; i += 65535) { const part = raw.subarray(i, i + 65535), last = i + 65535 >= raw.length; const h = Buffer.alloc(5); h[0] = last ? 1 : 0; h.writeUInt16LE(part.length, 1); h.writeUInt16LE(~part.length & 0xffff, 3); blocks.push(h, Buffer.from(part)); if (last) break; }
  const ad = Buffer.alloc(4); ad.writeUInt32BE(((b << 16) | a) >>> 0, 0); blocks.push(ad); return Buffer.concat(blocks);
}
function png({ W, H, px }, fg, bg) {
  const rowLen = Math.ceil(W / 8), raw = Buffer.alloc((rowLen + 1) * H);
  for (let y = 0; y < H; y++) { const o = y * (rowLen + 1); for (let x = 0; x < W; x++) if (px[y * W + x]) raw[o + 1 + (x >> 3)] |= 0x80 >> (x & 7); }
  let z; try { z = require('node:zlib').deflateSync(raw, { level: 9 }); } catch (e) { z = zlibStored(raw); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 1; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(hex(bg).concat(hex(fg)))), chunk('IDAT', z), chunk('IEND', Buffer.alloc(0))]);
}

const okHex = v => /^[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : null;
module.exports = async (req, res) => {
  const q = req.query || {}, tz = /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(String(q.z || '')) ? String(q.z) : 'Asia/Jerusalem';
  const to = target(q.d, q.h, tz), k = String(q.s) === '1' ? 1 : 2, unit = ['d', 'w', 'm'].includes(q.u) ? q.u : 'd';
  const left = to == null ? 0 : to - Date.now();
  const img = png(draw(parts(left, unit, tz), k), okHex(q.fg) || '1e5a63', okHex(q.bg) || 'ffffff');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Expires', '0');
  res.end(img);
};
module.exports.target = target; module.exports.parts = parts; module.exports.draw = draw;
