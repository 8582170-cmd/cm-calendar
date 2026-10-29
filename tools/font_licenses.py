# -*- coding: utf-8 -*-
"""סיווג רישיון לגופנים שבאוספים (assets/greetings/fonts): מותר לשימוש מסחרי בוודאות / אסור בוודאות / לבדיקה.
הסיווג נעשה לפי מה שכתוב בתוך קובץ הגופן (זכויות יוצרים, יצרן, רישיון). זה לא ייעוץ משפטי: "לבדיקה" = לא ברור מהקובץ.
יוצר assets/greetings/fonts/license.json"""
import json, os, re
from fontTools.ttLib import TTFont
D = os.path.join(os.path.dirname(__file__), '..', 'assets', 'greetings', 'fonts')
L = json.load(open(os.path.join(D, 'catalog.json')))
OK = [(r'open font licen|scripts\.sil\.org/ofl|\bofl\b|openfontlicense', 'רישיון OFL (חופשי, מותר מסחרי)'),
      (r'reserved font name|project authors', 'רישיון OFL (חופשי, מותר מסחרי)'),
      (r'apache licen', 'רישיון Apache (מותר מסחרי)'),
      (r'ubuntu font licen|font\.ubuntu\.com/licen', 'רישיון Ubuntu Font (מותר מסחרי)'),
      (r'\bgpl\b|gnu general public|general public licen|culmus', 'GPL / Culmus (חופשי, מותר מסחרי)')]
NO = [(r'non-?commercial|by-nc|not use this font for commercial|personal use only|for personal use|not for commercial', 'רישיון לא מסחרי'),
      (r'maste\W*r\W*font|masterfont|studio rosenb', 'מאסטרפונט: גופן בתשלום, צריך רישיון'),
      (r'fontbit|פונטביט', 'פונטביט: גופן בתשלום, צריך רישיון'),
      (r'guttman|גוטמן', 'גוטמן (מגיע עם Office): אסור לשימוש באתר'),
      (r'myfont\W*co\W*il', 'MyFont: גופן בתשלום'),
      (r'monotype|linotype', 'Monotype: גופן בתשלום'),
      (r'kivun', 'כיוון: גופן בתשלום'),
      (r'copyright-protected|unauthori[sz]ed', 'כתוב בקובץ שהוא מוגן ואסור בלי רישיון'),
      (r'wordperfect|novell', 'WordPerfect: גופן מסחרי'),
      (r'bitstream inc', 'Bitstream: גופן בתשלום'),
      (r'galtech|גלטק', 'קובץ בדיקה של יצרן')]
out = {}
for c in L:
    try:
        f = TTFont(os.path.join(D, c[1]), lazy=True)
        n = f['name']
        txt = ' '.join((n.getDebugName(i) or '') for i in (0, 7, 8, 9, 11, 13, 14))
    except Exception:
        txt = ''
    t = (txt + ' ' + (c[6] if len(c) > 6 else '')).lower()
    k, why = 'chk', 'לא כתוב בקובץ רישיון ברור'
    # קודם רישיון לא מסחרי, אחר כך רישיון חופשי שכתוב בקובץ, ורק אז יצרן מסחרי
    hit = (('ok', 'GPL / Culmus (חופשי, מותר מסחרי)') if re.search(r'gnu general public|\bgpl\b', t) else None) or \
        next(((('no', w)) for rx, w in NO[:1] if re.search(rx, t)), None) or \
        next((('ok', w) for rx, w in OK if re.search(rx, t)), None) or \
        next((('no', w) for rx, w in NO[1:] if re.search(rx, t)), None)
    if hit:
        k, why = hit
    out[c[0]] = [k, why]
json.dump(out, open(os.path.join(D, 'license.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(Counter(v[0] for v in out.values()))
