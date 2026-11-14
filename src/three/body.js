// 方塊人身形（真實比例：小童軍約 6 歲、117 cm；幼童軍約 9 歲、135 cm；童軍約 13 歲、155 cm；深資童軍約 18 歲、168 cm）— v1.0 · © SCOUT SYSTEM
// 單位：厘米（cm）。人物面向 +z；穿著者左 = +x。y = 0 係地面。
// 每一格貼圖 = 0.5 cm（PX = 2），所以徽章位置可以直接用手冊嘅厘米數。

export const PX = 2; // 每厘米幾多格

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

export const BODIES = { grasshopper: BODY, cub: CUB_BODY, scout: SCOUT_BODY, venture: VENTURE_BODY };

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
};

/**
 * 童軍支部三款制服嘅配色（手冊 P.30–35；綱要 P.12–14）。徽章同擺位三款一樣，只係帽、恤衫、褲、襪唔同。
 * hat：'beret' = 軟帽 + 金屬帽章；'sea' = 海童軍白頂帽 + 帽帶
 */
export const SCOUT_VARIANTS = {
  land: { shirt: COLOURS.cubShirt, leg: COLOURS.cubGreen, sock: COLOURS.cubSock, hat: 'beret', beret: COLOURS.beret },
  sea: { shirt: COLOURS.seaShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'sea' },
  air: { shirt: COLOURS.airShirt, leg: COLOURS.navy, sock: COLOURS.navySock, hat: 'beret', beret: COLOURS.airBeret },
};
export const scoutVariant = (id) => SCOUT_VARIANTS[id] ?? SCOUT_VARIANTS.land;

/**
 * 深資童軍三款制服嘅配色（手冊 P.36–41；綱要 P.14–15）。徽章同擺位三款一樣（手冊 P.170）。
 * hat：'beret' = 軟帽 + 童軍帽章；'seaLeader' = 海童軍男／女領袖白頂帽 + 深資海童軍帽章
 */
export const VENTURE_VARIANTS = {
  land: { shirt: COLOURS.cubShirt, leg: COLOURS.cubGreen, hat: 'beret', beret: COLOURS.maroon },
  sea: { shirt: COLOURS.seaShirt, leg: COLOURS.navy, hat: 'seaLeader' },
  air: { shirt: COLOURS.airShirt, leg: COLOURS.navy, hat: 'beret', beret: COLOURS.ventureAirBeret },
};
export const ventureVariant = (id) => VENTURE_VARIANTS[id] ?? VENTURE_VARIANTS.land;

/**
 * 深資童軍下身（手冊 P.36；綱要 P.15）：男 = 長褲 + 黑短襪 + 綁帶皮鞋；
 * 女 = 半截裙 + 肉色襪褲 + 非綁帶中跟皮鞋，或者（綱要 P.15）長褲 + 黑襪 + 綁帶皮鞋。
 */
export function ventureLegwear(gender, choice) {
  const skirt = gender === 'girl' && choice !== 'trousers';
  return { skirt, laced: !skirt, sock: skirt ? COLOURS.tights : COLOURS.blackSock };
}

/** 肩帶 + 深資童軍肩章（cm）：肩帶由膊頭邊（torso 邊）向衣領；肩章方頭（徽號）近膊頭 */
export function strapLayout(L) {
  const { B, top } = L;
  const S = B.strap;
  if (!S) return null;
  const outer = B.torso.w / 2; // 膊頭邊
  const inner = B.neck.w / 2 + 1.75; // 衣領外圍
  return { w: S.w, t: S.t, outer, inner, len: outer - inner, y: top + S.t / 2, cx: (outer + inner) / 2 };
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
  const back = { w: NK.backW, h: NK.backH, top, z: -(B.torso.d / 2 + (vest ? VEST_T : 0) + 0.2) };
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
