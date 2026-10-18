"""יוצר את העמודים הסטטיים של הלוח המקוון (לגוגל): עמוד לכל עיר, לכל שנה, חגים, כלים, וגרסה באנגלית.
מריצים אחרי כל שינוי ב-online/index.html או ברשימת הערים:  python3 tools/gen_online.py
כתובת האתר לקובץ ה-sitemap:  SITE=https://example.com python3 tools/gen_online.py
"""
import json, os, re, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
ON = ROOT / 'online'
SITE = os.environ.get('SITE', 'https://www.myluach.org').rstrip('/')
TPL = (ON / 'index.html').read_text(encoding='utf-8')
CITIES = json.loads(re.search(r'window\.LC_CITIES=(\[.*\]);', (ON / 'cities.js').read_text(encoding='utf-8')).group(1))

def gem(n):
    H = [(400,'ת'),(300,'ש'),(200,'ר'),(100,'ק')]; T = ['','י','כ','ל','מ','נ','ס','ע','פ','צ']; O = ['','א','ב','ג','ד','ה','ו','ז','ח','ט']
    s = ''
    for v, l in H:
        while n >= v: s += l; n -= v
    s += 'טו' if n == 15 else 'טז' if n == 16 else T[n // 10] + O[n % 10]
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]

HEB_YEARS = range(5786, 5791)
GREG_YEARS = range(2026, 2029)
TOOLS = {
    'countdown': ('ספירה לאחור לחתונה, בר מצווה ולידה', 'כמה ימים נשארו לחתונה, לבר המצווה או ללידה: ספירה לאחור עם קישור לשיתוף, ולוח ספירה מעוצב להדפסה.',
                  'Countdown to a wedding, Bar Mitzvah or birth', 'How many days are left: a countdown with a share link and a printable countdown calendar.'),
    'convert': ('המרת תאריכים עברי לועזי', 'ממיר תאריכים: מתאריך לועזי לעברי ומעברי ללועזי, כולל לידה אחרי השקיעה.',
                'Hebrew date converter', 'Convert Gregorian dates to Hebrew dates and back, including after-sunset births.'),
    'barmitzvah': ('חישוב תאריך בר מצווה ובת מצווה', 'מחשבון בר מצווה ובת מצווה: התאריך העברי, יום השבת ופרשת השבוע של העלייה לתורה.',
                   'Bar Mitzvah & Bat Mitzvah date calculator', 'Find the Bar or Bat Mitzvah date, the Shabbat and the Torah portion.'),
    'yahrzeit': ('חישוב יום שנה (יארצייט)', 'מחשבון יום שנה (יארצייט): תאריכי האזכרה בשנים הקרובות לפי תאריך הפטירה.',
                 'Yahrzeit calculator', 'Upcoming yahrzeit dates from the date of passing.'),
    'days': ('חישוב ימים בין תאריכים', 'כמה ימים בין שני תאריכים, ומה התאריך בעוד מספר ימים, בעברי ובלועזי.',
             'Days between dates calculator', 'How many days between two dates, and the date N days from now.'),
}

def page(path, title, desc, page, lang='he', alt=None):
    """path: יחסית ל-online/. page: אובייקט LC_PAGE."""
    depth = path.count('/')
    base = '../' * depth
    s = TPL
    s = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', s, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + html.escape(desc) + '">', s)
    s = re.sub(r'(href|src)="(cal\.css|cities\.js|cal\.js)(\?v=\w+)?"', lambda m: m.group(1) + '="' + base + m.group(2) + (m.group(3) or '') + '"', s)
    page = dict(page, static=True, base=base)
    if alt: page['alt'] = '../' * depth + alt
    s = s.replace('<script>window.LC_PAGE=window.LC_PAGE||{};</script>', '<script>window.LC_PAGE=' + json.dumps(page, ensure_ascii=False) + ';</script>')
    if lang == 'en':
        s = s.replace('<html lang="he" dir="rtl">', '<html lang="en" dir="ltr">')
    alt_link = '<link rel="alternate" hreflang="' + ('he' if lang == 'en' else 'en') + '" href="' + SITE + '/online/' + (alt or '') + '">' if alt else ''
    s = s.replace('</head>', '<link rel="canonical" href="' + SITE + '/online/' + path + '">' + alt_link + '\n</head>')
    out = ON / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(s, encoding='utf-8')
    return path

made = []
# English home
made.append(page('en/index.html', 'Hebrew Calendar Online · Jewish holidays, zmanim, Shabbat times',
                 'Online Hebrew-Gregorian calendar: Jewish holidays, weekly Torah portion, zmanim and Shabbat times for any city, date converter, Bar Mitzvah and yahrzeit calculators, reminders.',
                 {'lang': 'en', 'root': './', 'view': 'month'}, 'en', alt='index.html'))
