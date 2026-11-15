// 布質名牌：手冊 P.128 款式（綠底、黃字、中文名喺左、英文名喺右）+ 用戶輸入嘅姓名 — v1.0 · © SCOUT SYSTEM
// 顏色由 P.128 示例圖量出嚟（底色約 #1f4f2e、字色約 #d8eb70）；字型用瀏覽器內置字型。
export const NAME_TAG = { bg: '#1f4f2e', edge: '#173d23', text: '#d8eb70', aspect: 7.5 / 1.6 };

/** art = picks.js resolveArt 嘅 nameTag 結果 { zh, en }；回傳 canvas */
export function nameTagCanvas(art, height = 96) {
  const c = document.createElement('canvas');
  c.height = height;
  c.width = Math.round(height * NAME_TAG.aspect);
  const ctx = c.getContext('2d');
  ctx.fillStyle = NAME_TAG.bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = NAME_TAG.edge;
  ctx.lineWidth = height * 0.08;
  ctx.strokeRect(0, 0, c.width, c.height);
  ctx.fillStyle = NAME_TAG.text;
  ctx.textBaseline = 'middle';
  const pad = height * 0.35;
  const parts = [art.zh, art.en].filter(Boolean);
  const size = height * 0.56;
  ctx.font = `bold ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", Arial, sans-serif`;
  const widths = parts.map((p) => ctx.measureText(p).width);
  const gap = parts.length > 1 ? height * 0.6 : 0;
  const total = widths.reduce((s, w) => s + w, 0) + gap;
  const k = Math.min(1, (c.width - pad * 2) / Math.max(1, total)); // 太長就壓窄
  let x = (c.width - total * k) / 2;
  parts.forEach((p, i) => {
    ctx.save();
    ctx.translate(x, c.height / 2);
    ctx.scale(k, 1);
    ctx.fillText(p, 0, 0);
    ctx.restore();
    x += (widths[i] + gap) * k;
  });
  return c;
}
