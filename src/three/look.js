// 外觀（v25–v29c）：只留「流線」（圓滑公仔＋布紋、刺繡章、金屬反光、環境光）；v29c 刪咗「精緻」「簡約」。
// 只改「點樣畫」，唔改任何位置：徽章位置照舊由 badgeLayout.js 以厘米計（ADR-0023）。
// © SCOUT SYSTEM · SCOUT3D v1.0
import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { PX } from './body.js';

/** v29c：外觀只留「流線」（精緻／簡約已刪，用戶：減輕負擔）。 */
export const LOOKS = ['smooth'];
export const DEFAULT_LOOK = 'smooth';
/**
 * v29c 人形試做：current = 現有流線公仔；a = 修正比例／關節／皮膚（程式砌）；b = 真人人台（Anny／MakeHuman CC0 模型）。
 * 只係預覽，徽章位置一樣由 badgeLayout.js 以厘米計。
 */
export const FIGURES = ['current', 'b'];
export const DEFAULT_FIGURE = 'current';
export const FigureContext = createContext(DEFAULT_FIGURE);
export const useFigure = () => useContext(FigureContext);

/* ---------------- 圓角方塊 ---------------- */
/**
 * 圓角半徑（cm）：最多 0.6 cm，細方塊按比例細啲。
 * 0.6 cm 係刻意細：袖章最闊 = 袖闊 − 1 cm（每邊留 0.5 cm），章角離圓角開始位最多 0.1 cm，浮起唔夠 0.01 cm。
 */
export const MAX_RADIUS = 0.6;
/** 衫袖：袖外側四格圓章（深資／樂行）可以離袖邊淨係 0.1 cm，所以袖用細啲嘅圓角 */
export const SLEEVE_RADIUS = 0.2;
export function radiusFor(w, h, d, max = MAX_RADIUS) {
  return Math.min(max, 0.22 * Math.min(w, h, d));
}

/**
 * BoxGeometry 嘅 UV 規則（每面 u、v 由位置線性計）：同 three.js buildPlane 一樣。
 * 圓角方塊用返呢套「平面投影」UV，貼圖喺平面部分同普通方塊一模一樣（RoundedBoxGeometry 原本嘅 UV 會縮細少少）。
 */
export function planarUV(face, x, y, z, w, h, d) {
  const cl = (t) => Math.min(1, Math.max(0, t));
  switch (face) {
    case 0: return [cl((d / 2 - z) / d), cl((y + h / 2) / h)]; // +x
    case 1: return [cl((z + d / 2) / d), cl((y + h / 2) / h)]; // -x
    case 2: return [cl((x + w / 2) / w), cl((d / 2 - z) / d)]; // +y
    case 3: return [cl((x + w / 2) / w), cl((z + d / 2) / d)]; // -y
    case 4: return [cl((x + w / 2) / w), cl((y + h / 2) / h)]; // +z
    default: return [cl((w / 2 - x) / w), cl((y + h / 2) / h)]; // -z
  }
}

/* ---------------- 像素畫放大（Scale2x × 2）＋布面雜色 ---------------- */
function scale2x(src, w, h) {
  const out = new Uint32Array(w * h * 4);
  const W2 = w * 2;
  const at = (x, y) => src[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const E = at(x, y), B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), H = at(x, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E;
      if (B !== H && D !== F) {
        e0 = D === B ? D : E;
        e1 = B === F ? F : E;
        e2 = D === H ? D : E;
        e3 = H === F ? F : E;
      }
      const o = y * 2 * W2 + x * 2;
      out[o] = e0;
      out[o + 1] = e1;
      out[o + W2] = e2;
      out[o + W2 + 1] = e3;
    }
  }
  return out;
}

