// SCOUT3D v1.0 · © SCOUT SYSTEM
// v27「流線」細節：立體頭髮、手指、耳仔、鼻（ADR-0025）。只係形狀，冇章喺上面；徽章位置唔受影響。
import * as THREE from 'three';
import { partShape, profileAt } from './look.js';

/* ---------------- 頭嘅有號距離（同 smoothBox 一樣嘅形狀；外面 = 正） ---------------- */
function roundRectSd(x, z, a, b, r) {
  const qx = Math.abs(x) - (a - r), qz = Math.abs(z) - (b - r);
  return Math.min(Math.max(qx, qz), 0) + Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) - r;
}

/**
 * 頭（中心喺原點）嘅 SDF：橫切面圓角長方形，頂底各自收圓。
 * v30 試做 A：profile = 由頂（t = 0）到底（t = 1）嘅闊度比例（下巴收窄），同 smoothBox 一樣縮橫切面。
 */
export function headSdf([x, y, z], { w, h, d, profile = null }) {
  const S = partShape('head', w, h, d);
  const a = w / 2, b = d / 2, hh = h / 2;
  const r = Math.min(S.rc, a, b);
  const re = y >= 0 ? S.reTop : S.reBot;
  const k = profile ? profileAt(profile, Math.min(1, Math.max(0, (hh - y) / h))) : 1;
  const d2 = roundRectSd(x / k, z / k, a, b, r) * k;
  const wx = d2 + re, wy = Math.abs(y) - hh + re;
  return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - re;
}

/** 由頭中心沿方向 dir 去到頭表面嘅距離（二分法） */
export function headRadius(dir, head) {
  let lo = 0, hi = Math.max(head.w, head.h, head.d);
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (headSdf([dir[0] * m, dir[1] * m, dir[2] * m], head) > 0) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
}

const dirOf = (theta, phi) => [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)];

/**
 * 髮腳（由頭頂量落嚟幾多 cm）：theta = 0 正前（+z）、π/2 左（+x）、π 後面。
 * 男仔：短陰（4.5 cm，前面一撮撮）、鬢角、耳仔上面、後面去到 15 cm。
 * 女仔：齊陰、兩邊遮住耳仔、後面去到下巴高度。
 */
export function hairDrop(theta, style, h) {
  const c = Math.cos(theta); // 1 = 前，-1 = 後
  const s = Math.abs(Math.sin(theta)); // 1 = 側
  const long = style === 'pigtails';
  const front = long ? 5.6 : 4.4;
  const side = long ? 13 : 8;
  const back = long ? h - 3.5 : 15;
  let drop;
  if (c >= 0) drop = front * c * c + side * (1 - c * c);
  else drop = back * c * c + side * (1 - c * c);
  // 前面瀏海：一撮撮（尖）
  if (c > 0.55) {
    const k = long ? 26 : 19;
    const tri = Math.abs(((theta * k) / Math.PI) % 2 - 1); // 0..1 三角波
    drop += (long ? 0.6 : 1.1) * (1 - tri) * Math.min(1, (c - 0.55) / 0.2);
  }
  // 成圈髮腳都有細細撮（唔係一條直線）
  drop += (long ? 0.35 : 0.45) * Math.pow(Math.abs(Math.sin(theta * (long ? 30 : 24))), 3);
  // 男仔鬢角（耳仔前面）
  if (!long && s > 0.75 && c > 0.05 && c < 0.45) drop += 3 * Math.sin(((c - 0.05) / 0.4) * Math.PI);
  return drop;
}

const hairCache = new Map();

/**
 * 頭髮殼：沿 theta（圍住個頭）同 phi（由頭頂落）嘅格，每條直線由頭頂去到髮腳；
 * 表面 = 頭表面 + 厚度（頂厚、邊薄，加梳紋），最後一行摺返入頭皮，邊位有厚度。
 * 座標：頭中心 = 原點。hat = 戴帽時壓薄啲，唔會穿出帽。
 */
