// 旅條：手冊 P.25、P.94 示例款式（綠底黃字：旅號 + 英文序數上標、HONG KONG GROUP／SCOUT ASSOCIATION OF HK）— v1.0 · © SCOUT SYSTEM
// 顏色由示例圖量出（底色約 #1f4b2e、字色約 #dcd34c）；尺寸 9 × 2.2 cm（手冊 P.94）。字型用瀏覽器內置字型。
export const TROOP_TAPE = { bg: '#1f4b2e', edge: '#173a23', text: '#dcd34c', aspect: 9 / 2.2 };

const FONT = 'Arial Narrow, "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';

/** 喺 maxW 入面畫一行字（太長就壓窄） */
function fitText(ctx, text, x, y, maxW) {
  const w = ctx.measureText(text).width;
  const k = Math.min(1, maxW / Math.max(1, w));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return w * k;
}

/** art = picks.js resolveArt 嘅 troopTape 結果 { no, suffix }；回傳 canvas */
export function troopTapeCanvas(art, height = 120) {
  const c = document.createElement('canvas');
  c.height = height;
  c.width = Math.round(height * TROOP_TAPE.aspect);
  const ctx = c.getContext('2d');
  const H = height;
  ctx.fillStyle = TROOP_TAPE.bg;
  ctx.fillRect(0, 0, c.width, H);
  ctx.strokeStyle = TROOP_TAPE.edge;
  ctx.lineWidth = H * 0.07;
  ctx.strokeRect(0, 0, c.width, H);
  ctx.fillStyle = TROOP_TAPE.text;
  ctx.textBaseline = 'alphabetic';

  // 左：旅號（大字）+ 序數上標；佔約 37% 闊
  const left = H * 0.22;
  const numBox = c.width * 0.37;
  ctx.font = `${H * 0.62}px ${FONT}`;
  const supSize = H * 0.24;
  const numW = fitText(ctx, String(art.no), left, H * 0.78, numBox - supSize * 1.6);
  ctx.font = `bold ${supSize}px ${FONT}`;
  fitText(ctx, art.suffix, left + numW + H * 0.04, H * 0.36, supSize * 1.6);

  // 右：兩行英文
  const x = left + numBox + H * 0.02;
  const maxW = c.width - x - H * 0.18;
  ctx.font = `bold ${H * 0.34}px ${FONT}`;
  fitText(ctx, 'HONG KONG GROUP', x, H * 0.47, maxW);
  ctx.font = `bold ${H * 0.25}px ${FONT}`;
  fitText(ctx, 'SCOUT ASSOCIATION OF HK', x, H * 0.82, maxW);
  return c;
}
