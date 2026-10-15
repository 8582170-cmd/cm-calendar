# יוצר את איורי המאגר המובנה (SVG מקוריים, בלי דמויות): assets/library/*.svg ו-assets/library/index.js
import json, math, os, random
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'library')
W, H = 1600, 1000
def svg(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice"><defs>{defs}</defs>{body}</svg>'
def lg(id, stops, x1=0, y1=0, x2=0, y2=1):
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">' + ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops) + '</linearGradient>'
def rg(id, stops, cx=.5, cy=.5, r=.5):
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}">' + ''.join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a is not None else '') + '/>' for o, c, a in stops) + '</radialGradient>'
def ridge(y, amp, seed, step=80, fill='#000', jag=1.0):
    rnd = random.Random(seed); pts = []
    x = -50
    while x <= W + 80:
        pts.append((x, y - amp * (0.5 + 0.5 * math.sin(x / 260 + seed)) - rnd.uniform(0, amp * 0.35 * jag)))
        x += step
    d = f'M-60 {H} ' + ' '.join(f'L{px:.0f} {py:.0f}' for px, py in pts) + f' L{W+80} {H} Z'
    return f'<path d="{d}" fill="{fill}"/>'
def stars(n, seed, ymax=600):
    rnd = random.Random(seed)
    return ''.join(f'<circle cx="{rnd.uniform(0,W):.0f}" cy="{rnd.uniform(0,ymax):.0f}" r="{rnd.uniform(.8,2.6):.1f}" fill="#fff" opacity="{rnd.uniform(.4,1):.2f}"/>' for _ in range(n))
def flame(cx, cy, s=1):
    return (f'<g transform="translate({cx} {cy}) scale({s})"><ellipse cx="0" cy="-8" rx="34" ry="44" fill="url(#glow)"/>'
            f'<path d="M0 -46 C14 -28 16 -12 10 0 C6 8 -6 8 -10 0 C-16 -12 -12 -28 0 -46Z" fill="#ffb627"/>'
            f'<path d="M0 -30 C7 -20 8 -10 4 -2 C2 2 -2 2 -4 -2 C-8 -10 -6 -20 0 -30Z" fill="#fff3c4"/></g>')
GLOW = rg('glow', [(0, '#ffd36b', .55), (1, '#ffd36b', 0)])
items = []
def add(id, cat, title, s):
    open(os.path.join(OUT, id + '.svg'), 'w').write(s)
    items.append({'id': 'seed-' + id, 'url': 'assets/library/' + id + '.svg', 'cat': cat, 'title': title})

# ---------- טבע ----------
add('sunrise-mountains', 'nature', 'זריחה בהרים', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="1050" cy="560" r="120" fill="url(#sun)"/><circle cx="1050" cy="560" r="78" fill="#fff4cf"/>'
    + ridge(620, 160, 1, 90, '#c98b7a', .8) + ridge(720, 140, 2, 70, '#9a6a73') + ridge(820, 120, 3, 60, '#6b4c66') + ridge(920, 80, 4, 50, '#3f3150'),
    lg('sky', [(0, '#2d3a6b'), (.45, '#e48a6c'), (.75, '#f7c58a'), (1, '#fde4b1')]) + rg('sun', [(0, '#fff1c1', 1), (1, '#ffd27a', 0)])))
add('sea-sunset', 'nature', 'שקיעה בים', svg(
    '<rect width="1600" height="600" fill="url(#sky)"/><rect y="600" width="1600" height="400" fill="url(#sea)"/><circle cx="800" cy="590" r="110" fill="#ffd27a"/><rect y="600" width="1600" height="400" fill="url(#sea)" opacity=".75"/>'
    + ''.join(f'<rect x="{800-w/2}" y="{620+i*28}" width="{w}" height="6" rx="3" fill="#ffd27a" opacity="{.8-i*.07:.2f}"/>' for i, w in enumerate([260, 220, 300, 180, 240, 140, 200, 110, 150, 80, 120, 60, 70]))
    + '<path d="M0 600 Q400 585 800 600 T1600 600 V614 H0Z" fill="#7a4d64" opacity=".5"/>',
    lg('sky', [(0, '#3b2f63'), (.5, '#c4607a'), (1, '#ffb27a')]) + lg('sea', [(0, '#5a4772'), (1, '#1f2547')])))