export function hairGeometry(head, style = 'short', hat = false) {
  // v29：hat = 帽口離頭頂幾多 cm（true = 4）。帽口以上嘅頭髮收埋入頭皮（以前壓薄都會喺帽同膠邊之間穿出嚟），
  // 帽口以下先有頭髮，由薄漸漸變返正常厚度。
  const cut = hat === true ? 4 : +hat || 0;
  const key = [head.w, head.h, head.d, style, cut, JSON.stringify(head.profile ?? null)].join('|');
  if (hairCache.has(key)) return hairCache.get(key);
  const NU = 240, NV = 30;
  const top = head.h / 2;
  const base = cut ? 0.6 : style === 'pigtails' ? 0.75 : 0.9;
  const phiAt = (theta, drop) => {
    let lo = 0, hi = Math.PI * 0.98;
    for (let it = 0; it < 30; it++) {
      const m = (lo + hi) / 2;
      const dv = dirOf(theta, m);
      const y = dv[1] * headRadius(dv, head);
      if (top - y < drop) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };
  const P = [];
  const I = [];
  const row = NV + 2; // 0..NV 表面 + 1 行摺入
  for (let i = 0; i <= NU; i++) {
    const theta = (i / NU) * Math.PI * 2;
    const drop = hairDrop(theta, style, head.h);
    // 搵 phi：表面點嘅 y = top − drop
    const phiMax = phiAt(theta, drop);
    const phiMin = cut ? Math.min(phiMax, phiAt(theta, cut)) : 0;
    const hidden = cut && drop <= cut + 0.2; // 呢個方向嘅頭髮全部喺帽入面
    for (let j = 0; j <= NV + 1; j++) {
      const f = Math.min(1, j / NV);
      const phi = phiMin + (phiMax - phiMin) * Math.sin((f * Math.PI) / 2); // 近邊位密啲
      const dv = dirOf(theta, phi);
      const R = headRadius(dv, head);
      let off;
      if (hidden || j > NV || (cut && j === 0)) off = -0.4; // 摺返入頭皮（帽口嗰行都係）
      else if (cut) {
        const yy = dv[1] * R;
        const below = top - yy - cut; // 帽口以下幾多 cm
        const ramp = Math.min(1, Math.max(0, below / 1.5));
        const swirl = theta * 30 + phi * 2.2;
        const groove = 0.22 * Math.pow(Math.abs(Math.sin(swirl)), 0.6) * ramp;
        off = (0.12 + (base - 0.12) * ramp) * (1 - 0.5 * f * f) + groove;
      } else {
        // 梳紋：一撮撮由頭頂順住梳落嚟（近頭頂細、近邊位明顯）
        const swirl = theta * 30 + phi * 2.2;
        const clump = Math.pow(Math.abs(Math.sin(swirl)), 0.6);
        const fine = 0.5 + 0.5 * Math.sin(theta * 97 + phi * 5);
        const groove = (0.28 * clump + 0.06 * fine) * Math.min(1, phi * 2.2);
        off = base * (1 - 0.5 * f * f) + 0.1 + groove;
      }
      P.push(dv[0] * (R + off), dv[1] * (R + off), dv[2] * (R + off));
    }
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < row - 1; j++) {
      const a = i * row + j, b = (i + 1) * row + j;
      I.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  hairCache.set(key, g);
  return g;
}

/* ---------------- v29 帽：貼頭嘅帽帶、圓滑軟帽 ---------------- */
/** 頭（中心 = 原點）喺高度 y、方向 theta（0 = 前 +z、π/2 = 左 +x）嘅水平半徑 */
export function headRadiusAt(theta, y, head) {
  const dx = Math.sin(theta), dz = Math.cos(theta);
  let lo = 0, hi = Math.max(head.w, head.d);
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2;
    if (headSdf([dx * m, y, dz * m], head) > 0) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
}

const bandCache = new Map();
/**
 * 貼住個頭嘅帽帶（流線）：y0–y1（頭中心座標）之間，離頭皮 gap cm，外面微微圓（厚 thick cm）。
 * 方塊版帽帶係一舊比個頭大嘅長方體，圓頭上面四角會凸出嚟，好似多咗一層黑色嘢（v29 用戶）。
 */
export function headBandGeometry(head, y0, y1, gap = 0.25, thick = 0.35) {
  const key = [head.w, head.h, head.d, y0, y1, gap, thick].map((v) => +(+v).toFixed(3)).join('|') + JSON.stringify(head.profile ?? null);
  if (bandCache.has(key)) return bandCache.get(key);
  const NU = 96;
  const prof = [];
  const hh = (y1 - y0) / 2;
  prof.push([-0.15, -hh]);
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / 8;
    prof.push([thick * Math.cos(a), hh * Math.sin(a)]);
  }
  prof.push([-0.15, hh]);
  const P = [];
  const I = [];
  const n = prof.length;
  for (let i = 0; i <= NU; i++) {
    const th = (i / NU) * Math.PI * 2;
    const r = Math.max(headRadiusAt(th, y0, head), headRadiusAt(th, y1, head), headRadiusAt(th, (y0 + y1) / 2, head)) + gap;
    const dx = Math.sin(th), dz = Math.cos(th);
    for (const [dr, dy] of prof) P.push(dx * (r + dr), (y0 + y1) / 2 + dy, dz * (r + dr));
  }
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = (i + 1) * n + j;
      I.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  bandCache.set(key, g);
  return g;
}

/**
 * 圓滑軟帽帽身（流線）：由帽帶頂（rimY，頭中心座標）起，向外脹再收埋去頭頂上面；
 * 向穿著者右邊（−x）拉低、脹多啲（手冊 P.98–99：軟帽拉向右邊）。左邊（+x）唔會揭起（以前方塊帽身斜咗，左邊露出頭髮）。
 * 回傳 { geo, profile(theta, t) → [x, y, z], normal(theta, t) }。
 */
export function beretShape(head, rimY) {
  const top = head.h / 2 + 1.7;
  const prof = (theta, t) => {
    const right = Math.max(0, -Math.sin(theta)); // 1 = 穿著者右邊
    const rr = headRadiusAt(theta, rimY, head) + 0.55;
    const bulge = 1.2 + 1.5 * right * right;
    const droop = 1.3 * right * right;
    const P0 = [rr, rimY];
    const P1 = [rr + bulge * 1.5, rimY + 1.6 - droop];
    const P2 = [rr * 0.62 + bulge * 0.6, top - 0.2 * right];
    const P3 = [0, top - 0.6 * right];
    const u = 1 - t;
    const r = u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0];
    const y = u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1];
    return [Math.sin(theta) * r, y, Math.cos(theta) * r];
  };
  const NU = 96, NV = 28;
  const P = [];
  const I = [];
  for (let i = 0; i <= NU; i++) {
    const th = (i / NU) * Math.PI * 2;
    for (let j = 0; j <= NV; j++) P.push(...prof(th, j / NV));
  }
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = (i + 1) * (NV + 1) + j;
      I.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  const normal = (theta, t) => {
    const e = 1e-3;
    const p = prof(theta, t);
    const a = prof(theta, t + e), b = prof(theta + e, t);
    const v1 = new THREE.Vector3(a[0] - p[0], a[1] - p[1], a[2] - p[2]);
    const v2 = new THREE.Vector3(b[0] - p[0], b[1] - p[1], b[2] - p[2]);
    const n = new THREE.Vector3().crossVectors(v2, v1).normalize();
    if (n.x * p[0] + n.z * p[2] + n.y * (p[1] - rimY) < 0) n.negate();
    return n;
  };
  return { geo: g, profile: prof, normal };
}

