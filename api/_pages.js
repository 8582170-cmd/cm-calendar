/* דפים ומאמרים שנוצרים מדף הניהול: נשמרים ב-settings → pages, ומוצגים בכתובת /p/<slug> (מוכנים לגוגל, נבנים בשרת) */
'use strict';
const { loadSetting, saveSetting, json } = require('./_lib');
const SITE = 'https://www.myluach.org';
const CATS = { toldot: 'תולדות ישראל', zmanim: 'זמני היום', minhagim: 'מנהגים', luach: 'לוח שנה אישי', page: 'דף' };
const CTA = {
  online: ['לוח שנה עברי אונליין', 'חגים, זמני היום וזמני שבת לכל עיר, בתצוגה חודשית, שבועית ויומית.', '/online/', 'ללוח האונליין'],
  zmanim: ['זמני היום לעיר שלכם', 'כל הזמנים, לפי השיטה שלכם.', '/online/#zmanim', 'לזמני היום'],
  luach: ['לוח שנה אישי עם התמונות שלכם', 'לוח עברי-לועזי עם תמונות, ימי הולדת, זמני היום ולימוד יומי, מוכן להדפסה.', '/app.html', 'לבנות לוח'],
  countdown: ['לוח ספירה לאחור מעוצב', 'לחתונה, לבר מצווה או ללידה.', '/countdown.html', 'לבניית לוח ספירה'],
  history: ['דברי ימי ישראל בלוח שלכם', 'בלוח של MyLuach אפשר להציג בכל יום אירועים מתולדות עם ישראל וימי הילולא של צדיקים.', '/app.html', 'לבנות לוח'],
  none: null
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HB = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const hdate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? (+m[3]) + ' ב' + HB[+m[2] - 1] + ' ' + m[1] : ''; };

/* ניקוי HTML: רק תגיות טקסט בסיסיות */
const ALLOW = { h2: [], h3: [], h4: [], p: [], br: [], b: [], strong: [], i: [], em: [], u: [], s: [], ul: [], ol: [], li: [], blockquote: [], a: ['href'], img: ['src', 'alt'],
  table: [], thead: [], tbody: [], tr: [], th: [], td: [], div: ['class'], span: ['class'], hr: [], figure: [], figcaption: [], small: [], sup: [], sub: [] };
