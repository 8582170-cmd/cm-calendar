# -*- coding: utf-8 -*-
# בונה דפי נחיתה לחיפושים (calendar/*.html, countdown-calendar/*.html) מתוך tools/landing_src.py,
# ומוסיף אותם ל-sitemap.xml. להריץ אחרי gen_online.py (שכותב את ה-sitemap מחדש).
import json, os, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from landing_src import PAGES
ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE = 'https://www.myluach.org'
esc = lambda s: html.escape(s, quote=True)
strip = lambda s: html.unescape(__import__('re').sub(r'<[^>]+>', '', s))
CATN = {'calendar': 'לוח שנה אישי', 'countdown-calendar': 'לוח ספירה לאחור'}
CATHOME = {'calendar': '/app.html', 'countdown-calendar': '/countdown.html'}

HEAD = '''<!doctype html>
<html lang="he" dir="rtl" data-cms="lp-{cms}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · MyLuach</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{keys}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="MyLuach">
<meta property="og:image" content="{site}/assets/icon-512.png">
<link rel="icon" href="/assets/logo.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icon-180.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/articles.css?v=2">
<style>.lp-hero{{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 6px}}.lp-hero .art-btn{{font-size:19px;padding:11px 22px}}.lp-faq details{{border-bottom:1px solid var(--line);padding:8px 0}}.lp-faq summary{{cursor:pointer;font-weight:700}}.lp-faq p{{margin:6px 0 0}}</style>
<script type="application/ld+json">{ld}</script>
<script src="/assets/a11y.js?v=2" defer></script>
<script src="/assets/cms.js?v=1" defer></script>
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן</a>
<header class="a-top"><div class="a-top-in">
  <a class="a-logo" href="/"><img src="/assets/logo.svg?v=2" alt="" width="34" height="34">MyLuach</a>
  <nav class="a-nav" aria-label="ניווט ראשי"><a href="/online/">לוח אונליין</a><a href="/articles/">מאמרים</a><a href="/countdown.html">ספירה לאחור</a><a class="a-cta" href="/app.html">לבנות לוח</a></nav>
</div></header>
'''
FOOT = '''<footer class="a-foot"><div class="a-foot-in"><span>© MyLuach</span><a href="/">דף הבית</a><a href="/pricing.html">מחירים</a><a href="/online/">לוח שנה אונליין</a><a href="/articles/">מאמרים</a><a href="/accessibility.html">הצהרת נגישות</a><a href="/privacy.html">פרטיות</a></div></footer>
</body></html>
'''

def page(p):
    cat = p['slug'].split('/')[0]
    url = f'{SITE}/{p["slug"]}.html'
    ld = json.dumps([
        {"@context": "https://schema.org", "@type": "WebPage", "name": p['title'], "description": p['desc'], "url": url, "inLanguage": "he",
         "isPartOf": {"@type": "WebSite", "name": "MyLuach", "url": SITE + '/'}},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in p['faq']]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "MyLuach", "item": SITE + '/'},
            {"@type": "ListItem", "position": 2, "name": CATN[cat], "item": SITE + CATHOME[cat]},
            {"@type": "ListItem", "position": 3, "name": p['title'], "item": url}]}], ensure_ascii=False)
    h = HEAD.format(cms=p['slug'].replace('/', '-'), title=esc(p['title']), desc=esc(p['desc']), keys=esc(p['keys']), url=url, site=SITE, ld=ld)
    go, go2 = p['go'], p.get('go2')
    btns = f'<div class="lp-hero"><a class="art-btn" href="{go[0]}">{esc(go[1])} ←</a>' + (f'<a class="art-btn ghost" href="{go2[0]}">{esc(go2[1])}</a>' if go2 else '') + '</div>'
    h += '<div class="a-wrap a-wrap-1"><main id="main" class="a-main">'
    h += f'<nav class="crumbs" aria-label="מיקום"><a href="/">MyLuach</a> › <a href="{CATHOME[cat]}">{CATN[cat]}</a> › <span>{esc(p["title"])}</span></nav>'
    h += f'<article class="art"><h1>{esc(p["h1"])}</h1><p class="lead">{p["lead"]}</p>{btns}'
    for t, body in p['body']:
        h += f'\n<h2>{esc(t)}</h2>\n{body}'
    h += '\n<h2>שאלות נפוצות</h2>\n<div class="lp-faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in p['faq']) + '</div>'
    free = 'עד 40 יום בחינם.' if cat == 'countdown-calendar' else 'בונים ורואים הכל בחינם, ומשלמים רק על לוח מורחב.'
    h += f'\n<div class="art-box"><h3>{esc(go[1])}</h3><p>{free}</p><a class="art-btn" href="{go[0]}">{esc(go[1])} ←</a></div>'
    rel = [x for x in PAGES if x is not p]
    rel.sort(key=lambda x: x['slug'].split('/')[0] != cat)
    h += '\n<h2>עוד באתר</h2><ul>' + ''.join(f'<li><a href="/{x["slug"]}.html">{esc(x["title"])}</a></li>' for x in rel) + '<li><a href="/online/">לוח שנה עברי אונליין</a></li></ul>'
    h += '</article></main></div>\n'
    return h + FOOT

for p in PAGES:
    out = os.path.join(ROOT, p['slug'] + '.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(page(p))
# ה-sitemap:
sm = os.path.join(ROOT, 'sitemap.xml'); s = open(sm).read()
add = ''.join(f'  <url><loc>{SITE}/{p["slug"]}.html</loc></url>\n' for p in PAGES if f'<loc>{SITE}/{p["slug"]}.html</loc>' not in s)
if add:
    s = s.replace('</urlset>', add + '</urlset>'); open(sm, 'w').write(s)
print(len(PAGES), 'landing pages;', add.count('<url>'), 'added to sitemap')
