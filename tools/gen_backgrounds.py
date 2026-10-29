# -*- coding: utf-8 -*-
"""רקעים מקוריים בצבעי מים, משותפים ללוח השנה ולברכות.
יוצר assets/backgrounds/<id>.jpg (A4 ב-300dpi), <id>-t.jpg (תמונה קטנה) ו-pack.json.
הרצה: python3 tools/gen_backgrounds.py [id ...]
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, zoom, map_coordinates

W, H = 2480, 3508
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'backgrounds')


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def noise(rng, w, h, cells, octaves=5, pers=0.55):
    """רעש חלק (fbm) בגודל w×h, בין 0 ל-1"""
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = int(cells * 2 ** o)
        cw, ch = max(2, c), max(2, int(c * h / w))
        g = rng.random((ch + 3, cw + 3)).astype(np.float32)
        z = zoom(g, (h / ch, w / cw), order=3)[:h, :w]
        if z.shape != (h, w):
            z = np.pad(z, ((0, h - z.shape[0]), (0, w - z.shape[1])), mode='edge')
        out += amp * z
        tot += amp
        amp *= pers
    out /= tot
    out -= out.min()
    out /= max(1e-6, out.max())
    return out


def lowres(fn, k=4):
    """מחשב שדה ברזולוציה נמוכה ומגדיל (לשטיפות רכות: מהיר יותר)"""
    a = fn(W // k, H // k)
    return np.clip(zoom(a, (H / a.shape[0], W / a.shape[1]), order=1)[:H, :W], 0, 1)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Canvas:
    def __init__(self, seed, paper='#fdfbf6'):
        self.rng = np.random.default_rng(seed)
        self.img = np.ones((H, W, 3), np.float32) * hexc(paper)
        self.hf = lowres(lambda w, h: noise(self.rng, w, h, 18, 4, 0.6), 2)

    def wash(self, alpha, color, edge=0.55):
        """צבע מים: שכבה שקופה בצבע, עם קצוות כהים מעט (כמו פיגמנט שמתרכז בשולי הכתם)"""
        a = np.clip(alpha, 0, 1).astype(np.float32)
        if a.shape == self.hf.shape:
            a = a * (0.72 + 0.56 * (self.hf - 0.5) + 0.28)
        e = np.clip(a - gaussian_filter(a, 6 if a.shape[0] > 800 else 2), 0, 1)
        a = np.clip(a + e * edge * 3, 0, 1)
        c = hexc(color) if isinstance(color, str) else color
        self.img *= 1 - a[..., None] * (1 - c)

    def wash_at(self, x0, y0, a, color, edge=0.6):
        h, w = a.shape
        x1, y1 = min(W, x0 + w), min(H, y0 + h)
        sx, sy = max(0, -x0), max(0, -y0)
        x0c, y0c = max(0, x0), max(0, y0)
        if x1 <= x0c or y1 <= y0c:
            return
        a = a[sy:sy + (y1 - y0c), sx:sx + (x1 - x0c)]
        e = np.clip(a - gaussian_filter(a, 2.2), 0, 1)
        a = np.clip(a + e * edge * 3, 0, 1)
        c = hexc(color) if isinstance(color, str) else color
        sub = self.img[y0c:y1, x0c:x1]
        sub *= 1 - a[..., None] * (1 - c)

    def glow(self, cx, cy, r, color, k=0.9):
        """הילה בהירה (מבהירה לכיוון הצבע)"""
        yy, xx = np.mgrid[0:H:4, 0:W:4]
        d = np.sqrt(((xx - cx) / r) ** 2 + ((yy - cy) / r) ** 2)
        a = zoom(np.clip(1 - d, 0, 1) ** 1.6, 4, order=1)[:H, :W] * k
        c = hexc(color)
        self.img = self.img * (1 - a[..., None]) + c * a[..., None]

    def grain(self, k=0.035):
        g = self.rng.random((H // 2, W // 2)).astype(np.float32)
        g = gaussian_filter(g, 0.8)
        g = zoom(g, 2, order=1)[:H, :W]
        fib = lowres(lambda w, h: noise(self.rng, w, h, 60, 3), 2)
        t = (g - 0.5) * k + (fib - 0.5) * k * 0.6
        self.img = np.clip(self.img * (1 + t[..., None]), 0, 1)

    def save(self, name):
        im = Image.fromarray((np.clip(self.img, 0, 1) * 255).astype(np.uint8))
        im.save(os.path.join(OUT, name + '.jpg'), quality=86, optimize=True, progressive=True)
        t = im.resize((400, 566), Image.LANCZOS)
        t.save(os.path.join(OUT, name + '-t.jpg'), quality=82, optimize=True)


def corner_field(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.clip(1 - np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2), 0, 1)


def clouds(c, cells, lo, hi, bias=None, oct=6):
    n = lowres(lambda w, h: noise(c.rng, w, h, cells, oct), 4)
    if bias is not None:
        n = n * 0.55 + bias * 0.75
    return smooth(n, lo, hi)


def edge_frame(power=2.2):
    """קרוב לשולי הדף = 1, במרכז = 0"""
    yy, xx = np.mgrid[0:H:4, 0:W:4].astype(np.float32)
    dx = np.abs(xx / W - 0.5) * 2
    dy = np.abs(yy / H - 0.5) * 2
    d = np.maximum(dx ** power, dy ** power) ** (1 / power)
    return zoom(d, 4, order=1)[:H, :W]


# ---------- צמחים ----------

def blot(c, poly_fn, size, color, alpha=0.62, var=0.35, blur=1.6, edge=0.7):
    """צורה אחת בצבעי מים: poly_fn(draw, ox, oy) מצייר על שכבה בגודל size"""
    w, h = size
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    poly_fn(d)
    a = np.asarray(m, np.float32) / 255
    a = gaussian_filter(a, blur)
    nz = noise(c.rng, w, h, max(2, w // 60), 3)
    a = smooth(a + (nz - 0.5) * 0.35, 0.35, 0.65)
    a *= alpha * (1 - var + var * noise(c.rng, w, h, max(2, w // 90), 3))
    return a


def leaf_poly(cx, cy, L, Wd, ang, n=22):
    pts = []
    ca, sa = math.cos(ang), math.sin(ang)
    for side in (1, -1):
        rng_ = range(n + 1) if side == 1 else range(n, -1, -1)
        for i in rng_:
            t = i / n
            x = t * L
            y = side * Wd * math.sin(math.pi * t) ** 0.9 * (1 - 0.25 * t)
            pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def bez(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return out


def paint_layer(c, x0, y0, w, h, draw_fn, color, alpha=0.6, blur=1.4, var=0.4, edge=0.7):
    a = blot(c, lambda d: draw_fn(d, x0, y0), (w, h), color, alpha, var, blur)
    c.wash_at(x0, y0, a, color, edge)


def stem(c, pts, color, width, alpha=0.7):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = int(min(xs)) - 30, int(min(ys)) - 30
    w, h = int(max(xs)) - x0 + 60, int(max(ys)) - y0 + 60

    def f(d, ox, oy):
        q = [(x - ox, y - oy) for x, y in pts]
        for i in range(len(q) - 1):
            t = i / max(1, len(q) - 1)
            d.line([q[i], q[i + 1]], fill=255, width=max(2, int(width * (1 - 0.55 * t))))
    paint_layer(c, x0, y0, w, h, f, color, alpha, 1.2, 0.25)


def eucalyptus(c, base, tip, bend, greens, leaf_r=(55, 95), count=11, mirror=1):
    p0 = base
    p3 = tip
    p1 = (base[0] + (tip[0] - base[0]) * 0.3 + bend * mirror, base[1] + (tip[1] - base[1]) * 0.3)
    p2 = (base[0] + (tip[0] - base[0]) * 0.7 + bend * 0.6 * mirror, base[1] + (tip[1] - base[1]) * 0.7)
    pts = bez(p0, p1, p2, p3, 80)
    stem(c, pts, '#7d8f7a', 10, 0.75)
    for i in range(count):
        t = 0.12 + 0.85 * i / count
        k = int(t * (len(pts) - 1))
        x, y = pts[k]
        dx, dy = pts[min(k + 1, len(pts) - 1)][0] - pts[max(k - 1, 0)][0], pts[min(k + 1, len(pts) - 1)][1] - pts[max(k - 1, 0)][1]
        nl = math.hypot(dx, dy) or 1
        nx, ny = -dy / nl, dx / nl
        side = 1 if i % 2 == 0 else -1
        r = c.rng.uniform(*leaf_r) * (1 - 0.35 * t)
        off = r * 1.05
        cx, cy = x + nx * off * side, y + ny * off * side
        col = greens[int(c.rng.integers(len(greens)))]
        sz = int(r * 2.9)

        la = math.atan2(ny * side, nx * side) + c.rng.uniform(-0.35, 0.35)
        poly = leaf_poly(x + nx * side * r * 0.1, y + ny * side * r * 0.1, r * 2.1, r * 0.95, la, 20)

        def f(d, ox, oy, poly=poly):
            d.polygon([(px - ox, py - oy) for px, py in poly], fill=255)
        paint_layer(c, int(cx - sz / 2), int(cy - sz / 2), sz, sz, f, col, c.rng.uniform(0.5, 0.72), 1.4, 0.45)
        # עורק עדין


def sprig(c, base, length, ang, color, leaf_col, leaves=9, leaf_len=(70, 130), leaf_w=0.28, berry=None):
    """ענף עם עלים מוארכים (או גרגרים)"""
    ca, sa = math.cos(ang), math.sin(ang)
    tip = (base[0] + ca * length, base[1] + sa * length)
    curl = c.rng.uniform(-0.18, 0.18) * length
    pts = bez(base, (base[0] + ca * length * 0.35 - sa * curl, base[1] + sa * length * 0.35 + ca * curl),
              (base[0] + ca * length * 0.7 - sa * curl * 1.4, base[1] + sa * length * 0.7 + ca * curl * 1.4), tip, 50)
    stem(c, pts, color, 6, 0.7)
    for i in range(leaves):
        t = 0.15 + 0.85 * i / leaves
        k = int(t * (len(pts) - 1))
        x, y = pts[k]
        side = 1 if i % 2 == 0 else -1
        L = c.rng.uniform(*leaf_len) * (1 - 0.4 * t)
        a = ang + side * c.rng.uniform(0.55, 0.95)
        if berry:
            r = c.rng.uniform(20, 34)
            bx, by = x + math.cos(a) * L * 0.5, y + math.sin(a) * L * 0.5
            stem(c, [(x, y), (bx, by)], color, 3, 0.5)

            def fb(d, ox, oy, bx=bx, by=by, r=r):
                d.ellipse([bx - ox - r, by - oy - r, bx - ox + r, by - oy + r], fill=255)
            paint_layer(c, int(bx - r * 2), int(by - r * 2), int(r * 4), int(r * 4), fb, berry, 0.75, 1.0, 0.3)
        else:
            poly = leaf_poly(x, y, L, L * leaf_w, a)
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            x0, y0 = int(min(xs)) - 10, int(min(ys)) - 10
            w, h = int(max(xs)) - x0 + 20, int(max(ys)) - y0 + 20
            col = leaf_col[int(c.rng.integers(len(leaf_col)))] if isinstance(leaf_col, list) else leaf_col

            def fl(d, ox, oy, poly=poly):
                d.polygon([(px - ox, py - oy) for px, py in poly], fill=255)
            paint_layer(c, x0, y0, w, h, fl, col, c.rng.uniform(0.5, 0.75), 1.2, 0.45)
    return tip


def flower(c, cx, cy, r, petal, center='#c99a5b', n=5, alpha=0.62):
    rot = c.rng.uniform(0, math.pi)
    for i in range(n):
        a = rot + i * 2 * math.pi / n + c.rng.uniform(-0.12, 0.12)
        L = r * c.rng.uniform(0.85, 1.1)
        poly = leaf_poly(cx, cy, L, L * 0.42, a, 16)
        x0, y0 = int(cx - r * 1.3), int(cy - r * 1.3)

        def f(d, ox, oy, poly=poly):
            d.polygon([(px - ox, py - oy) for px, py in poly], fill=255)
        paint_layer(c, x0, y0, int(r * 2.6), int(r * 2.6), f, petal, alpha * c.rng.uniform(0.75, 1), 1.3, 0.5)
    rc = r * 0.2

    def fc(d, ox, oy):
        d.ellipse([cx - ox - rc, cy - oy - rc, cx - ox + rc, cy - oy + rc], fill=255)
    paint_layer(c, int(cx - rc * 2), int(cy - rc * 2), int(rc * 4), int(rc * 4), fc, center, 0.8, 1.0, 0.3)


def grass(c, base, length, ang, color, width=7):
    ca, sa = math.cos(ang), math.sin(ang)
    bend = c.rng.uniform(-0.25, 0.25) * length
    tip = (base[0] + ca * length - sa * bend, base[1] + sa * length + ca * bend)
    pts = bez(base, (base[0] + ca * length * 0.4, base[1] + sa * length * 0.4),
              (base[0] + ca * length * 0.75 - sa * bend * 0.6, base[1] + sa * length * 0.75 + ca * bend * 0.6), tip, 40)
    stem(c, pts, color, width, 0.55)


def wheat(c, base, length, ang, color='#c9a464'):
    ca, sa = math.cos(ang), math.sin(ang)
    bend = c.rng.uniform(-0.12, 0.12) * length
    tip = (base[0] + ca * length - sa * bend, base[1] + sa * length + ca * bend)
    pts = bez(base, (base[0] + ca * length * 0.4, base[1] + sa * length * 0.4),
              (base[0] + ca * length * 0.8 - sa * bend, base[1] + sa * length * 0.8 + ca * bend), tip, 60)
    stem(c, pts, '#b79458', 6, 0.6)
    for i in range(14):
        t = 0.55 + 0.45 * i / 14
        k = int(t * (len(pts) - 1))
        x, y = pts[k]
        for side in (1, -1):
            a = ang + side * 0.5
            L = 105 * (1 - 0.4 * (t - 0.55) / 0.45)
            poly = leaf_poly(x, y, L, L * 0.33, a, 12)

            def f(d, ox, oy, poly=poly):
                d.polygon([(px - ox, py - oy) for px, py in poly], fill=255)
            paint_layer(c, int(x - 120), int(y - 120), 240, 240, f, color, 0.6, 1.1, 0.4)


# ---------- הרקעים ----------
BGS = []


def bg(id_, title, cat):
    def deco(fn):
        BGS.append((id_, title, cat, fn))
        return fn
    return deco


@bg('wc-blue-gold', 'כחול וזהב בצבעי מים', 'water')
def _(c):
    e = edge_frame(1.6)
    c.wash(clouds(c, 3, 0.4, 0.9, e) * 0.55, '#8dbbd6', 0.5)
    c.wash(clouds(c, 4, 0.55, 0.98, e) * 0.4, '#5a93bd', 0.6)
    c.glow(W * 0.55, H * 0.35, W * 0.55, '#fffdf2', 0.85)
    c.glow(W * 0.8, H * 0.18, W * 0.42, '#fbe7a6', 0.55)


@bg('wc-blush', 'ורוד ותכלת עדין', 'water')
def _(c):
    pk = np.maximum(corner_field(W, 0, W * 0.9, H * 0.5), corner_field(0, H, W * 0.9, H * 0.5))
    bl = np.maximum(corner_field(0, H * 0.1, W * 0.8, H * 0.45), corner_field(W, H * 0.9, W * 0.8, H * 0.45))
    c.wash(clouds(c, 2.5, 0.3, 0.9, pk) * 0.42, '#f1b3ae', 0.45)
    c.wash(clouds(c, 2.5, 0.3, 0.9, bl) * 0.38, '#aac7e0', 0.5)
    c.wash(clouds(c, 3.5, 0.6, 0.98, pk) * 0.22, '#e09a8a', 0.5)
    c.glow(W * 0.5, H * 0.5, W * 0.45, '#fffaf6', 0.6)


@bg('wc-peach', 'אפרסק והילה', 'water')
def _(c):
    b = corner_field(W * 0.95, H * 0.02, W * 1.0, H * 0.55)
    c.wash(clouds(c, 3.5, 0.35, 0.9, b * 0.8) * 0.45, '#f8cba6', 0.45)
    c.wash(clouds(c, 4.5, 0.55, 0.95, b * 0.8) * 0.3, '#f1a48e', 0.55)
    c.wash(clouds(c, 3, 0.55, 0.98, corner_field(0, H, W * 0.9, H * 0.4)) * 0.4, '#f3c7b5', 0.4)
    c.glow(W * 0.45, H * 0.55, W * 0.55, '#fffaf5', 0.8)


@bg('wc-lavender', 'סגול לבנדר', 'water')
def _(c):
    e = edge_frame(1.8)
    c.wash(clouds(c, 3, 0.32, 0.85, e) * 0.38, '#c3b3de', 0.45)
    c.wash(clouds(c, 3.5, 0.5, 0.95, e) * 0.3, '#e8b6cf', 0.5)
    c.wash(clouds(c, 4, 0.6, 0.98, e) * 0.2, '#9a8bc8', 0.6)
    c.glow(W * 0.5, H * 0.48, W * 0.6, '#fdfbff', 0.8)


@bg('wc-mint', 'מנטה וטורקיז', 'water')
def _(c):
    e = edge_frame(1.8)
    c.wash(clouds(c, 3, 0.32, 0.85, e) * 0.38, '#a9dccd', 0.45)
    c.wash(clouds(c, 3.5, 0.5, 0.95, e) * 0.28, '#7cbdbb', 0.55)
    c.wash(clouds(c, 4, 0.6, 0.98, e) * 0.22, '#dfeab2', 0.4)
    c.glow(W * 0.5, H * 0.5, W * 0.6, '#fbfffd', 0.8)


@bg('wc-sky', 'שמיים תכולים', 'water')
def _(c):
    yy = np.linspace(1, 0, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
    c.wash(clouds(c, 2.5, 0.3, 0.9, yy) * 0.6, '#8fbfe0', 0.35)
    c.wash(clouds(c, 3.5, 0.55, 0.98, yy) * 0.4, '#5f98c9', 0.5)
    c.glow(W * 0.5, H * 0.75, W * 0.8, '#ffffff', 0.7)


@bg('wc-gold', 'זהב חם וחול', 'water')
def _(c):
    e = edge_frame(1.8)
    c.wash(clouds(c, 2.5, 0.32, 0.88, e) * 0.4, '#eddcb4', 0.4)
    c.wash(clouds(c, 3.5, 0.5, 0.95, e) * 0.3, '#d4b47a', 0.6)
    c.wash(clouds(c, 4, 0.62, 0.99, e) * 0.16, '#c19a5e', 0.7)
    c.glow(W * 0.5, H * 0.5, W * 0.6, '#fffcf3', 0.8)


@bg('wc-swirl', 'פסטל מתערבל', 'water')
def _(c):
    w, h = W // 4, H // 4
    n1 = noise(c.rng, w, h, 2, 4)
    n2 = noise(c.rng, w, h, 2, 4)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    wx = xx + (n1 - 0.5) * w * 0.9
    wy = yy + (n2 - 0.5) * h * 0.6
    base = noise(c.rng, w, h, 1.5, 4)
    f = map_coordinates(base, [np.clip(wy, 0, h - 1), np.clip(wx, 0, w - 1)], order=1)
    f = gaussian_filter(f, 6)
    f = (f - f.min()) / (f.max() - f.min())
    f = zoom(f, 4, order=1)[:H, :W]
    cols = [('#f6c3dc', 0.0), ('#fde9d2', 0.22), ('#ffffff', 0.42), ('#ffffff', 0.55), ('#c6e4f3', 0.75), ('#e0d3f3', 1.0)]
    img = np.zeros((H, W, 3), np.float32)
    xs = [p for _, p in cols]
    for ch in range(3):
        ys = [hexc(col)[ch] for col, _ in cols]
        img[..., ch] = np.interp(f, xs, ys)
    c.img = c.img * 0.35 + img * 0.65
    c.glow(W * 0.62, H * 0.3, W * 0.45, '#ffffff', 0.7)


@bg('fl-eucalyptus', 'אקליפטוס על שיש', 'floral')
def _(c):
    c.img[:] = hexc('#f1f1ef')
    v = lowres(lambda w, h: noise(c.rng, w, h, 3, 6), 2)
    c.wash(smooth(v, 0.5, 0.9) * 0.18, '#b7b9bb', 0.2)
    greens = ['#5f8a86', '#6f9a90', '#4f7872', '#86a69c']
    eucalyptus(c, (-80, 1500), (1150, -40), -200, greens, (115, 175), 13)
    eucalyptus(c, (-100, 1050), (600, -120), 120, greens, (90, 140), 9)


@bg('fl-meadow', 'פרחי בר ועלים', 'floral')
def _(c):
    c.img[:] = hexc('#f6f4ef')
    e = edge_frame(1.8)
    c.wash(clouds(c, 3, 0.4, 0.95, e) * 0.35, '#c6d3cf', 0.3)
    c.glow(W * 0.5, H * 0.4, W * 0.6, '#fbfaf7', 0.6)
    sage = ['#87a39a', '#9db3a6', '#6e8f8a', '#a9b98f']
    for side, x in ((1, 130), (-1, W - 130)):
        for i in range(6):
            a = -math.pi / 2 + side * c.rng.uniform(-0.05, 0.45)
            sprig(c, (x + side * c.rng.uniform(-60, 160), H + 40), c.rng.uniform(1000, 1700), a, '#8a9a7f', sage, 11, (120, 210))
        for i in range(3):
            a = -math.pi / 2 + side * c.rng.uniform(0.05, 0.35)
            sprig(c, (x + side * c.rng.uniform(0, 260), H + 30), c.rng.uniform(850, 1300), a, '#7f8f8f', None, 9, (90, 150), berry='#6f95b5')
        for i in range(10):
            grass(c, (x + side * c.rng.uniform(-80, 380), H + 20), c.rng.uniform(500, 1100), -math.pi / 2 + side * c.rng.uniform(-0.2, 0.4), '#b59a6a', 5)
    for (x, y, r) in ((470, H - 900, 95), (W - 520, H - 1150, 105), (300, H - 1500, 80), (W - 330, H - 620, 85), (700, H - 420, 75)):
        flower(c, x, y, r, '#e8b0a0')


@bg('fl-peach-flowers', 'פרחים באפרסק', 'floral')
def _(c):
    b = corner_field(W * 0.95, 0, W * 1.0, H * 0.6)
    c.wash(clouds(c, 3, 0.35, 0.9, b * 0.85) * 0.38, '#f8cdaa', 0.4)
    c.wash(clouds(c, 4, 0.55, 0.95, b * 0.85) * 0.2, '#f2a68c', 0.5)
    c.glow(W * 0.45, H * 0.45, W * 0.6, '#fffaf6', 0.75)
    for i in range(16):
        x = c.rng.uniform(-40, W + 40)
        sprig(c, (x, H + 30), c.rng.uniform(450, 850), -math.pi / 2 + c.rng.uniform(-0.5, 0.5), '#c2a273', ['#c8a978', '#d8b98d', '#a9b98f'], 8, (80, 140))
    for i in range(9):
        x = 120 + i * (W - 240) / 8 + c.rng.uniform(-60, 60)
        y = H - c.rng.uniform(200, 620)
        flower(c, x, y, c.rng.uniform(95, 150), ['#f0b2a0', '#eec0b0', '#e79c8e'][i % 3], '#d0a060', 6)


@bg('fl-sage-corners', 'עלים בפינות', 'floral')
def _(c):
    c.img[:] = hexc('#fbfaf6')
    sage = ['#86a397', '#a0b9a8', '#6f8f86', '#b4c4a2']
    for (x, y, a) in ((-20, -20, 0.75), (W + 20, -20, math.pi - 0.75), (-20, H + 20, -0.75), (W + 20, H + 20, math.pi + 0.75)):
        for k in range(3):
            sprig(c, (x, y), c.rng.uniform(1000, 1450), a + c.rng.uniform(-0.35, 0.35), '#8b9a86', sage, 11, (140, 240))
        sprig(c, (x, y), 850, a + c.rng.uniform(-0.2, 0.2), '#8b9a86', None, 8, (90, 150), berry='#d6a6a0')


@bg('fl-olive', 'ענפי זית', 'floral')
def _(c):
    c.img[:] = hexc('#fbf9f2')
    e = edge_frame(2)
    c.wash(clouds(c, 3, 0.45, 0.98, e) * 0.3, '#e3dcc2', 0.3)
    olive = ['#7d8b5a', '#8f9c6a', '#6c7a4f', '#a3a87c']
    sprig(c, (-40, 380), 1900, -0.14, '#7a6a4f', olive, 20, (190, 290), 0.2)
    sprig(c, (-40, 520), 1100, 0.12, '#7a6a4f', olive, 12, (160, 240), 0.2)
    sprig(c, (W + 40, H - 380), 1900, math.pi - 0.14, '#7a6a4f', olive, 20, (190, 290), 0.2)
    sprig(c, (W + 40, H - 520), 1100, math.pi + 0.12, '#7a6a4f', olive, 12, (160, 240), 0.2)
    for (x, y) in ((700, 440), (1050, 330), (W - 720, H - 440), (W - 1080, H - 330)):
        r = 34
        paint_layer(c, int(x - 60), int(y - 60), 120, 120, lambda d, ox, oy, x=x, y=y: d.ellipse([x - ox - r, y - oy - r * 1.3, x - ox + r, y - oy + r * 1.3], fill=255), '#4f5a3a', 0.65, 1.2)


@bg('fl-wheat', 'שיבולים', 'floral')
def _(c):
    c.img[:] = hexc('#fcf8ee')
    b = np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
    c.wash(clouds(c, 3, 0.45, 0.98, b) * 0.4, '#efd9a8', 0.3)
    for i in range(15):
        x = W * 0.5 + (i - 7) * 70 + c.rng.uniform(-40, 40)
        a = -math.pi / 2 + (x - W * 0.5) / 1300 + c.rng.uniform(-0.1, 0.1)
        wheat(c, (x, H + 40), c.rng.uniform(1100, 1550), a, ['#d6b26a', '#c9a35a', '#e0c07e'][i % 3])


@bg('tx-concrete', 'בטון אפור בהיר', 'texture')
def _(c):
    c.img[:] = hexc('#e3e3e2')
    n = lowres(lambda w, h: noise(c.rng, w, h, 6, 7, 0.6), 2)
    c.wash(smooth(n, 0.35, 0.95) * 0.25, '#9b9c9e', 0.15)
    s = lowres(lambda w, h: noise(c.rng, w, h, 30, 3), 1)
    c.wash(smooth(s, 0.6, 1) * 0.12, '#8a8b8d', 0.1)
    # פסים אנכיים עדינים
    st = gaussian_filter(c.rng.random((1, W)).astype(np.float32), (0, 3))
    st = (st - st.min()) / (st.max() - st.min())
    c.img *= (0.97 + 0.05 * st)[..., None]
    c.grain(0.06)


@bg('tx-marble', 'שיש לבן', 'texture')
def _(c):
    c.img[:] = hexc('#f6f5f2')
    w, h = W // 2, H // 2
    n = noise(c.rng, w, h, 1.5, 6, 0.6)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = np.abs(np.sin((xx * 0.8 + yy * 0.5) / w * 4.5 + n * 3.2))
    vein = (1 - smooth(v, 0.0, 0.05)) * 0.32 + (1 - smooth(v, 0.0, 0.3)) * 0.1
    vein = gaussian_filter(vein, 1.6) * (0.4 + 0.6 * noise(c.rng, w, h, 3, 3))
    vein = zoom(vein, 2, order=1)[:H, :W]
    c.wash(vein, '#a9a6a0', 0.1)
    c.wash(lowres(lambda w, h: smooth(noise(c.rng, w, h, 3, 6), 0.55, 1), 2) * 0.12, '#c9c3b8', 0.1)


@bg('tx-paper', 'נייר עבודת יד', 'texture')
def _(c):
    c.img[:] = hexc('#f8f2e4')
    e = edge_frame(2.4)
    c.wash(smooth(e, 0.7, 1.0) * 0.35, '#d9c6a0', 0.4)
    c.wash(clouds(c, 5, 0.5, 1.0) * 0.12, '#cdb88e', 0.3)
    c.grain(0.07)


@bg('tx-parchment', 'קלף עתיק', 'texture')
def _(c):
    c.img[:] = hexc('#f1e3c2')
    e = edge_frame(1.8)
    c.wash(clouds(c, 4, 0.3, 0.9, e) * 0.45, '#cfa96a', 0.6)
    c.wash(smooth(e, 0.8, 1.0) * 0.4, '#a9814a', 0.4)
    c.wash(clouds(c, 6, 0.55, 1.0) * 0.18, '#b8935a', 0.5)
    c.glow(W * 0.5, H * 0.5, W * 0.55, '#fbf3df', 0.55)
    c.grain(0.06)


@bg('tx-linen', 'פשתן', 'texture')
def _(c):
    c.img[:] = hexc('#f2efe8')
    r = c.rng
    hx = gaussian_filter(r.random((1, W)).astype(np.float32), (0, 1.2))
    hy = gaussian_filter(r.random((H, 1)).astype(np.float32), (1.2, 0))
    t = (hx - 0.5) * 0.06 + (hy - 0.5) * 0.06
    c.img *= (1 + t)[..., None]
    c.wash(clouds(c, 4, 0.5, 1.0) * 0.1, '#c8c0ae', 0.2)
    c.grain(0.04)


CATS = [['water', 'צבעי מים'], ['floral', 'פרחים ועלים'], ['texture', 'נייר ומרקמים'], ['nature', 'נופים'], ['lib', 'מהמאגר של הלוח']]


def main(only):
    os.makedirs(OUT, exist_ok=True)
    for i, (id_, title, cat, fn) in enumerate(BGS):
        if only and id_ not in only:
            continue
        c = Canvas(1000 + i)
        fn(c)
        if not id_.startswith('tx-'):
            c.grain(0.03)
        c.save(id_)
        print('ok', id_, flush=True)
    items = [{'id': id_, 'title': t, 'cat': cat, 'img': '/assets/backgrounds/' + id_ + '.jpg', 'thumb': '/assets/backgrounds/' + id_ + '-t.jpg'} for id_, t, cat, _ in BGS]
    # נופים לכל חודש מהלוח, ואיורים מהמאגר: גם הם רקעים משותפים
    nat = [('nisan', 'כלניות באביב'), ('iyar', 'אחו סגול'), ('sivan', 'שדות חיטה'), ('tamuz', 'ים ושמש'), ('av', 'דיונות בשקיעה'), ('elul', 'זריחה מעל רכסים'),
           ('tishrei', 'שעת זהב בגבעות'), ('cheshvan', 'עננים וערפל'), ('kislev', 'ערב חורף וירח'), ('tevet', 'הרים מושלגים'), ('shvat', 'פריחת השקדיות'), ('adar', 'גבעות וחרציות')]
    for k, t in nat:
        items.append({'id': 'nat-' + k, 'title': t, 'cat': 'nature', 'img': '/assets/library/nat-' + k + '.jpg', 'thumb': '/assets/library/nat-' + k + '.jpg'})
    with open(os.path.join(OUT, 'pack.json'), 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'cats': [{'id': a, 'name': b} for a, b in CATS], 'items': items}, f, ensure_ascii=False, indent=0)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