add('forest-mist', 'nature', 'יער בערפל', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/>'
    + ''.join(
        ''.join(f'<path d="M{x} {by} l{-w} 0 l{w} {-h} l{w} {h}Z" fill="{c}"/>' for x, w, h in [(random.Random(k*99+j).uniform(-40,1640), random.Random(k*7+j).uniform(28,60)*sc, random.Random(k*3+j).uniform(160,320)*sc) for j in range(26)])
        + f'<rect y="{by-30}" width="1600" height="{1000-by+30}" fill="{c}"/><rect y="{by-140}" width="1600" height="160" fill="url(#mist)"/>'
        for k, (by, c, sc) in enumerate([(560, '#9fb6ae', .7), (700, '#6d8f84', .9), (850, '#3f6457', 1.1), (1000, '#1f3b33', 1.3)])),
    lg('sky', [(0, '#dfe9e4'), (1, '#b9cdc5')]) + lg('mist', [(0, '#e8f0ec', 0), (1, '#e8f0ec', .55)].__class__([(0, '#e8f0ec'), (1, '#e8f0ec')])).replace('<stop offset="0" stop-color="#e8f0ec"/>', '<stop offset="0" stop-color="#e8f0ec" stop-opacity="0"/>').replace('<stop offset="1" stop-color="#e8f0ec"/>', '<stop offset="1" stop-color="#e8f0ec" stop-opacity=".6"/>')))
def flowers(seed, n, y0, y1):
    rnd = random.Random(seed); out = ''
    cols = ['#f25f5c', '#ffe066', '#ffffff', '#f7a1c4', '#c77dff', '#ff9f1c']
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(y0, y1); r = 3 + (y - y0) / (y1 - y0) * 12; c = rnd.choice(cols)
        out += f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x:.0f}" y2="{y+r*3:.0f}" stroke="#3d7a3a" stroke-width="{max(1,r/4):.1f}"/>'
        out += ''.join(f'<circle cx="{x+math.cos(a)*r:.1f}" cy="{y+math.sin(a)*r:.1f}" r="{r*.62:.1f}" fill="{c}"/>' for a in [i*math.pi*2/5 for i in range(5)])
        out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r*.45:.1f}" fill="#f4a300"/>'
    return out
add('flower-field', 'nature', 'שדה פריחה', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="1320" cy="190" r="70" fill="#fff6c9"/>'
    + '<ellipse cx="300" cy="640" rx="700" ry="160" fill="#8cc084"/><ellipse cx="1250" cy="660" rx="800" ry="190" fill="#74b06c"/><rect y="640" width="1600" height="360" fill="url(#gr)"/>'
    + flowers(5, 420, 650, 990),
    lg('sky', [(0, '#7ec8f0'), (1, '#dff3ff')]) + lg('gr', [(0, '#6aa85f'), (1, '#3f7a35')])))
add('desert-dunes', 'nature', 'דיונות במדבר', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="420" cy="260" r="90" fill="#fff0c7"/>'
    + '<path d="M-50 620 Q300 480 700 610 T1650 560 V1000 H-50Z" fill="#e7b278"/><path d="M-50 720 Q400 590 900 720 T1650 680 V1000 H-50Z" fill="#d4945a"/><path d="M-50 840 Q500 720 1000 850 T1650 820 V1000 H-50Z" fill="#b8733f"/>'
    + '<path d="M700 610 Q760 640 900 720" stroke="#f3cf9c" stroke-width="6" fill="none" opacity=".6"/>',
    lg('sky', [(0, '#f6a85b'), (.6, '#fbd38d'), (1, '#fde9c4')])))
add('starry-night', 'nature', 'לילה מכוכב', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/>' + stars(260, 7, 760)
    + '<path d="M1230 170 a90 90 0 1 0 70 150 a72 72 0 1 1 -70 -150Z" fill="#fff4cf"/>'
    + ridge(820, 120, 8, 70, '#1f2a48') + ridge(920, 70, 9, 50, '#121a30'),
    lg('sky', [(0, '#0b1230'), (.7, '#24346a'), (1, '#3c4f8a')])))
add('kinneret', 'nature', 'הכנרת והגליל', svg(
    '<rect width="1600" height="560" fill="url(#sky)"/>' + ridge(560, 140, 11, 90, '#8aa7a0', .6).replace(f'M-60 {H}', 'M-60 600').replace(f'L{W+80} {H}', f'L{W+80} 600')
    + '<rect y="540" width="1600" height="300" fill="url(#lake)"/>' + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="4" rx="2" fill="#fff" opacity=".35"/>' for x, y, w in [(200, 600, 180), (700, 640, 260), (1150, 610, 150), (400, 700, 220), (1000, 740, 300)])
    + '<path d="M-50 820 Q400 760 800 820 T1650 800 V1000 H-50Z" fill="#6e9c5a"/><path d="M-50 900 Q500 850 1000 910 T1650 890 V1000 H-50Z" fill="#4f7d43"/>'
    + ''.join(f'<g transform="translate({x} {y})"><rect x="-5" y="-60" width="10" height="70" fill="#5b4532"/>' + ''.join(f'<path d="M0 -60 q{math.cos(a)*70:.0f} {math.sin(a)*40-10:.0f} {math.cos(a)*110:.0f} {math.sin(a)*60+20:.0f}" stroke="#3f6b35" stroke-width="12" fill="none" stroke-linecap="round"/>' for a in [math.pi*i/6 for i in range(-5, 0)]) + '</g>' for x, y in [(180, 880), (1420, 870), (1300, 905)]),
    lg('sky', [(0, '#9fd3f2'), (1, '#eaf7ff')]) + lg('lake', [(0, '#4b9cc0'), (1, '#2e6f95')])))

