import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1]
OUT = sys.argv[2]
ORANGE = (255, 90, 31, 255)
INK = (17, 17, 17, 255)
PAPER = (247, 247, 243, 255)
SS = 4  # supersample for smooth edges


def ticket_layer(W):
    """Black ticket, drawn upright, with a tear line and notches; returns RGBA layer."""
    layer = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tw, th = int(W * 0.60), int(W * 0.78)
    x0, y0 = (W - tw) // 2, (W - th) // 2
    r = int(W * 0.07)
    d.rounded_rectangle([x0, y0, x0 + tw, y0 + th], radius=r, fill=INK)
    # tear line position: stub section at the bottom
    ty = y0 + int(th * 0.72)
    nr = int(W * 0.06)
    # notches punched out (transparent), so whatever sits behind shows through
    for cx in (x0, x0 + tw):
        d.ellipse([cx - nr, ty - nr, cx + nr, ty + nr], fill=(0, 0, 0, 0))
    # dashed tear line
    dash, gap, lw = int(W * 0.035), int(W * 0.025), max(2, int(W * 0.012))
    x = x0 + nr + gap
    while x + dash <= x0 + tw - nr - gap // 2:
        d.rounded_rectangle([x, ty - lw // 2, x + dash, ty + lw // 2], radius=lw // 2, fill=PAPER)
        x += dash + gap
    # poster S in the main section
    font = ImageFont.truetype(FONT, int(W * 0.46))
    box = d.textbbox((0, 0), 'S', font=font)
    sw, sh = box[2] - box[0], box[3] - box[1]
    cx, cy = x0 + tw / 2, y0 + (ty - y0) / 2
    d.text((cx - sw / 2 - box[0], cy - sh / 2 - box[1]), 'S', font=font, fill=PAPER)
    return layer


def make(size, with_ground):
    W = size * SS
    base = Image.new('RGBA', (W, W), ORANGE if with_ground else (0, 0, 0, 0))
    t = ticket_layer(W).rotate(-9, resample=Image.BICUBIC, center=(W / 2, W / 2))
    base.alpha_composite(t)
    return base.resize((size, size), Image.LANCZOS)


icon = make(1024, True).convert('RGB')  # App Store icon must be opaque
icon.save(f'{OUT}/icon.png')
make(1024, False).save(f'{OUT}/splash-icon.png')
# Android adaptive: foreground on transparent with safe-zone padding
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mark = make(1024, False).resize((680, 680), Image.LANCZOS)
fg.alpha_composite(mark, (172, 172))
fg.save(f'{OUT}/android-icon-foreground.png')
Image.new('RGBA', (1024, 1024), ORANGE).save(f'{OUT}/android-icon-background.png')
mono = fg.copy(); px = mono.load()
for yy in range(1024):
    for xx in range(1024):
        a = px[xx, yy][3]
        px[xx, yy] = (255, 255, 255, a)
mono.save(f'{OUT}/android-icon-monochrome.png')
icon.resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('ok')
