/* בנייה ל-Cloudflare Pages: Pages מגיש דפים בלי ".html" (ומפנה מ-x.html ל-x).
   כדי שגוגל יראה כתובת אחת לכל דף, מחליפים בתיקייה dist את הכתובות המלאות של האתר
   (canonical, hreflang, og:url, מפת האתר, קישורים) לצורה בלי .html. המקור ב-git לא משתנה, כך ש-Vercel (הגיבוי) לא מושפע. */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const RX = /(https:\/\/www\.myluach\.org\/[^"'\s<>)#?]*?)(index)?\.html(?=[#?"'\s<>)\\]|$)/g;
let files = 0, hits = 0;
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n), s = statSync(p);
    if (s.isDirectory()) { walk(p); continue; }
    if (!/\.(html|xml)$/.test(n)) continue;
    const t = readFileSync(p, 'utf8'); let c = 0;
    const u = t.replace(RX, (m, a) => { c++; return a; });
    if (c) { writeFileSync(p, u); files++; hits += c; }
  }
})(process.argv[2] || 'dist');
console.log('clean urls: ' + hits + ' in ' + files + ' files');
