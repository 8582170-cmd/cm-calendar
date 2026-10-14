"""יוצר את countdown.html (בונה לוחות ספירה לאחור) מתוך app.html. מריצים אחרי כל שינוי ב-app.html:
   python3 tools/gen_countdown.py"""
import pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent.parent
s=(ROOT/'app.html').read_text(encoding='utf-8')
s=re.sub(r'<title>.*?</title>','<title>לוח ספירה לאחור להדפסה · חתונה, בר מצווה, לידה · MyLuach</title>',s,count=1,flags=re.S)
s=s.replace('<link rel="canonical" href="https://www.myluach.org/app.html">','<link rel="canonical" href="https://www.myluach.org/countdown.html">\n<meta name="description" content="בונים לוח ספירה לאחור מעוצב להדפסה: לחתונה, לבר מצווה, לבת מצווה, ללידה או לכל יום מיוחד. עיצובים לכלה ולילדים, תמונות ומשפטים. עד 40 יום: הורדה חינם.">',1)
s=s.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase','<script>window.MYLUACH_MODE=\'countdown\'</script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase',1)
s=re.sub(r'(<h1 class="brand">.*?</a>)<small>.*?</small>',r'\1<small>לוח ספירה לאחור להדפסה: לחתונה, לבר מצווה, ללידה ולכל יום מיוחד</small>',s,count=1,flags=re.S)
s=s.replace('<body>','<body class="cd-app">',1)
(ROOT/'countdown.html').write_text(s,encoding='utf-8')
print('countdown.html')

# הבונה הפשוט (simple.html): אותו בונה, 4 שלבים בלבד
t=(ROOT/'app.html').read_text(encoding='utf-8')
t=re.sub(r'<title>.*?</title>','<title>לוח שנה אישי עם תמונות, בקלות · בונה פשוט · MyLuach</title>',t,count=1,flags=re.S)
t=t.replace('<link rel="canonical" href="https://www.myluach.org/app.html">','<link rel="canonical" href="https://www.myluach.org/simple.html">\n<meta name="description" content="בונים לוח שנה אישי עם תמונות בארבעה צעדים פשוטים: סוג לוח, עיצוב, תמונת שער ותמונות לכל חודש, ימי הולדת ואירועים. מדפיסים בבית.">',1)
t=t.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase','<script>window.MYLUACH_MODE=\'simple\'</script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase',1)
t=t.replace('<body>','<body class="simple-app">',1)
(ROOT/'simple.html').write_text(t,encoding='utf-8')
print('simple.html')