/** 可重複嘅雜色（整數座標） */
function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** 平滑雜色（value noise，0–1） */
function smooth(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const AO = 0.09; // 邊位最暗 9%
export const FINE = 4; // 精緻貼圖：每格再分 4 × 4（0.125 cm）
const fineCache = new WeakMap();
/**
 * 精緻貼圖：Scale2x 兩次（斜邊唔再係樓梯級），布料再加少少雜色（唔同纖維深淺）。
 * cloth = false（皮膚、鞋、頭髮）就唔加雜色。
 */
export function fineCanvas(c, cloth = true) {
  const byKind = fineCache.get(c) ?? {};
  const k = cloth ? 'cloth' : 'plain';
  if (byKind[k]) return byKind[k];
  const w = c.width, h = c.height;
  const src = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer.slice(0));
  const x2 = scale2x(src, w, h);
  const x4 = scale2x(x2, w * 2, h * 2);
  const W = w * FINE, H = h * FINE;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(W, H);
  const bytes = new Uint8ClampedArray(x4.buffer);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // 布：細雜色 ± 2.5%（纖維深淺）＋大片光暗；全部：近邊位暗少少（似 AO：方塊交接位有陰影感）
      const n = cloth ? (hash(x, y) - 0.5) * 0.05 + (smooth(x / 24, y / 24) - 0.5) * 0.03 : 0;
      const e = Math.min(x + 0.5, W - x - 0.5, y + 0.5, H - y - 0.5) / (PX * FINE); // 離邊 cm
      const f = (1 + n) * (1 - (cloth ? AO : AO * 0.6) * Math.exp(-e / 0.9));
      img.data[i] = bytes[i] * f;
      img.data[i + 1] = bytes[i + 1] * f;
      img.data[i + 2] = bytes[i + 2] * f;
      img.data[i + 3] = bytes[i + 3];
    }
  }
  ctx.putImageData(img, 0, 0);
  byKind[k] = out;
  fineCache.set(c, byKind);
  return out;
}

/* ---------------- 法線貼圖（程式畫，唔使下載） ---------------- */
function normalCanvas(size, height, strength) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = height(x, y);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const TAU = Math.PI * 2;
let fabricBase = null;
let stitchBase = null;
/** 斜紋布（一格 = 2 × 2 cm，6 條斜紋＋細格織紋＋粗紗） */
function fabricTexture() {
  if (fabricBase) return fabricBase;
  const S = 128;
  const c = normalCanvas(
    S,
    (x, y) =>
      0.5 * Math.sin((TAU * 6 * (x + y)) / S) +
      0.22 * Math.sin((TAU * 32 * x) / S) * Math.sin((TAU * 32 * y) / S) +
      0.35 * (hash(x, y) - 0.5) +
      0.25 * (hash(x >> 3, y) - 0.5),
    0.9,
  );
  fabricBase = new THREE.CanvasTexture(c);
  fabricBase.wrapS = fabricBase.wrapT = THREE.RepeatWrapping;
  fabricBase.anisotropy = 4;
  return fabricBase;
}

/** 刺繡（一格 = 1 × 1 cm，斜斜嘅緞面針步） */
function stitchTexture() {
  if (stitchBase) return stitchBase;
  const S = 64;
  const c = normalCanvas(
    S,
    (x, y) => Math.pow(Math.abs(Math.sin((Math.PI * 10 * (y + x * 0.2)) / S)), 0.7) + 0.3 * (hash(x, y >> 1) - 0.5),
    1.4,
  );
  stitchBase = new THREE.CanvasTexture(c);
  stitchBase.wrapS = stitchBase.wrapT = THREE.RepeatWrapping;
  stitchBase.anisotropy = 4;
  return stitchBase;
}

const repCache = new Map();
function repeated(base, tag, rx, ry) {
  const key = `${tag}|${rx.toFixed(2)}|${ry.toFixed(2)}`;
  let t = repCache.get(key);
  if (!t) {
    t = base.clone(); // 同一個 Source：GPU 只上載一次
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    repCache.set(key, t);
  }
  return t;
}
/** 布紋法線（wcm × hcm 一面） */
export const fabricNormal = (wcm, hcm) => repeated(fabricTexture(), 'fabric', Math.max(0.5, wcm / 2), Math.max(0.5, hcm / 2));
/** 刺繡法線（章闊 wcm × 高 hcm） */
export const stitchNormal = (wcm, hcm) => repeated(stitchTexture(), 'stitch', Math.max(0.5, wcm), Math.max(0.5, hcm));

/* ---------------- 材質種類 ---------------- */
/** 畫布種類（pixels.js 標記）：skin 皮膚、hair 頭髮、shoe 鞋、leather 皮革；冇標記 = 布 */
export function tagKind(canvases, kind) {
  canvases.forEach((c) => {
    c.kind = kind;
  });
  return canvases;
}

/** 每種材質嘅粗糙度、法線強度 */
export const KIND_PROPS = {
  cloth: { roughness: 0.93, normal: 0.55, cloth: true },
  skin: { roughness: 0.62, normal: 0, cloth: false },
  hair: { roughness: 0.55, normal: 0, cloth: false },
  shoe: { roughness: 0.42, normal: 0, cloth: false },
  leather: { roughness: 0.5, normal: 0, cloth: false },
};

