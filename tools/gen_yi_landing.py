# -*- coding: utf-8 -*-
"""דפי נחיתה באידיש (כתיב חסידי): yi/*.html. מריצים אחרי gen_online.py (שכותב את ה-sitemap מחדש):
python3 tools/gen_yi_landing.py"""
import json, os, re, html
ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE = 'https://www.myluach.org'
esc = lambda s: html.escape(s, quote=True)
strip = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s))

HEAD = '''<!doctype html>
<html lang="yi" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · MyLuach</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{keys}">
<link rel="canonical" href="{url}">{alt}
<meta property="og:type" content="website"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><meta property="og:locale" content="yi">
<meta property="og:image" content="{site}/assets/icon-512.png">
<link rel="icon" href="/assets/logo.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icon-180.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/articles.css?v=2">
<style>.lp-hero{{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 6px}}.lp-hero .art-btn{{font-size:19px;padding:11px 22px}}.lp-faq details{{border-bottom:1px solid var(--line);padding:8px 0}}.lp-faq summary{{font-weight:700;cursor:pointer}}.yi-cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:14px 0}}.yi-card{{border:1px solid var(--line);border-radius:16px;padding:14px 16px;text-decoration:none;color:inherit;display:block}}.yi-card b{{display:block;font-size:19px;margin-bottom:4px}}.yi-card:hover{{border-color:currentColor}}</style>
<script type="application/ld+json">{ld}</script>
<script src="/assets/a11y.js?v=2" defer></script>
</head>
<body>
<a class="skip" href="#main">צום אינהאלט</a>
<header class="a-top"><div class="a-top-in">
  <a class="a-logo" href="/yi/"><img src="/assets/logo.svg?v=2" alt="" width="34" height="34">MyLuach</a>
  <nav class="a-nav" aria-label="נאוויגאציע"><a href="/invite-yi">איינלאדונג</a><a href="/timer-yi">קאונטדאון</a><a href="/yi/yiddish-calendar.html">לוח אויף אידיש</a><a href="/" hreflang="he" lang="he">עברית</a></nav>
</div></header>
'''
FOOT = '''<footer class="a-foot"><div class="a-foot-in"><span>© MyLuach</span><a href="/yi/">היים</a><a href="/invite-yi">דיגיטאלע איינלאדונג</a><a href="/timer-yi">קאונטדאון</a><a href="/yi/yiddish-calendar.html">לוח אויף אידיש</a><a href="/privacy.html">פריוואטקייט</a></div></footer>
</body></html>
'''

INV_FEATS = '''<ul>
<li><b>די איינלאדונג:</b> נעמען פון חתן און כלה (אדער דעם בעל שמחה), עלטערן, נוסח, דער ארט מיט וועיז און גוגל מאפס, און צולייגן צום קאלענדאר.</li>
<li><b>באשטעטיגונגען:</b> יעדער גאסט באשטעטיגט מיט איין קליק, וויפיל מענטשן קומען, און ענטפערט אויף אייערע פראגעס (למשל מיט וועלכן באס, אדער נאר צום טאנצן).</li>
<li><b>א פערזענליכער לינק פאר יעדן גאסט:</b> אין וואטסאפ, אין אימעיל אדער אין SMS. איר זעט ווער האט געעפנט און ווער האט נאך נישט געענטפערט.</li>
<li><b>קול-מעסעדזש צום טעלעפאן:</b> קומט אן אויך צו א כשר׳ן טעלעפאן. דער גאסט הערט די איינלאדונג און באשטעטיגט מיט קנעפלעך.</li>
<li><b>ברכות, צוטיילן תהילים, זיץ-ארדענונג</b> און דערמאנונגען פאר די געסט.</li>
<li><b>די גאנצע איינלאדונג אויף אידיש</b>, אדער אויף לשון קודש אדער ענגליש, ווי איר קלייבט.</li>
</ul>'''