/* ---------------- 手：手掌＋四隻手指（兩節，微微屈）＋拇指 ---------------- */
const capCache = new Map();
/** 膠囊（向下 −Y，頂喺原點，總長 len） */
export function capsule(r, len) {
  const key = `${r.toFixed(3)}|${len.toFixed(3)}`;
  if (capCache.has(key)) return capCache.get(key);
  const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10);
  g.translate(0, -len / 2, 0);
  capCache.set(key, g);
  return g;
}

/**
 * 手指排位（手嘅局部座標：原點 = 手腕中心，−y 向下，掌心向身（s = 1 左手 → 掌心向 −x））。
 * 回傳 { palm: [w, h, d, cy], fingers: [{ x, y, z, r, segs: [{ len, rotZ }], rotX }], thumb }
 */
export function handLayout({ w, h, d }, s = 1) {
  const palmH = h * 0.5;
  const breadth = d * 1.12;
  const thick = w * 0.6;
  const fl = h * 0.5;
  const r = breadth / 7.4;
  const lens = [0.92, 1, 0.95, 0.78];
  const fingers = lens.map((k, i) => {
    const z = breadth / 2 - r * 1.15 - i * ((breadth - r * 2.3) / 3); // 食指喺前（+z）
    const L = fl * k;
    return {
      x: 0,
      y: -palmH + 0.3,
      z,
      r: r * (i === 3 ? 0.88 : 1),
      // 兩節：第一節微微向掌心屈，第二節再屈多啲（s 決定方向）
      segs: [{ len: L * 0.55, rot: -s * (0.12 + i * 0.03) }, { len: L * 0.5, rot: -s * 0.32 }],
      spread: (1.5 - i) * 0.05,
    };
  });
  const thumb = { x: -s * thick * 0.15, y: -palmH * 0.35, z: breadth / 2 - 0.2, r: r * 1.12, len: fl * 0.72, rotX: -0.55, rotZ: -s * 0.25 };
  return { palm: [thick, palmH, breadth], fingers, thumb };
}

/** 孖辮：上面紮住、中間脹、尾尖，有梳紋；頂喺原點，向下 len cm */
export function pigtailGeometry(len = 12, rMax = 2.3) {
  const key = `pig|${len}|${rMax}`;
  if (hairCache.has(key)) return hairCache.get(key);
  const NA = 32, NL = 24;
  const P = [];
  const I = [];
  for (let j = 0; j <= NL; j++) {
    const t = j / NL; // 0 = 頂（紮位）、1 = 尾
    const prof = t < 0.12 ? 0.62 + (t / 0.12) * 0.25 : 0.87 + 0.13 * Math.sin(Math.min(1, (t - 0.12) / 0.35) * Math.PI * 0.5) - Math.pow(Math.max(0, (t - 0.45) / 0.55), 1.6) * 0.9;
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2;
      const strand = 1 + 0.09 * Math.pow(Math.abs(Math.sin(a * 4 + t * 2.5)), 0.6);
      const r = Math.max(0.05, rMax * prof * strand);
      P.push(Math.cos(a) * r, -t * len, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < NL; j++) {
    for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i, b = a + NA + 1;
      I.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  hairCache.set(key, g);
  return g;
}
