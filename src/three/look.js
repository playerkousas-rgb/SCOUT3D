// 外觀模式（v25）：「精緻」＝圓角方塊、布紋、刺繡章、金屬反光、環境光；「簡約」＝原本嘅像素方塊。
// 只改「點樣畫」，唔改任何位置：徽章位置照舊由 badgeLayout.js 以厘米計（ADR-0023）。
// © SCOUT SYSTEM · SCOUT3D v1.0
import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PX } from './body.js';

export const LOOKS = ['detailed', 'simple'];
export const DEFAULT_LOOK = 'detailed';
export const LookContext = createContext(DEFAULT_LOOK);
/** 而家係咪「精緻」模式 */
export const useDetailed = () => useContext(LookContext) === 'detailed';

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

const geoCache = new Map();
/**
 * 圓角方塊（有快取，唔好 dispose）。max = 最大圓角半徑；taper = 底面闊度比例（褲腳收窄 < 1、裙腳放闊 > 1；1 = 唔變）。
 * 面嘅次序同材質陣列同 BoxGeometry 一樣：[+x, -x, +y, -y, +z, -z]。
 */
export function roundedBox(w, h, d, taper = 1, max = MAX_RADIUS) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${taper.toFixed(3)}|${max}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const r = radiusFor(w, h, d, max);
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const per = pos.count / 6;
  for (let i = 0; i < pos.count; i++) {
    const [u, v] = planarUV(Math.floor(i / per), pos.getX(i), pos.getY(i), pos.getZ(i), w, h, d);
    uv.setXY(i, u, v);
  }
  if (taper !== 1) {
    // 由頂（y = h/2，比例 1）到底（y = -h/2，比例 taper）線性收窄，只改 x、z
    for (let i = 0; i < pos.count; i++) {
      const t = (h / 2 - pos.getY(i)) / h;
      const k = 1 + (taper - 1) * t;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
  }
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

const plainCache = new Map();
/** 普通方塊（簡約模式；有快取，唔好 dispose）。同圓角方塊一樣用 geometry 屬性，轉模式時唔會甩咗 geometry */
export function plainBox(w, h, d) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = plainCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    plainCache.set(key, g);
  }
  return g;
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