# ---------- מקומות קדושים ----------
def wall_stones(x0, y0, x1, y1, rows, seed, base='#d8c6a1'):
    rnd = random.Random(seed); out = ''; rh = (y1 - y0) / rows
    for r in range(rows):
        y = y0 + r * rh; x = x0 - rnd.uniform(0, 120); sc = 1 + (rows - r) * 0.04
        while x < x1:
            w = rnd.uniform(140, 300) * sc; shade = rnd.uniform(-18, 14)
            if x < x0: w -= (x0 - x); x = x0
            w = min(w, x1 - x)
            if w < 30: x += w; continue
            c = '#%02x%02x%02x' % tuple(max(0, min(255, int(base[i:i+2], 16) + int(shade))) for i in (1, 3, 5))
            out += f'<rect x="{x+4:.0f}" y="{y+4:.0f}" width="{w-8:.0f}" height="{rh-8:.0f}" rx="6" fill="{c}"/><rect x="{x+10:.0f}" y="{y+10:.0f}" width="{w-20:.0f}" height="{rh-20:.0f}" rx="5" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>'
            x += w
    return out
def plants(seed, n, y0, y1):
    rnd = random.Random(seed); out = ''
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(y0, y1)
        out += ''.join(f'<ellipse cx="{x+rnd.uniform(-26,26):.0f}" cy="{y+rnd.uniform(-14,10):.0f}" rx="{rnd.uniform(12,20):.0f}" ry="{rnd.uniform(6,9):.0f}" fill="{rnd.choice(["#6f8f45","#5c7d3a","#86a35a"])}" transform="rotate({rnd.uniform(-40,40):.0f} {x:.0f} {y:.0f})"/>' for _ in range(9))
    return out
add('kotel', 'holy', 'הכותל המערבי', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><rect y="80" width="1600" height="920" fill="#b9a47c"/>' + wall_stones(0, 90, 1600, 1000, 9, 21) + plants(22, 14, 200, 700)
    + '<rect y="80" width="1600" height="920" fill="url(#light)"/>',
    lg('sky', [(0, '#8fc6ea'), (1, '#d7eefa')]) + lg('light', [(0, '#fff3d6'), (1, '#3a2c18')], 0, 0, 1, 1).replace('stop-color="#fff3d6"/>', 'stop-color="#fff3d6" stop-opacity=".25"/>').replace('stop-color="#3a2c18"/>', 'stop-color="#3a2c18" stop-opacity=".3"/>')))
def crenels(x0, x1, y, h=40, w=46, gap=34, c='#c9a46c'):
    out = ''; x = x0
    while x < x1:
        out += f'<rect x="{x}" y="{y-h}" width="{w}" height="{h+2}" fill="{c}"/>'; x += w + gap
    return out
add('jerusalem-walls', 'holy', 'חומות ירושלים', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="1250" cy="230" r="80" fill="#fff0c4" opacity=".9"/>'
    + '<rect x="0" y="470" width="1600" height="380" fill="#c9a46c"/>' + crenels(0, 1600, 470) + wall_stones(0, 470, 1600, 850, 6, 31, '#cfa871')
    + '<rect x="560" y="300" width="480" height="550" fill="#c09864"/>' + crenels(560, 1040, 300, 46, 52, 30, '#c09864') + wall_stones(560, 300, 1040, 850, 9, 32, '#c49c66')
    + '<path d="M720 850 V600 a80 80 0 0 1 160 0 V850Z" fill="#3b2a1a"/><path d="M736 850 V604 a64 64 0 0 1 128 0 V850Z" fill="#5a4129"/>'
    + '<rect x="600" y="380" width="26" height="70" rx="13" fill="#3b2a1a"/><rect x="974" y="380" width="26" height="70" rx="13" fill="#3b2a1a"/>'
    + '<path d="M0 850 H1600 V1000 H0Z" fill="#8a7a55"/>' + ''.join(f'<g transform="translate({x} 860)"><rect x="-6" y="-120" width="12" height="130" fill="#5b4532"/><ellipse cx="0" cy="-150" rx="60" ry="70" fill="#4f7340"/><ellipse cx="-25" cy="-120" rx="40" ry="45" fill="#5f8a4c"/></g>' for x in [110, 300, 1300, 1500]),
    lg('sky', [(0, '#f3a66b'), (.6, '#fbd8a6'), (1, '#fdeccf')])))
