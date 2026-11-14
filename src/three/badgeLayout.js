// 徽章擺位計算（純計數，冇 three.js，可以用 node 測試）— v1.0 · © SCOUT SYSTEM
// 全部用厘米，數字直接嚟自規則 JSON 嘅 size / anchor。
// 上身：x = 穿著者角度（+ = 穿著者左），y = 離地高度。
// 袖：u = 望住嗰隻袖外側時嘅左右（+ = 望嘅人右手邊），v = 章中心喺肩膊縫線下幾多 cm。
import { layout, neckerLayout, VEST_T } from './body.js';

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

const artOf = (rules, id, step) => {
  const b = rules.badges.find((x) => x.id === id);
  return { b, file: Array.isArray(b.art) ? b.art[step - 1].file : b.art.file };
};

/**
 * 學校運動上衣（未能縫章）：章改戴喺旅巾上。
 * - 'uh'：《儀容與制服手冊》P.24 — 團員章喺領巾尖中央；進步章依左袖排列，戴喺前面巾尾左、右末端。
 * - 'gsg'：《小童軍活動指引》第三版 P.9 附圖 — 團員章、小草蜢獎章並排喺領巾尖，藍、綠喺兩邊，紅、啡喺下面。
 * 左右跟手冊插圖「人看的角度」：
 *   巾尾喺前面，望住穿著者時左邊 = 穿著者右（-x）；
 *   領巾尖喺背後，企喺後面望時左邊 = 穿著者左（+x）。
 * 回傳嘅位置同上身一樣：x / y / z（cm），facing = 'front' | 'back'。
 */
export function placeSchool(rules, gender, mode = 'uh', { vest = false } = {}) {
  const N = neckerLayout(layout(gender), { vest });
  const tip = N.back.top - N.back.h; // 領巾尖最低點
  const out = [];
  const add = (id, step, x, y, facing) => {
    const { b, file } = artOf(rules, id, step);
    out.push({
      key: step ? `${id}-${step}` : id,
      id,
      step,
      mount: 'torso',
      facing,
      shape: b.size.shape,
      w: b.size.wCm,
      h: b.size.hCm,
      x,
      y,
      z: facing === 'back' ? N.back.z : N.tailZ(1) + 0.1,
      art: file,
    });
  };
  const ps = rules.badges.find((x) => x.id === 'progress').size.hCm;
  if (mode === 'gsg') {
    const m = rules.badges.find((x) => x.id === 'membership').size.wCm;
    const row = tip + 11.8; // 附圖：一行四個（藍、團員章、小草蜢獎章、綠），紅啡喺下面
    const cx = m / 2 + 0.1;
    add('membership', undefined, cx, row, 'back');
    add('grasshopperAward', undefined, -cx, row, 'back');
    add('progress', 3, cx + m / 2 + 0.2 + ps / 2, row, 'back');
    add('progress', 4, -(cx + m / 2 + 0.2 + ps / 2), row, 'back');
    add('progress', 1, cx, row - m / 2 - 0.5 - ps / 2, 'back');
    add('progress', 2, -cx, row - m / 2 - 0.5 - ps / 2, 'back');
    return out;
  }
  add('membership', undefined, 0, tip + 6.5, 'back');
  const bottom = N.tail.top - N.tail.len + N.tail.tip + 0.3; // 巾尾尖上面
  const x = N.tail.x + 0.2;
  add('progress', 1, -x, bottom + ps / 2, 'front'); // 望住穿著者：左邊巾尾 = 穿著者右
  add('progress', 3, -x, bottom + ps * 1.5, 'front');
  add('progress', 2, x, bottom + ps / 2, 'front');
  add('progress', 4, x, bottom + ps * 1.5, 'front');
  return out;
}

/**
 * 按服裝計出所有章嘅位置。
 * - 學校運動上衣：用 placeSchool（衫上面嘅章唔戴）。
 * - 背心：團員章戴喺背心左胸（手冊 P.24），所以向外移；紀念章俾背心遮住。
 */
export function placeFor(rules, outfit) {
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const vest = !!outfit.vest;
  if (outfit.school) return placeSchool(rules, gender, outfit.schoolLayout, { vest });
  return placeAll(rules, gender)
    .filter((p) => !(vest && p.id === 'commemorative'))
    .map((p) => (vest && p.id === 'membership' ? { ...p, z: p.z + VEST_T } : p));
}

/** 按開關揀返要顯示嘅章 */
export function visible(placements, state, { invested, school = false }) {
  if (school && !invested) return []; // 未宣誓冇旅巾，冇地方戴
  return placements.filter((p) => {
    if (p.id === 'membership' && !invested) return false;
    if (p.id === 'progress') return p.step <= (state.progress || 0);
    return !!state[p.id];
  });
}

/** 某個章喺而家嘅服裝會唔會顯示，同埋點解唔顯示 */
export function shownReason(rules, outfit, state, id) {
  const all = placeFor(rules, outfit);
  if (!all.some((p) => p.id === id)) return outfit.school ? 'school' : 'vest';
  if (visible(all, state, { invested: outfit.invested, school: outfit.school }).some((p) => p.id === id)) return null;
  if (outfit.school && !outfit.invested) return 'schoolUninvested';
  if (id === 'membership' && !outfit.invested) return 'uninvested';
  return 'off';
}
