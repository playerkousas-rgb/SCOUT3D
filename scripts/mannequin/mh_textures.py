# SCOUT3D v1.0 · © SCOUT SYSTEM
# v33（ADR-0030）：MakeHuman CC0 貼圖 → public/models/mannequin/tex/（縮細；衫褲鞋只留「摺痕明暗」灰階圖，
# 顏色由網頁按制服上；頭髮、眉都變灰階，網頁乘返髮色）。
#   python3 scripts/mannequin/mh_textures.py <vrm-avatar-maker>/web/assets
import sys, os
from PIL import Image, ImageFilter, ImageOps

A = sys.argv[1]
T = os.path.join(A, 'textures')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'models', 'mannequin', 'tex')
os.makedirs(OUT, exist_ok=True)


def save(im, name, **kw):
    p = os.path.join(OUT, name)
    im.save(p, **kw)
    print(name, im.size, os.path.getsize(p))


# 皮膚（亞洲、年輕；男女各一）
for g in ('male', 'female'):
    im = Image.open(os.path.join(T, f'skin_young_asian_{g}.jpg')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    save(im, f'skin_{"boy" if g == "male" else "girl"}.jpg', quality=84)

save(Image.open(os.path.join(T, 'eye_brown.jpg')).convert('RGB').resize((256, 256), Image.LANCZOS), 'eyes.jpg', quality=85)


def grey_alpha(src, size, name, gamma=0.85):
    """髮／眉：灰階（平均 = 0.5）＋ alpha；網頁 color = 髮色 × 2"""
    im = Image.open(os.path.join(T, src)).convert('RGBA').resize((size, size), Image.LANCZOS)
    r, g, b, a = im.split()
    L = Image.merge('RGB', (r, g, b)).convert('L')
    px, al = list(L.getdata()), list(a.getdata())
    vals = [p for p, q in zip(px, al) if q > 128]
    mean = (sum(vals) / max(1, len(vals))) or 1
    out = [min(255, int(127 * (p / mean) ** gamma)) for p in px]
    Lo = Image.new('L', im.size)
    Lo.putdata(out)
    save(Image.merge('LA', (Lo, a)).convert('RGBA'), name, quality=88, method=6)


grey_alpha('short02.webp', 1024, 'hair_short.webp')
grey_alpha('toigo_blunt_bob.webp', 1024, 'hair_bob.webp')
grey_alpha('eyebrow001.webp', 256, 'brows.webp')
grey_alpha('eyelashes01.webp', 256, 'lashes.webp')


def shade(src, name, size=512, lo=0.62, blur=5):
    """衫褲鞋：亮度（模糊、壓窄）→ 摺痕明暗，最亮 ≈ 1；網頁乘制服顏色"""
    im = Image.open(os.path.join(T, src)).convert('L').resize((size, size), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(blur))
    px = sorted(im.getdata())
    hi = px[int(len(px) * 0.92)] or 1
    im = im.point(lambda p: int(255 * min(1.0, lo + (1 - lo) * min(1.0, p / hi))))
    save(im, name, quality=86)


shade('male_casualsuit01.jpg', 'shade_suit.jpg')
shade('female_elegantsuit01.jpg', 'shade_skirt.jpg', lo=0.7, blur=10)
shade("shoes01.jpg", "shade_shoes.jpg", lo=0.45)
