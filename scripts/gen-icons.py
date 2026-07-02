# Erzeugt die PWA-Icons für alle Maskottchen (public/icons/).
# Aufruf: python3 scripts/gen-icons.py
from PIL import Image, ImageDraw

GRAPE = (107, 71, 232, 255)
OUT = 'public/icons'


def scaler(s, pad):
    def p(x, y):
        return (x / 64 * s * (1 - 2 * pad) + s * pad, y / 64 * s * (1 - 2 * pad) + s * pad)
    return p


def draw_fox(d, s, pad):
    p = scaler(s, pad)
    fox = (255, 138, 61, 255)
    inner = (122, 58, 16, 255)
    cream = (255, 246, 238, 255)
    dark = (43, 22, 8, 255)
    d.polygon([p(11, 28), p(15, 6), p(30, 17)], fill=fox)
    d.polygon([p(53, 28), p(49, 6), p(34, 17)], fill=fox)
    d.polygon([p(15.5, 24), p(17.5, 11), p(26, 19)], fill=inner)
    d.polygon([p(48.5, 24), p(46.5, 11), p(38, 19)], fill=inner)
    d.ellipse([p(10, 17), p(54, 57)], fill=fox)
    d.ellipse([p(19, 37.5), p(45, 56.5)], fill=cream)
    d.ellipse([p(20.5, 30.5), p(26.5, 36.5)], fill=dark)
    d.ellipse([p(37.5, 30.5), p(43.5, 36.5)], fill=dark)
    d.ellipse([p(28.8, 40.8), p(35.2, 47.2)], fill=dark)


def draw_owl(d, s, pad):
    p = scaler(s, pad)
    body = (154, 123, 209, 255)
    ears = (138, 109, 201, 255)
    belly = (238, 230, 250, 255)
    dark = (36, 21, 54, 255)
    gold = (255, 197, 49, 255)
    d.polygon([p(16, 16), p(20, 4), p(27, 13)], fill=ears)
    d.polygon([p(48, 16), p(44, 4), p(37, 13)], fill=ears)
    d.ellipse([p(11, 14), p(53, 58)], fill=body)
    d.ellipse([p(19.5, 36.5), p(44.5, 55.5)], fill=belly)
    d.ellipse([p(15.5, 22), p(31.5, 38)], fill=(255, 255, 255, 255))
    d.ellipse([p(32.5, 22), p(48.5, 38)], fill=(255, 255, 255, 255))
    d.ellipse([p(20.9, 27.4), p(28.1, 34.6)], fill=dark)
    d.ellipse([p(35.9, 27.4), p(43.1, 34.6)], fill=dark)
    d.polygon([p(32, 44), p(27.5, 37.5), p(36.5, 37.5)], fill=gold)


def draw_panda(d, s, pad):
    p = scaler(s, pad)
    dark = (42, 37, 48, 255)
    white = (255, 255, 255, 255)
    d.ellipse([p(6, 9), p(22, 25)], fill=dark)
    d.ellipse([p(42, 9), p(58, 25)], fill=dark)
    d.ellipse([p(10.5, 17), p(53.5, 57)], fill=white)
    d.ellipse([p(17, 26), p(29, 41)], fill=dark)
    d.ellipse([p(35, 26), p(47, 41)], fill=dark)
    d.ellipse([p(22.3, 30.3), p(26.3, 34.3)], fill=white)
    d.ellipse([p(37.7, 30.3), p(41.7, 34.3)], fill=white)
    d.ellipse([p(28.8, 40.8), p(35.2, 47.2)], fill=dark)


def draw_dragon(d, s, pad):
    p = scaler(s, pad)
    horn = (246, 231, 200, 255)
    body = (47, 168, 107, 255)
    snout = (169, 230, 197, 255)
    dark = (18, 53, 31, 255)
    d.polygon([p(19, 15), p(15, 3), p(27, 10)], fill=horn)
    d.polygon([p(45, 15), p(49, 3), p(37, 10)], fill=horn)
    d.ellipse([p(11, 17.5), p(53, 56.5)], fill=body)
    d.ellipse([p(19, 38), p(45, 56)], fill=snout)
    d.ellipse([p(20.5, 29.5), p(26.5, 35.5)], fill=dark)
    d.ellipse([p(37.5, 29.5), p(43.5, 35.5)], fill=dark)
    d.ellipse([p(25.7, 44.2), p(29.3, 47.8)], fill=dark)
    d.ellipse([p(34.7, 44.2), p(38.3, 47.8)], fill=dark)


MASCOTS = {'fox': draw_fox, 'owl': draw_owl, 'panda': draw_panda, 'dragon': draw_dragon}


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    return m


def make(mascot, draw_fn, size, path, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size), GRAPE)
    if maskable:
        img.paste(bg, (0, 0))
        draw_fn(ImageDraw.Draw(img), size, pad=0.14)
    else:
        img.paste(bg, (0, 0), rounded_mask(size, int(size * 0.22)))
        draw_fn(ImageDraw.Draw(img), size, pad=0.08)
    img.save(path)


for name, fn in MASCOTS.items():
    make(name, fn, 180, f'{OUT}/{name}-180.png', maskable=True)
    make(name, fn, 192, f'{OUT}/{name}-192.png')
    make(name, fn, 512, f'{OUT}/{name}-512.png')
    make(name, fn, 512, f'{OUT}/{name}-512-maskable.png', maskable=True)
print('Icons erzeugt.')
