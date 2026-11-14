// 徽章擺位計算（純計數，冇 three.js，可以用 node 測試）— v1.0 · © SCOUT SYSTEM
// 全部用厘米，數字直接嚟自規則 JSON 嘅 size / anchor。
// 上身：x = 穿著者角度（+ = 穿著者左），y = 離地高度。
// 袖：u = 望住嗰隻袖外側時嘅左右（+ = 望嘅人右手邊），v = 章中心喺肩膊縫線下幾多 cm。
import { layout, neckerLayout, VEST_T } from './body.js';

const sectionOf = (rules) => rules?.section?.id ?? 'grasshopper';

/** 動態圖案（區章、地域章、優異旅團章、童軍小隊章）嘅 art key；真正圖案由 lib/picks.js resolveArt 決定 */
export const dynKey = (id) => `dyn:${id}`;

/** 袖外側面嘅尺寸 */
export function sleeveFace(gender, section = 'grasshopper') {
  const { B } = layout(gender, section);
  return { width: B.sleeve.d, length: B.sleeve.len, cuffSeam: B.sleeve.len - B.sleeve.band };
}

/**
 * 袖章貼片喺手臂 group 入面嘅位置同轉角（Badges.jsx 用）。貼片本身面向 +z、圖案左→右 = 本地 +x；
 * 轉 rotY 之後，圖案右手邊會指向 artRight（世界方向）。右袖：artRight = +z（近胸），
 * 即係圖案左邊（例如小隊章第一個隊色）近背 —— 同用戶確認嘅方向一致。
 */
export function sleevePose(side, sleeveW, seamY, p, eps = 0.06) {
  const s = side === 'l' ? 1 : -1;
  const rotY = (s * Math.PI) / 2;
  return {
    position: [s * (sleeveW / 2 + eps), seamY - p.v, -s * p.u],
    rotY,
    // 繞 y 軸轉 θ：本地 +x → (cos θ, 0, −sin θ)
    artRight: [Math.round(Math.cos(rotY)), 0, Math.round(-Math.sin(rotY))],
  };
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
  const section = sectionOf(rules);
  const { B, top } = layout(gender, section);
  const face = sleeveFace(gender, section);
  const out = [];
  const box = {}; // 每個章喺袖上面佔嘅 v 範圍：{ top, bottom }

  // 先擺唔靠其他章嘅，再擺「喺某個章下面／上面」嘅
  const order = [...rules.badges].sort((a, b) => !!(a.anchor.belowBadge || a.anchor.aboveBadge) - !!(b.anchor.belowBadge || b.anchor.aboveBadge));
  for (const b of order) {
    const a = b.anchor;
    const { wCm: w, hCm: h, shape } = b.size;
    const art = b.dynamic ? dynKey(b.id) : Array.isArray(b.art) ? null : b.art.file;
    const fit = b.dynamic === 'district' || b.dynamic === 'region'; // 各區圖案比例唔同：喺 w × h 入面置中縮放
    if (a.part === 'torso') {
      const sx = a.side === 'left' ? 1 : -1;
      let x = sx * a.xCm;
      let y = top - a.fromTopCm;
      if (a.pocket) {
        // 胸袋（body.js 嘅 pocket）：centre = 袋身（袋蓋以下）中央；aboveFlap = 章底喺袋蓋頂上 gapCm
        const P = B.pocket;
        if (!P) throw new Error(`徽章 ${b.id} 要胸袋，但呢個身形冇胸袋`);
        x = sx * P.x;
        const flapTop = top - P.top;
        y = a.pocket === 'centre' ? flapTop - P.flap - (P.h - P.flap) / 2 : flapTop + a.gapCm + h / 2;
      }
      out.push({ key: b.id, id: b.id, mount: 'torso', shape, w, h, x, y, z: B.torso.d / 2, art, fit });
      continue;
    }
    const mount = a.side === 'left' ? 'l' : 'r';
    // 袖面 u：+ = 望住袖外側嘅右手邊。右袖右手邊 = 穿著者前面；左袖右手邊 = 後面
    const frontSign = a.side === 'right' ? 1 : -1;
    const u = a.towards ? (a.towards === 'front' ? frontSign : -frontSign) * a.offsetCm : 0;
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
    out.push({ key: b.id, id: b.id, mount, shape, w, h, u, v: t + h / 2, art, fit, ...(b.needsInvestiture ? { inv: true } : {}) });
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
  const N = neckerLayout(layout(gender, sectionOf(rules)), { vest });
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

/**
 * 按開關揀返要顯示嘅章。
 * unavailable = 而家冇圖案嘅章（例如揀咗總會總部屬下嘅區，冇地域章）
 */
export function visible(placements, state, { invested, school = false, unavailable = [] }) {
  if (school && !invested) return []; // 未宣誓冇旅巾，冇地方戴
  return placements.filter((p) => {
    if ((p.id === 'membership' || p.inv) && !invested) return false; // 世界童軍會員章、童軍小隊章：宣誓後先戴
    if (unavailable.includes(p.id)) return false;
    if (p.id === 'progress') return p.step <= (state.progress || 0);
    return !!state[p.id];
  });
}

/** 某個章喺而家嘅服裝會唔會顯示，同埋點解唔顯示 */
export function shownReason(rules, outfit, state, id, { unavailable = [] } = {}) {
  const all = placeFor(rules, outfit);
  if (!all.some((p) => p.id === id)) return outfit.school ? 'school' : 'vest';
  if (visible(all, state, { invested: outfit.invested, school: outfit.school, unavailable }).some((p) => p.id === id)) return null;
  if (outfit.school && !outfit.invested) return 'schoolUninvested';
  if ((id === 'membership' || all.some((p) => p.id === id && p.inv)) && !outfit.invested) return 'uninvested';
  if (unavailable.includes(id)) return 'noArt';
  return 'off';
}