for c in CITIES:
    he, en = c['he'], c['en']
    made.append(page('zmanim/%s.html' % c['id'], 'זמני היום ב%s · זמני שבת וחגים · לוח שנה עברי' % he,
                     'זמני היום ב%s: עלות השחר, הנץ, סוף זמן קריאת שמע ותפילה, שקיעה וצאת הכוכבים, זמני כניסת ויציאת שבת, חגים ולוח שנה עברי.' % he,
                     {'view': 'zmanim', 'city': c['id'], 'root': '../'}, alt='en/zmanim/%s.html' % c['id']))
    made.append(page('en/zmanim/%s.html' % c['id'], 'Zmanim in %s · Shabbat times & Jewish calendar' % en,
                     'Daily zmanim for %s: dawn, sunrise, latest Shema, sunset, nightfall, Shabbat candle lighting and havdalah times, and Jewish holidays.' % en,
                     {'view': 'zmanim', 'city': c['id'], 'lang': 'en', 'root': '../'}, 'en', alt='zmanim/%s.html' % c['id']))
    made.append(page('shabbat/%s.html' % c['id'], 'זמני כניסת ויציאת שבת ב%s' % he,
                     'זמני הדלקת נרות ויציאת שבת ב%s לשבתות ולחגים הקרובים, עם פרשת השבוע.' % he,
                     {'view': 'shabbat', 'city': c['id'], 'root': '../'}, alt='en/shabbat/%s.html' % c['id']))
    made.append(page('en/shabbat/%s.html' % c['id'], 'Shabbat times in %s · candle lighting & havdalah' % en,
                     'Shabbat candle-lighting and havdalah times for %s for the coming weeks, with the weekly Torah portion.' % en,
                     {'view': 'shabbat', 'city': c['id'], 'lang': 'en', 'root': '../'}, 'en', alt='shabbat/%s.html' % c['id']))
for y in HEB_YEARS:
    hy = gem(y % 1000)
    made.append(page('luach/%d.html' % y, 'לוח שנה %s · לוח שנה עברי לועזי %d–%d' % (hy, y - 3761, y - 3760),
                     'לוח שנה %s מלא: כל החודשים העבריים והלועזיים, חגים ומועדים, ראשי חודשים ופרשות השבוע. ולהדפסה: לוח אישי מעוצב.' % hy,
                     {'view': 'year', 'year': y, 'root': '../'}, alt='en/luach/%d.html' % y))
    made.append(page('en/luach/%d.html' % y, 'Hebrew year %d calendar (%d–%d)' % (y, y - 3761, y - 3760),
                     'Full Hebrew calendar for %d: all months, Jewish holidays, Rosh Chodesh and Torah portions.' % y,
                     {'view': 'year', 'year': y, 'lang': 'en', 'root': '../'}, 'en', alt='luach/%d.html' % y))
    made.append(page('chagim/%d.html' % y, 'חגים ומועדים %s · מתי החגים בשנת %s' % (hy, hy),
                     'כל החגים, הצומות והמועדים בשנת %s: תאריך עברי, תאריך לועזי ויום בשבוע.' % hy,
                     {'view': 'holidays', 'year': y, 'root': '../'}, alt='en/chagim/%d.html' % y))
    made.append(page('en/chagim/%d.html' % y, 'Jewish holidays %d–%d (%d)' % (y - 3761, y - 3760, y),
                     'All Jewish holidays and fasts in the Hebrew year %d with Hebrew and Gregorian dates.' % y,
                     {'view': 'holidays', 'year': y, 'lang': 'en', 'root': '../'}, 'en', alt='chagim/%d.html' % y))
for y in GREG_YEARS:
    made.append(page('luach/%d.html' % y, 'לוח שנה %d עם תאריכים עבריים וחגים' % y,
                     'לוח שנה %d לועזי עם התאריכים העבריים, החגים ופרשות השבוע.' % y,
                     {'view': 'year', 'year': y, 'root': '../'}, alt='en/luach/%d.html' % y))
    made.append(page('en/luach/%d.html' % y, '%d calendar with Hebrew dates and Jewish holidays' % y,
                     '%d Gregorian calendar with Hebrew dates, Jewish holidays and Torah portions.' % y,
                     {'view': 'year', 'year': y, 'lang': 'en', 'root': '../'}, 'en', alt='luach/%d.html' % y))
for k, (th, dh, te, de) in TOOLS.items():
    made.append(page('tools/%s.html' % k, th, dh, {'view': 'tools', 'tool': k, 'root': '../'}, alt='en/tools/%s.html' % k))
    made.append(page('en/tools/%s.html' % k, te, de, {'view': 'tools', 'tool': k, 'lang': 'en', 'root': '../'}, 'en', alt='tools/%s.html' % k))

urls = ['', 'gallery.html', 'app.html', 'countdown.html', 'terms.html', 'privacy.html', 'online/'] + ['online/' + p for p in made]
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join('  <url><loc>%s/%s</loc></url>\n' % (SITE, u) for u in urls) + '</urlset>\n', encoding='utf-8')
(ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % SITE, encoding='utf-8')
import subprocess, sys
subprocess.run([sys.executable, str(ROOT / 'tools' / 'gen_countdown.py')], check=True)
print(len(made), 'pages')
# גרסאות לקבצים (נגד מטמון ישן)
import subprocess, sys
subprocess.run([sys.executable, str(ROOT / 'tools/bust_online.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'tools/gen_articles.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'tools/gen_landing.py')], check=True)
