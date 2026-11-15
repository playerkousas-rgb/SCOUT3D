// 方塊人身形（真實比例：小童軍約 6 歲、117 cm；幼童軍約 9 歲、135 cm；童軍約 13 歲、155 cm；深資童軍約 18 歲、168 cm）— v1.0 · © SCOUT SYSTEM
// 單位：厘米（cm）。人物面向 +z；穿著者左 = +x。y = 0 係地面。
// 每一格貼圖 = 0.5 cm（PX = 2），所以徽章位置可以直接用手冊嘅厘米數。

export const PX = 2; // 每厘米幾多格

/** 杏色恤衫背後膊頭擔干（橫線）離膊頂幾遠（cm）；旅巾背後三角嘅尖到呢條線為止（用戶 2026-11-13 附圖） */
export const SHIRT_YOKE = 9;

const COMMON = {
  height: 117,
  necker: { tailLen: 19, backW: 22, backH: 16, wogDrop: 7.5 },
  head: { w: 18, h: 21, d: 19, y: 96, z: 0.5 },
  neck: { w: 8, h: 4, d: 8, y: 92 },
  torso: { h: 37, d: 13, y: 55 }, // y = 衫腳；頂 = 92（膊頭）
  upperArm: { w: 6.5, h: 19, d: 6.5 }, // 頂喺膊頭下 1 cm
  lowerArm: { w: 6, h: 16, d: 6 },
  hand: { w: 5.5, h: 10, d: 4 },
  sleeve: { len: 15.5, band: 1.5, w: 7.7, d: 10.5 }, // 短袖由膊頂（肩膊縫線）量起；白袖邊；闊身袖，外側面 10.5 cm 擺得落旅章
  leg: { w: 10, d: 10, y: 5, top: 58, gap: 1 },
  shoe: { w: 10.5, h: 6, d: 17, z: 2 },
};

/** 幼童軍：約 9 歲、135 cm。恤衫塞入褲；兩個胸袋（pocket = 左右胸袋中心、闊、高、袋蓋，cm，由膊頂量） */
const CUB = {
  height: 135,
  necker: { tailLen: 22, backW: 25, backH: 18.5, wogDrop: 7.5 },
  head: { w: 19, h: 22, d: 20, y: 112, z: 0.5 },
  neck: { w: 8.5, h: 4, d: 8.5, y: 108 },
  torso: { h: 44, d: 15, y: 64 }, // 頂 = 108（膊頭）
  upperArm: { w: 7, h: 22, d: 7 },
  lowerArm: { w: 6.5, h: 18, d: 6.5 },
  hand: { w: 6, h: 11, d: 4.5 },
  sleeve: { len: 18.5, band: 2, w: 8.6, d: 12 }, // 袖外側 12 cm：旅章 9 cm、地域章 + 區章 3.8 + 1 + 3.8 cm 擺得落
  leg: { w: 11.5, d: 11.5, y: 6, top: 67, gap: 1 },
  shoe: { w: 11.5, h: 6.5, d: 19, z: 2.5 },
  pocket: { x: 7.8, w: 10, h: 12.5, flap: 4, top: 13.5 },
  waist: 70, // 皮帶中心離地
};

/** 童軍：約 13 歲、155 cm（童軍 11–16 歲嘅中間）。恤衫塞入褲；兩個胸袋；袖要擺得落旅章、地域／區章、小隊章同優異旅團章 */
const SCOUT = {
  height: 155,
  necker: { tailLen: 27, backW: 29, backH: 21.5, wogDrop: 9 },
  head: { w: 20, h: 23, d: 21, y: 131, z: 0.5 },
  neck: { w: 9.5, h: 4, d: 9.5, y: 127 },
  torso: { h: 50, d: 17, y: 77 }, // 頂 = 127（膊頭）
  upperArm: { w: 8, h: 26, d: 8 },
  lowerArm: { w: 7, h: 21, d: 7 },
  hand: { w: 6.5, h: 13, d: 5 },
  sleeve: { len: 22, band: 2, w: 10, d: 14 }, // 袖口縫線離膊頂 20 cm：旅章 2–4.2、地域／區章 6.2–11.2、小隊章 15.4–17、優異旅團章 17.7–19.7
  leg: { w: 13, d: 13, y: 7, top: 80, gap: 1 },
  shoe: { w: 12.5, h: 7, d: 22, z: 3 },
  pocket: { x: 8.6, w: 11, h: 13.5, flap: 4.5, top: 15.5 },
  waist: 81,
};