add('kever-rachel', 'holy', 'קבר רחל אמנו (איור)', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><path d="M0 800 Q800 760 1600 800 V1000 H0Z" fill="#c7b08a"/>'
    + '<rect x="560" y="470" width="480" height="340" fill="#efe5d2"/><rect x="560" y="470" width="480" height="24" fill="#d9ccb2"/>'
    + '<path d="M620 470 a180 170 0 0 1 360 0Z" fill="#f4ecdc"/><path d="M620 470 a180 170 0 0 1 360 0" fill="none" stroke="#d9ccb2" stroke-width="10"/>'
    + '<rect x="380" y="560" width="200" height="250" fill="#e7dcc6"/><rect x="1020" y="560" width="200" height="250" fill="#e7dcc6"/>'
    + '<path d="M760 810 V650 a40 40 0 0 1 80 0 V810Z" fill="#6b5844"/>' + ''.join(f'<path d="M{x} 640 V600 a22 22 0 0 1 44 0 V640Z" fill="#8a775f"/>' for x in [620, 936, 430, 1110])
    + ''.join(f'<g transform="translate({x} 810)"><rect x="-8" y="-200" width="16" height="210" fill="#5b4532"/><path d="M0 -330 C40 -260 50 -220 30 -190 L-30 -190 C-50 -220 -40 -260 0 -330Z" fill="#3f6b3a"/></g>' for x in [260, 1340]),
    lg('sky', [(0, '#a9d4ef'), (1, '#f1f8fc')])))
add('machpela', 'holy', 'מערת המכפלה (איור)', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><path d="M0 820 Q800 780 1600 830 V1000 H0Z" fill="#b59c72"/>'
    + '<rect x="250" y="360" width="1100" height="470" fill="#d6c19a"/>' + wall_stones(250, 520, 1350, 830, 5, 41, '#d2bb92')
    + ''.join(f'<rect x="{x}" y="380" width="34" height="150" fill="#c4ac82"/>' for x in range(280, 1340, 70)) + '<rect x="250" y="360" width="1100" height="24" fill="#c4ac82"/>'
    + crenels(250, 1350, 360, 34, 40, 30, '#cdb68d') + '<path d="M740 830 V700 h120 V830Z" fill="#5f4c35"/>',
    lg('sky', [(0, '#8cc3e6'), (1, '#e7f4fb')])))

# ---------- בית המקדש ----------
add('beit-hamikdash', 'mikdash', 'בית המקדש (איור)', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="800" cy="300" r="380" fill="url(#halo)"/>'
    + '<rect x="120" y="700" width="1360" height="300" fill="#c9b48a"/><rect x="120" y="690" width="1360" height="20" fill="#e3d3ae"/>' + ''.join(f'<rect x="{x}" y="720" width="22" height="200" fill="#b6a077"/>' for x in range(150, 1460, 60))
    + '<rect x="420" y="560" width="760" height="140" fill="#efe6cf"/><rect x="420" y="550" width="760" height="16" fill="#d8c8a2"/>'
    + '<rect x="560" y="200" width="480" height="360" fill="#f7f0de"/><rect x="560" y="190" width="480" height="18" fill="#d8c8a2"/>'
    + '<rect x="470" y="300" width="90" height="260" fill="#efe6cf"/><rect x="1040" y="300" width="90" height="260" fill="#efe6cf"/>'
    + '<path d="M740 560 V330 h120 V560Z" fill="#c99a2e"/><path d="M752 560 V342 h96 V560Z" fill="#e7bd52"/><rect x="752" y="440" width="96" height="6" fill="#c99a2e"/>'
    + ''.join(f'<rect x="{x}" y="230" width="14" height="70" fill="#e1d4b4"/>' for x in range(590, 1030, 40)) + crenels(560, 1040, 190, 22, 18, 22, '#e7dcc0')
    + '<path d="M800 660 l-40 40 h80Z" fill="#b9a47a"/><rect x="740" y="640" width="120" height="20" fill="#a68f62"/>',
    lg('sky', [(0, '#f6c77a'), (.5, '#fde6b8'), (1, '#fff7e6')]) + rg('halo', [(0, '#fff7da', .9), (1, '#fff7da', 0)])))
def menorah(cx, base, s=1, col='url(#gold)'):
    out = f'<g transform="translate({cx} {base}) scale({s})">'
    for i, r in enumerate([0, 110, 220, 330]):
        if r == 0:
            out += f'<rect x="-10" y="-520" width="20" height="440" fill="{col}"/>'
        else:
            out += f'<path d="M{-r} -520 V-420 A{r} {r*0.95:.0f} 0 0 0 {r} -420 V-520" fill="none" stroke="{col}" stroke-width="18"/>'
        for x in ([0] if r == 0 else [-r, r]):
            out += f'<rect x="{x-24}" y="-540" width="48" height="22" rx="8" fill="{col}"/>' + flame(x, -545, .9).replace('translate(', 'translate(')
    out += f'<path d="M-130 -60 L0 -100 L130 -60 L150 0 H-150Z" fill="{col}"/><rect x="-170" y="0" width="340" height="26" rx="8" fill="{col}"/></g>'
    return out
