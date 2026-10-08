"""Stash app icon: an orange ticket stacked on a black one, black S, white ground.

python3 scripts/make-icon.py assets/fonts/StubsDisplay.ttf assets
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT, OUT = sys.argv[1], sys.argv[2]
ORANGE = (255, 90, 31, 255)
INK = (17, 17, 17, 255)
WHITE = (255, 255, 255, 255)
SS = 4  # supersample for smooth edges


def card(W, tw, th, fill, letter=False):
    layer = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = (W - tw) // 2, (W - th) // 2
    d.rounded_rectangle([x0, y0, x0 + tw, y0 + th], radius=int(W * 0.08), fill=fill)
    if letter:
        ty = y0 + int(th * 0.75)
        dash, gap, lw = int(W * 0.034), int(W * 0.024), max(2, int(W * 0.013))
        x = x0 + int(W * 0.06)
        while x + dash <= x0 + tw - int(W * 0.05):
            d.rounded_rectangle([x, ty - lw // 2, x + dash, ty + lw // 2], radius=lw // 2, fill=WHITE)
            x += dash + gap
        font = ImageFont.truetype(FONT, int(W * 0.46))
        b = d.textbbox((0, 0), 'S', font=font)
        sw, sh = b[2] - b[0], b[3] - b[1]
        cx, cy = x0 + tw / 2, y0 + (ty - y0) / 2
        d.text((cx - sw / 2 - b[0], cy - sh / 2 - b[1]), 'S', font=font, fill=INK)
    return layer


def shift(layer, dx, dy):
    return layer.transform(layer.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), resample=Image.BICUBIC)


def mark(W):
    back = card(W, int(W * 0.54), int(W * 0.72), INK).rotate(10, resample=Image.BICUBIC, center=(W / 2, W / 2))
    back = shift(back, -W * 0.06, -W * 0.03)
    front = card(W, int(W * 0.56), int(W * 0.74), ORANGE, letter=True).rotate(-6, resample=Image.BICUBIC, center=(W / 2, W / 2))
    front = shift(front, W * 0.04, W * 0.01)
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    out.alpha_composite(back)
    out.alpha_composite(front)
    return out


def make(size, ground):
    W = size * SS
    base = Image.new('RGBA', (W, W), ground or (0, 0, 0, 0))
    base.alpha_composite(mark(W))
    return base.resize((size, size), Image.LANCZOS)


icon = make(1024, WHITE).convert('RGB')  # App Store icon must be opaque
icon.save(f'{OUT}/icon.png')
make(1024, None).save(f'{OUT}/splash-icon.png')
# Android adaptive: mark inside the safe zone on transparent, white behind
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
fg.alpha_composite(make(1024, None).resize((680, 680), Image.LANCZOS), (172, 172))
fg.save(f'{OUT}/android-icon-foreground.png')
Image.new('RGBA', (1024, 1024), WHITE).save(f'{OUT}/android-icon-background.png')
mono = fg.copy()
px = mono.load()
for yy in range(1024):
    for xx in range(1024):
        px[xx, yy] = (255, 255, 255, px[xx, yy][3])
mono.save(f'{OUT}/android-icon-monochrome.png')
icon.resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('ok')