/** 一面嘅大小（cm）：由畫布格數計返 */
export const canvasCm = (c) => [c.width / PX, c.height / PX];

/* ---------------- 徽章 ---------------- */
/** 金屬章（勳章、別針、金屬肩章、紀念章）：有金屬反光；其餘當刺繡布章 */
const METAL_IDS = new Set([
  'neckMedal', 'gallantry', 'meritAward', 'longService', 'retiredPin', 'metalEpaulette', 'diamondJubilee', 'millennium',
  'centenary', 'anniv110', 'sp95', 'sp100', 'sp110', 'specialContribution', 'specialStar', 'serviceBars', 'wings', 'healthGuard',
  'walkTogether', 'scoutCentre', 'metroCamp',
]);
export const isMetalBadge = (p) => METAL_IDS.has(p.id) || !!p.crop;

export const BADGE_THICK = 0.15; // 布章厚度（cm）
export const BADGE_LIFT = 0.1; // 精緻模式：章面再企出 0.1 cm（只係 z，x／y 位置唔變）

const edgeCache = new WeakMap();
/**
 * 睇章圖邊：四角唔透明 = 長方布章（可以畫厚度）；edge = 邊位平均色（厚度側面用）。
 * round = 圓章：用圓周取色。
 */
export function badgeEdge(image, round) {
  if (!image?.width) return null;
  const cached = edgeCache.get(image);
  const k = round ? 'round' : 'rect';
  if (cached?.[k]) return cached[k];
  const S = 32;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  let data;
  try {
    ctx.drawImage(image, 0, 0, S, S);
    data = ctx.getImageData(0, 0, S, S).data;
  } catch {
    return null;
  }
  const px = (x, y) => {
    const i = (Math.round(y) * S + Math.round(x)) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const pts = [];
  if (round) {
    for (let a = 0; a < 32; a++) pts.push([15.5 + 14.5 * Math.cos((a / 32) * TAU), 15.5 + 14.5 * Math.sin((a / 32) * TAU)]);
  } else {
    for (let i = 1; i < S - 1; i += 2) pts.push([i, 1], [i, S - 2], [1, i], [S - 2, i]);
  }
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of pts) {
    const p = px(x, y);
    if (p[3] < 128) continue;
    r += p[0];
    g += p[1];
    b += p[2];
    n++;
  }
  const corners = [px(1, 1), px(S - 2, 1), px(1, S - 2), px(S - 2, S - 2)];
  const opaque = corners.every((p) => p[3] > 200);
  const out = {
    opaque,
    edge: n ? `rgb(${Math.round((r / n) * 0.82)}, ${Math.round((g / n) * 0.82)}, ${Math.round((b / n) * 0.82)})` : '#888888',
  };
  edgeCache.set(image, { ...cached, [k]: out });
  return out;
}

/* ---------------- v26 流線公仔：圓滑部件（程式砌，唔使模型檔） ---------------- */

/** 上身、衫袖橫切面圓角：章、專章帶、笛繩用 snapToSurface 貼返落圓滑表面（平面部分位置唔變） */
export const TORSO_RC_K = 0.42; // 上身圓角 = 0.42 × 厚度（側面差唔多半圓）
export const TORSO_RE_TOP = 2.5; // 膊頭收圓
export const SLEEVE_RC_K = 0.42;
export const SLEEVE_RE_TOP = 0.32; // 膊頭（袖頂）收圓 = 0.32 × 袖闊；袖章喺圓位會屈返貼住
/** 上身闊度（由頂 t = 0 到底 t = 1）：胸口最闊、腰收窄、下擺少少放返 */
export const TORSO_PROFILE = [[0, 1], [0.3, 1], [0.72, 0.93], [1, 0.95]];
/** 闊度比例 k(t)：profile 線性插值 */
export function profileAt(profile, t) {
  if (!profile) return 1;
  for (let i = 1; i < profile.length; i++) {
    const [t0, k0] = profile[i - 1], [t1, k1] = profile[i];
    if (t <= t1) return k0 + ((k1 - k0) * (t - t0)) / (t1 - t0 || 1);
  }
  return profile[profile.length - 1][1];
}

/**
 * 每種部件嘅形狀：rc = 橫切面圓角、reTop／reBot = 頂／底收圓（cm）。
 * limb：手腳差唔多係圓柱；head：圓頭；hand：手套形；shoe：圓頭鞋。
 */
