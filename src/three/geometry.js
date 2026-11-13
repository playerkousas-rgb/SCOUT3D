// 程序生成衣物幾何（全部用真實尺寸，米）— v1.0 · © SCOUT SYSTEM
import * as THREE from 'three';
import { D, SHIRT_PROFILE, SLEEVE, torsoZ, profileRadius } from './dims.js';

const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));

export function torsoGeometry() {
  const g = new THREE.LatheGeometry(v2(SHIRT_PROFILE), 48);
  g.scale(1, 1, D.torsoDepth);
  g.computeVertexNormals();
  return g;
}

export function vestGeometry() {
  const pts = SHIRT_PROFILE.filter(([, y]) => y >= 0.59 && y <= 0.886).map(([r, y]) => [r * 1.07 + 0.002, y]);
  const g = new THREE.LatheGeometry(v2(pts), 48, 0.3, Math.PI * 2 - 0.6);
  g.scale(1, 1, D.torsoDepth * 1.02);
  g.computeVertexNormals();
  return g;
}

export function sleeveGeometry(long) {
  const s = SLEEVE;
  const pts = long
    ? [
        [s.longHemR, s.longHemY],
        [0.039, -0.27],
        [0.044, -0.18],
        [0.048, -0.1],
        [0.05, -0.04],
      ]
    : [
        [s.shortHemR, s.shortHemY],
        [0.049, -0.09],
        [0.05, -0.04],
      ];
  pts.push([0.05, 0.0], [0.047, 0.02], [0.036, 0.034], [0.018, 0.041], [0.0, 0.043]);
  const g = new THREE.LatheGeometry(v2(pts), 36);
  g.computeVertexNormals();
  return g;
}

export function hipsGeometry() {
  const g = new THREE.LatheGeometry(
    v2([
      [0.0, 0.5],
      [0.098, 0.5],
      [0.108, 0.53],
      [0.112, 0.57],
      [0.11, 0.6],
      [0.0, 0.605],
    ]),
    40,
  );
  g.scale(1, 1, 0.68);
  g.computeVertexNormals();
  return g;
}

/** 旅巾背後三角：貼住軀幹背面 */
export function neckerBackGeometry({ yTop = 0.925, yPoint = 0.655, wTop = 0.1 } = {}) {
  const nu = 18;
  const nv = 18;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    const y = yPoint + v * (yTop - yPoint);
    const half = Math.min(v * wTop, profileRadius(y) * 0.99);
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      const x = u * half;
      const z = -(torsoZ(x, y) + 0.005 + 0.004 * (1 - v));
      pos.push(x, y, z);
      uv.push((x / wTop + 1) / 2, v);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      // 面向 -z（背後）
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 旅巾前面一條巾尾（沿軀幹表面嘅帶） */
export function neckerTailGeometry(side) {
  const s = side === 'left' ? 1 : -1; // 穿著者左 = +x
  const ctrl = [
    [0.024, 0.906],
    [0.014, 0.875],
    [0.006, 0.846],
    [0.012, 0.8],
    [0.024, 0.74],
    [0.031, 0.69],
  ].map(([x, y]) => new THREE.Vector3(s * x, y, 0));
  const widths = (t) => {
    // 頸位闊啲，巾圈位窄，之後展開，尾段收尖
    if (t < 0.25) return 0.03 - (t / 0.25) * 0.016;
    if (t < 0.9) return 0.014 + ((t - 0.25) / 0.65) * 0.022;
    return 0.036 * (1 - (t - 0.9) / 0.1) + 0.004;
  };
  const curve = new THREE.CatmullRomCurve3(ctrl);
  const n = 40;
  const pos = [];
  const uv = [];
  const idx = [];
  const zOff = side === 'left' ? 0.009 : 0.012;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nrm = new THREE.Vector3(0, 0, 1);
    const sideV = new THREE.Vector3().crossVectors(tan, nrm).normalize();
    const w = widths(t) / 2;
    for (const k of [-1, 1]) {
      const x = p.x + sideV.x * w * k;
      const y = p.y + sideV.y * w * k;
      const z = torsoZ(x, y) + zOff;
      pos.push(x, y, z);
      uv.push((k + 1) / 2, 1 - t);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // 確保法線向前（+z）
  const nz = g.attributes.normal.getZ(0);
  if (nz < 0) {
    const flipped = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    g.setIndex(flipped);
    g.computeVertexNormals();
  }
  return g;
}

export function bucketHatGeometry() {
  const g = new THREE.LatheGeometry(
    v2([
      [0.158, -0.035],
      [0.15, -0.026],
      [0.112, 0.0],
      [0.107, 0.03],
      [0.1, 0.07],
      [0.08, 0.095],
      [0.04, 0.104],
      [0.0, 0.106],
    ]),
    40,
  );
  g.computeVertexNormals();
  return g;
}
