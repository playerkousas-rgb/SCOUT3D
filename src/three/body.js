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
  sleeve: { len: 11, band: 1.5, pad: 0.6 }, // 短袖由膊頂量起；白袖邊；袖比手臂闊
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
