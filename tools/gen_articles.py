# -*- coding: utf-8 -*-
# בונה את דפי המאמרים: articles/*.html, articles/index.html, assets/articles-list.js, ומוסיף אותם ל-sitemap.xml
import json, os, re, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from articles_src import ARTICLES, CATS, NOTE
from articles_hist import HIST, HNOTE, REM
ARTICLES = HIST + ARTICLES
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'articles')
SITE = 'https://www.myluach.org'
os.makedirs(OUT, exist_ok=True)
esc = lambda s: html.escape(s, quote=True)
HB = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
def hdate(d):
    y, m, dd = map(int, d.split('-')); return f'{dd} ב{HB[m-1]} {y}'
CTA = {
 'online': ('לוח שנה עברי אונליין', 'חגים, זמני היום וזמני שבת לכל עיר, בתצוגה חודשית, שבועית ויומית.', '/online/', 'ללוח האונליין'),
 'zmanim': ('זמני היום לעיר שלכם', 'כל הזמנים, לפי השיטה שלכם: אשכנזים, ספרדים, חזון שמיים, הרב ציקוני, בעל התניא ועוד.', '/online/#zmanim', 'לזמני היום'),
 'shabbat': ('זמני כניסת השבת ויציאתה', 'הדלקת נרות ויציאת שבת לכל עיר, לשבועות הקרובים.', '/online/#shabbat', 'לזמני השבת'),
 'countdown': ('לוח ספירה לאחור מעוצב', 'לחתונה, לבר מצווה או ללידה: עם תמונות, משפטים ופרשת השבוע.', '/countdown.html', 'לבניית לוח ספירה'),
 'history': ('דברי ימי ישראל בלוח שלכם', 'בלוח של MyLuach אפשר להציג בכל יום אירועים מתולדות עם ישראל וימי הילולא של צדיקים.', '/app.html', 'לבנות לוח'),
 'luach': ('לוח שנה אישי עם התמונות שלכם', 'לוח עברי-לועזי עם תמונות, ימי הולדת, זמני היום ולימוד יומי, מוכן להדפסה.', '/app.html', 'לבנות לוח'),
}
HEAD = '''<!doctype html>
<html lang="he" dir="rtl" data-cms="{cms}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · MyLuach</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{keys}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{ogtype}"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="MyLuach">
<meta property="og:image" content="{site}/assets/icon-512.png">
<link rel="icon" href="/assets/logo.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icon-180.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/articles.css?v=2">
<script type="application/ld+json">{ld}</script>
<script src="/assets/a11y.js?v=1" defer></script>
<script src="/assets/cms.js?v=1" defer></script>
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן</a>
<header class="a-top"><div class="a-top-in">
  <a class="a-logo" href="/"><img src="/assets/logo.svg?v=2" alt="" width="34" height="34">MyLuach</a>
  <nav class="a-nav" aria-label="ניווט ראשי"><a href="/online/">לוח אונליין</a><a href="/articles/">מאמרים</a><a href="/countdown.html">ספירה לאחור</a><a class="a-cta" href="/app.html">לבנות לוח</a></nav>
</div></header>
'''
FOOT = '''<footer class="a-foot"><div class="a-foot-in"><span>© MyLuach</span><a href="/">דף הבית</a><a href="/online/">לוח שנה אונליין</a><a href="/articles/">מאמרים</a><a href="/accessibility.html">הצהרת נגישות</a><a href="/privacy.html">פרטיות</a></div></footer>
</body></html>
'''
def page(a):
    url = f'{SITE}/articles/{a["slug"]}.html'
    ld = json.dumps([{"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'], "inLanguage": "he",
        "datePublished": a['date'], "dateModified": a.get('mod', a['date']), "mainEntityOfPage": url,
        "author": {"@type": "Organization", "name": "MyLuach"}, "publisher": {"@type": "Organization", "name": "MyLuach", "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon-512.png"}}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "MyLuach", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "מאמרים", "item": SITE + "/articles/"},
            {"@type": "ListItem", "position": 3, "name": a['title'], "item": url}]}], ensure_ascii=False)
    c = CTA[a['cta']]
    rel = [x for x in ARTICLES if x['slug'] != a['slug'] and x['cat'] == a['cat']][:4] or [x for x in ARTICLES if x['slug'] != a['slug']][:4]
    h = HEAD.format(cms='art-' + a['slug'], title=esc(a['title']), desc=esc(a['desc']), keys=esc(a.get('keys', '')), url=url, ogtype='article', site=SITE, ld=ld)
    h += f'''<div class="a-wrap">
<main id="main" class="a-main">
<nav class="crumbs" aria-label="מיקום"><a href="/">MyLuach</a> › <a href="/articles/">מאמרים</a> › <span>{esc(CATS[a['cat']])}</span></nav>
<article class="art">
<h1>{esc(a['title'])}</h1>
<p class="art-meta">{esc(CATS[a['cat']])} · {hdate(a['date'])}</p>
{re.sub(r'<div class="art-box"><b>(.*?)</b>', r'<div class="art-box"><h3>\1</h3>', a['body'].strip())}
{(REM + HNOTE) if a['cat'] == 'toldot' else NOTE}
</article>
</main>
<aside class="a-side" data-cms-skip>
<div class="a-card a-ctac"><b>{esc(c[0])}</b><p>{esc(c[1])}</p><a class="art-btn" href="{c[2]}">{esc(c[3])}</a></div>
<div class="a-card"><b>מאמרים נוספים</b><ul>{''.join(f'<li><a href="{x["slug"]}.html">{esc(x["title"])}</a></li>' for x in rel)}</ul><a href="/articles/">כל המאמרים ←</a></div>
</aside>
</div>
'''
    return h + FOOT