export function partShape(part, w, h, d) {
  const m = Math.min(w, d);
  switch (part) {
    case 'torso': return { rc: TORSO_RC_K * Math.min(w, d), reTop: TORSO_RE_TOP, reBot: 0.6, profile: TORSO_PROFILE };
    case 'sleeve': return { rc: SLEEVE_RC_K * Math.min(w, d), reTop: SLEEVE_RE_TOP * Math.min(w, d), reBot: 0.5 };
    case 'head': return { rc: 0.47 * m, reTop: 0.42 * h, reBot: 0.26 * h };
    case 'neck': return { rc: 0.48 * m, reTop: 0.3, reBot: 0.3 };
    case 'limb': return { rc: 0.47 * m, reTop: Math.min(1, 0.2 * m), reBot: Math.min(1, 0.2 * m) };
    case 'hand': return { rc: 0.45 * m, reTop: 0.6, reBot: 0.45 * m };
    case 'shoe': return { rc: 0.4 * Math.min(w, d), reTop: Math.min(1.6, 0.45 * h), reBot: 0.3 };
    case 'hat': return { rc: 0.42 * m, reTop: 0.45 * h, reBot: 0.25 };
    case 'skirt': return { rc: 0.3 * m, reTop: 0.6, reBot: 0.5 };
    default: return { rc: Math.min(0.6, 0.22 * Math.min(w, h, d)), reTop: Math.min(0.6, 0.22 * Math.min(w, h, d)), reBot: Math.min(0.6, 0.22 * Math.min(w, h, d)) };
  }
}

/** 圓角長方形周邊上第 i 點（由前面中間開始，向 +x 方向行一圈） */
function ringPoints(a, b, r, nf, na) {
  const pts = [];
  const fx = a - r, fz = b - r;
  const line = (x0, z0, x1, z1, n) => { for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]); };
  const arc = (cx, cz, t0, n) => { for (let i = 0; i < n; i++) { const t = t0 + ((Math.PI / 2) * i) / n; pts.push([cx + r * Math.sin(t), cz + r * Math.cos(t)]); } };
  line(0, b, fx, b, nf); // 前面右半
  arc(fx, fz, 0, na); // 前 +x 角
  line(a, fz, a, 0, nf);
  line(a, 0, a, -fz, nf);
  arc(fx, -fz, Math.PI / 2, na);
  line(fx, -b, 0, -b, nf);
  line(0, -b, -fx, -b, nf);
  arc(-fx, -fz, Math.PI, na);
  line(-a, -fz, -a, 0, nf);
  line(-a, 0, -a, fz, nf);
  arc(-fx, fz, (3 * Math.PI) / 2, na);
  line(-fx, b, 0, b, nf);
  return pts;
}

const smoothCache = new Map();
/**
 * 圓滑部件：圓角長方形橫切面向上下伸，頂底收圓；外框 = w × h × d（同方塊一樣）。
 * 每個三角形按法線揀返方塊六面其中一面（材質陣列次序一樣），UV 用平面投影（planarUV），
 * 所以原本畫喺方塊面上嘅貼圖照用，正面中間位置一樣。taper = 底面闊度比例。
 */
