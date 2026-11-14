// 優異旅團章：手冊 P.159 底圖 + 用戶輸入嘅年份數字 — v1.0 · © SCOUT SYSTEM
// 只換年份數字（原本嘅「年優異旅團」字樣同底色保留）；字色、位置跟原圖量出嚟。
const images = new Map();

export function loadImage(url) {
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          images.delete(url);
          reject(new Error(`載入唔到 ${url}`));
        };
        img.src = url;
      }),
    );
  }
  return images.get(url);
}

/** 畫出一個優異旅團章（art = picks.js resolveArt 嘅 merit 結果），回傳 canvas */
export async function meritCanvas(art, scale = 2) {
  const img = await loadImage(art.base);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth * scale;
  c.height = img.naturalHeight * scale;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const [l, t, r, b] = art.digits;
  const box = { x: l * c.width, y: t * c.height, w: (r - l) * c.width, h: (b - t) * c.height };
  const text = String(art.year);
  // 數字高度 ≈ 字號 × 0.72（無襯線字體嘅數字高度）
  const size = box.h / 0.72;
  ctx.font = `${size}px Arial, "Helvetica Neue", Helvetica, sans-serif`;
  ctx.fillStyle = art.text;
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const sx = Math.min(1.15, box.w / Math.max(1, m.width)); // 4 位數撐滿原本嘅位
  ctx.save();
  ctx.translate(box.x + box.w - m.width * sx, box.y + box.h);
  ctx.scale(sx, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return c;
}

const urls = new Map();
/** 介面縮圖用嘅 data URL（同一年份同顏色只畫一次） */
export async function meritDataUrl(art) {
  const k = `${art.colour}-${art.year}`;
  if (!urls.has(k)) urls.set(k, meritCanvas(art, 1).then((c) => c.toDataURL('image/png')));
  return urls.get(k);
}