def index():
    url = SITE + '/articles/'
    ld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage", "name": "מאמרים: זמני היום, מנהגים ולוח השנה", "url": url, "inLanguage": "he",
        "hasPart": [{"@type": "Article", "headline": a['title'], "url": f'{SITE}/articles/{a["slug"]}.html'} for a in ARTICLES]}, ensure_ascii=False)
    title = 'מאמרים: זמני היום, מנהגים ולוח השנה העברי'
    desc = 'מאמרים והסברים על זמני היום ושיטות החישוב (רבינו תם, שקיעה, סוף זמן ק״ש, חזון שמיים), מנהגים כמו ניטל, ורעיונות ללוח שנה אישי.'
    h = HEAD.format(cms='art-index', title=esc(title), desc=esc(desc), keys='זמני היום, רבינו תם, שקיעה, קריאת שמע, ניטל, לוח שנה אישי', url=url, ogtype='website', site=SITE, ld=ld)
    h += '<div class="a-wrap a-wrap-1"><main id="main" class="a-main"><h1 class="a-h1">מאמרים</h1><p class="lead">אירועים פחות מוכרים מתולדות ישראל, הסברים על זמני היום ושיטות החישוב, מנהגים, ורעיונות ללוח שנה אישי.</p>'
    for k, n in CATS.items():
        L = [a for a in ARTICLES if a['cat'] == k]
        if not L: continue
        h += f'<section class="a-cat" data-cat="{k}"><h2>{esc(n)}</h2><div class="a-grid">' + ''.join(
            f'<a class="a-item" href="{a["slug"]}.html"><b>{esc(a["title"])}</b><span>{esc(a["desc"])}</span></a>' for a in L) + '</div></section>'
    h += '<div id="dynArt"></div></main></div>\n'
    h += '''<script>fetch('/api/pricing?pg=_list').then(function(r){return r.json()}).then(function(d){var L=(d&&d.items)||[];if(!L.length)return;var C=d.cats||{},by={};
L.forEach(function(a){(by[a.cat]=by[a.cat]||[]).push(a)});var e=function(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
Object.keys(by).forEach(function(k){var sec=document.querySelector('[data-cat="'+k+'"] .a-grid');var html=by[k].map(function(a){return '<a class="a-item" href="/p/'+e(a.slug)+'"><b>'+e(a.title)+'</b><span>'+e(a.desc)+'</span></a>'}).join('');
if(sec)sec.insertAdjacentHTML('afterbegin',html);else document.getElementById('dynArt').insertAdjacentHTML('beforeend','<section class="a-cat" data-cat="'+e(k)+'"><h2>'+e(C[k]||'מאמרים')+'</h2><div class="a-grid">'+html+'</div></section>')})}).catch(function(){})</script>
'''
    return h + FOOT
for a in ARTICLES:
    open(os.path.join(OUT, a['slug'] + '.html'), 'w').write(page(a))
open(os.path.join(OUT, 'index.html'), 'w').write(index())
open(os.path.join(ROOT, 'assets', 'articles-list.js'), 'w').write('/* נוצר אוטומטית מ־tools/gen_articles.py */\nwindow.MYLUACH_ARTICLES=' + json.dumps([['index', 'מאמרים: הדף הראשי']] + [[a['slug'], a['title']] for a in ARTICLES], ensure_ascii=False) + ';\n')
# sitemap
sm = os.path.join(ROOT, 'sitemap.xml'); s = open(sm).read()
urls = [SITE + '/articles/'] + [f'{SITE}/articles/{a["slug"]}.html' for a in ARTICLES]
add = ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls if f'<loc>{u}</loc>' not in s)
if add:
    s = s.replace('</urlset>', add + '</urlset>'); open(sm, 'w').write(s)
print(len(ARTICLES), 'articles;', add.count('<url>'), 'added to sitemap')
