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
/* o.colons = נקודתיים בין התאים, o.fr = 0 בלי מסגרת, 1 מסגרת לכל תא, 2 מסגרת אחת מסביב, o.lens = מספר הספרות בכל תא (קבוע לאורך האנימציה) */
function draw(groups, k, o) {
  o = o || {};
  const fr = +o.fr || 0, colons = o.colons !== false && fr !== 1;
  const DW = 34 * k, DH = 62 * k, T = 7 * k, GAP = 7 * k, COL = (fr === 1 ? 26 : 20) * k, PAD = (fr ? 22 : 14) * k, B = 3 * k;
  const digits = groups.map((g, i) => String(g.v).padStart(o.lens ? o.lens[i] : 2, '0'));
  const lens = digits.map(d => d.length), maxLen = Math.max(...lens);
  /* כל התאים באותו רוחב, כדי שהתוויות מתחת (ימים, שעות…) יתיישרו בדיוק */
  const CELL = o.cell || maxLen * DW + (maxLen - 1) * GAP;
  const W = PAD * 2 + digits.length * CELL + (digits.length - 1) * COL, H = PAD * 2 + DH;
  const px = new Uint8Array(W * H);
  const rect = (x, y, w, h) => { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) px.fill(1, j * W + Math.max(0, x), j * W + Math.min(W, x + w)); };
  const outline = (x, y, w, h) => { rect(x + B * 2, y, w - B * 4, B); rect(x + B * 2, y + h - B, w - B * 4, B); rect(x, y + B * 2, B, h - B * 4); rect(x + w - B, y + B * 2, B, h - B * 4);
    rect(x + B, y + B, B, B); rect(x + w - 2 * B, y + B, B, B); rect(x + B, y + h - 2 * B, B, B); rect(x + w - 2 * B, y + h - 2 * B, B, B); };
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
  let x = PAD; const centers = [], cells = [];
  if (fr === 2) outline(B, B, W - 2 * B, H - 2 * B);
  digits.forEach((d, i) => {
    const x0 = x, w = d.length * DW + (d.length - 1) * GAP; let dx = x0 + ((CELL - w) / 2 | 0);
    for (const ch of d) { digit(dx, PAD, +ch); dx += DW + GAP; }
    if (fr === 1) outline(x0 - 10 * k, PAD - 12 * k, CELL + 20 * k, DH + 24 * k);
    x = x0 + CELL; centers.push(x0 + CELL / 2); cells.push([x0, x0 + CELL]);
    if (i < digits.length - 1) { if (colons) { const cx = x + (COL - T) / 2 | 0; rect(cx, PAD + DH * 0.28 | 0, T, T); rect(cx, PAD + DH * 0.66 | 0, T, T); } x += COL; }
  });
  return { W, H, px, centers, cells, lens, PAD, DH, CELL };
}

