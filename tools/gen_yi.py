#!/usr/bin/env python3
"""יוצר את invite-yi.html ו-timer-yi.html (אידיש) מתוך invite.html ו-timer.html.
מריצים אחרי gen_invite.py:  python3 tools/gen_yi.py
התרגומים ב-tools/i18n_yi.py. ביטויים רגולריים עם עברית בקוד מוגנים ולא מתורגמים (הם בודקים נתונים מהשרת).
טקסט שלא תורגם נשאר בעברית (קריא), והסקריפט מדפיס כמה כאלה נשארו."""
import json, re, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from i18n_yi import YI

PAGES = {
  'invite': dict(src='invite.html', out='invite-yi.html', url='https://www.myluach.org/invite-yi', he='https://www.myluach.org/invite',
                 name='דיגיטאלע הזמנה · MyLuach', desc='א דיגיטאלע הזמנה פאר א חתונה, בר מצוה און יעדע שמחה, מיט באשטעטיגונגען, דערמאנונגען, ברכות און תהילים.',
                 crumb='דיגיטאלע הזמנה'),
  'timer': dict(src='timer.html', out='timer-yi.html', url='https://www.myluach.org/timer-yi', he='https://www.myluach.org/timer',
                name='צייל־זייגער צו דער שמחה · MyLuach', desc='א צייל־זייגער צו יעדן דאטום, מיט א בילד, אידישן דאטום, א לינק צו טיילן, קאוד פאר א וועבזייטל און א טיימער פאר אימעיל.',
                crumb='צייל־זייגער'),
}
RX = re.compile(r'(?:(?<=[\(,=:!&|?\[])|(?<=return ))/(?![/*])(?:[^/\n\\\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])*[֐-׿](?:[^/\n\\\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])*/[gimsuy]*')

def build(key):
  P = PAGES[key]; s = open(os.path.join(ROOT, P['src']), encoding='utf-8').read()
  def rep(a, b):
    nonlocal s
    if a not in s: sys.exit(key + ': not found: ' + a[:70])
    s = s.replace(a, b, 1)
  rep('<html lang="he" dir="rtl"', '<html lang="yi" dir="rtl"')
  s = re.sub(r'<link rel="canonical" href="[^"]+">', '<link rel="canonical" href="%s">' % P['url'], s, count=1)
  s = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">\n', '', s)
  s = s.replace('<link rel="canonical" href="%s">' % P['url'], '<link rel="canonical" href="%s">\n<link rel="alternate" hreflang="he" href="%s">\n<link rel="alternate" hreflang="yi" href="%s">' % (P['url'], P['he'], P['url']), 1)
  s = re.sub(r'<meta property="og:url" content="[^"]+">', '<meta property="og:url" content="%s">' % P['url'], s, count=1)
  s = s.replace('<meta property="og:locale" content="he_IL">', '<meta property="og:locale" content="yi">')
  # קישור החלפת שפה: לעברית
  s = re.sub(r'<a class="lsw" href="(?:timer-en\.html|invite-en)" hreflang="en" lang="en">English</a>', '', s)
  s = re.sub(r'<a class="lsw" href="(timer-yi\.html|invite-yi)" hreflang="yi" lang="yi">אידיש</a>', '<a class="lsw" href="%s" hreflang="he" lang="he">עברית</a>' % P['he'].rsplit('/', 1)[1], s)
  # שפת דף האורחים: אידיש כברירת מחדל
  rep('<option value="yi">יידיש</option>', '<option value="yi" selected>אידיש</option>')
  # הגנה: ld+json וביטויים רגולריים
  keep = []
  def mask(m): keep.append(m.group(0)); return '\x00%d\x00' % (len(keep) - 1)
  s = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', s, flags=re.S)
  s = RX.sub(mask, s)
  for a, b in sorted(YI, key=lambda x: -len(x[0])):
    if a != b: s = s.replace(a, b)
  s = re.sub('\x00(\\d+)\x00', lambda m: keep[int(m.group(1))], s)
  # נתונים מובנים
  def strip(x): return html.unescape(re.sub('<[^>]+>', '', x))
  qa = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', s)
  app = {"@context": "https://schema.org", "@type": "WebApplication", "name": P['name'], "url": P['url'], "description": P['desc'], "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "inLanguage": "yi", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}}
  faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in qa]}
  crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "MyLuach", "item": "https://www.myluach.org/"}, {"@type": "ListItem", "position": 2, "name": P['crumb'], "item": P['url']}]}
  ld = ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>\n' for o in (app, faq, crumbs))
  i = s.index('</head>'); s = s[:i] + ld + s[i:]
  open(os.path.join(ROOT, P['out']), 'w', encoding='utf-8').write(s)
  # כמה טקסטים בעברית נשארו (מחוץ לקוד): רק לידיעה
  vis = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
  left = sorted(set(t.strip() for t in re.findall(r'>([^<>]*[א-ת][^<>]*)<', vis) if t.strip()))
  print(P['out'], 'written; Hebrew-looking visible text left:', len(left))
  if '-v' in sys.argv: print('\n'.join(left))

for k in PAGES: build(k)