/**
 * 深資童軍：約 18 歲、168 cm（深資童軍 16–21 歲嘅中間）。恤衫有肩帶（深資童軍肩章套喺肩帶上）；
 * 袖要擺得落旅章、地域／區章同優異旅團章。strap = 肩帶（由膊頭邊向衣領量，cm）。
 */
const VENTURE = {
  height: 168,
  necker: { tailLen: 30, backW: 32, backH: 24, wogDrop: 10 },
  head: { w: 21, h: 24, d: 22, y: 142, z: 0.5 },
  neck: { w: 10, h: 4, d: 10, y: 138 },
  torso: { h: 54, d: 18, y: 84 }, // 頂 = 138（膊頭）
  upperArm: { w: 8.5, h: 29, d: 8.5 },
  lowerArm: { w: 7.5, h: 23, d: 7.5 },
  hand: { w: 7, h: 14, d: 5.5 },
  sleeve: { len: 24, band: 2, w: 10.5, d: 15 }, // 袖口縫線離膊頂 22 cm：旅章 2–4.2、地域／區章 6.2–11.2、優異旅團章 19.7–21.7
  leg: { w: 14, d: 14, y: 7.5, top: 87, gap: 1 },
  shoe: { w: 13, h: 7.5, d: 25, z: 3.5 },
  pocket: { x: 9.2, w: 12, h: 14.5, flap: 5, top: 17 },
  waist: 88,
  strap: { w: 4.4, t: 0.5 },
  skirtBottom: 46, // 半截裙及膝（裙腳離地，蓋住膝頭）
};

export const BODY = {
  boy: { ...COMMON, torso: { ...COMMON.torso, w: 24 }, hair: 'short' },
  girl: { ...COMMON, torso: { ...COMMON.torso, w: 23 }, hair: 'pigtails' },
};

export const CUB_BODY = {
  boy: { ...CUB, torso: { ...CUB.torso, w: 27 }, hair: 'short' },
  girl: { ...CUB, torso: { ...CUB.torso, w: 26 }, hair: 'pigtails' },
};

export const SCOUT_BODY = {
  boy: { ...SCOUT, torso: { ...SCOUT.torso, w: 31 }, hair: 'short' },
  girl: { ...SCOUT, torso: { ...SCOUT.torso, w: 30 }, hair: 'pigtails' },
};

export const VENTURE_BODY = {
  boy: { ...VENTURE, torso: { ...VENTURE.torso, w: 34 }, hair: 'short' },
  girl: { ...VENTURE, torso: { ...VENTURE.torso, w: 33 }, hair: 'pigtails' },
};

/** 樂行童軍（18–26 歲）：沿用深資童軍 168 cm 方塊人（擺位以 cm 計；手冊 P.171 同 P.170 附圖擺位一樣） */
export const ROVER_BODY = VENTURE_BODY;

/** 數字乘 k（保留 1 位小數）；keep 入面嘅鍵唔變（例如肩帶闊、袖口邊、cm 單位嘅細節） */
function scaleDims(obj, k, keep = new Set()) {
  if (typeof obj === 'number') return Math.round(obj * k * 10) / 10;
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.entries(obj).map(([key, v]) => [key, keep.has(key) ? v : scaleDims(v, k, keep)]));
}

/**
 * 成年成員（用戶揀）：男 172 cm、女 160 cm，由深資童軍 168 cm 方塊人按比例放大／縮細。
 * 肩帶（闊 4.4、厚 0.5）同袖口邊唔跟比例（衣物細節唔會因為人高咗而變闊）。
 * shortsBottom：編號 5 短褲腳約喺膝頭中間上 10 cm（手冊 P.88）；longSockTop：長襪到膝頭下。
 */
const KEEP = new Set(['strap', 'band', 'gap', 'z']);
const LEADER_MALE = { ...scaleDims(VENTURE, 172 / 168, KEEP), height: 172, shortsBottom: 59, longSockTop: 45 };
const LEADER_FEMALE = { ...scaleDims(VENTURE, 160 / 168, KEEP), height: 160 };
export const LEADER_BODY = {
  boy: { ...LEADER_MALE, torso: { ...LEADER_MALE.torso, w: 35 }, hair: 'short' },
  girl: { ...LEADER_FEMALE, torso: { ...LEADER_FEMALE.torso, w: 31.5 }, hair: 'pigtails' },
};

export const BODIES = { grasshopper: BODY, cub: CUB_BODY, scout: SCOUT_BODY, venture: VENTURE_BODY, rover: ROVER_BODY, leader: LEADER_BODY };

