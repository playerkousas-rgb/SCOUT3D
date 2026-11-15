// 徽章擺位計算（純計數，冇 three.js，可以用 node 測試）— v1.0 · © SCOUT SYSTEM
// 全部用厘米，數字直接嚟自規則 JSON 嘅 size / anchor。
// 上身：x = 穿著者角度（+ = 穿著者左），y = 離地高度。
// 袖：u = 望住嗰隻袖外側時嘅左右（+ = 望嘅人右手邊），v = 章中心喺肩膊縫線下幾多 cm。
import { layout, neckerLayout, strapLayout, dressLayout, leaderUniform, isDress, VEST_T } from './body.js';

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

/** 某套制服用邊個位置（anchorBy：例如感謝章喺晚禮服改戴喺右襟領童軍徽下面） */
export const anchorOf = (b, uniform) => (uniform && b.anchorBy?.[uniform]) || b.anchor;

/** 有選項（例：銀／金）嘅章每個有圖案嘅選項各出一個；冇選項就用 b.art */
const artOpts = (b, art) => (b.choices ? b.choices.filter((c) => c.art).map((c) => ({ choice: c.id, art: c.art.file })) : [{ art }]);

/** 圖案（px = [闊, 高] 像素）喺 w × h 入面置中縮放（勳章相片比例唔同） */
export function fitPx(px, w, h) {
  const k = Math.min(w / px[0], h / px[1]);
  return { w: Math.round(px[0] * k * 100) / 100, h: Math.round(px[1] * k * 100) / 100 };
}

/** 勳章圓形牌當 3.6 cm 高：勳章底喺袋蓋頂下面 3.6 cm（手冊 P.187「圓形牌頂端緊貼袋蓋頂」、P.193 各勳章底同一水平） */
export const DISC_CM = 3.6;
/** 晚禮服小型章 = 一半大小（手冊冇寫尺寸） */
export const MINI = 0.5;

/**
 * 掛頸勳章（手冊 P.186 插圖：勳章喺胸袋袋蓋附近）：v17 用戶指示「要低D」。
 * 相片頂嘅 U 形綬帶（STRAP_CROP，相高嘅 8%）唔畫，改由衣領拉落嚟（Badges.jsx 用相片嗰一行拉長），勳章本身向下移 NECK_DROP cm。
 */
export const NECK_DROP = { default: 7, u2: 4 };
export const STRAP_CROP = 0.08;

/** 一般場合勳條模式（手冊 P.190、P.194）：只限 rules.ribbons.uniforms（禮服、恤衫；晚禮服冇勳條） */
export const ribbonsOn = (rules, uniform, occasion) => !!(rules?.ribbons && occasion === 'general' && uniform && rules.ribbons.uniforms.includes(uniform));

/** 所有勳條圖（預先載入 texture 用） */
export function ribbonUrls(rules) {
  const out = [];
  for (const b of rules.badges || []) {
    if (b.ribbon?.file) out.push(b.ribbon.file);
    for (const c of b.choices || []) if (c.ribbon?.file) out.push(c.ribbon.file);
  }
  return out;
}

/**
 * 計出所有徽章嘅位置（就算未開都計，方便測試同聚焦）。
 * uniform = 成年成員制服編號（anchorBy、晚禮服襟領用）
 * @returns {Array<{key,id,mount,shape,w,h,x?,y?,u?,v?,art,step?}>}
 */
