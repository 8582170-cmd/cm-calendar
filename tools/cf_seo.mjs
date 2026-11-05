/* בנייה ל-Cloudflare Pages: שיפורי קידום שלא משנים את מראה האתר.
   1. בדפי זמני השבת וזמני היום של כל עיר: הכותרת והתיאור בתוצאות החיפוש כוללים את זמני השבת הקרובה (הדלקת נרות, צאת השבת, פרשה).
      הזמנים מחושבים כמו בלוח המקוון (אשכנזים: הדלקה לפי העיר, צאת שבת 8.5°). האתר נבנה מחדש כל שבוע, כך שהזמנים מתעדכנים.
   2. נתונים מובנים (JSON-LD) בלתי נראים: פירורי לחם בדפי הלוח המקוון.
   אם משהו נכשל (למשל אין אינטרנט בזמן הבנייה), הדפים נשארים כמו שהם. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const DIST = process.argv[2] || 'dist', SITE = 'https://www.myluach.org';
const log = (...a) => console.log('seo:', ...a);

async function loadHebcal() {
  if (process.env.HEBCAL_ESM) { const H = await import(process.env.HEBCAL_ESM); return H; }
  const url = 'https://cdn.jsdelivr.net/npm/@hebcal/core@5.10.1/dist/bundle.min.js';
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error('hebcal ' + r.status);
  /* החבילה מגדירה משתנה גלובלי hebcal (כמו בדפדפן) */
  globalThis.window = globalThis.window || globalThis; globalThis.self = globalThis.self || globalThis;
  vm.runInThisContext(await r.text(), { filename: 'hebcal.bundle.js' });
  if (!globalThis.hebcal) throw new Error('hebcal missing'); return globalThis.hebcal;
}
const gem = n => { const o = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], t = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  n %= 1000; let r = h[Math.floor(n / 100)] || ''; n %= 100; r += n === 15 ? 'טו' : n === 16 ? 'טז' : t[Math.floor(n / 10)] + o[n % 10]; return r.length > 1 ? r.slice(0, -1) + '״' + r.slice(-1) : r + '׳'; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function upcoming(H, c) {
  const { HebrewCalendar, Location } = H;
  const loc = new Location(c.lat, c.lng, !!c.il, c.tz, c.en, '', undefined, c.el || 0);
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), end = new Date(start.getTime() + 9 * 864e5);
  const ev = HebrewCalendar.calendar({ start, end, location: loc, candlelighting: true, candleLightingMins: c.candle || 18, havdalahDeg: 8.5, il: !!c.il, sedrot: true });
  const cand = ev.find(e => /Candle lighting/i.test(e.getDesc()) && e.eventTime);
  if (!cand) return null;
  const hav = ev.find(e => /Havdalah/i.test(e.getDesc()) && e.eventTime && e.eventTime > cand.eventTime);
  const PF = (H.flags && H.flags.PARSHA_HASHAVUA) || 0;
  const par = ev.find(e => (PF ? (e.getFlags() & PF) : /^Parashat /.test(e.getDesc())) && e.getDate().greg() >= cand.getDate().greg());
  const t = (d, he) => new Intl.DateTimeFormat(he ? 'he-IL' : 'en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit', hour12: !he }).format(d);
  const day = (d, he) => new Intl.DateTimeFormat(he ? 'he-IL' : 'en-US', { timeZone: c.tz, weekday: 'long', day: 'numeric', month: he ? 'numeric' : 'short' }).format(d);
  return {
    candle: { he: t(cand.eventTime, true), en: t(cand.eventTime, false), dayHe: day(cand.eventTime, true), dayEn: day(cand.eventTime, false) },
    hav: hav ? { he: t(hav.eventTime, true), en: t(hav.eventTime, false) } : null,
    par: par ? { he: par.render('he-x-NoNikud').replace(/^פרשת\s*/, ''), en: par.render('en').replace(/^Parashat\s*/, '') } : null
  };
}

function setHead(html, title, desc) {
  if (title) html = html.replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>').replace(/(<meta property="og:title" content=")[^"]*/, '$1' + esc(title));
  if (desc) html = html.replace(/(<meta name="description" content=")[^"]*/, '$1' + esc(desc)).replace(/(<meta property="og:description" content=")[^"]*/, '$1' + esc(desc));
  return html;
}
function addLd(html, obj) { return html.replace('</head>', '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>\n</head>'); }
const crumbs = L => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: L.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });

