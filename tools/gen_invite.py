#!/usr/bin/env python3
"""יוצר את invite.html (בונה דף הזמנה לאירוע) מתוך timer.html. אותו קוד, עם דף ההזמנה פתוח וטקסטים אחרים.
מריצים אחרי כל שינוי ב-timer.html:  python3 tools/gen_invite.py"""
import json, re, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, 'timer.html'), encoding='utf-8').read()
def rep(a, b):
    global s
    if a not in s: sys.exit('not found: ' + a[:70])
    s = s.replace(a, b, 1)
rep('data-pg="timer"', 'data-pg="invite"')
s = re.sub(r'<title>.*?</title>', '<title>הזמנה דיגיטלית לאירוע עם אישורי הגעה · לחתונה ולבר מצווה, בחינם | MyLuach</title>', s, count=1)
s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="דף הזמנה דיגיטלי לחתונה, לבר מצווה ולכל שמחה: ההזמנה, שעון ספירה לאחור, מיקום עם וייז, הוספה ליומן, אישורי הגעה, תזכורות לאורחים, קיר ברכות וחלוקת תהילים. קישור אישי לכל מוזמן לוואטסאפ. בחינם.">', s, count=1)
s = s.replace('https://www.myluach.org/timer"', 'https://www.myluach.org/invite"')
s = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">\n', '', s)
s = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="הזמנה דיגיטלית לאירוע · MyLuach">', s, count=1)
s = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="הזמנה, שעון ספירה, וייז, אישורי הגעה, ברכות ותהילים. בחינם.">', s, count=1)
rep('<a href="countdown.html">לוח ספירה להדפסה</a><a class="lsw" href="timer-en.html" hreflang="en" lang="en">English</a>', '<a href="timer">שעון ספירה פשוט</a><a href="countdown.html">לוח ספירה להדפסה</a>')
rep('<h1>שעון ספירה לאחור לאירוע</h1>', '<h1>הזמנה דיגיטלית לאירוע</h1>')
s = re.sub(r'<p class="mute">שעון דיגיטלי שסופר לאחור[^<]*</p>', '<p class="mute">דף אחד לכל השמחה: ההזמנה, שעון שסופר לאחור, המקום עם וייז וגוגל מפות, הוספה ליומן, אישורי הגעה, תזכורות לאורחים, קיר ברכות, חלוקת תהילים וקישור למתנה. שולחים לכל מוזמן קישור אישי בוואטסאפ. בחינם.</p><p class="mute" style="font-size:15px"><b>איך מתחילים:</b> 1. ממלאים את שם האירוע, התאריך והעיצוב. 2. בוחרים כתובת לאירוע. 3. ממלאים את דף ההזמנה ושומרים.</p>', s, count=1)
rep('<label for="slug">כתובת לאירוע (לא חובה)</label>', '<label for="slug">כתובת לאירוע (חובה לדף ההזמנה)</label>')
rep('<summary>📨 דף הזמנה לאירוע: אישור הגעה, תזכורות וברכות</summary>', '<summary>📨 דף ההזמנה</summary>')
FAQ = [
 ('איך שולחים את ההזמנה?', 'אחרי השמירה כותבים את שמות המוזמנים, ולוחצים "יצירת קישורים אישיים". לכל מוזמן נוצר קישור עם השם שלו וכפתור וואטסאפ, וההודעה יוצאת מהטלפון שלכם.'),
 ('איך רואים מי אישר הגעה?', 'בחלק "אישורי הגעה וברכות" רואים סיכום של כמה מגיעים, מבוגרים וילדים, ואת הרשימה המלאה. אפשר גם להוריד אותה לאקסל. הניהול עובד מהדפדפן שבו נשמרה הכתובת.'),
 ('מי רואה את הברכות?', 'מי שכותב ברכה בוחר אם כולם יראו אותה בקיר הברכות, או רק בעלי השמחה. אתם יכולים להסתיר או למחוק כל ברכה, ולהדפיס את כולן כספר ברכות.'),
 ('איך עובדת חלוקת התהילים?', 'כל אורח בוחר פרקים מתוך 150 פרקי התהילים, כותב את שמו, ויכול להירשם לתזכורת במייל. פרק שנלקח מסומן, וכשכל הספר נלקח מתחיל סבב חדש.'),
 ('ואיך מקבלים מתנות?', 'מדביקים קישור תשלום משלכם, כמו ביט, PayBox או דף תשלום, ובדף ההזמנה יופיע כפתור "מתנה". הכסף עובר ישר אליכם.'),
 ('זה בחינם?', 'כן. רק להעלאת תמונה צריך חשבון באתר, גם הוא בחינם.'),
]
a = s.index('<h2>שאלות נפוצות</h2>'); b = s.index('</main>', a)
s = s[:a] + '<h2>שאלות נפוצות</h2>\n' + '\n'.join('<details><summary>%s</summary><p>%s</p></details>' % (q, x) for q, x in FAQ) + '\n' + s[b:]
app = {"@context": "https://schema.org", "@type": "WebApplication", "name": "הזמנה דיגיטלית לאירוע · MyLuach", "url": "https://www.myluach.org/invite", "description": "דף הזמנה לאירוע עם שעון ספירה, וייז, אישורי הגעה, תזכורות, ברכות וחלוקת תהילים.", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "inLanguage": "he", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}}
faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": x}} for q, x in FAQ]}
crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "MyLuach", "item": "https://www.myluach.org/"}, {"@type": "ListItem", "position": 2, "name": "הזמנה דיגיטלית לאירוע", "item": "https://www.myluach.org/invite"}]}
lds = re.findall(r'<script type="application/ld\+json">.*?</script>\n', s, flags=re.S)
s = s.replace(''.join(lds), ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>\n' for o in (app, faq, crumbs)))
open(os.path.join(ROOT, 'invite.html'), 'w', encoding='utf-8').write(s)
print('invite.html written')