PAGES = [
 {'slug': 'yi/index', 'url': SITE + '/yi/', 'he': SITE + '/',
  'title': 'MyLuach אויף אידיש: איינלאדונגען, קאונטדאון און לוחות',
  'h1': 'MyLuach אויף אידיש',
  'desc': 'דיגיטאלע איינלאדונג פאר א חתונה און יעדע שמחה, א קאונטדאון ביז דער שמחה, און א פערזענליכער לוח מיט בילדער און זמנים צו דרוקן אויף אידיש.',
  'keys': 'אידיש, איינלאדונג, חתונה איינלאדונג, דיגיטאלע איינלאדונג, קאונטדאון, לוח אויף אידיש, אידישער לוח',
  'lead': 'אלעס פאר אייער שמחה, אויף אידיש: א דיגיטאלע איינלאדונג מיט באשטעטיגונגען, א קאונטדאון ביז דער שמחה, און א פערזענליכער לוח צו דרוקן.',
  'cards': [('/invite-yi', 'דיגיטאלע איינלאדונג', 'פאר א חתונה, בר מצוה, ברית און יעדע שמחה, מיט באשטעטיגונגען און א פערזענליכן לינק פאר יעדן גאסט.'),
            ('/timer-yi', 'קאונטדאון ביז דער שמחה', 'א זייגער וואס ציילט טעג, שעות און מינוט, צו טיילן, אריינלייגן אין א וועבזייטל אדער אין אן אימעיל.'),
            ('/yi/yiddish-calendar.html', 'א לוח אויף אידיש צו דרוקן', 'א פערזענליכער לוח מיט בילדער, זמנים און די משפחה׳ס דאטומס, מיט טעג און חדשים אויף אידיש.'),
            ('/yi/wedding-invitation.html', 'איינלאדונג פאר א חתונה', 'ווי אזוי מאכט מען א שיינע איינלאדונג און באקומט באשטעטיגונגען פון אלע געסט.')],
  'body': [], 'faq': [
   ('קאסט עס געלט?', 'מאכן און זען איז אומזיסט. א דיגיטאלע איינלאדונג קען מען עפענען אומזיסט מיט א קאנטע, און שיקן אין אימעיל צו 20 געסט. א פול פעקל לייגט צו מער אימעילס, דערמאנונגען, זיץ-ארדענונג און נאך.'),
   ('איז דאס אלעס אויף אידיש?', 'יא. די איינלאדונג וואס די געסט זעען, די אימעילס צו די געסט, דער קאונטדאון און דער געדרוקטער לוח קענען זיין אויף אידיש.')]},
 {'slug': 'yi/wedding-invitation', 'url': SITE + '/yi/wedding-invitation.html', 'he': SITE + '/invite',
  'title': 'דיגיטאלע איינלאדונג פאר א חתונה, מיט באשטעטיגונגען',
  'h1': 'דיגיטאלע איינלאדונג פאר א חתונה',
  'desc': 'מאכט א דיגיטאלע איינלאדונג פאר א חתונה אויף אידיש: נעמען, עלטערן, ארט מיט וועיז, באשטעטיגונגען, באסן, ברכות און תהילים. שיקט א פערזענליכן לינק צו יעדן גאסט.',
  'keys': 'חתונה איינלאדונג, דיגיטאלע איינלאדונג, איינלאדונג אויף אידיש, באשטעטיגונג, חתונה, בר מצוה איינלאדונג',
  'lead': 'א שיינע איינלאדונג וואס יעדער גאסט באקומט מיט זיין נאמען, און איר זעט ווער קומט, וויפיל מענטשן, און מיט וועלכן באס.',
  'go': ('/invite-yi', 'מאכן אן איינלאדונג'),
  'body': [('וואס איז אין דער איינלאדונג', INV_FEATS),
           ('ווי אזוי ארבעט עס', '''<ol>
<li>קלייבט די סארט שמחה (חתונה, ווארט, בר מצוה, ברית…) און שרייבט די נעמען.</li>
<li>לייגט צו דעם דאטום, דעם ארט און די פראגעס (באס, נאר צום טאנצן).</li>
<li>לייגט צו די געסט מיט טעלעפאן און/אדער אימעיל, און שיקט.</li>
<li>אינעם איבערבליק זעט איר ווער האט געעפנט, ווער קומט און ווער נישט.</li>
</ol>''')],
  'faq': [('קען א גאסט מיט א כשר׳ן טעלעפאן באשטעטיגן?', 'יא. מיטן קול-מעסעדזש הערט ער די איינלאדונג אויפן טעלעפאן און באשטעטיגט מיט קנעפלעך. די ענטפער קומט אריין אין דער זעלבער ליסטע.'),
          ('קען מען שיקן אין שבת?', 'ניין. מען קען נישט שיקן און נישט באשטימען אויף שבת און יום טוב, און אויך נישט א שעה פאר און א האלבע שעה נאכדעם.'),
          ('וויפיל קאסט עס?', 'עפענען די איינלאדונג און שיקן צו 20 געסט אין אימעיל איז אומזיסט. מער געסט, דערמאנונגען און קול-מעסעדזשעס זענען אין א פעקל.')]},
 {'slug': 'yi/yiddish-calendar', 'url': SITE + '/yi/yiddish-calendar.html', 'he': SITE + '/app.html',
  'title': 'א לוח אויף אידיש צו דרוקן, מיט בילדער און זמנים',
  'h1': 'א פערזענליכער לוח אויף אידיש',
  'desc': 'מאכט א לוח צו דרוקן מיט טעג און חדשים אויף אידיש: זמנים לויט אייער שטאט, ליכט צינדן און מוצאי שבת, די משפחה׳ס יארצייטן און געבורטסטאגן, און בילדער.',
  'keys': 'לוח אויף אידיש, אידישער לוח, לוח צו דרוקן, זמנים לוח, ליכט צינדן, פערזענליכער לוח, משפחה לוח',
  'lead': 'א לוח פאר דער וואנט אדער פארן טיש, מיט אייערע בילדער און דאטומס, און מיט טעג און חדשים אויף אידיש.',
  'go': ('/app.html', 'מאכן א לוח'),
  'body': [('וואס איז אינעם לוח', '''<ul>
<li><b>טעג און חדשים אויף אידיש:</b> זונטאג, מאנטאג… שבת קודש, און יאנואר, פעברואר… נאוועמבער.</li>
<li><b>זמנים</b> לויט אייער שטאט און מנהג, <b>ליכט צינדן</b> און <b>מוצאי שבת</b> יעדע וואך.</li>
<li><b>יארצייטן, געבורטסטאגן און חתונה־טעג</b> פון דער משפחה, לויטן אידישן אדער ענגלישן דאטום. זיי קומען צוריק יעדעס יאר.</li>
<li><b>בילדער:</b> א בילד פאר יעדן חודש, א שער-בלאט, און בילדער אין געוויסע טעג.</li>
<li><b>פרשת השבוע, יום טובים און דף יומי.</b></li>
</ul>'''),
           ('ווי אזוי קלייבט מען אידיש', '''<ol>
<li>עפנט דעם לוח-בויער און קלייבט דאס יאר און די שטאט.</li>
<li>ביי "שפת הלוח המודפס" קלייבט <b>אידיש</b>.</li>
<li>לייגט צו בילדער און דאטומס, און נעמט אראפ א PDF צו דרוקן.</li>
</ol>''')],
  'faq': [('ווערט דאס וואס איך שרייב אויך געטוישט?', 'ניין. נאר די קבוע׳דיגע ווערטער ווערן אויף אידיש (טעג, חדשים, זמנים). וואס איר שרייבט אליין בלייבט ווי איר האט געשריבן.'),
          ('איז עס אומזיסט?', 'מאכן און זען דעם גאנצן לוח איז אומזיסט. א פשוטער לוח פארן גאנצן יאר קען מען אויך אראפנעמען אומזיסט.')]},
 {'slug': 'yi/countdown', 'url': SITE + '/yi/countdown.html', 'he': SITE + '/timer',
  'title': 'קאונטדאון ביז דער חתונה: וויפיל טעג זענען געבליבן',
  'h1': 'קאונטדאון ביז דער שמחה',
  'desc': 'א קאונטדאון ביז דער חתונה, בר מצוה אדער יעדע שמחה: טעג, שעות און מינוט, מיטן אידישן דאטום, צו טיילן אין וואטסאפ, אריינלייגן אין א וועבזייטל אדער אין אן אימעיל. אומזיסט.',
  'keys': 'קאונטדאון, קאונטדאון חתונה, וויפיל טעג ביז דער חתונה, קאונטדאון בר מצוה, טיימער',
  'lead': 'וויפיל טעג זענען נאך געבליבן? א זייגער וואס ציילט ביז דער שמחה, מיט א בילד און מיטן אידישן דאטום.',
  'go': ('/timer-yi', 'מאכן א קאונטדאון'),
  'body': [('וואס קען מען', '''<ul>
<li><b>טיילן</b> מיט א לינק אין וואטסאפ.</li>
<li><b>אריינלייגן</b> אין א וועבזייטל.</li>
<li><b>אין אן אימעיל:</b> א בילד וואס דערהיינטיגט זיך יעדעס מאל מען עפנט דעם אימעיל.</li>
<li><b>אויף אידיש:</b> טעג, שעות, מינוט און סעקונדעס, מיטן אידישן דאטום.</li>
</ul>''')],
  'faq': [('איז עס אומזיסט?', 'יא, אינגאנצן. נאר צו ארויפלייגן א בילד דארף מען א קאנטע, אויך אומזיסט.')]},
]