export const COLOURS = {
  skin: '#f1c6a2',
  skinShade: '#e2ad88',
  blush: '#f2a7a0',
  hair: '#1f1712',
  hairHi: '#3a2c23',
  eyeWhite: '#ffffff',
  eye: '#2a1b12',
  brow: '#2a1d16',
  mouth: '#c8676a',
  shirt: '#f07a1c',
  shirtShade: '#d9690f',
  trim: '#f6f6f2',
  trousers: '#8d8e90',
  trousersShade: '#7a7b7d',
  shoe: '#f4f4f4',
  sole: '#b9bcc0',
  lace: '#d4d6da',
  // 幼童軍（手冊 P.28–29 附圖）
  cubShirt: '#e4d8b6', // 杏色
  cubShirtShade: '#c9b98f',
  cubGreen: '#6e7d43', // 草青色
  cubGreenShade: '#5c6a36',
  cubSock: '#3d5230', // 深草青色
  belt: '#6a4326', // 棕色
  buckle: '#c9ccd1',
  shoeBlack: '#202024',
  soleBlack: '#111114',
  capGreen: '#1f4a2c', // 深綠色
  capPiping: '#f0cc1e', // 黃間條
  // 童軍（手冊 P.30–31、P.102、P.110）
  beret: '#1f4a2c', // 深綠色軟帽
  beretBand: '#141414', // 黑色膠邊
  leather: '#4a2f1f', // 皮巾圈
  leatherHi: '#6b4630',
  // 海童軍／空童軍（手冊 P.32–35；顏色取自綱要 P.13–14 附圖）
  navy: '#313166', // 深藍色短褲／裙褲
  navySock: '#2b2b5a', // 深藍色長襪（略深少少，方便同褲分開）
  seaShirt: '#f7f7f4', // 白色恤衫
  seaCapTop: '#fbfbfa', // 白頂帽
  airShirt: '#94afdb', // 淺藍色恤衫
  airBeret: '#24364f', // 灰藍色軟帽
  // 深資童軍（手冊 P.36–41 附圖）
  maroon: '#8b2231', // 棗紅色軟帽
  ventureAirBeret: '#2c344e', // 深資空童軍灰藍色軟帽
  tights: '#e9c2a0', // 肉色尼龍襪褲（比皮膚深少少）
  blackSock: '#1c1c20',
  capPeak: '#17171a', // 白頂帽黑色帽舌
  // 制服毛衣（手冊 P.121–122 附圖）
  sweaterGreen: '#353c23', // 深草青色
  sweaterNavy: '#2c2749', // 深藍色
  // 領帶（手冊 P.113）
  tieMaroon: '#8e1f2c',
  tieBlack: '#16161a',
  tieNavy: '#262a55',
  tieGreen: '#1f4a2c', // 深綠色（樂行童軍、成年成員）
  // 成年成員（手冊 P.100、P.108–109、P.111、P.115）
  hardHat: '#1d4329', // 深綠色金邊硬帽
  gold: '#d8b23a', // 金邊
  assocNecker: '#1f4a2c', // 會巾：深綠色
  gilwellNecker: '#b59870', // 基維爾領巾：淺啡色（卡其）
  gilwellWoggle: '#7a4524', // 基維爾巾圈（土耳其結）
  woodBead: '#8a5a33', // 木章木珠
  thong: '#5a3a22', // 皮繩
  // 禮服、晚禮服（手冊 P.57–62、P.203–205）
  brass: '#c9a647', // 禮服會徽銅鈕
  messWhite: '#f3f2ee', // 夏季白色晚禮服上衣
  messBlack: '#1c1c21', // 冬季黑色晚禮服上衣、黑色長褲／長裙
  messShirt: '#fbfbf9', // 白色長袖恤衫
  purple: '#6b3d9a', // 紫色絲質腰封、褲邊間條
  silver: '#cfd3d8', // 銀色童軍徽、銀鈕
};

/**
 * 童軍支部三款制服嘅配色（手冊 P.30–35；綱要 P.12–14）。徽章同擺位三款一樣，只係帽、恤衫、褲、襪唔同。
 * hat：'beret' = 軟帽 + 金屬帽章；'sea' = 海童軍白頂帽 + 帽帶
 */
export const SCOUT_VARIANTS = {
  land: { shirt: COLOURS.cubShirt, leg: COLOURS.cubGreen, sock: COLOURS.cubSock, hat: 'beret', beret: COLOURS.beret, sweater: COLOURS.sweaterGreen },
  sea: { shirt: COLOURS.seaShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'sea', sweater: COLOURS.sweaterNavy },
  air: { shirt: COLOURS.airShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'beret', beret: COLOURS.airBeret, sweater: COLOURS.sweaterNavy },
};
export const scoutVariant = (id) => SCOUT_VARIANTS[id] ?? SCOUT_VARIANTS.land;

