# 下載香港童軍總會「地域及區」網頁上嘅地域章、區章，縮細做 PNG — v1.0 · © SCOUT SYSTEM
# 只喺 GitHub Actions 行（開發沙盒上唔到 scout.org.hk）。圖案版權屬香港童軍總會，只縮細、唔改圖。
# 用法：python3 scripts/fetch_district_badges_v1.0.py
import io, json, sys, time, urllib.request
from PIL import Image

DATA = 'src/data/districts_v1.0.json'
OUT = 'public/badges/districts'
BOX = (128, 168)  # 3.8 × 5 cm 嘅章，最多 128 × 168 px

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (SCOUT3D badge fetcher)'})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            print('retry', url, e, file=sys.stderr)
            time.sleep(2 + i * 3)
    raise SystemExit(f'下載失敗：{url}')

def save(src, dest, base):
    raw = get(base + src)
    im = Image.open(io.BytesIO(raw))
    im.seek(0)
    im = im.convert('RGBA')
    print(f'{src}: {im.size} {len(raw)} bytes')
    im.thumbnail(BOX, Image.LANCZOS)
    q = im.convert('RGB').quantize(colors=64, method=Image.Quantize.FASTOCTREE)
    q.save(f'{OUT}/{dest}', optimize=True)

def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    d = json.load(open(DATA, encoding='utf-8'))
    base = d['source']['imageBase']
    for r in d['regions']:
        if r['badge']:
            save(r['badge']['src'], r['badge']['file'].split('/')[-1], base)
        for x in r['districts']:
            save(x['src'], x['file'].split('/')[-1], base)

main()
