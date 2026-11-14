// 徽章擺位計算（純計數，冇 three.js，可以用 node 測試）— v1.0 · © SCOUT SYSTEM
// 全部用厘米，數字直接嚟自規則 JSON 嘅 size / anchor。
// 上身：x = 穿著者角度（+ = 穿著者左），y = 離地高度。
// 袖：u = 望住嗰隻袖外側時嘅左右（+ = 望嘅人右手邊），v = 章中心喺肩膊縫線下幾多 cm。
import { layout } from './body.js';

/** 袖外側面嘅尺寸 */
export function sleeveFace(gender) {
  const { B } = layout(gender);
  return { width: B.sleeve.d, length: B.sleeve.len, cuffSeam: B.sleeve.len - B.sleeve.band };
}

/** 進步獎章每一步喺 2×2 格入面嘅位置（望住左袖外側）：下行紅、啡；上行藍、綠 */
export const PROGRESS_GRID = [
  { step: 1, col: -1, row: 0 },
  { step: 2, col: 1, row: 0 },
  { step: 3, col: -1, row: 1 },
  { step: 4, col: 1, row: 1 },
];

/**
 * 計出所有徽章嘅位置（就算未開都計，方便測試同聚焦）。
 * @returns {Array<{key,id,mount,shape,w,h,x?,y?,u?,v?,art,step?}>}
 */
export function placeAll(rules, gender) {
  const { B, top } = layout(gender);
  const face = sleeveFace(gender);
  const out = [];
  const box = {}; // 每個章喺袖上面佔嘅 v 範圍：{ top, bottom }

  // 先擺唔靠其他章嘅，再擺「喺某個章下面／上面」嘅
  const order = [...rules.badges].sort((a, b) => !!(a.anchor.belowBadge || a.anchor.aboveBadge) - !!(b.anchor.belowBadge || b.anchor.aboveBadge));
  for (const b of order) {
    const a = b.anchor;
    const { wCm: w, hCm: h, shape } = b.size;
    if (a.part === 'torso') {
      const sx = a.side === 'left' ? 1 : -1;
      out.push({ key: b.id, id: b.id, mount: 'torso', shape, w, h, x: sx * a.xCm, y: top - a.fromTopCm, z: B.torso.d / 2, art: b.art.file });
      continue;
    }
    const mount = a.side === 'left' ? 'l' : 'r';
    if (a.grid) {
      // 2×2 格：底邊喺袖口縫線上方 aboveCuffSeamCm
      const bottom = face.cuffSeam - a.aboveCuffSeamCm;
      box[b.id] = { top: bottom - 2 * h, bottom };
      for (const g of PROGRESS_GRID) {
        out.push({
          key: `${b.id}-${g.step}`,
          id: b.id,
          step: g.step,
          mount,
          shape,
          w,
          h,
          u: (g.col * w) / 2,
          v: bottom - h / 2 - g.row * h,
          art: b.art[g.step - 1].file,
        });
      }
      continue;
    }
    let t;
    if (a.fromShoulderCm != null) t = a.fromShoulderCm;
    else if (a.belowBadge) t = box[a.belowBadge].bottom + a.gapCm;
    else if (a.aboveBadge) t = box[a.aboveBadge].top - a.gapCm - h;
    else if (a.aboveCuffSeamCm != null) t = face.cuffSeam - a.aboveCuffSeamCm - h;
    else throw new Error(`徽章 ${b.id} 冇袖上位置`);
    box[b.id] = { top: t, bottom: t + h };
    out.push({ key: b.id, id: b.id, mount, shape, w, h, u: 0, v: t + h / 2, art: b.art.file });
  }
  return out;
}

/** 按開關揀返要顯示嘅章 */
export function visible(placements, state, { invested }) {
  return placements.filter((p) => {
    if (p.id === 'membership' && !invested) return false;
    if (p.id === 'progress') return p.step <= (state.progress || 0);
    return !!state[p.id];
  });
}