/**
 * 深資童軍三款制服嘅配色（手冊 P.36–41；綱要 P.14–15）。徽章同擺位三款一樣（手冊 P.170）。
 * hat：'beret' = 軟帽 + 童軍帽章；'seaLeader' = 海童軍男／女領袖白頂帽 + 深資海童軍帽章
 */
export const VENTURE_VARIANTS = {
  land: { shirt: COLOURS.cubShirt, leg: COLOURS.cubGreen, hat: 'beret', beret: COLOURS.maroon, sweater: COLOURS.sweaterGreen, tie: COLOURS.tieMaroon },
  sea: { shirt: COLOURS.seaShirt, leg: COLOURS.navy, hat: 'seaLeader', sweater: COLOURS.sweaterNavy, tie: COLOURS.tieBlack },
  air: { shirt: COLOURS.airShirt, leg: COLOURS.navy, hat: 'beret', beret: COLOURS.ventureAirBeret, sweater: COLOURS.sweaterNavy, tie: COLOURS.tieNavy },
};
export const ventureVariant = (id) => VENTURE_VARIANTS[id] ?? VENTURE_VARIANTS.land;

/**
 * 樂行童軍三款制服嘅配色（手冊 P.42–47；綱要 P.10–11）。徽章同擺位三款一樣（手冊 P.171）。
 * 同深資童軍唯一分別：樂行童軍深綠色軟帽、深綠色領帶（手冊 P.113）；海／空款同深資海／空童軍一樣
 * （樂行海童軍帽章 = 深資／樂行海童軍帽章，手冊 P.102）。
 */
export const ROVER_VARIANTS = {
  land: { ...VENTURE_VARIANTS.land, beret: COLOURS.beret, tie: COLOURS.tieGreen },
  sea: { ...VENTURE_VARIANTS.sea },
  air: { ...VENTURE_VARIANTS.air },
};
export const roverVariant = (id) => ROVER_VARIANTS[id] ?? ROVER_VARIANTS.land;

/**
 * 成年成員三款制服（手冊 P.64–81）：陸上 = 杏色恤衫、草青色、深綠色軟帽／金邊硬帽、深綠色領帶；
 * 海童軍領袖 = 白恤衫、深藍色、海童軍男／女領袖白頂帽、黑色領帶；空童軍領袖 = 淺藍色恤衫、深藍色、灰藍色軟帽、深藍色領帶。
 * sock = 編號 5 長襪（陸上深草青色；海／空深藍色）。
 */
export const LEADER_VARIANTS = {
  land: { shirt: COLOURS.cubShirt, leg: COLOURS.cubGreen, sock: COLOURS.cubSock, hat: 'beret', beret: COLOURS.beret, sweater: COLOURS.sweaterGreen, tie: COLOURS.tieGreen },
  sea: { shirt: COLOURS.seaShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'seaLeader', sweater: COLOURS.sweaterNavy, tie: COLOURS.tieBlack },
  air: { shirt: COLOURS.airShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'beret', beret: COLOURS.ventureAirBeret, sweater: COLOURS.sweaterNavy, tie: COLOURS.tieNavy },
};
export const leaderVariant = (id) => LEADER_VARIANTS[id] ?? LEADER_VARIANTS.land;

/** 深資／樂行童軍、成年成員（長褲／半截裙、肩帶、領帶） */
export const isSenior = (section) => section === 'venture' || section === 'rover' || section === 'leader';

/** 成年成員制服編號（手冊 P.53）：1 禮服、2 晚禮服、3 常規、4 領帶、5 男短褲、6 女長褲 */
export const LEADER_UNIFORMS = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
/** 有外套嘅制服：禮服上衣（編號 1）、晚禮服上衣（編號 2）。徽章、肩帶要向外移一個外套厚度 */
export const isDress = (u) => u === 'u1' || u === 'u2';

/**
 * 成年成員制服編號（手冊 P.53–56）。編號 5 只係男、編號 6 只係女：轉人物時自動改做對應嗰套（5 ↔ 6）。
 */
export function leaderUniform(gender, id) {
  const girl = gender === 'girl';
  if (id === 'u5' && girl) return 'u6';
  if (id === 'u6' && !girl) return 'u5';
  return LEADER_UNIFORMS.includes(id) ? id : 'u3';
}

