# -*- coding: utf-8 -*-
# נופים רכים לרקע העמודים (assets/library/nat-*.svg): נוף אחד לכל חודש עברי, לפי העונה בארץ.
# נבנים מקוד (שכבות גבעות, שמיים, עננים, פרחים), כך שאין צורך בתמונות מבחוץ.
import math, os, random
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'library')
W, H = 1000, 1400

def ridge(base, amps, seed, step=20):
    r = random.Random(seed)
    waves = [(a, r.uniform(0.003, 0.012) * (i + 1), r.uniform(0, 6.3)) for i, a in enumerate(amps)]
    pts = [(x, base + sum(a * math.sin(x * f + p) for a, f, p in waves)) for x in range(-40, W + 60, step)]
    d = 'M%d %d L%.1f %.1f ' % (-40, H + 10, pts[0][0], pts[0][1])
    for i in range(1, len(pts) - 1):
        mx, my = (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2
        d += 'Q%.1f %.1f %.1f %.1f ' % (pts[i][0], pts[i][1], mx, my)
    return d + 'L%d %d Z' % (W + 60, H + 10)

def grad(id_, stops, vertical=True):
    a = 'x1="0" y1="0" x2="0" y2="1"' if vertical else 'x1="0" y1="0" x2="1" y2="0"'
    return '<linearGradient id="%s" %s>%s</linearGradient>' % (id_, a, ''.join('<stop offset="%s" stop-color="%s"%s/>' % (o, c, (' stop-opacity="%s"' % op) if op is not None else '') for o, c, op in stops))

def dots(seed, n, y0, y1, colors, rmin, rmax, opacity=0.9):
    r = random.Random(seed); out = []
    for _ in range(n):
        y = r.uniform(y0, y1); k = (y - y0) / max(1, (y1 - y0))
        rad = rmin + (rmax - rmin) * k * r.uniform(0.6, 1.1)
        out.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="%s" opacity="%.2f"/>' % (r.uniform(-10, W + 10), y, rad, r.choice(colors), opacity * r.uniform(0.6, 1)))
    return ''.join(out)

def clouds(seed, n, y0, y1, color='#fff', op=0.55):
    r = random.Random(seed); out = []
    for _ in range(n):
        cx, cy, w = r.uniform(-50, W + 50), r.uniform(y0, y1), r.uniform(140, 320)
        for j in range(4):
            out.append('<ellipse cx="%.0f" cy="%.0f" rx="%.0f" ry="%.0f" fill="%s" opacity="%.2f"/>' % (cx + r.uniform(-w / 2, w / 2), cy + r.uniform(-14, 14), w * r.uniform(.3, .55), w * r.uniform(.1, .18), color, op))
    return '<g filter="url(#blur)">' + ''.join(out) + '</g>'

def scene(sky, sun, layers, extra_back='', extra_front='', haze='#ffffff'):
    defs = ['<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>',
            '<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.5"/></filter>',
            '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>',
            grad('sky', sky), grad('haze', [(0, haze, 0), (.6, haze, .55), (1, haze, 0)])]
    body = '<rect width="%d" height="%d" fill="url(#sky)"/>' % (W, H)
    if sun:
        x, y, r, c = sun
        body += '<circle cx="%d" cy="%d" r="%d" fill="%s" opacity=".55" filter="url(#glow)"/><circle cx="%d" cy="%d" r="%d" fill="%s" opacity=".9"/>' % (x, y, r * 3, c, x, y, r, c)
    body += extra_back
    for i, (base, amps, seed, fill, blur) in enumerate(layers):
        gid = 'l%d' % i
        if isinstance(fill, tuple):
            defs.append(grad(gid, [(0, fill[0], None), (1, fill[1], None)])); f = 'url(#%s)' % gid
        else: f = fill
        body += '<path d="%s" fill="%s"%s/>' % (ridge(base, amps, seed), f, ' filter="url(#soft)"' if blur else '')
        if i < len(layers) - 1 and i < 2:
            body += '<rect y="%d" width="%d" height="%d" fill="url(#haze)" opacity=".35"/>' % (base - 120, W, 260)
    body += extra_front
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice"><defs>%s</defs>%s</svg>' % (W, H, ''.join(defs), body)

S = {}
# תשרי: שעת זהב על גבעות בסוף הקיץ
S['tishrei'] = scene([(0, '#f6d7b0', None), (.45, '#fbe9d2', None), (1, '#fff7ec', None)], (720, 560, 70, '#ffe2a8'),
  [(640, [40, 25, 10], 1, '#d9b9a6', True), (760, [55, 20, 8], 2, '#c7a27a', True), (900, [45, 30, 12], 3, ('#a8925e', '#8a7a4a'), False), (1080, [60, 25, 10], 4, ('#7d7a45', '#5f6234'), False)],
  extra_back=clouds(11, 4, 250, 480, '#fff3e3', .5))
# חשוון: היורה, עננים וערפל ירוק
S['cheshvan'] = scene([(0, '#9fb3c2', None), (.5, '#cfd9df', None), (1, '#eef2f2', None)], None,
  [(620, [30, 18, 8], 5, '#a9b8b9', True), (760, [40, 22, 10], 6, '#93a99c', True), (920, [50, 25, 12], 7, ('#7f9a7d', '#6b8a69'), False), (1110, [55, 20, 10], 8, ('#5f7f5c', '#4d6b4b'), False)],
  extra_back=clouds(12, 9, 120, 520, '#ffffff', .6) + clouds(13, 5, 150, 420, '#8d9ea9', .35), haze='#eef2f2')
# כסלו: ערב חורף, ירח וכוכבים
S['kislev'] = scene([(0, '#2c3a63', None), (.55, '#6d6f9c', None), (1, '#c9b8cf', None)], (300, 330, 38, '#f6f1dc'),
  [(720, [35, 20, 8], 9, '#5c5f8a', True), (860, [45, 25, 10], 10, '#46496f', True), (1010, [50, 22, 12], 11, ('#33375a', '#2a2d4a'), False), (1180, [40, 20, 10], 12, ('#23263f', '#1b1d31'), False)],
  extra_back=dots(14, 70, 20, 560, ['#ffffff', '#fdf3c8'], 1.2, 2.6, .85), haze='#c9b8cf')
# טבת: הרים מושלגים
S['tevet'] = scene([(0, '#bcd3e6', None), (.6, '#e3eef6', None), (1, '#f6fafc', None)], (760, 300, 46, '#fffaf0'),
  [(600, [90, 40, 15], 15, ('#f7fbff', '#c9d8e6'), True), (780, [70, 30, 12], 16, ('#e9f1f8', '#a9bfd2'), True), (960, [40, 22, 10], 17, ('#6f8a8f', '#55707a'), False), (1120, [45, 20, 10], 18, ('#4d6a62', '#3c564f'), False)],
  extra_back=clouds(19, 3, 200, 380, '#ffffff', .45), haze='#f6fafc')
# שבט: פריחת השקדיות
S['shvat'] = scene([(0, '#a9cfe8', None), (.6, '#dcecf5', None), (1, '#f4f9f6', None)], (220, 260, 40, '#fffbe8'),
  [(700, [35, 18, 8], 20, '#b9cdb5', True), (840, [45, 22, 10], 21, '#9cbc8e', True), (1000, [40, 20, 10], 22, ('#86ad74', '#6f9a5f'), False), (1170, [35, 18, 8], 23, ('#6a9a5a', '#5a8a4c'), False)],
  extra_back=clouds(24, 4, 180, 460), extra_front=dots(25, 260, 980, 1400, ['#ffffff', '#fbdde6', '#f6c3d3', '#fff0f4'], 3, 11, .95))
# אדר: גבעות ירוקות וחרציות
S['adar'] = scene([(0, '#8fc3ea', None), (.6, '#d3e8f5', None), (1, '#f2f8f3', None)], (760, 240, 42, '#fff6cf'),
  [(690, [40, 20, 8], 26, '#a9c9a0', True), (830, [50, 22, 10], 27, '#8fbd7d', True), (990, [45, 24, 12], 28, ('#79b062', '#64a050'), False), (1160, [40, 20, 10], 29, ('#5c9a48', '#4e8a3d'), False)],
  extra_back=clouds(30, 5, 160, 440), extra_front=dots(31, 240, 1000, 1400, ['#ffe066', '#fff3a8', '#ffffff', '#ffd23f'], 2.5, 9, .95))

# ניסן: כלניות באביב
S['nisan'] = scene([(0, '#9ccbee', None), (.6, '#dcedf7', None), (1, '#f5faf2', None)], (260, 230, 40, '#fff7d6'),
  [(700, [38, 20, 8], 32, '#b3cfa8', True), (840, [44, 22, 10], 33, '#97c184', True), (1000, [40, 22, 12], 34, ('#7fb468', '#69a352'), False), (1170, [36, 18, 9], 35, ('#5f9b4b', '#51893f'), False)],
  extra_back=clouds(36, 4, 170, 430), extra_front=dots(37, 230, 1010, 1400, ['#e03b3b', '#f05a5a', '#c92a2a', '#ffffff', '#f7b2c4'], 3, 11, .95))
# אייר: אחו בגוני סגול
S['iyar'] = scene([(0, '#b4c8ec', None), (.6, '#e6e8f6', None), (1, '#f7f4f8', None)], (740, 260, 40, '#fff4e0'),
  [(690, [36, 20, 8], 38, '#c3c6d9', True), (830, [44, 22, 10], 39, '#a8b9a0', True), (990, [42, 22, 12], 40, ('#93ad84', '#7d9d6d'), False), (1160, [38, 20, 9], 41, ('#6f915f', '#5e8051'), False)],
  extra_back=clouds(42, 5, 170, 450), extra_front=dots(43, 260, 1000, 1400, ['#9b7fd1', '#b9a3e3', '#ffffff', '#d9cdf2'], 2.5, 9, .9))
# סיוון: שדות חיטה בשלה
S['sivan'] = scene([(0, '#86bfe9', None), (.6, '#d2e7f6', None), (1, '#fbf6e6', None)], (780, 250, 44, '#fff3c4'),
  [(720, [30, 15, 6], 44, '#c3d0a4', True), (850, [36, 18, 8], 45, ('#e5cf86', '#d8bb64'), True), (1000, [30, 15, 8], 46, ('#e8c86a', '#d6ae4a'), False), (1160, [26, 14, 7], 47, ('#d9b04c', '#c49a3a'), False)],
  extra_back=clouds(48, 4, 160, 430), extra_front=dots(49, 160, 1100, 1400, ['#b8892d', '#e9cf7f', '#f3dfa0'], 1.5, 4, .7))
# תמוז: ים ושמש של קיץ
S['tamuz'] = scene([(0, '#5fb3e3', None), (.55, '#bfe3f5', None), (1, '#eaf6fb', None)], (700, 300, 50, '#fffbe6'),
  [(880, [3, 2, 1], 50, ('#4fb3c9', '#2f95b0'), False), (1080, [14, 8, 4], 51, ('#7cc9d4', '#5bb4c4'), True), (1180, [30, 14, 6], 52, ('#f3e4c4', '#e8d3a6'), False)],
  extra_back=clouds(53, 4, 150, 420, '#ffffff', .6),
  extra_front=''.join('<rect x="%d" y="%d" width="%d" height="2" fill="#ffffff" opacity=".45" rx="1"/>' % (random.Random(54 + i).uniform(0, 900), 900 + i * 9, random.Random(80 + i).uniform(40, 160)) for i in range(18)))
# אב: דיונות במדבר בשקיעה
S['av'] = scene([(0, '#f2a97f', None), (.5, '#f7cfa8', None), (1, '#fde9d2', None)], (300, 640, 60, '#ffe0b0'),
  [(760, [30, 15, 6], 55, '#e8b48c', True), (900, [55, 25, 10], 56, ('#e7a774', '#d98f5c'), True), (1060, [60, 28, 12], 57, ('#d98c55', '#c47640'), False), (1220, [50, 22, 10], 58, ('#c26f3c', '#a95c30'), False)],
  extra_back=clouds(59, 3, 300, 520, '#ffe1c6', .5), haze='#fde9d2')
# אלול: זריחה מעל רכסים
S['elul'] = scene([(0, '#f7c6b3', None), (.45, '#fbe0cc', None), (1, '#fdf2e6', None)], (520, 640, 64, '#fff0c9'),
  [(660, [40, 25, 10], 60, '#c9aac0', True), (780, [50, 25, 10], 61, '#a990b0', True), (910, [55, 28, 12], 62, ('#8a7aa0', '#76688c'), True), (1060, [55, 25, 12], 63, ('#655a80', '#544a6c'), False), (1220, [45, 20, 10], 64, ('#46405e', '#3a344e'), False)],
  extra_back=clouds(65, 4, 260, 520, '#fff1e6', .55), haze='#fdf2e6')

for k, v in S.items():
    open(os.path.join(OUT, 'nat-%s.svg' % k), 'w').write(v)
print(len(S), 'scenes')
