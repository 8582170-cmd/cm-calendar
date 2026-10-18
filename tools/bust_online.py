"""מוסיף לכל עמודי הלוח המקוון גרסה לפי תוכן הקבצים (cal.js?v=…), כדי שדפדפנים ושרתי סינון (כמו נטפרי) לא יציגו קובץ ישן.
מריצים אחרי כל שינוי ב-online/cal.js, cal.css או cities.js:  python3 tools/bust_online.py"""
import hashlib, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
ON = ROOT / 'online'
V = {n: hashlib.md5((ON / n).read_bytes()).hexdigest()[:8] for n in ('cal.js', 'cal.css', 'cities.js')}
RX = re.compile(r'((?:href|src)="(?:\.\./)*)(cal\.js|cal\.css|cities\.js)(\?v=\w+)?"')
n = 0
for f in ON.rglob('*.html'):
    s = f.read_text(encoding='utf-8'); t = RX.sub(lambda m: m.group(1) + m.group(2) + '?v=' + V[m.group(2)] + '"', s)
    if t != s: f.write_text(t, encoding='utf-8'); n += 1
print('updated', n, 'pages', V)