/**
 * 成年成員下身：
 * - 編號 1、3、4 女 = 草青色半截裙（及膝）+ 肉色襪褲 + 非綁帶中跟皮鞋；編號 5 = 短褲 + 長襪；其餘長褲 + 黑短襪 + 綁帶皮鞋。
 * - 編號 2（晚禮服，手冊 P.61）：男 = 黑色長褲（褲邊紫色間條）+ 黑短襪 + 黑色光身皮鞋；女 = 黑色長裙 + 肉色襪褲 + 黑色高跟皮鞋。
 * dress：'jacket' = 禮服上衣；'mess' = 晚禮服上衣
 */
export function leaderLegwear(gender, uniform) {
  const u = leaderUniform(gender, uniform);
  const girl = gender === 'girl';
  const skirt = girl && (u === 'u1' || u === 'u2' || u === 'u3' || u === 'u4');
  return {
    uniform: u,
    skirt,
    longSkirt: girl && u === 'u2',
    shorts: u === 'u5',
    tie: u === 'u1' || u === 'u4',
    bowTie: u === 'u2',
    dress: u === 'u1' ? 'jacket' : u === 'u2' ? 'mess' : null,
    stripe: !girl && u === 'u2',
    laced: !skirt,
    sock: skirt ? COLOURS.tights : COLOURS.blackSock,
  };
}

/**
 * 禮服／晚禮服外套嘅殼（cm）：同毛衣一樣每邊厚 VEST_T、頂面高過膊頭 SWEATER_TOP。
 * - 禮服上衣（手冊 P.59 附圖）：長過褲頭，衫腳約喺褲頭下面 8% 身高。
 * - 晚禮服上衣（手冊 P.62 附圖）：短身；殼一直包到上身底，腰封同褲頭畫喺殼上。
 * fleur = 兩邊翻領銀色童軍徽中心（x：+ = 穿著者左），襟領勳章排喺佢上面、感謝章喺右邊下面（手冊 P.189）。
 * opening = 前面 V 位：top 闊（半闊）、bottom = V 底離殼頂幾遠。
 */
export function dressLayout(L, uniform) {
  const { B, top } = L;
  const t = B.torso;
  const shellTop = top + SWEATER_TOP;
  const bottom = uniform === 'u1' ? Math.round((B.waist - B.height * 0.08) * 10) / 10 : t.y - 0.5;
  const w = t.w + VEST_T * 2;
  const d = t.d + VEST_T * 2;
  const front = t.d / 2 + VEST_T;
  const nw = B.neck.w;
  const fleurY = Math.round((top - B.height * 0.085) * 10) / 10;
  const lapelW = 4.6; // 晚禮服翻領闊（示意）
  const fleurX = nw / 2 + 1.6 + lapelW / 2; // 翻領中間
  return {
    w, d, h: shellTop - bottom, top: shellTop, bottom, front,
    hem: uniform === 'u2' ? B.waist + 1 : bottom, // 晚禮服上衣前幅喺腰封上面完
    cummerbund: uniform === 'u2' ? { top: B.waist + 9, bottom: B.waist - 1.5 } : null,
    opening: uniform === 'u1' ? { half: nw / 2 + 2.6, depth: Math.round(B.height * 0.115 * 10) / 10 } : { half: nw / 2 + 1.6, depth: shellTop - B.waist },
    lapelW,
    fleur: uniform === 'u2' ? { x: fleurX, y: fleurY, size: 1.8 } : null,
  };
}

/**
 * 深資童軍下身（手冊 P.36；綱要 P.15）：男 = 長褲 + 黑短襪 + 綁帶皮鞋；
 * 女 = 半截裙 + 肉色襪褲 + 非綁帶中跟皮鞋，或者（綱要 P.15）長褲 + 黑襪 + 綁帶皮鞋。
 */
export function ventureLegwear(gender, choice) {
  const skirt = gender === 'girl' && choice !== 'trousers';
  return { skirt, laced: !skirt, sock: skirt ? COLOURS.tights : COLOURS.blackSock };
}

/** 制服毛衣（手冊 P.121–122）：同背心一樣嘅殼（每邊厚 VEST_T），頂面高過膊頭 SWEATER_TOP cm */
export const SWEATER_TOP = 0.5;

/**
 * 肩帶 + 深資童軍肩章（cm）：肩帶由膊頭邊（torso 邊）向衣領；肩章方頭（徽號）近膊頭。
 * 著制服毛衣：肩章改戴喺毛衣雙肩肩帶上（手冊 P.122），所以高 SWEATER_TOP、闊 VEST_T。
 */