export function placeAll(rules, gender, { sweater = false, uniform = null, occasion = 'formal' } = {}) {
  const section = sectionOf(rules);
  const L = layout(gender, section);
  const { B, top } = L;
  const face = sleeveFace(gender, section);
  const out = [];
  const box = {}; // 每個章喺袖上面佔嘅 v 範圍：{ top, bottom }

  // 先擺唔靠其他章嘅，再擺「喺某個章下面／上面」嘅
  const dep = (a) => !!(a.belowBadge || a.aboveBadge || a.onBadge || (a.slot && rules.slots?.[a.slot]?.belowBadge));
  // alsoAnchor（v22）：同一個章戴喺兩個位置（例：深資童軍急救章左右兩袖都戴，手冊 P.148）—— 當多一個章計，key 加 '-2'
  const badges = rules.badges.flatMap((b) => (b.alsoAnchor ? [b, { ...b, anchor: b.alsoAnchor, anchorBy: undefined, twin: true }] : [b]));
  const order = badges.sort((a, b) => dep(anchorOf(a, uniform)) - dep(anchorOf(b, uniform)));
  const onStrap = {}; // 職級肩章喺肩帶上嘅位置（「R」字樣別針跟住佢）
  const RB = ribbonsOn(rules, uniform, occasion) ? rules.ribbons : null;
  for (const b of order) {
    const a = anchorOf(b, uniform);
    const { wCm: w, hCm: h, shape } = b.size;
    const art = b.dynamic ? dynKey(b.id) : Array.isArray(b.art) ? null : b.art?.file ?? null;
    const fit = b.dynamic === 'district' || b.dynamic === 'region' || b.dynamic === 'nameTag'; // 各區圖案比例唔同：喺 w × h 入面置中縮放
    const extra = { ...(b.needsInvestiture ? { inv: true } : {}), ...(b.levels ? { levels: b.levels } : {}), ...(b.hiddenBy ? { hiddenBy: b.hiddenBy } : {}), ...(b.limitWhen ? { limitWhen: b.limitWhen } : {}), ...(b.requires ? { requires: b.requires } : {}) };
    const sx = a.side === 'left' ? 1 : -1;
    const withArt = (b.choices || []).filter((c) => c.art);
    if (RB && (a.part === 'neck' || a.rack)) {
      // 一般場合（手冊 P.190、P.194）：勳章同掛頸勳章全部改戴勳條，一律喺右胸袋袋蓋上方中央；排法喺 arrangeRacks（grid）
      const P = B.pocket;
      if (!P) throw new Error(`徽章 ${b.id} 要胸袋先戴到勳條`);
      const rack = { name: 'ribbon', grid: true, perRow: RB.perRow, cx: -P.x, inward: 1, bottom: top - P.top + RB.aboveFlapCm };
      const opts = b.choices ? withArt.filter((c) => c.ribbon).map((c) => ({ choice: c.id, file: c.ribbon.file, order: c.order })) : b.ribbon ? [{ file: b.ribbon.file, order: b.rackOrder }] : [];
      for (const o of opts) {
        out.push({
          key: [b.id, o.choice].filter(Boolean).join('-'), id: b.id, ...(o.choice ? { choice: o.choice } : {}), kind: 'ribbon', mount: 'torso', shape: 'rect',
          w: RB.wCm, h: RB.hCm, x: rack.cx, y: rack.bottom + RB.hCm / 2, z: B.torso.d / 2, art: o.file, rack, order: o.order, ...extra,
        });
      }
      continue;
    }
    if (a.slot) {
      // v21 佩戴位置「行」（slot）：同一行嘅章並排、上下幾層按顯示咗邊幾個先排（arrangeSlots）；呢度先計「自己一個」嘅位置
      const def = rules.slots?.[a.slot];
      if (!def) throw new Error(`徽章 ${b.id} 嘅 slot ${a.slot} 未登記`);
      let geo;
      if (def.part === 'torso') {
        const P = B.pocket;
        if (!P) throw new Error(`徽章 ${b.id} 要胸袋，但呢個身形冇胸袋`);
        const s2 = def.side === 'left' ? 1 : -1;
        geo = { kind: 'torso', cx: s2 * P.x, inward: -s2, maxW: P.w, flapTop: top - P.top, z: B.torso.d / 2 };
      } else {
        let start;
        if (def.fromShoulderCm != null) start = def.fromShoulderCm;
        else if (def.belowBadge && box[def.belowBadge]) start = box[def.belowBadge].bottom;
        else continue; // 嗰個章唔戴喺呢套制服
        geo = { kind: 'sleeve', start, frontSign: def.side === 'right' ? 1 : -1, maxW: face.width - 1 };
      }
      const opts = b.choices ? withArt.map((c) => ({ choice: c.id, art: c.art, layer: c.layer ?? a.layer, rank: c.rank ?? a.rank })) : [{ art: b.art, layer: a.layer, rank: a.rank }];
      for (const o of opts) {
        const f = a.exact || b.dynamic ? { w, h } : fitPx(o.art.px, w, h); // exact：沿用 size（例：香港章 4 × 5.6 cm，唔跟相片比例）；動態圖案（地域章／區章）喺框入面置中縮放
        const slot = { name: a.slot, layer: o.layer, rank: o.rank, def, geo };
        const base = { key: [b.id, o.choice].filter(Boolean).join('-'), id: b.id, ...(o.choice ? { choice: o.choice } : {}), shape, w: f.w, h: f.h, art: b.dynamic ? art : o.art.file, slot, ...(fit || b.fit ? { fit: true } : {}), ...extra };
        out.push(...arrangeSlot([{ ...base, ...(geo.kind === 'torso' ? { mount: 'torso', x: geo.cx, y: 0, z: geo.z } : { mount: def.side === 'left' ? 'l' : 'r', u: 0, v: 0 }) }], []).kept);
      }
      continue;
    }
    if (a.part === 'neck') {
      // 編號 3、5、6（恤衫＋領巾）：綬帶喺領巾、巾圈同木章前面；編號 4 喺領帶前面（巾圈最出到胸口外 1.7 cm）
      const neckZ = uniform && !isDress(uniform) ? 2.4 : 0.4;
      // 卓越服務勳章（手冊 P.186、P.189）：掛頸，綬帶由衣領兩邊落；相片頂喺膊頭（衣領底）
      // v17：勳章向下移 drop cm；相片頂 STRAP_CROP 唔畫，綬帶（strapCm）由衣領（top + 0.3）拉落去相片頂
      const drop = (uniform && NECK_DROP[uniform]) ?? NECK_DROP.default;
      for (const c of withArt) {
        const f = fitPx(c.art.px, w, h);
        const hc = Math.round(f.h * (1 - STRAP_CROP) * 100) / 100;
        const strapCm = Math.round((f.h * STRAP_CROP + drop) * 100) / 100;
        const y = Math.round((top + 0.3 - strapCm - hc / 2) * 100) / 100;
        out.push({ key: `${b.id}-${c.id}`, id: b.id, choice: c.id, mount: 'torso', shape, w: f.w, h: hc, x: 0, y, z: B.torso.d / 2 + neckZ, art: c.art.file, crop: 1 - STRAP_CROP, strapCm, ...extra });
      }
      continue;
    }
    if (a.rack) {
      // 勳章排（手冊 P.187、P.189、P.193）：先記低排嘅位置，真正 x 喺 arrangeRacks 按顯示咗邊幾個先計
      const k = a.rack === 'lapel' ? MINI : 1;
      let rack;
      if (a.rack === 'pocket') {
        const P = B.pocket;
        rack = { name: 'pocket', cx: sx * P.x, inward: -sx, maxW: P.w, bottom: top - P.top - DISC_CM };
      } else {
        const D = dressLayout(L, uniform);
        if (!D.fleur) throw new Error(`徽章 ${b.id} 要晚禮服翻領`);
        rack = { name: 'lapel', cx: sx * D.fleur.x, inward: -sx, maxW: D.lapelW, bottom: D.fleur.y + D.fleur.size / 2 + 0.4 };
      }
      const opts = b.choices ? withArt.map((c) => ({ choice: c.id, art: c.art, order: c.order })) : [{ art: b.art, order: b.rackOrder }];
      for (const o of opts) {
        const f = fitPx(o.art.px, w * k, h * k);
        out.push({
          key: [b.id, o.choice].filter(Boolean).join('-'), id: b.id, ...(o.choice ? { choice: o.choice } : {}), mount: 'torso', shape, w: f.w, h: f.h,
          x: rack.cx, y: rack.bottom + f.h / 2, z: B.torso.d / 2, art: o.art.file, rack, order: o.order, mini: k < 1, ...extra,
        });
      }
      continue;
    }
    if (a.lanyard) {
      // 嘉許笛繩（手冊 P.188–189）：3D 繩由 Blocky 畫（kind = 'lanyard'）；呢度嘅位置只係俾顯示同聚焦用
      const D = uniform === 'u2' ? dressLayout(L, uniform) : null;
      const P = B.pocket;
      for (const c of withArt) {
        out.push({
          key: `${b.id}-${c.id}`, id: b.id, choice: c.id, kind: 'lanyard', mini: !!D, mount: 'torso', shape, w, h, end: a.lanyardEnd ?? 'pocketMouth',
          x: D ? sx * D.fleur.x : sx * (P.x - P.w / 4), y: D ? D.fleur.y + 4 : top - P.top + 3, z: B.torso.d / 2, art: c.art.file, ...extra,
        });
      }
      continue;
    }
    if (a.lapel === 'belowFleur') {
      // 晚禮服：右襟領童軍徽下面（手冊 P.189）
      const D = dressLayout(L, uniform);
      for (const o of artOpts(b, art)) {
        out.push({ key: [b.id, o.choice].filter(Boolean).join('-'), id: b.id, ...(o.choice ? { choice: o.choice } : {}), mount: 'torso', shape, w, h, x: sx * D.fleur.x, y: D.fleur.y - D.fleur.size / 2 - a.gapCm - h / 2, z: B.torso.d / 2, art: o.art, fit: !!b.fit, ...extra });
      }
      continue;
    }
    if (a.band) {
      // 喪禮黑布（手冊 P.162）：一圈套住左袖、手肘上方；v = 黑布中心喺肩膊縫線下幾多 cm
      const seamToElbow = top - L.shoulderY + B.upperArm.h;
      out.push({ key: b.id, id: b.id, kind: 'band', mount: a.side === 'left' ? 'l' : 'r', shape, w, h, u: 0, v: seamToElbow - a.aboveElbowCm - h / 2, art, ...extra });
      continue;
    }
    if (a.part === 'shoulder' && (a.upTowards === 'collar' || a.onBadge)) {
      // 成年成員職級肩章（手冊 P.106、P.172）：套喺肩帶膊頭嗰頭、緊貼肩帶末端；徽號向衣領（圖案上 = 向衣領）。
      // 闊（w）橫跨肩帶，高（h）沿肩帶。「R」字樣別針（P.105）喺肩章徽號下面，即係近膊頭嗰半。
      // 轉角次序 YXZ：先 X 轉 -90°（平放、圖案上 = 向後），再 Y 轉 ±90°（圖案上 = 向衣領）。
      const S = strapLayout(layout(gender, section), { sweater });
      if (!S) throw new Error(`徽章 ${b.id} 要肩帶，但呢個身形冇肩帶`);
      for (const [k, sx] of [['l', 1], ['r', -1]]) {
        let x;
        let y = S.base + S.t;
        if (a.onBadge) {
          const host = onStrap[`${a.onBadge}-${k}`];
          if (!host) throw new Error(`徽章 ${b.id} 要先有 ${a.onBadge}`);
          x = host.x + sx * a.alongCm; // 向膊頭
          y = host.y + 0.04;
        } else {
          x = sx * (S.outer - 0.3 - h / 2);
          onStrap[`${b.id}-${k}`] = { x, y };
        }
        out.push({
          key: `${b.id}-${k}`, id: b.id, mount: 'torso', facing: 'up', shape, w, h, x, y, z: 0,
          rot: [-Math.PI / 2, (sx * Math.PI) / 2, 0, 'YXZ'],
          art, ...extra, ...(a.onBadge ? { requires: a.onBadge } : {}),
        });
      }
      continue;
    }
    if (a.part === 'shoulder') {
      // 深資童軍肩章：套喺雙肩肩帶上（手冊 P.145、P.170）。方頭（圖案左、徽號）近膊頭，圓頭近衣領。
      // 右膊（-x）：圖案右 = +x（向衣領）、圖案上 = 向後；左膊（+x）係同一款章轉 180°。
      const S = strapLayout(layout(gender, section), { sweater });
      if (!S) throw new Error(`徽章 ${b.id} 要肩帶，但呢個身形冇肩帶`);
      // 有 choices 就每個有圖案嘅選項各出一對（visible() 按揀咗邊個顯示）
      const opts = b.choices ? b.choices.filter((c) => c.art).map((c) => ({ choice: c.id, art: c.art.file })) : [{ art }];
      for (const o of opts) {
        for (const [k, sx] of [['l', 1], ['r', -1]]) {
          out.push({
            key: [b.id, o.choice, k].filter(Boolean).join('-'), id: b.id, mount: 'torso', facing: 'up', shape, w, h,
            x: sx * (S.outer - 0.3 - w / 2), y: S.base + S.t, z: 0,
            rot: sx > 0 ? [Math.PI / 2, Math.PI, 0] : [-Math.PI / 2, 0, 0],
            art: o.art, ...(o.choice ? { choice: o.choice } : {}), ...(b.needsInvestiture ? { inv: true } : {}),
          });
        }
      }
      continue;
    }
    if (a.part === 'torso') {
      let x = sx * a.xCm;
      let y = top - a.fromTopCm;
      if (a.pocket) {
        // 胸袋（body.js 嘅 pocket）：centre = 袋身（袋蓋以下）中央；aboveFlap = 章底喺袋蓋頂上 gapCm；flap = 袋蓋中央
        const P = B.pocket;
        if (!P) throw new Error(`徽章 ${b.id} 要胸袋，但呢個身形冇胸袋`);
        x = sx * P.x;
        // flapInnerCm：袋蓋近中線嗰邊（例：民政及青年事務局局長嘉許「左胸袋袋蓋右方」，手冊 P.198）
        if (a.flapInnerCm != null) x = sx * (P.x - P.w / 2 + a.flapInnerCm);
        const flapTop = top - P.top;
        y = a.pocket === 'centre' ? flapTop - P.flap - (P.h - P.flap) / 2 : a.pocket === 'flap' ? flapTop - P.flap / 2 : flapTop + a.gapCm + h / 2;
      }
      for (const o of artOpts(b, art)) {
        out.push({ key: [b.id, o.choice].filter(Boolean).join('-'), id: b.id, ...(o.choice ? { choice: o.choice } : {}), mount: 'torso', shape, w, h, x, y, z: B.torso.d / 2 + (a.flapInnerCm != null ? 0.05 : 0), art: o.art, fit: fit || !!b.fit, ...extra });
      }
      continue;
    }
    const mount = a.side === 'left' ? 'l' : 'r';
    // 袖面 u：+ = 望住袖外側嘅右手邊。右袖右手邊 = 穿著者前面；左袖右手邊 = 後面
    const frontSign = a.side === 'right' ? 1 : -1;
    const u = a.towards ? (a.towards === 'front' ? frontSign : -frontSign) * a.offsetCm : 0;
    if (a.stack) {
      // 服務段章（手冊 P.184、P.189）：第一段底喺袖口縫線上方 aboveCuffSeamCm，之後每段縫喺上一段上面；
      // 每個選項（一至四段）係一張疊好嘅相，高度 = 段數 × 每段高度（按相片比例縮放）
      const bottom = face.cuffSeam - a.aboveCuffSeamCm;
      for (const c of withArt) {
        const f = fitPx(c.art.px, w, h * c.count);
        out.push({ key: `${b.id}-${c.id}`, id: b.id, choice: c.id, count: c.count, mount, shape, w: f.w, h: f.h, u, v: bottom - f.h / 2, art: c.art.file, ...extra });
      }
      box[b.id] = { top: bottom - h * 4, bottom };
      continue;
    }
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
    else if (a.belowBadge && !box[a.belowBadge]) continue; // 嗰個章唔戴喺呢套制服
    else if (a.belowBadge) t = box[a.belowBadge].bottom + a.gapCm;
    else if (a.aboveBadge) t = box[a.aboveBadge].top - a.gapCm - h;
    else if (a.aboveCuffSeamCm != null) t = face.cuffSeam - a.aboveCuffSeamCm - h;
    else throw new Error(`徽章 ${b.id} 冇袖上位置`);
    box[b.id] = { top: t, bottom: t + h };
    out.push({ key: b.id, id: b.id, mount, shape, w, h, u, v: t + h / 2, art, fit: fit || !!b.fit, ...extra });
  }
  // 同一個章兩個位置：第二個 key 加 '-2'（React key、聚焦用）
  const seen = new Set();
  return out.map((p) => {
    if (!seen.has(p.key)) {
      seen.add(p.key);
      return p;
    }
    return { ...p, key: `${p.key}-2` };
  });
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
/** 成年成員制服毛衣（手冊 P.122、P.127）：只戴世界童軍會員章、香港章、香港肩章／旅章、職級肩章（連「R」字樣別針）、布質名牌 */
export const LEADER_SWEATER = new Set(['membership', 'hongKong', 'hkTitle', 'troop', 'epaulette', 'retiredPin', 'nameTag']);

export function placeFor(rules, outfit) {
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const vest = !!outfit.vest;
  if (sectionOf(rules) === 'leader') {
    // 成年成員：章跟制服編號（uniforms）；禮服／晚禮服上衣同制服毛衣一樣係一層殼，胸前章向外移、肩章喺外套肩帶上
    const uid = leaderUniform(gender, outfit.uniform);
    const dress = isDress(uid);
    const sweater = !dress && !!outfit.sweater;
    const R = { ...rules, badges: rules.badges.filter((b) => (!b.uniforms || b.uniforms.includes(uid)) && (!sweater || LEADER_SWEATER.has(b.id))) };
    const shell = dress || sweater;
    return placeAll(R, gender, { sweater: shell, uniform: uid, occasion: outfit.occasion }).map((p) => (shell && p.mount === 'torso' && p.facing !== 'up' ? { ...p, z: p.z + VEST_T } : p));
  }
  if (outfit.school) return placeSchool(rules, gender, outfit.schoolLayout, { vest });
  if (outfit.sweater && hasSweater(rules)) {
    // 制服毛衣（手冊 P.122）：只戴世界童軍會員章、香港章、旅章（「或制服毛衣相同位置」）同深資童軍肩章；
    // 其他章唔可以戴喺毛衣上。胸前章向外移一個毛衣厚度；袖章喺毛衣袖同一位置。
    const ok = new Set(rules.badges.filter((b) => b.sweater === true).map((b) => b.id));
    return placeAll(rules, gender, { sweater: true })
      .filter((p) => ok.has(p.id))
      .map((p) => (p.mount === 'torso' && p.facing !== 'up' ? { ...p, z: p.z + VEST_T } : p));
  }
  return placeAll(rules, gender)
    .filter((p) => !(vest && p.id === 'commemorative'))
    .map((p) => (vest && p.id === 'membership' ? { ...p, z: p.z + VEST_T } : p));
}

/** 呢個支部有冇制服毛衣（規則 JSON 有 sweater 衣物） */
export const hasSweater = (rules) => (rules.garments || []).some((g) => g.id === 'sweater');

/** 成年成員：呢個章喺呢個單位層級戴唔戴（冇 levels = 全部層級都戴；冇揀層級 = 唔篩） */
export const levelOk = (p, level) => !p.levels || !level || p.levels.includes(level);

/**
 * 按開關揀返要顯示嘅章。
 * unavailable = 而家冇圖案嘅章（例如揀咗總會總部屬下嘅區，冇地域章）
 * level = 成年成員單位層級（旅／區／地域／總部）：香港肩章／旅章、總會總部章／地域章／區章跟層級（手冊 P.94–95）
 */
/** 某個章揀咗（有選項嘅章唔係「冇」） */
const isOn = (state, id) => !!state[id] && state[id] !== 'none';
/** 俾另一個獎勵取代（例：獲頒長期服務獎章之後唔再戴服務段章，手冊 P.189） */
export const hiddenBy = (p, state) => (p.hiddenBy || []).find((id) => isOn(state, id)) ?? null;
/** 同另一個獎勵一齊戴時只限某幾個選項（例：特殊貢獻星章只可以同第十次嘅徽章一齊戴，手冊 P.183） */
export const limited = (p, state) => !!(p.limitWhen && p.choice && isOn(state, p.limitWhen.badge) && !p.limitWhen.choices.includes(p.choice));

export function visible(placements, state, { invested, school = false, unavailable = [], level = null }) {
  if (school && !invested) return []; // 未宣誓冇旅巾，冇地方戴
  const on = (p) => {
    if ((p.id === 'membership' || p.inv) && !invested) return false; // 世界童軍會員章、童軍小隊章：宣誓後先戴
    if (unavailable.includes(p.id)) return false;
    if (!levelOk(p, level)) return false;
    if (p.id === 'progress') return p.step <= (state.progress || 0);
    if (hiddenBy(p, state)) return false;
    if (limited(p, state)) return false;
    if (p.choice) return state[p.id] === p.choice; // 有選項嘅章（例：深資童軍肩章）
    return !!state[p.id];
  };
  const first = placements.filter(on);
  // 跟住另一個章嘅（「R」字樣別針喺職級肩章上）：嗰個章冇顯示就唔顯示
  const ids = new Set(first.map((p) => p.id));
  const shown = first.filter((p) => !p.requires || ids.has(p.requires));
  return arrangeSlots(arrangeRacks(centreLonePair(placements, shown)));
}

/**
 * v21 佩戴位置「行」（slot）：手冊 P.164–167、P.171–172；綱要 P.12。
 * 上身（胸袋）：layers 由下至上；第一層底 = 袋蓋頂 + gapCm（上面仲有層就用 gapIfAboveCm，例：飛行章同寰宇童軍章一齊戴時喺袋蓋上方 2 cm）；
 *   之後每層喺下一層頂上 0.4 cm 或者自己嘅 gapCm（取高嗰個）；clearRacks = 要喺勳章／勳條上面。
 * 袖：layers 由上至下；第一層頂 = start + gapCm，之後每層喺上一層底下面 gapCm。
 * 每層：按 rank（細 = 排先）最多 max 個；from = 'inner'（近中線先）／'outer'／'front'（袖：近前面先）；並排置中，太闊就縮細。
 * @returns {{ kept: Array, dropped: Array }}
 */
export function arrangeSlot(items, others) {
  const GAP0 = 0.4;
  let GAP = GAP0;
  if (!items.length) return { kept: [], dropped: [] };
  const { def, geo } = items[0].slot;
  const kept = [];
  const dropped = [];
  const byLayer = def.layers.map((L) => {
    const mine = items.filter((p) => p.slot.layer === L.id).sort((a, b) => a.slot.rank - b.slot.rank || a.id.localeCompare(b.id));
    const n = L.max ?? mine.length;
    dropped.push(...mine.slice(n));
    return { L, list: mine.slice(0, n) };
  }).filter((x) => x.list.length);
  const rowX = (list, from, maxW) => {
    const k = Math.min(1, maxW / (list.reduce((s, p) => s + p.w, 0) + GAP * (list.length - 1)));
    const sized = list.map((p) => (k < 1 ? { ...p, w: Math.round(p.w * k * 100) / 100, h: Math.round(p.h * k * 100) / 100 } : p));
    const total = sized.reduce((s, p) => s + p.w, 0) + GAP * (sized.length - 1);
    let o = total / 2; // 由第一個（from 嗰邊）開始
    return sized.map((p) => {
      const c = o - p.w / 2;
      o -= p.w + GAP;
      return { p, off: from === 'outer' ? -c : c };
    });
  };
  if (geo.kind === 'torso') {
    let floor = -Infinity;
    if (def.clearRacks) for (const q of others) if (q.rack && Math.sign(q.x) === Math.sign(geo.cx)) floor = Math.max(floor, q.y + q.h / 2 + GAP);
    let prevTop = -Infinity;
    byLayer.forEach(({ L, list }, i) => {
      GAP = L.spacingCm ?? GAP0;
      const gap = L.gapIfAboveCm != null && i < byLayer.length - 1 ? L.gapIfAboveCm : L.gapCm;
      const bottom = Math.max(geo.flapTop + gap, prevTop + GAP0, L.gapCm > 0 ? floor : -Infinity);
      let top = bottom;
      for (const { p, off } of rowX(list, L.from ?? 'inner', geo.maxW)) {
        kept.push({ ...p, x: geo.cx + geo.inward * off, y: bottom + p.h / 2 });
        top = Math.max(top, bottom + p.h);
      }
      prevTop = top;
    });
  } else {
    let prev = geo.start;
    byLayer.forEach(({ L, list }, i) => {
      GAP = L.spacingCm ?? GAP0; // 同一行章與章之間（例：地域章、區章相距 1 cm，手冊 P.95）
      // 袖：上面嘅層冇章就由下一層補上去（用第一層嘅距離），唔留空位
      const t = prev + ((i === 0 ? def.layers[0].gapCm : L.gapCm) ?? 0);
      let bottom = t;
      for (const { p, off } of rowX(list, L.from === 'back' ? 'outer' : 'inner', geo.maxW)) {
        // 袖：off + = 近前面（from front）；u + = 望住袖外側嘅右手邊（右袖 = 前、左袖 = 後）
        kept.push({ ...p, u: geo.frontSign * off + 0, v: t + p.h / 2 });
        bottom = Math.max(bottom, t + p.h);
      }
      prev = bottom;
    });
  }
  return { kept, dropped };
}

/** 將所有 slot 章按顯示咗邊幾個重新排；超出每層 max 嘅唔顯示 */
export function arrangeSlots(list) {
  const groups = new Map();
  for (const p of list) if (p.slot) groups.set(p.slot.name, [...(groups.get(p.slot.name) ?? []), p]);
  if (!groups.size) return list;
  const others = list.filter((p) => !p.slot);
  const moved = new Map();
  const gone = new Set();
  for (const items of groups.values()) {
    const { kept, dropped } = arrangeSlot(items, others);
    for (const p of kept) moved.set(p.key, p);
    for (const p of dropped) gone.add(p.key);
  }
  return list.filter((p) => !gone.has(p.key)).map((p) => moved.get(p.key) ?? p);
}

/**
 * 勳章排（手冊 P.187、P.189、P.193）：按 P.191–192 等級（order 細 = 高）由內側（近中線）排去外側；
 * 兩至三個並排，四個或以上（或者太闊）就重疊，最高等級喺最上面；底部同一水平（y 已經喺 placeAll 計好）。
 */
export function arrangeRacks(list) {
  const groups = new Map();
  for (const p of list) if (p.rack) groups.set(p.rack.name, [...(groups.get(p.rack.name) ?? []), p]);
  if (!groups.size) return list;
  const moved = new Map();
  const GAP = 0.15;
  for (const items of groups.values()) {
    const R = items[0].rack;
    if (R.grid) {
      for (const p of arrangeRibbons(items)) moved.set(p.key, p);
      continue;
    }
    const sorted = [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const n = sorted.length;
    const steps = sorted.slice(1).map((p, i) => (sorted[i].w + p.w) / 2 + GAP);
    const natural = sorted.reduce((s, p) => s + p.w, 0) + GAP * (n - 1);
    const overlap = n >= 4 || natural > R.maxW;
    const span = overlap ? Math.min(natural, R.maxW) : natural;
    const ends = (sorted[0].w + sorted[n - 1].w) / 2;
    const sum = steps.reduce((s, v) => s + v, 0);
    const k = overlap && sum > 0 ? Math.max(0, (span - ends) / sum) : 1;
    let pos = -span / 2 + sorted[0].w / 2; // 由排中心向外量（+ = 外側）
    sorted.forEach((p, i) => {
      if (i > 0) pos += steps[i - 1] * k;
      moved.set(p.key, { ...p, x: Math.round((R.cx - R.inward * pos) * 100) / 100, z: p.z + (n - i) * 0.03, overlap });
    });
  }
  return list.map((p) => moved.get(p.key) ?? p);
}

/**
 * 勳條（手冊 P.194–195）：按等級（order 細 = 高）排；每行 perRow 個，緊貼串連（金屬胸針）。
 * 多出嚟嘅（n % perRow 個，即最高等級嗰幾個）喺最上面一行並置中；下面每行 perRow 個。
 * 每行由內側（近中線，佩戴者左）至外側（佩戴者右）由高至低 —— 同 P.195 四個例子一致。
 */
export function arrangeRibbons(items) {
  if (!items.length) return [];
  const R = items[0].rack;
  const per = R.perRow || 3;
  const sorted = [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const n = sorted.length;
  const first = n % per || per;
  const rows = [sorted.slice(0, first)];
  for (let i = first; i < n; i += per) rows.push(sorted.slice(i, i + per));
  const out = [];
  rows.forEach((row, ri) => {
    const fromBottom = rows.length - 1 - ri;
    row.forEach((p, k) => {
      const off = (k - (row.length - 1) / 2) * p.w; // + = 外側
      out.push({ ...p, x: Math.round((R.cx - R.inward * off) * 100) / 100, y: Math.round((R.bottom + p.h / 2 + fromBottom * p.h) * 100) / 100, row: ri, col: k });
    });
  });
  return out;
}

/** 袖上並排嘅一對章（地域章喺前、區章喺後，手冊 P.95） */
export const SIDE_BY_SIDE = ['region', 'district'];

/**
 * 並排嘅一對章只得一個顯示（例：總會總部屬下嘅銀禧區冇地域章，或者熄咗其中一個）→ 嗰個章放返中間（用戶指示）。
 * 之後總會幹部制服只得一個總會章都係咁。只改袖章（u = 0），高度唔變。
 */
export function centreLonePair(placements, shown) {
  const pair = (list) => list.filter((p) => SIDE_BY_SIDE.includes(p.id) && p.mount !== 'torso');
  if (pair(placements).length < 2) return shown;
  const lone = pair(shown);
  if (lone.length !== 1) return shown;
  return shown.map((p) => (p === lone[0] ? { ...p, u: 0, centred: true } : p));
}

/** 某個章喺而家嘅服裝會唔會顯示，同埋點解唔顯示 */
export function shownReason(rules, outfit, state, id, { unavailable = [], level = null } = {}) {
  const all = placeFor(rules, outfit);
  if (!all.some((p) => p.id === id)) {
    if (sectionOf(rules) === 'leader') {
      const b = rules.badges.find((x) => x.id === id);
      const uid = leaderUniform(outfit.gender === 'girl' ? 'girl' : 'boy', outfit.uniform);
      if (b?.uniforms && !b.uniforms.includes(uid)) return 'uniform';
      return 'sweater';
    }
    return outfit.school ? 'school' : outfit.sweater && hasSweater(rules) ? 'sweater' : 'vest';
  }
  if (visible(all, state, { invested: outfit.invested, school: outfit.school, unavailable, level }).some((p) => p.id === id)) return null;
  if (outfit.school && !outfit.invested) return 'schoolUninvested';
  if ((id === 'membership' || all.some((p) => p.id === id && p.inv)) && !outfit.invested) return 'uninvested';
  if (all.some((p) => p.id === id && !levelOk(p, level))) return 'level';
  if (unavailable.includes(id)) return 'noArt';
  const mine = all.filter((p) => p.id === id && (!p.choice || p.choice === state[id]));
  const hider = mine.map((p) => hiddenBy(p, state)).find(Boolean);
  if (hider) return hider === 'longService' ? 'replaced' : `replaced_${hider}`;
  if (mine.some((p) => limited(p, state))) return 'limited';
  const req = all.find((p) => p.id === id && p.requires);
  if (req && state[id]) return req.requires.startsWith('stage') ? 'needsStage' : 'needsHost'; // v22：金帶要先有段章
  if (mine.some((p) => p.slot) && isOn(state, id)) return 'slotFull'; // v21：嗰一行已經揀滿（排序較前嘅章優先）
  return 'off';
}
