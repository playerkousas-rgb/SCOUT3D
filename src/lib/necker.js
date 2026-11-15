// 旅巾花款：素色＋花邊、斜紋（2／3 色）、左右唔同顏色 — v1.0 · © SCOUT SYSTEM
// 斜紋款式參考用戶附圖（2026-11-13）：平攤時長邊有平行色邊，捲起之後巾尾見到重複斜紋。
export const NECKER_THIRD = '#1f4e9c';

/**
 * outfit → { left, right, split }；每邊 = { pattern: 'plain' | 'stripe', colours }。
 * plain：colours = [主色, 花邊色]；stripe：colours = [色 1, 色 2, 色 3?]（2 色或 3 色）。
 * fixed = 會巾、基維爾領巾等固定顏色（唔跟用戶揀，冇花款）。
 * 左 = 穿著者左（+x）。
 */
export function neckerPalettes(o = {}, fixed = null) {
  if (fixed) {
    const P = { pattern: 'plain', colours: [fixed, fixed] };
    return { left: P, right: P, split: false };
  }
  const pattern = o.neckerPattern === 'stripe' ? 'stripe' : 'plain';
  const n = o.neckerStripes === 2 ? 2 : 3;
  const side = (main, border, third) => ({
    pattern,
    colours: pattern === 'plain' ? [main, border] : [main, border, third].slice(0, n),
  });
  const third = o.neckerThird ?? NECKER_THIRD;
  const left = side(o.neckerMain, o.neckerBorder, third);
  const split = !!o.neckerSplit;
  const right = split ? side(o.neckerRMain ?? o.neckerMain, o.neckerRBorder ?? o.neckerBorder, o.neckerRThird ?? third) : left;
  return { left, right, split };
}

/** 斜紋：每條闊（cm）同埋某一點屬於第幾條（dir = ±1 左右鏡像） */
export const STRIPE_W = 1.6;
export function stripeIndex(x, y, n, dir = 1) {
  const k = Math.floor((y + dir * x) / STRIPE_W);
  return ((k % n) + n) % n;
}