add('menorah', 'mikdash', 'מנורת המקדש', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/><circle cx="800" cy="420" r="460" fill="url(#halo)"/>' + menorah(800, 900, 1.15),
    lg('bg', [(0, '#1d2340'), (1, '#3b3150')]) + rg('halo', [(0, '#ffcf6b', .35), (1, '#ffcf6b', 0)]) + lg('gold', [(0, '#ffe08a'), (.5, '#d9a43a'), (1, '#9c6b1c')], 0, 0, 1, 1) + GLOW))

# ---------- חגים ----------
def apple(x, y, r, c='#d62828'):
    return f'<g transform="translate({x} {y})"><circle cx="-{r*.35:.0f}" cy="0" r="{r}" fill="{c}"/><circle cx="{r*.35:.0f}" cy="0" r="{r}" fill="{c}"/><ellipse cx="-{r*.4:.0f}" cy="-{r*.35:.0f}" rx="{r*.25:.0f}" ry="{r*.4:.0f}" fill="#fff" opacity=".25"/><path d="M0 -{r*.8:.0f} q4 -{r*.4:.0f} -6 -{r*.6:.0f}" stroke="#5b3a1e" stroke-width="8" fill="none"/><path d="M2 -{r*1.1:.0f} q{r*.6:.0f} -{r*.4:.0f} {r*.8:.0f} 0 q-{r*.5:.0f} {r*.25:.0f} -{r*.8:.0f} 0Z" fill="#4c8a3a"/></g>'
add('rosh-hashana', 'chagim', 'ראש השנה: שופר, תפוח ודבש', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/><rect y="740" width="1600" height="260" fill="#8a5a3c"/><rect y="740" width="1600" height="16" fill="#a8734f"/>'
    + '<path d="M220 560 C420 690 760 700 980 600 C1080 555 1150 470 1180 400 L1240 420 C1220 520 1130 640 990 700 C760 800 420 780 200 620Z" fill="url(#horn)"/><path d="M1180 400 L1240 420 L1262 380 L1196 362Z" fill="#7a4e2a"/>'
    + '<g transform="translate(1180 690)"><path d="M-90 -120 h180 l-20 170 a70 30 0 0 1 -140 0Z" fill="#f4a51c" opacity=".9"/><path d="M-95 -130 h190 v24 h-190Z" fill="#c97f10"/><rect x="-6" y="-210" width="12" height="110" fill="#a06a2a"/></g>'
    + apple(430, 670, 70) + apple(600, 690, 62, '#e85d2a') + '<g transform="translate(790 670)"><circle r="70" fill="#a4161a"/><path d="M-20 -66 l20 -26 l20 26Z" fill="#a4161a"/><circle cx="-24" cy="-14" r="10" fill="#e5383b"/><circle cx="12" cy="10" r="10" fill="#e5383b"/></g>',
    lg('bg', [(0, '#fdf3e1'), (1, '#f6dcb6')]) + lg('horn', [(0, '#f2d7a9'), (.6, '#c9965c'), (1, '#8a5a2b')], 0, 0, 1, 0)))
add('sukkot', 'chagim', 'סוכות', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><path d="M0 860 H1600 V1000 H0Z" fill="#9c7a52"/>'
    + '<rect x="330" y="360" width="940" height="500" fill="#f4ead2"/><rect x="330" y="360" width="20" height="500" fill="#8a6b45"/><rect x="1250" y="360" width="20" height="500" fill="#8a6b45"/><rect x="790" y="360" width="20" height="500" fill="#8a6b45"/>'
    + ''.join(f'<path d="M{x} {350+(i%3)*8} q60 -60 140 -20" stroke="#4f7d3a" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M{x+30} {356} q50 -40 120 10" stroke="#6f9e4f" stroke-width="16" fill="none" stroke-linecap="round"/>' for i, x in enumerate(range(300, 1300, 70)))
    + ''.join(f'<line x1="{x}" y1="380" x2="{x}" y2="{430+(i%2)*40}" stroke="#a0773f" stroke-width="3"/><circle cx="{x}" cy="{440+(i%2)*40}" r="18" fill="{c}"/>' for i, (x, c) in enumerate(zip(range(420, 1240, 120), ['#e63946', '#ffb703', '#2a9d8f', '#e76f51', '#8338ec', '#ffbe0b', '#d62828'])))
    + '<g transform="translate(560 860)"><rect x="-8" y="-380" width="16" height="380" fill="#5c8a3a"/><path d="M0 -380 l-14 -40 l14 10 l14 -10Z" fill="#5c8a3a"/>' + ''.join(f'<path d="M{s*10} {-260+k*30} q{s*60} 10 {s*70} 60" stroke="#3f6b2a" stroke-width="8" fill="none"/>' for k in range(4) for s in (-1, 1)) + '</g>'
    + '<ellipse cx="1010" cy="810" rx="80" ry="56" fill="#f4d03f"/><ellipse cx="985" cy="795" rx="22" ry="14" fill="#fff" opacity=".35"/><circle cx="1088" cy="800" r="8" fill="#7d6608"/>',
    lg('sky', [(0, '#87c5ea'), (1, '#e3f3fb')])))