/* --- GIF מונפש: 60 תמונות, אחת לשנייה. מכל תמונה נשמר רק האזור שהשתנה (לרוב רק השניות), כך שהקובץ קטן --- */
function lzw(px, W, x0, y0, w, h) {
  const out = []; let cur = 0, nb = 0, size = 3, next = 6; const tab = new Int16Array(4096 * 4);
  const emit = c => { cur |= c << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>>= 8; nb -= 8; } };
  emit(4);
  let pre = px[y0 * W + x0];
  for (let j = 0; j < h; j++) for (let i = (j === 0 ? 1 : 0); i < w; i++) {
    const k = px[(y0 + j) * W + x0 + i], idx = pre * 4 + k, c = tab[idx];
    if (c) { pre = c - 1; continue; }
    emit(pre);
    if (next === 4096) { emit(4); next = 6; size = 3; tab.fill(0); }
    else { if (next >= (1 << size)) size++; tab[idx] = ++next; }
    pre = k;
  }
  emit(pre); emit(5); if (nb > 0) out.push(cur & 255);
  const blocks = [2]; for (let i = 0; i < out.length; i += 255) { const part = out.slice(i, i + 255); blocks.push(part.length); for (const v of part) blocks.push(v); } blocks.push(0);
  return Buffer.from(blocks);
}
/* תא בודד שמור בזיכרון (לפי גודל וערך): השניות חוזרות על עצמן, אז מקודדים כל ערך פעם אחת */
const MEMO = new Map();
function cellData(str, k, cell) {
  const key = k + '|' + cell + '|' + str; let d = MEMO.get(key); if (d) return d;
  const im = draw([{ v: str }], k, { cell, lens: [str.length] });
  d = lzw(im.px, im.W, im.PAD, im.PAD, im.CELL, im.DH); if (MEMO.size > 2000) MEMO.clear(); MEMO.set(key, d); return d;
}
function anim(at, k, opt) {
  const v0 = at(0), f0 = draw(v0, k, opt), { W, H, PAD, DH, CELL, lens } = f0;
  const frames = [{ x: 0, y: 0, w: W, h: H, d: lzw(f0.px, W, 0, 0, W, H) }];
  let prev = v0.map(x => x.v);
  for (let i = 1; i < 60; i++) {
    const g = at(i), vals = g.map(x => x.v), ch = vals.map((v, j) => v !== prev[j] ? j : -1).filter(j => j >= 0);
    if (!ch.length) frames.push({ x: 0, y: 0, w: 1, h: 1, d: lzw(f0.px, W, 0, 0, 1, 1) });
    else if (ch.length === 1) { const j = ch[0]; frames.push({ x: f0.cells[j][0], y: PAD, w: CELL, h: DH, d: cellData(String(vals[j]).padStart(lens[j], '0'), k, CELL) }); }
    else { const f = draw(g, k, { ...opt, lens }), x0 = f.cells[ch[0]][0], x1 = f.cells[ch[ch.length - 1]][1]; frames.push({ x: x0, y: PAD, w: x1 - x0, h: DH, d: lzw(f.px, W, x0, PAD, x1 - x0, DH) }); }
    prev = vals;
  }
  return { W, H, frames };
}
function gif({ W, H, frames }, fg, bg) {
  const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const u16 = n => [n & 255, n >> 8];
  const parts = [Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...u16(W), ...u16(H), 0x80, 0, 0, ...hex(bg), ...hex(fg)])];
  frames.forEach((f, i) => {
    parts.push(Buffer.from([0x21, 0xF9, 4, 0x04, ...u16(i === frames.length - 1 ? 0 : 100), 0, 0, 0x2C, ...u16(f.x), ...u16(f.y), ...u16(f.w), ...u16(f.h), 0]), f.d);
  });
  parts.push(Buffer.from([0x3B]));
  return Buffer.concat(parts);
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
/* part: all = הכול בשורה אחת, top = רק החודשים/שבועות/ימים (g = איזה מהם), clock = רק שעות:דקות:שניות. a=1 = מונפש (GIF) */
const DATE_K = ['months', 'weeks', 'days'];
function pick(all, part, g) {
  if (part === 'clock') return all.filter(x => !DATE_K.includes(x.k));
  if (part === 'top') { const t = all.filter(x => DATE_K.includes(x.k)); return g != null && t[g] ? [t[g]] : t; }
  return all;
}
module.exports = async (req, res) => {
  const q = req.query || {}, tz = /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(String(q.z || '')) ? String(q.z) : 'Asia/Jerusalem';
  const to = target(q.d, q.h, tz), k = String(q.s) === '1' ? 1 : 2, unit = ['d', 'w', 'm'].includes(q.u) ? q.u : 'd';
  const part = ['top', 'clock'].includes(q.part) ? q.part : 'all', g = /^[0-2]$/.test(String(q.g || '')) ? +q.g : null;
  const opt = { fr: ['1', '2'].includes(String(q.fr)) ? +q.fr : 0, colons: part !== 'top' };
  const fg = okHex(q.fg) || '1e5a63', bg = okHex(q.bg) || 'ffffff', now = Date.now();
  const at = i => pick(parts(to == null ? 0 : to - now - i * 1000, unit, tz), part, g);
  let img, type;
  if (String(q.a) === '1' && part !== 'top' && to != null && to - now > 0) {
    img = gif(anim(at, k, opt), fg, bg); type = 'image/gif';
  } else { img = png(draw(at(0), k, opt), fg, bg); type = 'image/png'; }
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Expires', '0');
  res.end(img);
};
module.exports.target = target; module.exports.parts = parts; module.exports.draw = draw; module.exports.gif = gif; module.exports.anim = anim;