export function smoothBox(w, h, d, { rc = 1, reTop = 0.6, reBot = 0.6, taper = 1, profile = null } = {}) {
  const key = [w, h, d, rc, reTop, reBot, taper].map((v) => v.toFixed(3)).join('|') + JSON.stringify(profile);
  const hit = smoothCache.get(key);
  if (hit) return hit;
  const half = h / 2;
  const reT = Math.max(0.2, Math.min(reTop, h * 0.49, Math.min(w, d) / 2 - 0.01));
  const reB = Math.max(0.2, Math.min(reBot, h * 0.49, Math.min(w, d) / 2 - 0.01));
  const nf = 3, na = 6, K = 6, MID = 10;
  const rings = [];
  for (let i = 0; i <= K; i++) { const al = -Math.PI / 2 + (i / K) * (Math.PI / 2); rings.push([-half + reB + reB * Math.sin(al), reB * (1 - Math.cos(al))]); }
  for (let i = 1; i < MID; i++) rings.push([-half + reB + ((h - reB - reT) * i) / MID, 0]);
  for (let i = 0; i <= K; i++) { const al = (i / K) * (Math.PI / 2); rings.push([half - reT + reT * Math.sin(al), reT * (1 - Math.cos(al))]); }
  const pos = [];
  let N = 0;
  for (const [y, inset] of rings) {
    const k = (1 + (taper - 1) * ((half - y) / h)) * profileAt(profile, (half - y) / h);
    const A = (w / 2) * k, Bz = (d / 2) * k;
    const a = Math.max(0.01, A - inset), b = Math.max(0.01, Bz - inset);
    const r = Math.max(0.01, Math.min(rc * k - inset, a, b));
    const pts = ringPoints(a, b, r, nf, na);
    N = pts.length;
    for (const [x, z] of pts) pos.push(x, y, z);
  }
  const R = rings.length;
  const botC = pos.length / 3; pos.push(0, -half, 0);
  const topC = botC + 1; pos.push(0, half, 0);
  const idx = [];
  for (let j = 0; j < R - 1; j++) {
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      const p00 = j * N + i, p01 = j * N + i2, p10 = (j + 1) * N + i, p11 = (j + 1) * N + i2;
      idx.push(p00, p01, p10, p01, p11, p10); // 由外面望係逆時針（向外）
    }
  }
  for (let i = 0; i < N; i++) {
    const i2 = (i + 1) % N;
    idx.push(botC, i2, i);
    idx.push(topC, (R - 1) * N + i, (R - 1) * N + i2);
  }
  const ig = new THREE.BufferGeometry();
  ig.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ig.setIndex(idx);
  ig.computeVertexNormals();
  const P = ig.attributes.position, NN = ig.attributes.normal;
  const tri = Array.from({ length: idx.length / 3 }, (_, t) => t);
  const faceOf = (t) => {
    const v = [0, 1, 2].map((q) => new THREE.Vector3().fromBufferAttribute(P, idx[t * 3 + q]));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0]));
    const ax = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    const m = Math.max(...ax);
    if (m === ax[0]) return n.x > 0 ? 0 : 1;
    if (m === ax[1]) return n.y > 0 ? 2 : 3;
    return n.z > 0 ? 4 : 5;
  };
  const groups = [[], [], [], [], [], []];
  for (const t of tri) groups[faceOf(t)].push(t);
  const outP = [], outN = [], outU = [];
  const g = new THREE.BufferGeometry();
  let start = 0;
  groups.forEach((list, f) => {
    for (const t of list) {
      for (let q = 0; q < 3; q++) {
        const vi = idx[t * 3 + q];
        const x = P.getX(vi), y = P.getY(vi), z = P.getZ(vi);
        outP.push(x, y, z);
        outN.push(NN.getX(vi), NN.getY(vi), NN.getZ(vi));
        outU.push(...planarUV(f, x, y, z, w, h, d));
      }
    }
    g.addGroup(start, list.length * 3, f);
    start += list.length * 3;
  });
  g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(outU, 2));
  ig.dispose();
  smoothCache.set(key, g);
  return g;
}

/**
 * 貼返落圓滑部件表面：p = 原本喺方塊表面外 t cm 嘅點（徽章、專章帶、笛繩），
 * 回傳喺圓滑表面外同樣 t cm 嘅點。平面部分唔郁；圓角位沿圓心方向推（似由正面投影嘅 decal）。
 * S = { cx, cy, cz, w, h, d, rc, reTop, reBot }（同 smoothBox 一樣嘅形狀）。maxT：離表面太遠（例如喺手臂）就唔郁。
 */