def chanukiah(cx, base):
    out = f'<g transform="translate({cx} {base})"><rect x="-230" y="-10" width="460" height="30" rx="10" fill="url(#gold)"/><path d="M-60 -10 L0 -140 L60 -10Z" fill="url(#gold)"/><rect x="-12" y="-420" width="24" height="290" fill="url(#gold)"/>'
    out += '<rect x="-470" y="-280" width="940" height="22" rx="10" fill="url(#gold)"/>'
    for i in range(9):
        x = -440 + i * 110; sh = i == 4
        y = -360 if sh else -300
        if not sh: out += f'<rect x="{x-8}" y="{y}" width="16" height="24" fill="url(#gold)"/>'
        out += f'<rect x="{x-26}" y="{y-16}" width="52" height="20" rx="6" fill="url(#gold)"/><rect x="{x-8}" y="{y-80}" width="16" height="66" rx="4" fill="#f8f1e3"/>' + flame(x, y - 82, .8)
    return out + '</g>'
add('chanukah', 'chagim', 'חנוכה', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/>' + stars(90, 13, 500) + '<circle cx="800" cy="520" r="520" fill="url(#halo)"/>' + chanukiah(800, 880),
    lg('bg', [(0, '#0f1a3d'), (1, '#24366e')]) + rg('halo', [(0, '#ffcf6b', .28), (1, '#ffcf6b', 0)]) + lg('gold', [(0, '#ffe08a'), (.5, '#d9a43a'), (1, '#9c6b1c')], 0, 0, 1, 1) + GLOW))
def matza(x, y, w, h, rot):
    holes = ''.join(f'<circle cx="{x+20+i*((w-40)/7):.0f}" cy="{y+20+j*((h-40)/4):.0f}" r="3" fill="#a87b3e"/>' for i in range(8) for j in range(5))
    return f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#ecc98c"/><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="#c99a5a" stroke-width="5"/>{holes}</g>'
add('pesach', 'chagim', 'פסח: מצות וכוס יין', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/><rect y="760" width="1600" height="240" fill="#f3efe6"/><rect y="760" width="1600" height="10" fill="#d9cfb8"/>'
    + matza(260, 560, 520, 300, -6) + matza(300, 520, 520, 300, 4) + matza(330, 490, 520, 300, -2)
    + '<g transform="translate(1100 820)"><path d="M-110 -360 h220 c0 150 -50 210 -110 230 c-60 -20 -110 -80 -110 -230Z" fill="#c0c8d2"/><path d="M-98 -330 h196 c-4 120 -46 175 -98 194 c-52 -19 -94 -74 -98 -194Z" fill="#8b1e3f"/><rect x="-12" y="-130" width="24" height="110" fill="#aab3be"/><ellipse cx="0" cy="-10" rx="90" ry="18" fill="#aab3be"/><path d="M-80 -320 q20 100 30 150" stroke="#fff" stroke-opacity=".35" stroke-width="10" fill="none"/></g>',
    lg('bg', [(0, '#e8f1f8'), (1, '#cfe0ef')])))
add('shavuot', 'chagim', 'שבועות: לוחות, חיטה ופרחים', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/>'
    + '<g transform="translate(800 520)"><path d="M-300 340 V-180 a150 150 0 0 1 300 0 V340Z" fill="#d8d2c4"/><path d="M0 340 V-180 a150 150 0 0 1 300 0 V340Z" fill="#cfc8b8"/><path d="M-300 340 V-180 a150 150 0 0 1 300 0 V340Z M0 340 V-180 a150 150 0 0 1 300 0 V340Z" fill="none" stroke="#9c937e" stroke-width="8"/>'
    + ''.join(f'<rect x="{x}" y="{-120+k*82}" width="{w}" height="14" rx="7" fill="#a69d87"/>' for k in range(5) for x, w in [(-250, 200), (50, 200)]) + '</g>'
    + ''.join(f'<g transform="translate({x} 960) rotate({r})"><path d="M0 0 V-330" stroke="#c9a03a" stroke-width="8"/>' + ''.join(f'<ellipse cx="{s*16}" cy="{-330+k*32}" rx="12" ry="22" fill="#e2b84c" transform="rotate({s*25} {s*16} {-330+k*32})"/>' for k in range(6) for s in (-1, 1)) + '</g>' for x, r in [(200, -12), (250, 4), (300, 14), (1300, -14), (1350, -2), (1400, 12)])
    + flowers(17, 60, 860, 990),
    lg('bg', [(0, '#e9f6ee'), (1, '#c9e6d3')])))