def page(p):
    alt = '\n<link rel="alternate" hreflang="yi" href="%s">\n<link rel="alternate" hreflang="he" href="%s">' % (p['url'], p['he'])
    ld = json.dumps([
        {"@context": "https://schema.org", "@type": "WebPage", "name": p['title'], "description": p['desc'], "url": p['url'], "inLanguage": "yi", "isPartOf": {"@type": "WebSite", "name": "MyLuach", "url": SITE + '/'}},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in p['faq']]}], ensure_ascii=False)
    h = HEAD.format(title=esc(p['title']), desc=esc(p['desc']), keys=esc(p['keys']), url=p['url'], alt=alt, site=SITE, ld=ld)
    h += '<div class="a-wrap a-wrap-1"><main id="main" class="a-main"><article class="art">'
    h += f'<h1>{esc(p["h1"])}</h1><p class="lead">{p["lead"]}</p>'
    if p.get('cards'):
        h += '<div class="yi-cards">' + ''.join(f'<a class="yi-card" href="{u}"><b>{esc(t)}</b>{esc(d)}</a>' for u, t, d in p['cards']) + '</div>'
    if p.get('go'):
        h += f'<div class="lp-hero"><a class="art-btn" href="{p["go"][0]}">{esc(p["go"][1])} ←</a></div>'
    for t, body in p['body']:
        h += f'\n<h2>{esc(t)}</h2>\n{body}'
    h += '\n<h2>אפטע פראגעס</h2>\n<div class="lp-faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in p['faq']) + '</div>'
    if p.get('go'):
        h += f'\n<div class="art-box"><h3>{esc(p["go"][1])}</h3><a class="art-btn" href="{p["go"][0]}">{esc(p["go"][1])} ←</a></div>'
    rel = [x for x in PAGES if x is not p]
    h += '\n<h2>נאך אויפן וועבזייטל</h2><ul>' + ''.join(f'<li><a href="{x["url"].replace(SITE, "")}">{esc(x["title"])}</a></li>' for x in rel) + '</ul>'
    h += '</article></main></div>\n'
    return h + FOOT

for p in PAGES:
    out = os.path.join(ROOT, p['slug'] + '.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(page(p))
sm = os.path.join(ROOT, 'sitemap.xml'); s = open(sm, encoding='utf-8').read()
add = ''.join(f'  <url><loc>{p["url"]}</loc></url>\n' for p in PAGES if f'<loc>{p["url"]}</loc>' not in s)
if add:
    s = s.replace('</urlset>', add + '</urlset>'); open(sm, 'w', encoding='utf-8').write(s)
print(len(PAGES), 'Yiddish pages;', add.count('<url>'), 'added to sitemap')