export function strapLayout(L, { sweater = false, virtual = false } = {}) {
  const { B, top } = L;
  // virtual（v22）：童軍恤衫模型冇畫肩帶，但模範童軍肩帶要知肩帶喺邊（手冊 P.158 附圖有肩帶）——用一條唔畫、冇厚度嘅肩帶計路線
  const S = B.strap ?? (virtual ? { w: 4.4, t: 0 } : null);
  if (!S) return null;
  const outer = shoulderTip(L); // 膊頭（袖頂外邊）：肩帶一直去到膊頭（用戶指正）
  const inner = B.neck.w / 2 + 1.75; // 衣領外圍
  const base = top + (sweater ? SWEATER_TOP : 0);
  // 著毛衣：肩帶面高過膊頭 SWEATER_TOP；盒向下加厚到膊頭，袖頂上面唔會有隙
  const t = S.t + (base - top);
  return { w: S.w, t: S.t, outer, inner, len: outer - inner, base, y: base + S.t / 2, cx: (outer + inner) / 2, boxT: t, boxY: top + t / 2 };
}

/**
 * 嘉許笛繩路線（v19，用戶指正＋相片 image-11）：繩由左肩**職級肩章（套喺肩帶膊頭嗰頭）下面**穿過，
 * 由肩帶前邊出嚟、兜過袖頂前邊，沿袖窿前面吊落到胸袋下面，再兜返上左胸袋口（近中線嗰邊；笛子入袋唔畫）。
 * 晚禮服（D = dressLayout）：小型笛繩一樣由肩帶起，落去左襟領童軍徽。
 * slideX = 左肩職級肩章中心 x（冇就用肩章預設位：膊頭 − 0.3 − 半個肩章長）。
 * 回傳 [[x, y, z], …]（cm，左 = +X、前 = +Z）；第一、二點喺肩章下面（y 低過肩章面）。後面一段見 lanyardBackPoints。
 */
export function lanyardPoints({ L, strap, D = null, z, thick, slideX = null, side = 1, end = 'pocketMouth' }) {
  const pts = lanyardFront({ L, strap, D, z, thick, slideX: slideX == null ? null : Math.abs(slideX), end });
  return side < 0 ? mirrorX(pts) : pts;
}
/** 右肩（v22 模範童軍肩帶）＝ 左肩路線左右反轉 */
const mirrorX = (pts) => pts.map(([x, y, zz]) => [-x, y, zz]);
function lanyardFront({ L, strap, D, z, thick, slideX, end }) {
  const { B, top } = L;
  const sx = slideX ?? strap.outer - 0.3 - RANK_SLIDE_H / 2;
  const yU = strap.base + strap.t - thick / 2 + 0.02; // 繩面啱啱喺肩章底（肩章 y = 肩帶面 + 0.04）
  const zFront = strap.w / 2 + 0.15;
  const under = [[sx, yU, -0.6], [sx, yU, zFront]];
  if (D?.fleur) return [...under, [D.fleur.x + 2.2, D.fleur.y - 1.5, z], [D.fleur.x + 0.4, D.fleur.y - 3.5, z]];
  const sleeveFront = B.sleeve.d / 2 + thick / 2 + 0.05;
  const P = B.pocket;
  const flapTop = top - P.top;
  const pocketBottom = flapTop - P.h;
  const seamX = B.torso.w / 2 - 0.8; // 袖窿前面（身邊）
  const path = [
    ...under,
    [sx - 0.3, top + thick / 2, B.sleeve.d / 2], // 袖頂前邊
    [sx - 0.6, top - 1.5, sleeveFront], // 兜落袖前面
    [seamX, top - 9, z], // 沿袖窿前面
    [seamX - 0.3, pocketBottom - 2.5, z],
    [P.x + P.w / 2 + 0.5, pocketBottom - 5, z], // 胸袋外側下面兜返上（斜過胸袋、喺會員章外側經過）
  ];
  // 模範童軍肩帶（手冊 P.158）：末端扣喺胸袋袋蓋近中線嗰邊（右胸袋袋蓋左方）；嘉許笛繩：左胸袋口中間偏內（笛子由胸袋口右方放入）
  if (end === 'flapInner') path.push([P.x - P.w / 2 + 1.6, pocketBottom + 1, z], [P.x - P.w / 2 + 1.2, flapTop - P.flap / 2, z + 0.3]);
  else path.push([P.x - 1, flapTop + 0.1, z]);
  return path;
}
/** 模範童軍肩帶末端嘅穗（手冊 P.158 相片）：由末端吊落 len cm（回傳 [頂, 底]） */
export function tasselPoints(pts, len = 3.5) {
  const [x, y, zz] = pts[pts.length - 1];
  return [[x, y, zz + 0.2], [x, y - len, zz + 0.2]];
}
/**
 * 嘉許笛繩後面一段（v20，用戶：「你畫左前面無畫後面」）：笛繩係一個圈套住左膊。
 * 由職級肩章下面（同前面一段同一點起）向後、喺肩帶後邊穿出，兜過袖頂後邊，沿袖窿後面落到腋下，
 * 喺手臂下面（身側，入咗袖入面）兜去前面，同前面一段喺袖窿前面（top − 9）接埋。
 * 晚禮服小型笛繩：接埋之後再去左襟領（同前面一段第三點）。
 * 回傳 [[x, y, z], …]；第一點 = lanyardPoints 第一點（肩章下面）。
 */
