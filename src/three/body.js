// 方塊人身形（真實比例，約 6 歲、117 cm）— v1.0 · © SCOUT SYSTEM
// 單位：厘米（cm）。人物面向 +z；穿著者左 = +x。y = 0 係地面。
// 每一格貼圖 = 0.5 cm（PX = 2），所以徽章位置可以直接用手冊嘅厘米數。

export const PX = 2; // 每厘米幾多格

const COMMON = {
  height: 117,
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

export const BODY = {
  boy: { ...COMMON, torso: { ...COMMON.torso, w: 24 }, hair: 'short' },
  girl: { ...COMMON, torso: { ...COMMON.torso, w: 23 }, hair: 'pigtails' },
};

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
};

/** 計出每個部件嘅大細同位置（cm）。 */
export function layout(gender) {
  const B = BODY[gender] ?? BODY.boy;
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
  const wogY = top - 7.5;
  const a = [outer / 2 - rollT / 2, top + 0.4];
  const b = [1.3, wogY];
  const tail = { w: 5.2, len: 19, tip: 4, x: 1.7, top: wogY + 1 };
  const back = { w: 22, h: 16, top, z: -(B.torso.d / 2 + (vest ? VEST_T : 0) + 0.2) };
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