function clean(html) {
  let s = String(html || '').slice(0, 300000);
  s = s.replace(/<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
    tag = tag.toLowerCase(); const close = m[1] === '/';
    if (!ALLOW[tag]) return '';
    if (close) return '</' + tag + '>';
    let out = '';
    for (const a of ALLOW[tag]) {
      const r = new RegExp('\\s' + a + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(attrs); if (!r) continue;
      let v = r[2] ?? r[3] ?? r[4] ?? '';
      if ((a === 'href' || a === 'src') && !/^(https?:\/\/|\/|#|[\w.-]+\.html)/i.test(v.trim())) continue;
      if (a === 'class') v = v.split(/\s+/).filter(c => /^(art-box|art-note|small|lead|art-btn|ghost)$/.test(c)).join(' ');
      if (v) out += ' ' + a + '="' + esc(v) + '"';
    }
    if (tag === 'a' && /href="https?:/.test(out) && !/myluach\.org/.test(out)) out += ' rel="noopener" target="_blank"';
    if (tag === 'img') out += ' loading="lazy"';
    return '<' + tag + out + '>';
  });
}
const slugOk = s => /^[a-z0-9][a-z0-9-]{1,60}$/.test(s || '');
async function load() { const v = await loadSetting('pages'); return { items: Array.isArray(v.items) ? v.items : [] }; }
function head(p, url, ld) {
  return `<!doctype html>
<html lang="he" dir="rtl" data-cms="pg-${esc(p.slug)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)} · MyLuach</title>
<meta name="description" content="${esc(p.desc)}">
${p.keys ? '<meta name="keywords" content="' + esc(p.keys) + '">' : ''}
<link rel="canonical" href="${url}">
${p.published ? '' : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="${p.kind === 'page' ? 'website' : 'article'}"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.desc)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="MyLuach">
<meta property="og:image" content="${p.image ? esc(p.image) : SITE + '/assets/icon-512.png'}">
<link rel="icon" href="/assets/logo.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icon-180.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/articles.css?v=2">
${ld ? '<script type="application/ld+json">' + ld.replace(/</g, '\\u003c') + '</script>' : ''}
<script src="/assets/a11y.js?v=1" defer></script>
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן</a>
<header class="a-top"><div class="a-top-in">
  <a class="a-logo" href="/"><img src="/assets/logo.svg?v=2" alt="" width="34" height="34">MyLuach</a>
  <nav class="a-nav" aria-label="ניווט ראשי"><a href="/online/">לוח אונליין</a><a href="/articles/">מאמרים</a><a href="/countdown.html">ספירה לאחור</a><a class="a-cta" href="/app.html">לבנות לוח</a></nav>
</div></header>
`;
}
const FOOT = `<footer class="a-foot"><div class="a-foot-in"><span>© MyLuach</span><a href="/">דף הבית</a><a href="/online/">לוח שנה אונליין</a><a href="/articles/">מאמרים</a><a href="/accessibility.html">הצהרת נגישות</a><a href="/privacy.html">פרטיות</a></div></footer>
</body></html>`;
function render(p, all) {
  const url = SITE + '/p/' + p.slug, art = p.kind !== 'page';
  const ld = JSON.stringify(art ? [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.desc, inLanguage: 'he', datePublished: p.date, dateModified: p.mod || p.date, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'MyLuach' }, publisher: { '@type': 'Organization', name: 'MyLuach', logo: { '@type': 'ImageObject', url: SITE + '/assets/icon-512.png' } }, ...(p.image ? { image: p.image } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'MyLuach', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'מאמרים', item: SITE + '/articles/' }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] }] : null);
  let h = head(p, url, art ? ld : null);
  const body = clean(p.body).replace(/<div class="art-box"><b>([\s\S]*?)<\/b>/g, '<div class="art-box"><h3>$1</h3>');
  if (!art) return h + `<div class="a-wrap a-wrap-1"><main id="main" class="a-main"><article class="art"><h1>${esc(p.title)}</h1>${body}</article></main></div>\n` + FOOT;
  const c = CTA[p.cta || 'luach'];
  const rel = all.filter(x => x.published && x.kind !== 'page' && x.slug !== p.slug && x.cat === p.cat).slice(0, 5);
  h += `<div class="a-wrap"><main id="main" class="a-main">
<nav class="crumbs" aria-label="מיקום"><a href="/">MyLuach</a> › <a href="/articles/">מאמרים</a> › <span>${esc(CATS[p.cat] || '')}</span></nav>
<article class="art"><h1>${esc(p.title)}</h1><p class="art-meta">${esc(CATS[p.cat] || '')} · ${hdate(p.date)}</p>
${p.image ? '<img class="art-hero" src="' + esc(p.image) + '" alt="">' : ''}
${body}
${(p.tags || []).length ? '<p class="art-tags"><span>תגיות:</span>' + p.tags.map(t => '<a href="/articles/?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>').join('') + '</p>' : ''}
${p.note === false ? '' : '<p class="art-note">' + (p.cat === 'toldot' ? 'המידע נאסף ממקורות היסטוריים ותורניים. מצאתם טעות? נשמח לתיקון.' : 'המאמר נועד להסבר כללי ואינו פסק הלכה. למעשה, כל אחד ינהג כפי שקיבל מרבותיו וישאל את רב הקהילה.') + '</p>'}
</article></main>
<aside class="a-side">${c ? `<div class="a-card a-ctac"><b>${esc(c[0])}</b><p>${esc(c[1])}</p><a class="art-btn" href="${c[2]}">${esc(c[3])}</a></div>` : ''}
${rel.length ? `<div class="a-card"><b>עוד ב${esc(CATS[p.cat] || 'מאמרים')}</b><ul>${rel.map(x => `<li><a href="/p/${esc(x.slug)}">${esc(x.title)}</a></li>`).join('')}</ul><a href="/articles/">כל המאמרים ←</a></div>` : '<div class="a-card"><a href="/articles/">לכל המאמרים ←</a></div>'}
</aside></div>
`;
  return h + FOOT;
}
const notFound = () => head({ title: 'הדף לא נמצא', desc: '', slug: 'x', published: false }, SITE + '/articles/') + '<div class="a-wrap a-wrap-1"><main id="main"><article class="art"><h1>הדף לא נמצא</h1><p>ייתכן שהקישור שגוי או שהדף הוסר. <a href="/articles/">לכל המאמרים</a></p></article></main></div>' + FOOT;