async function main() {
  const cf = join(DIST, 'online/cities.js'); if (!existsSync(cf)) return log('no cities');
  const src = readFileSync(cf, 'utf8'), C = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
  let H = null; try { H = await loadHebcal(); } catch (e) { log('hebcal unavailable, titles unchanged:', e.message); }
  let n = 0, nl = 0;
  for (const c of C) {
    let u = null; if (H) { try { u = upcoming(H, c); } catch (e) { if (!main.err) log('city', c.id, e.message); main.err = (main.err || 0) + 1; } }
    for (const [dir, kind, en] of [['online/shabbat', 'shabbat', false], ['online/en/shabbat', 'shabbat', true], ['online/zmanim', 'zmanim', false], ['online/en/zmanim', 'zmanim', true]]) {
      const p = join(DIST, dir, c.id + '.html'); if (!existsSync(p)) continue;
      let h = readFileSync(p, 'utf8'); const name = en ? c.en : c.he;
      if (u) {
        if (en) {
          const tm = 'Candle lighting ' + u.candle.en + (u.hav ? ', Havdalah ' + u.hav.en : '');
          const title = kind === 'shabbat' ? 'Shabbat Times ' + name + ': ' + tm : 'Zmanim ' + name + ' · Shabbat ' + u.candle.en + (u.hav ? '–' + u.hav.en : '') + ' · Jewish Calendar';
          const desc = 'Shabbat in ' + name + ' this ' + u.candle.dayEn + ': candle lighting ' + u.candle.en + (u.hav ? ', havdalah ' + u.hav.en : '') + (u.par ? '. Parashat ' + u.par.en : '') + '. ' +
            (kind === 'shabbat' ? 'Candle lighting and havdalah times for the coming weeks and holidays.' : 'Daily zmanim: dawn, sunrise, latest Shema, sunset and nightfall, plus Jewish holidays.');
          h = setHead(h, title, desc);
        } else {
          const tm = 'כניסה ' + u.candle.he + (u.hav ? ', יציאה ' + u.hav.he : '');
          const title = kind === 'shabbat' ? 'זמני שבת ב' + name + ': ' + tm + (u.par ? ' · פרשת ' + u.par.he : '') : 'זמני היום ב' + name + ' · שבת: ' + tm + ' · לוח שנה עברי';
          const desc = 'השבת ב' + name + ' (' + u.candle.dayHe + '): הדלקת נרות ' + u.candle.he + (u.hav ? ', צאת השבת ' + u.hav.he : '') + (u.par ? ', פרשת ' + u.par.he : '') + '. ' +
            (kind === 'shabbat' ? 'זמני כניסת ויציאת שבת לשבתות ולחגים הקרובים.' : 'זמני היום: עלות השחר, הנץ, סוף זמן קריאת שמע ותפילה, שקיעה וצאת הכוכבים, וחגי ישראל.');
          h = setHead(h, title, desc);
        }
        n++;
      }
      if (!/BreadcrumbList/.test(h)) {
        const base = SITE + '/online/' + (en ? 'en/' : '');
        h = addLd(h, crumbs([['MyLuach', SITE + (en ? '/en' : '/')], [en ? 'Online Jewish calendar' : 'הלוח המקוון', base],
          [(en ? (kind === 'shabbat' ? 'Shabbat times ' : 'Zmanim ') : (kind === 'shabbat' ? 'זמני שבת ב' : 'זמני היום ב')) + name, base + kind + '/' + c.id]]));
        nl++;
      }
      writeFileSync(p, h);
    }
  }
  /* פירורי לחם גם בדפי החגים והלוח לפי שנה */
  for (const [dir, en, nameOf] of [['online/chagim', false, y => 'חגים ומועדים ' + gem(+y)], ['online/en/chagim', true, y => 'Jewish holidays ' + y], ['online/luach', false, y => 'לוח שנה ' + gem(+y)], ['online/en/luach', true, y => 'Jewish calendar ' + y]]) {
    const d = join(DIST, dir); if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter(x => /^\d{4}\.html$/.test(x))) {
      const p = join(d, f); let h = readFileSync(p, 'utf8'); if (/BreadcrumbList/.test(h)) continue;
      const y = f.slice(0, 4), base = SITE + '/online/' + (en ? 'en/' : '');
      h = addLd(h, crumbs([['MyLuach', SITE + (en ? '/en' : '/')], [en ? 'Online Jewish calendar' : 'הלוח המקוון', base], [nameOf(y), base + dir.split('/').pop() + '/' + y]]));
      writeFileSync(p, h); nl++;
    }
  }
  /* השנה העברית בכותרת של דף הבית ובונה הלוח (השנה שקונים לה לוח עכשיו: מקיץ כבר השנה הבאה) */
  if (H) { try {
    const hy = new H.HDate(new Date(Date.now() + 75 * 864e5)).getFullYear(), yt = gem(hy);
    for (const [f, from, to] of [['index.html', 'לוח שנה עברי־לועזי בעיצוב אישי', 'לוח שנה עברי־לועזי ' + yt + ' בעיצוב אישי'], ['app.html', 'בניית לוח שנה אישי אונליין', 'בניית לוח שנה אישי ' + yt + ' אונליין']]) {
      const p = join(DIST, f); if (!existsSync(p)) continue; let h = readFileSync(p, 'utf8');
      const m = /<title>([^<]*)<\/title>/.exec(h); if (m && m[1].includes(from) && !m[1].includes(yt)) { h = h.replace(m[0], '<title>' + m[1].replace(from, to) + '</title>'); writeFileSync(p, h); }
    }
  } catch (e) { log('year titles', e.message); } }
  log('times in titles:', n, 'pages · breadcrumbs:', nl, 'pages');
}
main().catch(e => log('failed (pages unchanged):', e.message));