add('purim', 'chagim', 'פורים: מגילה ומשלוח מנות', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/>' + ''.join(f'<circle cx="{random.Random(i).uniform(0,1600):.0f}" cy="{random.Random(i+500).uniform(0,1000):.0f}" r="{random.Random(i+900).uniform(5,14):.0f}" fill="{["#ff5d8f","#ffd166","#06d6a0","#118ab2","#8338ec"][i%5]}" opacity=".8"/>' for i in range(120))
    + '<g transform="translate(560 540)"><rect x="-300" y="-180" width="600" height="360" fill="#fbf3dc"/>' + ''.join(f'<rect x="{-250+c*170}" y="{-140+k*34}" width="140" height="10" rx="5" fill="#b8a679"/>' for c in range(3) for k in range(8)) + '<rect x="300" y="-230" width="70" height="460" rx="30" fill="#8a5a3c"/><rect x="315" y="-270" width="40" height="540" rx="18" fill="#c9965c"/></g>'
    + '<g transform="translate(1180 700)"><path d="M-180 0 h360 l-40 160 h-280Z" fill="#c97b4a"/><rect x="-190" y="-20" width="380" height="30" rx="12" fill="#a65a2e"/><circle cx="-80" cy="-50" r="50" fill="#e63946"/><circle cx="20" cy="-60" r="56" fill="#f4a261"/><path d="M80 -30 l50 -90 l50 90Z" fill="#e9c46a"/><rect x="-150" y="-90" width="60" height="70" rx="8" fill="#6a4c93"/></g>',
    lg('bg', [(0, '#fff3f7'), (1, '#ffe1ec')])))
add('tu-bishvat', 'chagim', 'ט״ו בשבט: עץ ופירות', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/><path d="M0 820 Q800 760 1600 820 V1000 H0Z" fill="#7fb069"/>'
    + '<path d="M780 830 C770 700 760 620 720 520 L760 510 C790 590 800 560 820 470 L860 480 C840 600 830 700 840 830Z" fill="#6b4a2f"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>' for x, y, r, c in [(800, 360, 230, '#5a9e4b'), (620, 440, 160, '#4f8f41'), (980, 440, 170, '#4f8f41'), (700, 280, 140, '#6bb35a'), (920, 290, 140, '#6bb35a')])
    + ''.join(f'<circle cx="{random.Random(i).uniform(560,1040):.0f}" cy="{random.Random(i+50).uniform(220,560):.0f}" r="18" fill="{["#ff8c42","#f9c74f","#e63946","#9d4edd"][i%4]}"/>' for i in range(26))
    + '<g transform="translate(1260 900)"><ellipse rx="170" ry="34" fill="#a26a3f"/><circle cx="-80" cy="-30" r="34" fill="#9d4edd"/><circle cx="-20" cy="-40" r="34" fill="#f9c74f"/><circle cx="50" cy="-34" r="36" fill="#e63946"/><ellipse cx="110" cy="-30" rx="40" ry="26" fill="#8b5e34"/></g>',
    lg('sky', [(0, '#bde0fe'), (1, '#f1faff')])))
add('lag-baomer', 'chagim', 'ל״ג בעומר: מדורה', svg(
    '<rect width="1600" height="1000" fill="url(#sky)"/>' + stars(140, 33, 560) + ridge(760, 120, 34, 70, '#2a2438')
    + '<circle cx="800" cy="720" r="360" fill="url(#halo)"/>'
    + '<g transform="translate(800 860)">' + ''.join(f'<rect x="-200" y="-14" width="400" height="28" rx="14" fill="#6b3e1f" transform="rotate({r})"/>' for r in [-18, 18, -6, 6])
    + '<path d="M0 -330 C80 -230 140 -160 120 -60 C110 0 -110 0 -120 -60 C-140 -160 -80 -230 0 -330Z" fill="#ff7b00"/><path d="M0 -240 C50 -170 80 -120 66 -60 C60 -20 -60 -20 -66 -60 C-80 -120 -50 -170 0 -240Z" fill="#ffb627"/><path d="M0 -150 C24 -110 36 -80 28 -50 C24 -30 -24 -30 -28 -50 C-36 -80 -24 -110 0 -150Z" fill="#fff1b5"/></g>'
    + ''.join(f'<circle cx="{800+random.Random(i).uniform(-200,200):.0f}" cy="{random.Random(i+7).uniform(330,560):.0f}" r="{random.Random(i+3).uniform(2,5):.1f}" fill="#ffcf6b"/>' for i in range(40)),
    lg('sky', [(0, '#0d1026'), (1, '#3a2346')]) + rg('halo', [(0, '#ff9f45', .45), (1, '#ff9f45', 0)])))