export function snapToSurface([x, y, z], S, maxT = 2.5) {
  if (S.snap) return S.snap([x, y, z], maxT); // v30 試做 B：網格表面（mannequin.js meshSurface）
  const hh = S.h / 2;
  const Y = y - S.cy;
  let X = x - S.cx;
  let Z = z - S.cz;
  const a0 = S.w / 2, b0 = S.d / 2, r0 = Math.min(S.rc, a0, b0);
  // 有 profile（上身腰位收窄）：嗰個高度嘅橫切面細咗 k 倍；近正面／側面嘅點向入移返同樣距離（離表面 t 唔變）
  const k = profileAt(S.profile, Math.min(1, Math.max(0, (hh - Y) / S.h)));
  if (k !== 1 && Math.max(Math.abs(X) - a0, Math.abs(Z) - b0) < maxT) {
    // 喺圓角範圍入面逐步加（連續，唔會一級級），到咗平面位就成個收窄量
    const ramp = (q, half) => Math.min(1, Math.max(0, (Math.abs(q) - (half - r0)) / r0));
    const wz = ramp(Z, b0), wx = ramp(X, a0);
    Z -= (Math.sign(Z) || 1) * b0 * (1 - k) * wz;
    X -= (Math.sign(X) || 1) * a0 * (1 - k) * wx;
  }
  const a = a0 * k, b = b0 * k, r = r0 * k;
  const sx = Math.sign(X) || 1, sz = Math.sign(Z) || 1;
  // 1. 橫切面圓角
  const qx = Math.abs(X) - (a - r), qz = Math.abs(Z) - (b - r);
  const th = Math.max(Math.abs(X) - a, Math.abs(Z) - b);
  if (qx > 0 && qz > 0 && th > -r && th < maxT) {
    const l = Math.hypot(qx, qz);
    const t = Math.max(0, th);
    X = sx * (a - r + (qx / l) * (r + t));
    Z = sz * (b - r + (qz / l) * (r + t));
  }
  // 2. 頂／底收圓：喺（離橫切面邊界距離, Y）平面做
  const sd = roundRectDist(X, Z, a, b, r);
  let newY = Y;
  for (const [re, top] of [[S.reTop, true], [S.reBot, false]]) {
    if (!(re > 0)) continue;
    const yc = top ? hh - re : -hh + re;
    const dy = top ? Y - yc : yc - Y;
    const u = sd.dist + re;
    if (dy <= 0 || u <= 0) continue;
    const t = Math.max(sd.dist, dy - re);
    if (t < -0.01 || t > maxT) continue;
    const l = Math.hypot(u, dy);
    const nu = (u / l) * (re + Math.max(0, t)) - re; // 新嘅離邊界距離
    const ndy = (dy / l) * (re + Math.max(0, t));
    X += sd.nx * (nu - sd.dist);
    Z += sd.nz * (nu - sd.dist);
    newY = top ? yc + ndy : yc - ndy;
  }
  return [X + S.cx, newY + S.cy, Z + S.cz];
}

/** 點去圓角長方形（半闊 a、半深 b、圓角 r）邊界嘅有號距離（外面 = 正）同向外法線 */
function roundRectDist(X, Z, a, b, r) {
  const sx = Math.sign(X) || 1, sz = Math.sign(Z) || 1;
  const qx = Math.abs(X) - (a - r), qz = Math.abs(Z) - (b - r);
  if (qx > 0 && qz > 0) {
    const l = Math.hypot(qx, qz) || 1;
    return { dist: l - r, nx: (sx * qx) / l, nz: (sz * qz) / l };
  }
  if (qx > qz) return { dist: qx - r, nx: sx, nz: 0 };
  return { dist: qz - r, nx: 0, nz: sz };
}

/** 部件表面描述（俾 snapToSurface 用）：中心、大小、形狀 */
export function surfaceOf(part, [w, h, d], [cx, cy, cz]) {
  return { cx, cy, cz, w, h, d, ...partShape(part, w, h, d) };
}

/** 章最多偏離平面幾多 cm 都仲當係平（照畫厚度，成塊平移）；腰身微微收窄只會令章斜少少 */
export const BEND_MIN = 0.08;

/** 將一個局部座標嘅平面（徽章）屈返貼住表面：matrix = 局部 → 部件座標 */
export function bendGeometry(geo, matrix, S) {
  const inv = matrix.clone().invert();
  const P = geo.attributes.position;
  const v = new THREE.Vector3();
  const o = new THREE.Vector3();
  const deltas = [];
  const shift = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    o.fromBufferAttribute(P, i);
    v.copy(o).applyMatrix4(matrix);
    const q = snapToSurface([v.x, v.y, v.z], S);
    v.set(q[0], q[1], q[2]).applyMatrix4(inv);
    P.setXYZ(i, v.x, v.y, v.z);
    const dl = v.clone().sub(o);
    deltas.push(dl);
    shift.add(dl);
  }
  if (P.count) shift.divideScalar(P.count);
  // moved = 真正屈咗幾多（扣除成塊平移）；shift = 成塊平移（局部座標，例如腰身收窄令章向入移少少）
  let moved = 0;
  for (const dl of deltas) moved = Math.max(moved, dl.distanceTo(shift));
  P.needsUpdate = true;
  geo.computeVertexNormals();
  geo.userData.moved = moved;
  geo.userData.shift = shift.toArray();
  return geo;
}
