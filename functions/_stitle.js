/* דפי זמני השבת וזמני היום של כל עיר: הכותרת והתיאור בתוצאות החיפוש כוללים את השבת (או החג) הקרובה.
   הזמנים נלקחים מטבלה שנבנית בזמן הבנייה לשנתיים קדימה (online/st/<עיר>.json, ראו tools/cf_seo.mjs),
   ומוכנסים לדף בכל כניסה. כך הם תמיד נכונים, בלי לבנות את האתר מחדש כל שבוע.
   אם משהו נכשל, הדף מוגש כמו שהוא (עם הכותרת שנקבעה בזמן הבנייה). */
const TABLES = new Map(), TTL = 6 * 3600e3;
async function table(ctx, id) {
  const c = TABLES.get(id); if (c && Date.now() - c.at < TTL) return c.d;
  const r = await ctx.env.ASSETS.fetch(new URL('/online/st/' + id + '.json', ctx.request.url));
  const d = r.ok ? await r.json() : null; TABLES.set(id, { at: Date.now(), d }); return d;
}
function texts(T, kind, en) {
  const now = Date.now(), e = (T.t || []).find(x => (x[1] || x[0] + 26 * 3600e3) > now); if (!e) return null;
  const [, , cHe, cEn, hHe, hEn, dHe, dEn, pHe, pEn] = e, name = en ? T.en : T.he;
  if (en) {
    const tm = 'Candle lighting ' + cEn + (hEn ? ', Havdalah ' + hEn : '');
    return { title: kind === 'shabbat' ? 'Shabbat Times ' + name + ': ' + tm : 'Zmanim ' + name + ' · Shabbat ' + cEn + (hEn ? '–' + hEn : '') + ' · Jewish Calendar',
      desc: 'Shabbat in ' + name + ' this ' + dEn + ': candle lighting ' + cEn + (hEn ? ', havdalah ' + hEn : '') + (pEn ? '. Parashat ' + pEn : '') + '. ' +
        (kind === 'shabbat' ? 'Candle lighting and havdalah times for the coming weeks and holidays.' : 'Daily zmanim: dawn, sunrise, latest Shema, sunset and nightfall, plus Jewish holidays.') };
  }
  const tm = 'כניסה ' + cHe + (hHe ? ', יציאה ' + hHe : '');
  return { title: kind === 'shabbat' ? 'זמני שבת ב' + name + ': ' + tm + (pHe ? ' · פרשת ' + pHe : '') : 'זמני היום ב' + name + ' · שבת: ' + tm + ' · לוח שנה עברי',
    desc: 'השבת ב' + name + ' (' + dHe + '): הדלקת נרות ' + cHe + (hHe ? ', צאת השבת ' + hHe : '') + (pHe ? ', פרשת ' + pHe : '') + '. ' +
      (kind === 'shabbat' ? 'זמני כניסת ויציאת שבת לשבתות ולחגים הקרובים.' : 'זמני היום: עלות השחר, הנץ, סוף זמן קריאת שמע ותפילה, שקיעה וצאת הכוכבים, וחגי ישראל.') };
}
export function cityPage(kind, en) {
  return async ctx => {
    const id = String(ctx.params.city || '').replace(/\.html$/, '');
    if (!/^[a-z0-9-]{2,40}$/.test(id) || !['GET', 'HEAD'].includes(ctx.request.method)) return ctx.next();
    /* בלי בקשה מותנית: אחרת מתקבל "לא השתנה" והכותרת הישנה נשארת בדפדפן */
    const h = new Headers(ctx.request.headers); h.delete('if-none-match'); h.delete('if-modified-since');
    const res = await ctx.next(new Request(ctx.request, { headers: h }));
    if (!res.ok || !/text\/html/.test(res.headers.get('content-type') || '')) return res;
    let x = null; try { const T = await table(ctx, id); if (T) x = texts(T, kind, en); } catch (e) { console.error('stitle', id, e.message); }
    if (!x) return res;
    const out = new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(x.title) } })
      .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', x.title) } })
      .on('meta[name="description"]', { element(el) { el.setAttribute('content', x.desc) } })
      .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', x.desc) } })
      .transform(res);
    const r = new Response(out.body, out); r.headers.delete('etag'); r.headers.set('cache-control', 'public, max-age=0, must-revalidate'); return r;
  };
}