export function lanyardBackPoints({ L, strap, D = null, z, thick, slideX = null, side = 1 }) {
  const pts = lanyardBack({ L, strap, D, z, thick, slideX: slideX == null ? null : Math.abs(slideX) });
  return side < 0 ? mirrorX(pts) : pts;
}
function lanyardBack({ L, strap, D, z, thick, slideX }) {
  const { B, top } = L;
  const sx = slideX ?? strap.outer - 0.3 - RANK_SLIDE_H / 2;
  const yU = strap.base + strap.t - thick / 2 + 0.02;
  const zBackEdge = -(strap.w / 2 + 0.15);
  const sleeveBack = -(B.sleeve.d / 2 + thick / 2 + 0.05);
  const seamX = B.torso.w / 2 - 0.8;
  const pts = [
    [sx, yU, -0.6], // 肩章下面（同前面一段接）
    [sx, yU, zBackEdge], // 肩帶後邊穿出
    [sx - 0.3, top + thick / 2, -B.sleeve.d / 2], // 袖頂後邊
    [sx - 0.6, top - 1.5, sleeveBack], // 兜落袖後面
    [seamX, top - 9, -z], // 沿袖窿後面
    [B.torso.w / 2 + 0.2, top - 10.5, 0], // 腋下（手臂下面）
    [seamX, top - 9, z], // 前面：同前面一段接埋
  ];
  if (D?.fleur) pts.push([D.fleur.x + 2.2, D.fleur.y - 1.5, z]);
  return pts;
}

/**
 * 笛繩顏色（手冊 P.184 相片；v20 用戶指正：高級嘉許係紫色）。每條 strand：c = 顏色、w = 粗幼（以笛繩粗幼計）。
 * 嘉許：橙金色一條；高級嘉許：紫色主繩＋幼米白扭紋（相片見到紫繩纏住一條幼米白線）。
 */
export const LANYARD_COLOURS = {
  commendation: [{ c: '#d98b1e', w: 1 }],
  high: [{ c: '#5b2d72', w: 1 }, { c: '#e3d5ae', w: 0.35 }],
  // 模範童軍肩帶（v22，手冊 P.158 相片）：深綠同金黃兩色扭紋（俗稱「雞繩」）——alt = 每 ALT_CM 轉一次色
  modelScout: [{ c: '#2e5e3a', w: 1.3, alt: '#d4b23a' }],
};
/** 扭紋每段長度（cm） */
export const ALT_CM = 0.9;
/** 並排 strand 嘅中心偏移（以笛繩粗幼計）：全部緊貼、成組置中 */
export function strandOffsets(ws) {
  const total = ws.reduce((a, w) => a + w, 0);
  let x = -total / 2;
  return ws.map((w) => {
    const o = x + w / 2;
    x += w;
    return Math.round(o * 1000) / 1000;
  });
}

/** 成年成員職級肩章沿肩帶嘅長度（cm，leader_rules epaulette hCm） */
export const RANK_SLIDE_H = 3.65;

/** 膊頭：袖頂外邊離中線幾遠（cm）；留 0.3 cm 唔好出咗袖邊 */
export const shoulderTip = (L) => L.armX + L.B.sleeve.w / 2 - 0.3;

/**
 * 非綁帶中跟皮鞋（深資／樂行女團員配半截裙）：用幾舊方塊砌，唔係淨係轉色（用戶指正）。
 * - 後面一舊中跟，前面鞋掌貼地；中間腳弓位係空（側面望到個窿）。
 * - 鞋面開口大：腳面同腳趾見到肉色襪褲，黑色只係鞋邊同鞋頭一圈。
 * 回傳 [{ part, kind: 'shoe'|'tights', size, pos, rot }]，pos 以鞋中心（z = 0）計，y = 離地。
 */
