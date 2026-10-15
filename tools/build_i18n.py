# Builds assets/i18n-en-dict.js from tools/i18n_en.json + tools/i18n_en_extra.py
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from i18n_en_extra import EXACT, RE
ROOT = os.path.join(os.path.dirname(__file__), '..')
d = json.load(open(os.path.join(ROOT, 'tools', 'i18n_en.json')))
d.update(EXACT)
js = 'window.MYLUACH_EN=' + json.dumps({'exact': d, 're': [[a, b.replace('\\', '$').replace('$1', '$1')] for a, b in RE]}, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'assets', 'i18n-en-dict.js'), 'w').write(js)
print(len(d), 'phrases,', len(RE), 'patterns')
