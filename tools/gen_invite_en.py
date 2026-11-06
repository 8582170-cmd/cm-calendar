#!/usr/bin/env python3
"""Creates invite-en.html (English invitation builder) from invite.html. Run after gen_invite.py:  python3 tools/gen_invite_en.py
Translations: the timer-en list (gen_timer_en.py) plus tools/i18n_en_invite.py. Hebrew regexes in code are protected."""
import ast, json, re, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from i18n_en_invite import EN
T = []
for n in ast.parse(open(os.path.join(ROOT, 'tools', 'gen_timer_en.py'), encoding='utf-8').read()).body:
    if isinstance(n, ast.Assign) and n.targets[0].id == 'T': T = ast.literal_eval(n.value)
RX = re.compile(r'(?:(?<=[\(,=:!&|?\[])|(?<=return ))/(?![/*])(?:[^/\n\\\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])*[֐-׿](?:[^/\n\\\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])*/[gimsuy]*')
URL, HE = 'https://www.myluach.org/invite-en', 'https://www.myluach.org/invite'
s = open(os.path.join(ROOT, 'invite.html'), encoding='utf-8').read()
def rep(a, b):
    global s
    if a not in s: sys.exit('not found: ' + a[:70])
    s = s.replace(a, b, 1)
rep('<html lang="he" dir="rtl"', '<html lang="en" dir="ltr"')
s = re.sub(r'<link rel="canonical" href="[^"]+">', '<link rel="canonical" href="%s">' % URL, s, count=1)
s = re.sub(r'<meta property="og:url" content="[^"]+">', '<meta property="og:url" content="%s">' % URL, s, count=1)
s = s.replace('<meta property="og:locale" content="he_IL">', '<meta property="og:locale" content="en_US">')
rep('<a class="logo" href="./">', '<a class="logo" href="en.html">')
s = re.sub(r'<a class="lsw" href="invite-en" hreflang="en" lang="en">English</a>', '<a class="lsw" href="invite" hreflang="he" lang="he">עברית</a>', s)
rep('<a href="timer">שעון ספירה פשוט</a><a href="countdown.html">לוח ספירה להדפסה</a>', '<a href="timer-en">Simple countdown clock</a><a href="countdown-en.html">Printable countdown</a>')
rep('<option value="en">English</option>', '<option value="en" selected>English</option>')
keep = []
def mask(m): keep.append(m.group(0)); return '\x00%d\x00' % (len(keep) - 1)
s = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', s, flags=re.S)
lang_sw = re.findall(r'<a class="lsw"[^>]*>[^<]*</a>', s); s = re.sub(r'<a class="lsw"[^>]*>[^<]*</a>', mask, s)
s = RX.sub(mask, s)
for a, b in sorted(T + EN, key=lambda x: -len(x[0])):
    if a != b: s = s.replace(a, b)
s = re.sub('\x00(\\d+)\x00', lambda m: keep[int(m.group(1))], s)
def strip(x): return html.unescape(re.sub('<[^>]+>', '', x))
qa = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', s)
app = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Digital Event Invitation · MyLuach", "url": URL, "description": "A digital invitation page for a wedding, bar mitzvah or any simcha, with RSVP, guest reminders, blessings and Tehillim division.", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "inLanguage": "en", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in qa]}
crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "MyLuach", "item": "https://www.myluach.org/en"}, {"@type": "ListItem", "position": 2, "name": "Digital event invitation", "item": URL}]}
ld = ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>\n' for o in (app, faq, crumbs))
i = s.index('</head>'); s = s[:i] + ld + s[i:]
open(os.path.join(ROOT, 'invite-en.html'), 'w', encoding='utf-8').write(s)
vis = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
left = sorted(set(t.strip() for t in re.findall(r'>([^<>]*[א-ת][^<>]*)<', vis) if t.strip()))
print('invite-en.html written; Hebrew visible text left:', len(left)); print('\n'.join(left[:80]))