export function pumpParts({ w, h, d }) {
  const zb = -d / 2, zf = d / 2;
  const fw = w - 1.6; // 隻腳（襪褲）窄過鞋
  const heelTop = h * 0.6; // 中跟高
  const heelD = d * 0.16;
  const heelFront = zb + 0.3 + heelD;
  const foreLen = d * 0.36; // 鞋掌（貼地）
  const foreZ = zf - foreLen;
  const vampTop = h * 0.48; // 鞋頭黑色去到幾高
  const toeTop = h * 0.67; // 腳趾面
  const counterTop = h * 0.92; // 後踭鞋身
  // 腳弓：由中跟頂斜落去鞋掌（中線兩端）
  const archT = 2;
  const [z0, y0, z1, y1] = [heelFront, heelTop - 0.5, foreZ, 1.2];
  const ang = Math.atan2(y0 - y1, z1 - z0); // rotation.x 正 = 前面向下
  const len = Math.hypot(z1 - z0, y0 - y1) + 1;
  const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2;
  const up = archT / 2 + 1.3; // 腳面（襪褲）喺腳弓上面
  return [
    { part: 'heel', kind: 'shoe', size: [w * 0.5, heelTop, heelD], pos: [0, heelTop / 2, zb + 0.3 + heelD / 2] },
    { part: 'counter', kind: 'shoe', size: [w, counterTop - heelTop + 0.4, d * 0.3], pos: [0, (heelTop - 0.4 + counterTop) / 2, zb + d * 0.15] },
    { part: 'arch', kind: 'shoe', size: [w, archT, len], pos: [0, cy, cz], rot: [ang, 0, 0] },
    { part: 'fore', kind: 'shoe', size: [w, vampTop, foreLen], pos: [0, vampTop / 2, foreZ + foreLen / 2] },
    { part: 'ankle', kind: 'tights', size: [fw, h - heelTop + 0.4, d * 0.34], pos: [0, (heelTop - 0.4 + h) / 2, zb + 0.5 + d * 0.17] },
    { part: 'instep', kind: 'tights', size: [fw, 2.6, len - 1], pos: [0, cy + up * Math.cos(ang), cz + up * Math.sin(ang)], rot: [ang, 0, 0] },
    { part: 'toes', kind: 'tights', size: [fw, toeTop - 1.6, foreLen - 1], pos: [0, (1.6 + toeTop) / 2, foreZ + (foreLen - 1) / 2] },
  ];
}

/** 計出每個部件嘅大細同位置（cm）。 */
export function layout(gender, section = 'grasshopper') {
  const set = BODIES[section] ?? BODY;
  const B = set[gender] ?? set.boy;
  const top = B.torso.y + B.torso.h; // 膊頭
  const armX = B.torso.w / 2 + B.upperArm.w / 2 + 0.3;
  const shoulderY = top - 1;
  const elbowY = shoulderY - B.upperArm.h;
  const wristY = elbowY - B.lowerArm.h;
  const legX = B.leg.w / 2 + B.leg.gap / 2;
  return { B, top, armX, shoulderY, elbowY, wristY, legX };
}

/** 背心厚度（cm）：背心比件衫每邊大幾多 */
export const VEST_T = 0.9;

/**
 * 旅巾尺寸同位置（cm）。徽章（學校運動上衣）同 3D 都用呢度，唔好喺第二度再抄數字。
 * front / backZ 跟有冇背心變（旅巾戴喺背心外面）。
 */
export function neckerLayout(L, { vest = false } = {}) {
  const { B, top } = L;
  const nw = B.neck.w;
  const collarT = 1.75;
  const rollT = 2.2;
  const rollH = 2.4;
  const inner = nw + collarT * 2; // 衣領外圍 = 旅巾內圍
  const outer = inner + rollT * 2;
  const front = B.torso.d / 2 + (vest ? VEST_T : 0); // 胸口表面 z
  const NK = B.necker;
  const wogY = top - NK.wogDrop;
  const a = [outer / 2 - rollT / 2, top + 0.4];
  const b = [1.3, wogY];
  const tail = { w: 5.2, len: NK.tailLen, tip: 4, x: 1.7, top: wogY + 1 };
  // 有胸袋嘅杏色恤衫（幼童軍以上、領袖）：背後三角尖到擔干橫線；小童軍活動服冇擔干，用返原本長度
  const back = { w: NK.backW, h: B.pocket ? SHIRT_YOKE : NK.backH, top, z: -(B.torso.d / 2 + (vest ? VEST_T : 0) + 0.2) };
  return {
    nw, collarT, rollT, rollH, inner, outer, front, wogY, a, b,
    len: Math.hypot(a[0] - b[0], a[1] - b[1]),
    ang: Math.atan2(a[0] - b[0], a[1] - b[1]),
    tail,
    back,
    /** 巾尾面 z：穿著者左條（s = +1）喺前面少少 */
    tailZ: (s) => front + 0.3 + (s > 0 ? 0.1 : 0),
  };
}
