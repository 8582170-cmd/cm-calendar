"""יוצר את countdown.html (בונה לוחות ספירה לאחור) מתוך app.html. מריצים אחרי כל שינוי ב-app.html:
   python3 tools/gen_countdown.py"""
import pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent.parent
s=(ROOT/'app.html').read_text(encoding='utf-8')
s=re.sub(r'<title>.*?</title>','<title>לוח ספירה לאחור בעיצוב אישי להדפסה · לחתונה, לבר מצווה וללידה | MyLuach</title>',s,count=1,flags=re.S)
s=re.sub(r'<meta name="description" content="[^"]*">','',s,count=1)
s=s.replace('<link rel="canonical" href="https://www.myluach.org/app.html">','<link rel="canonical" href="https://www.myluach.org/countdown.html">\n<link rel="alternate" hreflang="he" href="https://www.myluach.org/countdown.html">\n<link rel="alternate" hreflang="en" href="https://www.myluach.org/countdown-en.html">\n<meta name="description" content="לוח ספירה לאחור אישי: מעצבים לבד, עם התמונות, השמות והמשפטים שלכם, לחתונה, לבר מצווה, לבת מצווה, ללידה או לטיול. 9 עיצובים, פרשת השבוע וזמני היום. עד 40 יום בחינם.">',1)
s=s.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase','<script>window.MYLUACH_MODE=\'countdown\'</script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase',1)
s=re.sub(r'(<h1 class="brand">.*?</a>)<small>.*?</small>',r'\1<small>לוח ספירה לאחור להדפסה: לחתונה, לבר מצווה, ללידה ולכל יום מיוחד</small>',s,count=1,flags=re.S)
s=s.replace('<body>','<body class="cd-app">',1)
(ROOT/'countdown.html').write_text(s,encoding='utf-8')
print('countdown.html')

# הבונה הפשוט (simple.html): אותו בונה, 4 שלבים בלבד
t=(ROOT/'app.html').read_text(encoding='utf-8')
t=re.sub(r'<title>.*?</title>','<title>לוח שנה אישי עם תמונות, בקלות · בונה פשוט · MyLuach</title>',t,count=1,flags=re.S)
t=re.sub(r'<meta name="description" content="[^"]*">','',t,count=1)
t=t.replace('<link rel="canonical" href="https://www.myluach.org/app.html">','<link rel="canonical" href="https://www.myluach.org/simple.html">\n<link rel="alternate" hreflang="he" href="https://www.myluach.org/simple.html">\n<link rel="alternate" hreflang="en" href="https://www.myluach.org/simple-en.html">\n<meta name="description" content="בונים לוח שנה אישי עם תמונות בארבעה צעדים פשוטים: סוג לוח, עיצוב, תמונת שער ותמונות לכל חודש, ימי הולדת ואירועים. מדפיסים בבית.">',1)
t=t.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase','<script>window.MYLUACH_MODE=\'simple\'</script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase',1)
t=t.replace('<body>','<body class="simple-app">',1)
(ROOT/'simple.html').write_text(t,encoding='utf-8')
print('simple.html')

# English pages: simple-en.html, countdown-en.html
def english(src_mode, out, title, desc, body_cls):
    t=(ROOT/'app.html').read_text(encoding='utf-8')
    t=t.replace('<html lang="he" dir="rtl">','<html lang="en" dir="ltr">',1)
    t=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',t,count=1,flags=re.S)
    t=re.sub(r'<meta name="description" content="[^"]*">','',t,count=1)
    he = 'simple.html' if src_mode=='simple' else 'countdown.html'
    t=t.replace('<link rel="canonical" href="https://www.myluach.org/app.html">','<link rel="canonical" href="https://www.myluach.org/'+out+'">\n<link rel="alternate" hreflang="en" href="https://www.myluach.org/'+out+'">\n<link rel="alternate" hreflang="he" href="https://www.myluach.org/'+he+'">\n<meta name="description" content="'+desc+'">',1)
    t=t.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase','<script>window.MYLUACH_MODE=\''+src_mode+'\'</script>\n<script src="/assets/i18n-en-dict.js?v=202610291815"></script>\n<script src="/assets/i18n-en.js?v=1"></script>\n<script src="/online/cities.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase',1)
    t=t.replace('<body>','<body class="'+body_cls+'">',1)
    t=t.replace('href="index.html"','href="en.html"')
    (ROOT/out).write_text(t,encoding='utf-8'); print(out)
english('simple','simple-en.html','Personal Jewish Calendar with Photos · Simple Builder · MyLuach','Make a personal Hebrew-English calendar with your family photos, birthdays and yahrzeits on the Hebrew date, holidays, Torah portions and zmanim. Print at home.','simple-app')
english('countdown','countdown-en.html','Printable Countdown Calendar · Wedding, Bar Mitzvah, Baby · MyLuach','A printable countdown calendar for a wedding, Bar or Bat Mitzvah, a new baby or a trip: 9 styles, opening and closing photos, quotes, Torah portion and zmanim. Up to 40 days free.','cd-app')
