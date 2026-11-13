// 人物尺寸（單位：米）— 約 6–7 歲小朋友，身高約 1.18 m。v1.0 · © SCOUT SYSTEM
// 座標：y 向上；人物面向 +z；穿著者左方 = +x，右方 = -x。
// 用真實尺寸，所以徽章可以直接用釐米（1 cm = 0.01）。

export const CM = 0.01;

export const D = {
  hipY: 0.585,
  hipX: 0.062,
  shoulderY: 0.868,
  shoulderX: 0.148,
  armSpread: 0.19, // A 字站姿（弧度）
  upperArm: 0.2,
  foreArm: 0.17,
  neckY: 0.93,
  headY: 1.045,
  headR: 0.1,
  torsoDepth: 0.66, // 胸厚 / 胸闊
};

// 上衣軀幹輪廓 [半徑, y]（由衫腳到領口）
export const SHIRT_PROFILE = [
  [0.0, 0.575],
  [0.118, 0.575],
  [0.12, 0.6],
  [0.121, 0.66],
  [0.124, 0.73],
  [0.128, 0.79],
  [0.131, 0.835],
  [0.13, 0.862],
  [0.122, 0.884],
  [0.104, 0.902],
  [0.078, 0.916],
  [0.05, 0.925],
  [0.043, 0.93],
];

export function profileRadius(y, profile = SHIRT_PROFILE) {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    if (y >= y0 && y <= y1 && y1 > y0) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return y < profile[0][1] ? profile[1][0] : profile[profile.length - 1][0];
}

// 橢圓截面軀幹表面嘅 z（前面正數）
export function torsoZ(x, y, scale = 1) {
  const r = profileRadius(y) * scale;
  const inside = Math.max(r * r - x * x, 0);
  return Math.sqrt(inside) * D.torsoDepth;
}

// 袖：以肩關節做原點，手臂沿 -y
export const SLEEVE = {
  seamY: 0.02, // 肩膊縫線（袖頂外側）
  topR: 0.05,
  shortHemY: -0.13,
  shortHemR: 0.047,
  longHemY: -0.355,
  longHemR: 0.036,
};