add('shabbat', 'shabbat', 'שבת: נרות, חלות וכוס קידוש', svg(
    '<rect width="1600" height="1000" fill="url(#bg)"/><rect y="700" width="1600" height="300" fill="#f6f1e7"/><rect y="700" width="1600" height="10" fill="#e1d7c4"/>'
    + ''.join(f'<g transform="translate({x} 700)"><path d="M-60 0 h120 l-24 -40 h-72Z" fill="url(#silver)"/><rect x="-14" y="-200" width="28" height="160" fill="url(#silver)"/><path d="M-50 -200 h100 l-10 -24 h-80Z" fill="url(#silver)"/><rect x="-14" y="-380" width="28" height="160" fill="#fbf8f0"/>{flame(0, -382, 1.1)}</g>' for x in [260, 470])
    + '<g transform="translate(900 640)"><path d="M-260 60 C-260 -60 260 -60 260 60Z" fill="#7a1f3d"/><path d="M-280 70 h560 l-20 40 h-520Z" fill="#7a1f3d"/><path d="M-280 70 h560" stroke="#e8c36a" stroke-width="10"/>' + ''.join(f'<path d="M{x} -30 l14 -26 l14 26" stroke="#e8c36a" stroke-width="6" fill="none"/>' for x in range(-200, 200, 60)) + '</g>'
    + '<g transform="translate(1340 700)"><path d="M-80 -300 h160 c0 110 -36 150 -80 166 c-44 -16 -80 -56 -80 -166Z" fill="url(#silver)"/><path d="M-70 -280 h140 c-4 86 -32 120 -70 134 c-38 -14 -66 -48 -70 -134Z" fill="#8b1e3f"/><rect x="-10" y="-134" width="20" height="100" fill="url(#silver)"/><ellipse cy="-30" rx="70" ry="14" fill="url(#silver)"/></g>',
    lg('bg', [(0, '#24324f'), (1, '#4a5a7d')]) + lg('silver', [(0, '#f2f4f7'), (.5, '#b8c1cc'), (1, '#8a95a3')], 0, 0, 1, 0) + GLOW))

# ---------- רקעים ----------
add('bg-parchment', 'bg', 'רקע: קלף', svg('<rect width="1600" height="1000" fill="url(#p)"/><rect width="1600" height="1000" fill="url(#v)"/>',
    rg('p', [(0, '#fbf3df', 1), (1, '#ead8b3', 1)], .5, .45, .75) + rg('v', [(.6, '#7a5a2a', 0), (1, '#7a5a2a', .25)], .5, .5, .8)))
add('bg-sky', 'bg', 'רקע: שמיים ועננים', svg('<rect width="1600" height="1000" fill="url(#s)"/>' + ''.join(f'<g opacity=".9" transform="translate({x} {y}) scale({k})"><ellipse rx="160" ry="60" fill="#fff"/><ellipse cx="-90" cy="10" rx="100" ry="46" fill="#fff"/><ellipse cx="100" cy="14" rx="110" ry="44" fill="#fff"/><ellipse cx="20" cy="-40" rx="90" ry="60" fill="#fff"/></g>' for x, y, k in [(300, 260, 1), (1100, 200, 1.3), (800, 620, .9), (1400, 760, .8), (200, 820, .7)]),
    lg('s', [(0, '#5aa9e6'), (1, '#cfe8fb')])))
add('bg-gold-frame', 'bg', 'רקע: מסגרת זהב', svg('<rect width="1600" height="1000" fill="#fbf7ee"/><rect x="40" y="40" width="1520" height="920" fill="none" stroke="url(#g)" stroke-width="22"/><rect x="80" y="80" width="1440" height="840" fill="none" stroke="url(#g)" stroke-width="5"/>'
    + ''.join(f'<g transform="translate({x} {y}) rotate({r})"><path d="M0 0 q60 -10 90 30 q-50 -10 -70 30 q-10 -40 -20 -60Z" fill="url(#g)"/><circle cx="18" cy="18" r="10" fill="url(#g)"/></g>' for x, y, r in [(80, 80, 0), (1520, 80, 90), (1520, 920, 180), (80, 920, 270)]),
    lg('g', [(0, '#f2d58a'), (.5, '#c99a3a'), (1, '#8a6420')], 0, 0, 1, 1)))
open(os.path.join(OUT, 'index.js'), 'w').write('/* נוצר אוטומטית מ־tools/gen_library.py: איורים מקוריים למאגר התמונות */\nwindow.MYLUACH_LIB_SEED=' + json.dumps(items, ensure_ascii=False) + ';\n')
print(len(items), 'images')