/* בקשות ציבוריות: /p/<slug>, רשימה (JSON), מפת אתר */
async function handle(req, res) {
  const q = String((req.query || {}).pg || ''), L = (await load()).items;
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
  if (q === '_list') return json(res, 200, { items: L.filter(x => x.published && x.kind !== 'page').map(({ slug, title, desc, cat, date, tags }) => ({ slug, title, desc, cat, date, tags: tags || [] })).sort((a, b) => String(b.date).localeCompare(String(a.date))), cats: CATS });
  if (q === '_sitemap') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + L.filter(x => x.published).map(x => `  <url><loc>${SITE}/p/${x.slug}</loc>${x.mod || x.date ? '<lastmod>' + (x.mod || x.date).slice(0, 10) + '</lastmod>' : ''}</url>`).join('\n') + '\n</urlset>\n');
  }
  const p = L.find(x => x.slug === q);
  const preview = p && !p.published && (req.query || {}).preview === p.token;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!p || (!p.published && !preview)) { res.statusCode = 404; return res.end(notFound()); }
  if (preview) res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 200; res.end(render(p, L));
}
/* פעולות מדף הניהול */
async function adminAction(b) {
  const D = await load();
  if (b.action === 'pageslist') return { items: D.items.map(({ slug, title, cat, kind, published, date, mod, token }) => ({ slug, title, cat, kind, published, date, mod, token })), cats: CATS, ctas: Object.keys(CTA) };
  if (b.action === 'pageget') { const p = D.items.find(x => x.slug === b.slug); return p ? { page: p } : { error: 'not found' }; }
  if (b.action === 'pagedelete') { D.items = D.items.filter(x => x.slug !== b.slug); await saveSetting('pages', D); return { ok: true }; }
  if (b.action === 'pagesave') {
    const i = b.page || {}, slug = String(i.slug || '').trim().toLowerCase();
    if (!slugOk(slug)) return { error: 'כתובת הדף: רק אותיות באנגלית, ספרות ומקפים (2–60 תווים)' };
    if (!String(i.title || '').trim()) return { error: 'חסרה כותרת' };
    const old = D.items.find(x => x.slug === (b.oldSlug || slug));
    if (b.oldSlug !== slug && D.items.some(x => x.slug === slug)) return { error: 'כבר יש דף בכתובת הזו' };
    const today = new Date().toISOString().slice(0, 10);
    const p = { slug, title: String(i.title).trim().slice(0, 200), desc: String(i.desc || '').trim().slice(0, 400), keys: String(i.keys || '').slice(0, 300), tags: [...new Set(String(Array.isArray(i.tags) ? i.tags.join(',') : i.tags || '').split(/[,،]/).map(t => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 12),
      cat: CATS[i.cat] ? i.cat : 'toldot', kind: i.kind === 'page' ? 'page' : 'article', cta: CTA.hasOwnProperty(i.cta) ? i.cta : 'luach',
      image: /^(https?:\/\/|\/)/.test(i.image || '') ? String(i.image).slice(0, 500) : '', body: clean(i.body), published: !!i.published,
      date: /^\d{4}-\d{2}-\d{2}$/.test(i.date || '') ? i.date : (old && old.date) || today, mod: today, token: (old && old.token) || Math.random().toString(36).slice(2, 12), note: i.note !== false };
    if (old) D.items[D.items.indexOf(old)] = p; else D.items.unshift(p);
    await saveSetting('pages', D); return { ok: true, page: p };
  }
  return { error: 'action' };
}
async function publicUrls() { return (await load()).items.filter(x => x.published).map(x => SITE + '/p/' + x.slug); }
module.exports = { handle, adminAction, publicUrls, clean, CATS };
