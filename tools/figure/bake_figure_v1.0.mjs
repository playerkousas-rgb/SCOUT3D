#!/usr/bin/env node
// SCOUT3D v1.0 — offline figure bake. © SCOUT SYSTEM
//
// Builds public/models/grasshopper_<boy|girl>_v1.0.glb from MakeHuman CC0 assets:
//   1. morph the MakeHuman base mesh into a ~6-year-old (baby/child macro targets)
//   2. fit CC0 hair, eyes, brows, lashes and shoes (.mhclo)
//   3. pose arms down (linear blend skinning with the MakeHuman default rig)
//   4. sculpt the uniform from the posed body (garment_v1.0.mjs): shirt, white collar + sleeve bands,
//      track trousers — every hem and seam is an exact line, recorded as anchors for badge placement
//   5. build the Grasshopper neckerchief + woggle procedurally on the shirt and collar
//   6. write a meshopt-compressed GLB (no badges — those come later)
//
// Inputs (not in Git; see tools/figure/README.md):  --vam <vrm-avatar-maker/web/assets>  --mh <makehuman/data/targets/macrodetails>
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization, EXTTextureWebP } from '@gltf-transform/extensions';
import { meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { loadAll } from './load_v1.0.mjs';
import { morphBody, loadItem, fitItem, visibleBodyIndices } from './vendor/avatar-core.js';
import { fitRig, skinPositions, smoothNormals } from './vendor/vrm-export.js';
import { readRGBA, blank, encode, tint } from './image_v1.0.mjs';
import * as G from './garment_v1.0.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VAM = arg('vam', '/tmp/vam/web/assets');
const MH = arg('mh', '/tmp/mh/makehuman/data/targets/macrodetails');
const OUT = arg('out', path.resolve(import.meta.dirname, '../../public/models'));
const ONLY = arg('only', null);

// ---- Figures ----------------------------------------------------------------------------------
// age: MakeHuman macro value (0 = 1 y, 0.1875 = 11 y). MakeHuman's young children come out short, so
// the shape uses ~7 y and the whole figure is then scaled to a typical HK 6-year-old height.
const FIGURES = {
  boy: { gender: 1, age: 0.12, height: 1.17, hair: 'short02', hairColor: '#17110e', brows: 'eyebrow010', skin: 'skin_young_asian_male.jpg' },
  girl: { gender: 0, age: 0.12, height: 1.16, hair: 'ponytail01', hairColor: '#17110e', brows: 'eyebrow006', skin: 'skin_young_asian_female.jpg' },
};
const RACE = { asian: 1 };
// Shirt and trousers are sculpted from the body (garment_v1.0.mjs); only the shoes are a MakeHuman item.
const OUTFIT = { shoes: 'shoes02' };
const INFLATE = {}; // decimeters, as vrm-avatar-maker
// Garment dimensions, metres (6-year-old, 1.17 m).
const CUT = {
  sleeve: 0.085,     // short sleeve: from the shoulder joint along the upper arm
  band: 0.014,       // white sleeve band
  neckRx: 0.058, neckRz: 0.054, // neck opening (ellipse round the neck joint)
  bodyHemAboveHip: 0.01, // where the shirt leaves the body (above the crotch)…
  hemDrop: 0.06,         // …then hangs straight down this far
  waistAboveHip: 0.07,
  cuffAboveAnkle: 0.012,
};
const COLOURS = { shirt: '#f07a1c', trim: '#f7f7f4', trousers: '#8d8e90' };
const srgb = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b, 1]; }; // THREE.Color(hex) is linear

// ---- Helpers ----------------------------------------------------------------------------------
/** MakeHuman UVs are OpenGL-style (v up); glTF wants v down. */
const flipV = (uv) => { const o = Float32Array.from(uv); for (let i = 1; i < o.length; i += 2) o[i] = 1 - o[i]; return o; };
const v3 = (a, i) => new THREE.Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);

function inflate(fitted, item, d) {
  const n = smoothNormals(fitted, item.source, item.indices);
  for (let i = 0; i < fitted.length; i++) fitted[i] += n[i] * d;
}

function raiseAlongSkin(fitted, item, normals, h) {
  const { refs, weights } = item;
  for (let v = 0; v < item.info.vertexCount; v++) {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) { const w = weights[v * 3 + k], r = refs[v * 3 + k] * 3; nx += w * normals[r]; ny += w * normals[r + 1]; nz += w * normals[r + 2]; }
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    let tx = -ny * nx, ty = 1 - ny * ny, tz = -ny * nz; const tl = Math.hypot(tx, ty, tz) || 1;
    fitted[v * 3] += h * tx / tl; fitted[v * 3 + 1] += h * ty / tl; fitted[v * 3 + 2] += h * tz / tl;
  }
}

/**
 * Relaxed standing pose (MakeHuman rests in an A-pose with legs apart). Left = +X, front = +Z.
 * Each entry aims a bone (and everything under it) along a direction; `null` keeps the bone's original
 * world direction (so feet stay flat after the legs move); a function maps the original direction.
 */
function standPose(rig, heads, tails) {
  const matrices = rig.bones.map(() => new THREE.Matrix4());
  const index = Object.fromEntries(rig.bones.map((b, i) => [b.name, i]));
  const plan = (s) => [
    [`upperarm`, () => [s * 0.19, -1, -0.03]],
    [`lowerarm`, () => [s * 0.1, -1, 0.15]],
    [`hand`, () => [s * 0.04, -1, 0.08]],
    [`thigh`, (d) => [d.x * 0.3, d.y, d.z]],
    [`calf`, (d) => [d.x * 0.3, d.y, d.z]],
    [`foot`, null],
  ];
  for (const [side, sign] of [['l', 1], ['r', -1]]) {
    for (const [part, f] of plan(sign)) {
      const i = index[`${part}_${side}`];
      const orig = tails[i].clone().sub(heads[i]).normalize();
      const h = heads[i].clone().applyMatrix4(matrices[i]);
      const t = tails[i].clone().applyMatrix4(matrices[i]);
      const target = f ? new THREE.Vector3(...f(orig)).normalize() : orig;
      const q = new THREE.Quaternion().setFromUnitVectors(t.sub(h).normalize(), target);
      const turn = new THREE.Matrix4().makeTranslation(h.x, h.y, h.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-h.x, -h.y, -h.z));
      const moved = rig.bones.map(() => false);
      rig.bones.forEach((b, j) => { moved[j] = j === i || (b.parent >= 0 && moved[b.parent]); });
      moved.forEach((m, j) => { if (m) matrices[j].premultiply(turn); });
    }
  }
  return matrices;
}

/** Outermost surface distance from `origin` along horizontal `dir`, among `pts` within `radius` of the ray. */
function surfaceAlong(pts, origin, dir, radius) {
  let best = 0;
  const r2 = radius * radius;
  for (let i = 0; i < pts.length; i += 3) {
    const qx = pts[i] - origin.x, qy = pts[i + 1] - origin.y, qz = pts[i + 2] - origin.z;
    const t = qx * dir.x + qy * dir.y + qz * dir.z;
    if (t <= 0 || t <= best) continue;
    const px = qx - t * dir.x, py = qy - t * dir.y, pz = qz - t * dir.z;
    if (px * px + py * py + pz * pz < r2) best = t;
  }
  return best;
}

function catmull(points, samples) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return curve.getSpacedPoints(samples);
}

// ---- Neckerchief + woggle (meters, final frame) -------------------------------------------------
// Worn rolled, over the collar, woggle on the upper chest, two pointed tails to about the stomach
// (reference photo supplied by the user, 2026-11-13). A small triangle shows at the back of the neck.
function buildNeckerchief(cloud, collarCloud, J) {
  const axisX = J.neck.x, axisZ = J.neck.z - 0.004;
  const yNeck = J.neckBase;                       // collar line at the back
  const yW = yNeck - 0.075;                       // woggle
  const yTip = yNeck - 0.27;                      // tail tips (about the stomach)
  const front = (phi) => { const a = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.min(a, 2 * Math.PI - a); }; // 0 front .. PI back
  const ringW = (phi) => Math.min(1, Math.max(0, (front(phi) - 0.45) / 0.5));
  // Round the neck the roll lies ON the collar fall, just outside the stand, following the shoulder slope.
  const wrap = (phi) => ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const ringD = (phi) => J.line.R(wrap(phi)) + 0.013;
  const both = new Float32Array(cloud.length + collarCloud.length); both.set(cloud); both.set(collarCloud, cloud.length);
  const topAt = (phi, d) => {
    const x = axisX + Math.sin(phi) * d, z = axisZ + Math.cos(phi) * d;
    let top = -Infinity;
    const cap = J.line.Y(wrap(phi)) + 0.02; // ignore neck skin / chin above the collar
    for (let i = 0; i < both.length; i += 3) if (both[i + 1] < cap && (both[i] - x) ** 2 + (both[i + 2] - z) ** 2 < 0.006 ** 2) top = Math.max(top, both[i + 1]);
    return isFinite(top) ? top : J.line.Y(wrap(phi));
  };
  const radial = (phi, y) => {
    const dir = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)), o = new THREE.Vector3(axisX, y, axisZ);
    const w = ringW(phi);
    const df = w < 1 ? surfaceAlong(cloud, o, dir, 0.014) : 0;
    return w * ringD(phi) + (1 - w) * df;
  };
  // Collar top edge per direction: the roll sits just under it.
  const BINS = 36, top = new Float32Array(BINS).fill(-Infinity);
  for (let i = 0; i < collarCloud.length; i += 3) {
    const phi = Math.atan2(collarCloud[i] - axisX, collarCloud[i + 2] - axisZ);
    const b = Math.floor(((phi + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * BINS) % BINS;
    top[b] = Math.max(top[b], collarCloud[i + 1]);
  }
  const collarTop = (phi) => { const b = Math.floor(((phi % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * BINS) % BINS; return isFinite(top[b]) ? top[b] : yNeck; };
  const at = (phi, y, d) => new THREE.Vector3(axisX + Math.sin(phi) * d, y, axisZ + Math.cos(phi) * d);
  // One half (s = +1 wearer's left): tip -> woggle -> collarbone -> side of neck -> back centre.
  // Right half uses phi in (PI, 2PI) so the path is continuous at the back.
  const ring = (a) => topAt(a, ringD(a));
  const half = (s) => [
    [0.2, yTip], [0.15, yTip + 0.07], [0.07, yW - 0.03], [0.05, yW], [0.2, yW + 0.035],
    [0.62, null], [1.15, null], [1.8, null], [2.5, null], [Math.PI, null],
  ].map(([a, y]) => { const phi = s > 0 ? a : 2 * Math.PI - a; return [phi, y ?? ring(phi)]; });
  const ctrl = [...half(1), ...half(-1).reverse().slice(1)].map(([phi, y]) => new THREE.Vector3(phi, y, 0));
  // Spline in (phi, y) space, then put on the surface with a smoothed envelope of the radial distance.
  const samples = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getSpacedPoints(300);
  const raw = samples.map((p) => radial(p.x, p.y));
  const env = raw.map((_, i) => Math.max(...raw.slice(Math.max(0, i - 6), i + 7)));
  const dist = env.map((_, i) => { const w = env.slice(Math.max(0, i - 8), i + 9); return w.reduce((a, c) => a + c, 0) / w.length; });
  const n = samples.length;
  // Arc-length (in phi/y space it's uneven, so measure on the surface).
  const P0 = samples.map((p, i) => at(p.x, p.y, dist[i]));
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + P0[i].distanceTo(P0[i - 1]));
  const total = L[n - 1];
  // Where the woggle sits along the length (both halves), for the rolled -> flat transition.
  const wogIdx = [samples.findIndex((p) => p.y >= yW && p.x < Math.PI), n - 1 - [...samples].reverse().findIndex((p) => p.y >= yW && p.x > Math.PI)];
  const TIP = 0.03, ringN = 12;
  const pos = [], nor = [], uv = [], idx = [];
  const centre = [], thick = [];
  for (let i = 0; i < n; i++) {
    const phi = samples[i].x, y = samples[i].y;
    const below = i < wogIdx[0] ? (L[wogIdx[0]] - L[i]) : i > wogIdx[1] ? (L[i] - L[wogIdx[1]]) : 0; // metres below the woggle
    const flat = Math.min(1, below / 0.03);                     // 0 = rolled, 1 = flat tail
    const fromEnd = Math.min(L[i], total - L[i]);
    const taper = fromEnd < TIP ? Math.max(0.03, fromEnd / TIP) : 1;
    const th = (0.0115 * (1 - flat) + 0.0035 * flat) * (0.5 + 0.5 * taper);
    const w = (0.021 * (1 - flat) + 0.034 * flat) * taper;
    const lift = phi < Math.PI ? 0.0012 : 0;                          // left tail on top of the right one
    const wr = ringW(phi);
    const p = at(phi, y + wr * (th / 2 + 0.001), dist[i] + (1 - wr) * (0.004 + th / 2) + lift);
    centre.push(p); thick.push(th);
    const pPrev = at(samples[Math.max(i - 1, 0)].x, samples[Math.max(i - 1, 0)].y, dist[Math.max(i - 1, 0)]);
    const pNext = at(samples[Math.min(i + 1, n - 1)].x, samples[Math.min(i + 1, n - 1)].y, dist[Math.min(i + 1, n - 1)]);
    const tan = pNext.sub(pPrev).normalize();
    // Surface normal: radial; round the neck the roll lies on the shoulder slope (tilted up).
    const ringPart = ringW(phi);
    const radialDir = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
    const up0 = radialDir.clone().multiplyScalar(Math.cos(0.35 * ringPart)).add(new THREE.Vector3(0, Math.sin(0.35 * ringPart), 0)).normalize();
    const side = new THREE.Vector3().crossVectors(up0, tan).normalize();
    const nrm = new THREE.Vector3().crossVectors(tan, side).normalize();
    for (let k = 0; k < ringN; k++) {
      const a = (k / ringN) * Math.PI * 2;
      // superellipse: flat faces, rounded edges
      const c = Math.cos(a), sn = Math.sin(a);
      const cx = Math.sign(c) * Math.pow(Math.abs(c), 0.6), cy = Math.sign(sn) * Math.pow(Math.abs(sn), 0.6);
      const q = p.clone().addScaledVector(side, (cx * w) / 2).addScaledVector(nrm, (cy * th) / 2);
      pos.push(q.x, q.y, q.z);
      const nn = side.clone().multiplyScalar(c / Math.max(w, 1e-4)).addScaledVector(nrm, sn / Math.max(th, 1e-4)).normalize();
      nor.push(nn.x, nn.y, nn.z);
      uv.push(0.5 + cx * 0.5, L[i] / 0.05);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < ringN; k++) {
    const a = i * ringN + k, b = i * ringN + ((k + 1) % ringN), c = a + ringN, d = b + ringN;
    idx.push(a, b, c, b, d, c);
  }
  // Back triangle (the neckerchief's point showing under the roll).
  const tri = { pos: [], nor: [], uv: [], idx: [] };
  const rows = 12, cols = 14;
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const t = r / rows, u = c / cols;
    const halfW = 0.036 * (1 - t);
    const x = (u - 0.5) * 2 * halfW;
    const phi = Math.PI - x / 0.075;
    const y = ring(Math.PI) - 0.012 - t * 0.062;
    const p = at(phi, y, surfaceAlong(cloud, new THREE.Vector3(axisX, y, axisZ), new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)), 0.014) + 0.003);
    tri.pos.push(p.x, p.y, p.z);
    const nn = new THREE.Vector3(Math.sin(phi), 0.15, Math.cos(phi)).normalize();
    tri.nor.push(nn.x, nn.y, nn.z);
    // u: constant-width border along both slanted edges (matches the roll's stripe texture at the top)
    const dEdge = halfW - Math.abs(x);
    tri.uv.push(0.5 + Math.sign(x) * 0.5 * (1 - Math.min(1, dEdge / 0.036)), t);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = r * (cols + 1) + c, b = a + 1, cc = a + cols + 1, d = cc + 1;
    tri.idx.push(a, cc, b, b, cc, d);
  }
  // Woggle: an elliptical ring round both tails.
  // Woggle centred on the two tails where they pass through it, in front of them.
  const wp = centre[wogIdx[0]].clone().add(centre[wogIdx[1]]).multiplyScalar(0.5);
  wp.add(new THREE.Vector3(wp.x - axisX, 0, wp.z - axisZ).normalize().multiplyScalar(Math.max(thick[wogIdx[0]], thick[wogIdx[1]]) * 0.5 + 0.0045));
  const wog = new THREE.TorusGeometry(1, 0.28, 12, 40);
  wog.scale(0.024, 0.0125, 0.016);
  wog.translate(wp.x, wp.y, wp.z);
  return {
    necker: { pos, nor, uv, idx },
    back: tri,
    woggle: { pos: [...wog.attributes.position.array], nor: [...wog.attributes.normal.array], uv: [...wog.attributes.uv.array], idx: [...wog.index.array] },
    anchors: { woggle: [wp.x, wp.y, wp.z], neckBase: yNeck, tailTip: yTip },
  };
}

// ---- Sculpted outfit (metres, final frame) -------------------------------------------------------
// 小童軍 activity uniform from the reference photo: orange short-sleeve shirt with a white collar and
// white sleeve bands, grey track trousers. Built from the body surface so every edge is a clean,
// known line (garment_v1.0.mjs).
function buildOutfit(base, bodyM, bodyNor, jointM) {
  const bones = base.rig.bones;
  const under = (root) => { const r = bones.findIndex((b) => b.name === root); return bones.map((b, j) => { for (let k = j; k >= 0; k = bones[k].parent) if (k === r) return true; return false; }); };
  const groups = [under('upperarm_l'), under('upperarm_r'), under('thigh_l'), under('thigh_r'), under('head')];
  const attrs = new Float32Array(base.N * G.ATTR);
  for (let v = 0; v < base.N; v++) for (let k = 0; k < 4; k++) {
    const w = base.weights[v * 4 + k], j = base.joints[v * 4 + k];
    groups.forEach((g, gi) => { if (g[j]) attrs[v * G.ATTR + gi] += w; });
  }
  const tris = Array.from(base.body.indices, (r) => base.body.source[r]);
  const J = {
    neck: jointM('neck_01'), chest: jointM('spine_03'), spine: jointM('spine_02'),
    S: { l: jointM('upperarm_l'), r: jointM('upperarm_r') }, E: { l: jointM('lowerarm_l'), r: jointM('lowerarm_r') },
    hip: { l: jointM('thigh_l'), r: jointM('thigh_r') }, ankle: { l: jointM('foot_l'), r: jointM('foot_r') },
  };
  const armDir = { l: J.E.l.clone().sub(J.S.l).normalize(), r: J.E.r.clone().sub(J.S.r).normalize() };
  const hipY = (J.hip.l.y + J.hip.r.y) / 2;
  const yHem = hipY + CUT.bodyHemAboveHip, yHemFinal = yHem - CUT.hemDrop, yWaist = hipY + CUT.waistAboveHip;
  const yCuff = (J.ankle.l.y + J.ankle.r.y) / 2 + CUT.cuffAboveAnkle;
  const SIDES = [['l', 0], ['r', 1]];

  // Fields (metres; >= 0 keeps). p = [x, y, z], A = attributes.
  const armT = (p, sd) => p.clone().sub(J.S[sd]).dot(armDir[sd]);
  const F = {
    head: (p, A) => (0.5 - A[4]) * 0.05,
    neck: (p) => {
      const e = Math.hypot((p.x - J.neck.x) / CUT.neckRx, (p.z - J.neck.z - 0.004) / CUT.neckRz);
      const yPlane = J.neck.y - 0.002 - 0.03 * G.smoothstep(J.neck.z - 0.05, J.neck.z + 0.065, p.z);
      return Math.min(Math.max((e - 1) * 0.06, yPlane - p.y), J.neck.y + 0.004 - p.y);
    },
    hem: (p) => p.y - yHem,
    sleeve: (sd, len) => (p, A) => (A[sd === 'l' ? 0 : 1] < 0.5 ? 0.05 : len - armT(p, sd)),
    waist: (p) => yWaist - p.y,
    cuff: (p) => p.y - yCuff,
    noArms: (p, A) => (0.5 - A[0] - A[1]) * 0.05,
  };
  const at = (m, i) => [G.pos(m, i), m.A.slice(i * G.ATTR, i * G.ATTR + G.ATTR)];
  const field = (f) => (m, i) => f(...at(m, i));
  const ID = { head: 1, neck: 2, hem: 3, sleeveL: 4, sleeveR: 5, band: 6, waist: 7, cuff: 8, arms: 9 };

  // ---- Shirt ----
  let shirt = G.bodySurface(bodyM, bodyNor, tris, attrs);
  shirt = G.clip(shirt, field(F.head), ID.head);
  shirt = G.clip(shirt, field(F.neck), ID.neck);
  shirt = G.clip(shirt, field(F.hem), ID.hem);
  shirt = G.clip(shirt, field(F.sleeve('l', CUT.sleeve)), ID.sleeveL);
  shirt = G.clip(shirt, field(F.sleeve('r', CUT.sleeve)), ID.sleeveR);
  const torsoOnly = (m, i) => m.A[i * G.ATTR] + m.A[i * G.ATTR + 1] + m.A[i * G.ATTR + 4] < 0.3;
  // Chest mounds and nipples: opening of the radial profile, front of the torso only.
  G.openRadial(shirt, 0.04, J.spine.z, (m, i) => torsoOnly(m, i) && m.P[i * 3 + 2] > J.spine.z && m.P[i * 3 + 1] < J.neck.y - 0.05 && m.P[i * 3 + 1] > yHem + 0.02);
  G.relax(shirt, 20, 0.5);   // then smooth what's left (ribs, shoulder blades)
  G.recomputeNormals(shirt);
  G.offset(shirt, 0.006);
  // Torso hangs straight from the chest; sleeves hang loose from the deltoid.
  const isArm = (m, i) => m.A[i * G.ATTR] + m.A[i * G.ATTR + 1] > 0.5;
  G.hang(shirt, {
    origin: new THREE.Vector3(0, J.chest.y, J.spine.z), dir: new THREE.Vector3(0, -1, 0), from: 0,
    select: (m, i) => (isArm(m, i) ? 0 : 0.85 * G.smoothstep(0, 0.05, J.chest.y - m.P[i * 3 + 1])),
  });
  for (const [sd, k] of SIDES) G.hang(shirt, {
    origin: J.S[sd], dir: armDir[sd], side: new THREE.Vector3(sd === 'l' ? 1 : -1, 0, 0), bins: 24, from: 0.015,
    select: (m, i) => (m.A[i * G.ATTR + k] > 0.5 ? 0.6 * G.smoothstep(0.015, 0.055, armT(G.pos(m, i), sd)) : 0),
  });
  G.openRadial(shirt, 0.03, J.spine.z, (m, i) => torsoOnly(m, i) && m.P[i * 3 + 2] > J.spine.z && m.P[i * 3 + 1] < J.neck.y - 0.05 && m.P[i * 3 + 1] > yHem + 0.02);
  G.relax(shirt, 10, 0.5);
  // Shoulders: linear-blend skinning bunches the deltoid when the arms come down; cloth would bridge it.
  G.relax(shirt, 30, 0.5, (i) => {
    const p = G.pos(shirt, i); let w = 0;
    for (const [sd] of SIDES) w = Math.max(w, 1 - G.smoothstep(0.035, 0.075, p.distanceTo(J.S[sd])));
    return w * G.smoothstep(J.S.l.y - 0.05, J.S.l.y - 0.01, p.y);
  });
  // Skin under the shirt is not rendered, so only keep clear of it near the edges (where it shows).
  const bodyAt = (m, i) => new THREE.Vector3(m.B[i * 3], m.B[i * 3 + 1], m.B[i * 3 + 2]);
  const shirtDepth = (p, A) => Math.min(F.head(p, A), F.neck(p), F.hem(p), F.sleeve('l', CUT.sleeve)(p, A), F.sleeve('r', CUT.sleeve)(p, A));
  G.keepOut(shirt, (m, i) => (isArm(m, i) ? (Math.max(armT(G.pos(m, i), 'l') * (m.A[i * G.ATTR] > 0.5), armT(G.pos(m, i), 'r') * (m.A[i * G.ATTR + 1] > 0.5)) > CUT.sleeve - 0.035 ? 0.005 : -1) : shirtDepth(bodyAt(m, i), m.A.slice(i * G.ATTR, i * G.ATTR + G.ATTR)) < 0.016 ? 0.003 : -1));
  // ---- Trousers ----
  let pants = G.bodySurface(bodyM, bodyNor, tris, attrs);
  pants = G.clip(pants, field(F.waist), ID.waist);
  pants = G.clip(pants, field(F.cuff), ID.cuff);
  pants = G.clip(pants, field(F.noArms), ID.arms);
  pants = G.clip(pants, field(F.head), ID.head);
  // Snug under the shirt, loose track-trouser legs below its hem.
  const loose = (y) => 1 - G.smoothstep(yHemFinal - 0.02, yHem, y);
  G.relax(pants, 6, 0.5);
  G.recomputeNormals(pants);
  G.offset(pants, (m, i) => 0.003 + 0.013 * loose(m.P[i * 3 + 1]));
  for (const [sd, k] of SIDES) {
    const sx = sd === 'l' ? 1 : -1;
    const dir = J.ankle[sd].clone().sub(J.hip[sd]).normalize();
    G.hang(pants, {
      origin: J.hip[sd], dir, side: new THREE.Vector3(sx, 0, 0), bins: 28, from: 0.07,
      select: (m, i) => {
        if (m.A[i * G.ATTR + 2 + k] < 0.5) return 0;
        const p = G.pos(m, i), inner = (p.x - J.hip[sd].x) * sx < 0 ? 0.35 : 1;
        return 0.85 * inner * loose(p.y) * G.smoothstep(yCuff + 0.01, yCuff + 0.08, p.y); // elastic cuff at the ankle
      },
    });
  }
  G.relax(pants, 10, 0.5);
  G.keepOut(pants, (m, i) => 0.002 + 0.004 * loose(m.P[i * 3 + 1]));
  G.rim(pants, 0.006, (a, b) => pants.cut[a] === ID.waist && pants.cut[b] === ID.waist);

  // Shirt over the trousers' waistband.
  {
    const pc = Float32Array.from(pants.P);
    for (let i = 0; i < G.nV(shirt); i++) {
      const y = shirt.P[i * 3 + 1];
      if (isArm(shirt, i) || y > yWaist + 0.03) continue;
      const out = new THREE.Vector3(shirt.P[i * 3], 0, shirt.P[i * 3 + 2] - J.spine.z); const r = out.length(); out.normalize();
      const rp = surfaceAlong(pc, new THREE.Vector3(0, y, J.spine.z), out, 0.014);
      const need = rp + 0.008 * (1 - G.smoothstep(yWaist, yWaist + 0.03, y));
      if (rp > 0 && need > r) { shirt.P[i * 3] = out.x * need; shirt.P[i * 3 + 2] = J.spine.z + out.z * need; }
    }
    G.relax(shirt, 3, 0.5, (i) => (shirt.P[i * 3 + 1] < yWaist + 0.05 && !isArm(shirt, i) ? 1 : 0));
  }
  // Hem: the shirt hangs straight down from where it leaves the body, just outside the trousers.
  const pantsCloud = Float32Array.from(pants.P);
  const torsoZ = J.spine.z;
  G.extendDown(shirt, ID.hem, [0.02, 0.04, CUT.hemDrop], (p, drop) => {
    const out = new THREE.Vector3(p.x, 0, p.z - torsoZ); const r0 = out.length(); out.normalize();
    const y = p.y - drop;
    const rp = surfaceAlong(pantsCloud, new THREE.Vector3(0, y, torsoZ), out, 0.012);
    const r = Math.max(r0 + drop * 0.12, rp + 0.006);
    return new THREE.Vector3(out.x * r, y, torsoZ + out.z * r);
  }, (v) => shirt.cut[v] === ID.hem || (shirt.P[v * 3 + 1] < yHem + 0.012 && shirt.A[v * G.ATTR] + shirt.A[v * G.ATTR + 1] < 0.5));
  // White sleeve bands: split exactly at a plane CUT.band above each sleeve hem.
  const bandF = (sd, k) => (p, A) => (A[k] < 0.5 ? 1 : (CUT.sleeve - CUT.band) - armT(p, sd));
  const notBand = (m, i) => Math.min(field(bandF('l', 0))(m, i), field(bandF('r', 1))(m, i));
  const bands = G.clip(G.clone(shirt), (m, i) => -notBand(m, i), ID.band);
  shirt = G.clip(shirt, notBand, ID.band);
  for (const g of [shirt, bands]) { g.B = undefined; G.recomputeNormals(g); }
  const splitEdge = (g) => (a, b) => g.cut[a] === ID.band && g.cut[b] === ID.band;

  // Shirt surface cloud (for the collar and the neckerchief), before rims.
  const cloud = [];
  for (let i = 0; i < G.nV(shirt); i++) if (Math.abs(shirt.P[i * 3]) < 0.13 && shirt.P[i * 3 + 1] > J.neck.y - 0.35) cloud.push(shirt.P[i * 3], shirt.P[i * 3 + 1], shirt.P[i * 3 + 2]);
  for (let v = 0; v < base.N; v++) if (attrs[v * G.ATTR + 4] > 0.2 && Math.abs(bodyM[v * 3]) < 0.08 && bodyM[v * 3 + 1] < J.neck.y + 0.06 && bodyM[v * 3 + 1] > J.neck.y - 0.05) cloud.push(bodyM[v * 3], bodyM[v * 3 + 1], bodyM[v * 3 + 2]);

  // ---- Collar (white, folded polo collar lying on the shoulders) ----
  const collar = buildCollar(shirt, [ID.head, ID.neck], J.neck, Float32Array.from(cloud));

  G.rim(shirt, 0.006, splitEdge(shirt));
  G.rim(bands, 0.006, splitEdge(bands));

  // Body skin fully under a garment (hidden from rendering).
  const hidden = new Uint8Array(base.N);
  for (let v = 0; v < base.N; v++) {
    const p = new THREE.Vector3(bodyM[v * 3], bodyM[v * 3 + 1], bodyM[v * 3 + 2]), A = attrs.subarray(v * G.ATTR, v * G.ATTR + G.ATTR);
    const inShirt = Math.min(F.head(p, A), F.neck(p), F.hem(p), F.sleeve('l', CUT.sleeve)(p, A), F.sleeve('r', CUT.sleeve)(p, A)) > 0.012;
    const inPants = Math.min(F.waist(p), F.cuff(p) - 0.01, F.noArms(p, A)) > 0.008;
    hidden[v] = inShirt || inPants ? 1 : 0;
  }

  // Anchors for badges (step 3): seams and hems are exact lines of the garment.
  const anchors = { shirtHemY: yHemFinal, sleeveLength: CUT.sleeve, sleeveBand: CUT.band };
  for (const [sd] of SIDES) {
    let top = null;
    for (let i = 0; i < G.nV(shirt); i++) { const p = G.pos(shirt, i); if (Math.abs(p.x - J.S[sd].x) < 0.012 && Math.abs(p.z - J.S[sd].z) < 0.02 && (!top || p.y > top.y)) top = p; }
    anchors[`shoulderTop_${sd}`] = top.toArray();
    anchors[`sleeveHem_${sd}`] = J.S[sd].clone().addScaledVector(armDir[sd], CUT.sleeve).toArray();
    anchors[`armDir_${sd}`] = armDir[sd].toArray();
  }
  return {
    meshes: { shirt: G.toRender(shirt), sleeve_bands: G.toRender(bands), collar, trousers: G.toRender(pants) },
    cloud: Float32Array.from(cloud), collarCloud: collar.pos, collarBack: collar.backTop, collarLine: { R: collar.lineR, Y: collar.lineY }, hidden, anchors,
  };
}

/**
 * Folded polo collar: a short stand from the neckline, then a fall lying on the shoulders; open at the
 * front with two points. The neckline is binned and smoothed so the collar edges are clean curves.
 */
function buildCollar(shirt, ids, neck, cloud) {
  const ax = neck.x, az = neck.z;
  const BINS = 72, sumR = new Float64Array(BINS), sumY = new Float64Array(BINS), cnt = new Float64Array(BINS);
  for (const [a, b] of G.boundary(shirt)) for (const v of [a, b]) if (ids.includes(shirt.cut[v])) {
    const p = G.pos(shirt, v);
    let psi = Math.atan2(p.x - ax, p.z - az); if (psi < 0) psi += 2 * Math.PI; // 0/2PI front, PI back
    const k = Math.floor((psi / (2 * Math.PI)) * BINS) % BINS;
    sumR[k] += Math.hypot(p.x - ax, p.z - az); sumY[k] += p.y; cnt[k]++;
  }
  // Fill empty bins, then circular smoothing.
  let R = Array.from(cnt, (c, k) => (c ? sumR[k] / c : NaN)), Y = Array.from(cnt, (c, k) => (c ? sumY[k] / c : NaN));
  for (const arr of [R, Y]) for (let k = 0; k < BINS; k++) if (Number.isNaN(arr[k])) {
    let l = 1; while (Number.isNaN(arr[(k - l + BINS) % BINS]) && l < BINS) l++;
    let r = 1; while (Number.isNaN(arr[(k + r) % BINS]) && r < BINS) r++;
    arr[k] = (arr[(k - l + BINS) % BINS] * r + arr[(k + r) % BINS] * l) / (l + r);
  }
  const smooth = (arr, w) => arr.map((_, k) => { let s = 0; for (let j = -w; j <= w; j++) s += arr[(k + j + BINS) % BINS]; return s / (2 * w + 1); });
  R = smooth(smooth(R, 3), 3); Y = smooth(smooth(Y, 3), 3);
  const lerpBin = (arr, psi) => { const x = (psi / (2 * Math.PI)) * BINS - 0.5, k = Math.floor(x), t = x - k; return arr[(k + BINS) % BINS] * (1 - t) + arr[(k + 1) % BINS] * t; };
  const front = (psi) => Math.min(psi, 2 * Math.PI - psi);
  const GAP = 0.16, NS = 96, rowsPsi = [];
  for (let k = 0; k <= NS; k++) rowsPsi.push(GAP + (k / NS) * (2 * Math.PI - 2 * GAP));
  // Fall: lies on the shirt; its width grows to points at the front.
  const prof = rowsPsi.map((psi) => {
    const out = new THREE.Vector3(Math.sin(psi), 0, Math.cos(psi));
    const r0 = lerpBin(R, psi), y0 = lerpBin(Y, psi);
    const fr = 1 - G.smoothstep(0.25, 1.1, front(psi));
    const stand = 0.011 - 0.004 * fr, width = 0.03 + 0.018 * fr;
    const drop = width * (0.5 + 0.35 * fr), reach = width * (0.85 - 0.35 * fr);
    const yE = y0 - drop;
    const rs = surfaceAlong(cloud, new THREE.Vector3(ax, yE, az), out, 0.012);
    const yM = y0 - drop * 0.4;
    const rm = surfaceAlong(cloud, new THREE.Vector3(ax, yM, az), out, 0.012);
    return { out, r0, y0, stand, rE: Math.max(rs + 0.004, r0 + reach), yE, rM: Math.max(rm + 0.006, r0 + reach * 0.5), yM };
  });
  // Smooth the fall radii along the collar (no zig-zag).
  for (const key of ['rE', 'rM']) {
    const v = prof.map((q) => q[key]);
    for (let it = 0; it < 4; it++) for (let k = 1; k < v.length - 1; k++) v[k] = (v[k - 1] + 2 * v[k] + v[k + 1]) / 4;
    prof.forEach((q, k) => { q[key] = v[k]; });
  }
  const P = [];
  const put = (q, r, y) => P.push(ax + q.out.x * r, y, az + q.out.z * r);
  for (const q of prof) {
    put(q, q.r0 - 0.002, q.y0 - 0.002);          // inside the neckline
    put(q, q.r0 + 0.001, q.y0 + q.stand * 0.6);  // stand
    put(q, q.r0 + 0.005, q.y0 + q.stand);        // fold
    put(q, q.rM, q.yM);                          // fall
    put(q, q.rE, q.yE);                          // edge
  }
  const C = 5, T = [];
  for (let k = 0; k < NS; k++) for (let c = 0; c < C - 1; c++) {
    const a = k * C + c, b = a + 1, d = a + C, e = d + 1;
    T.push(a, d, b, b, d, e);
  }
  const n = P.length / 3;
  const m = { P, N: new Array(P.length).fill(0), src: new Array(n).fill(0), A: new Array(n * G.ATTR).fill(0), cut: new Array(n).fill(-1), T };
  const r = G.toRender(m);
  const back = prof[Math.round(NS / 2)];
  return { ...r, backTop: back.y0 + back.stand, lineR: (psi) => lerpBin(R, psi), lineY: (psi) => lerpBin(Y, psi) };
}

// ---- Bake one figure ------------------------------------------------------------------------------
async function bake(base, id, F) {
  const body = { gender: F.gender, age: F.age, muscle: 0.5, weight: 0.5, race: RACE };
  const current = morphBody(base, body);
  const normals = smoothNormals(current, base.body.source, base.body.indices);

  const slots = { eyes: 'low-poly', eyelashes: 'eyelashes01', eyebrows: F.brows, hair: F.hair, ...OUTFIT };
  const worn = {};
  for (const [slot, itemId] of Object.entries(slots)) {
    const item = await loadItem(base, itemId);
    const fitted = fitItem(item, current);
    if (slot === 'eyebrows') raiseAlongSkin(fitted, item, normals, 0.05);
    if (INFLATE[slot]) inflate(fitted, item, INFLATE[slot]);
    worn[slot] = { item, fitted };
  }

  // Pose
  const { heads, tails } = fitRig(base.rig, current);
  const M = standPose(base.rig, heads, tails);
  const posedBody = skinPositions(current, base.joints, base.weights, M);
  for (const w of Object.values(worn)) w.posed = skinPositions(w.fitted, w.item.skin.joints, w.item.skin.weights, M);

  // Scale to metres + target height, feet on the floor, centred.
  let lo = Infinity, hi = -Infinity;
  for (const v of base.body.source) { lo = Math.min(lo, posedBody[v * 3 + 1]); hi = Math.max(hi, posedBody[v * 3 + 1]); }
  const shoesLo = Math.min(...Array.from({ length: worn.shoes.posed.length / 3 }, (_, i) => worn.shoes.posed[i * 3 + 1]));
  const pelvis = heads[base.rig.bones.findIndex((b) => b.name === 'pelvis')];
  const s = F.height / (hi - lo); // body height (bare) -> target
  const floor = Math.min(lo, shoesLo);
  const toM = (arr) => { const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i += 3) { o[i] = (arr[i] - pelvis.x) * s; o[i + 1] = (arr[i + 1] - floor) * s; o[i + 2] = (arr[i + 2] - pelvis.z) * s; } return o; };
  const bodyM = toM(posedBody);
  for (const w of Object.values(worn)) w.m = toM(w.posed);
  const jointM = (name, end = 'head') => { const i = base.rig.bones.findIndex((b) => b.name === name); const p = (end === 'head' ? heads : tails)[i].clone().applyMatrix4(M[i]); return new THREE.Vector3((p.x - pelvis.x) * s, (p.y - floor) * s, (p.z - pelvis.z) * s); };

  // ---- Sculpted shirt, collar, sleeve bands, trousers ----
  const bodyNor = smoothNormals(bodyM, base.body.source, base.body.indices);
  const neck = jointM('neck_01');
  const outfit = buildOutfit(base, bodyM, bodyNor, jointM);
  const nk = buildNeckerchief(outfit.cloud, outfit.collarCloud, { neck, neckBase: outfit.collarBack - 0.004, line: outfit.collarLine });

  // ---- Meshes (render space) ----
  const meshes = [];
  const renderOf = (src, source, normalsSrc) => {
    const pos = new Float32Array(source.length * 3), nor = new Float32Array(source.length * 3);
    for (let r = 0; r < source.length; r++) for (let k = 0; k < 3; k++) { pos[r * 3 + k] = src[source[r] * 3 + k]; nor[r * 3 + k] = normalsSrc[source[r] * 3 + k]; }
    return { pos, nor };
  };
  // Body: skin under the garments and shoes removed.
  const vis = visibleBodyIndices(base, Object.values(worn).map((w) => w.item));
  const visIdx = [];
  for (let t = 0; t < vis.length; t += 3) {
    const [a, b2, c] = [vis[t], vis[t + 1], vis[t + 2]].map((r) => base.body.source[r]);
    if (!(outfit.hidden[a] && outfit.hidden[b2] && outfit.hidden[c])) visIdx.push(vis[t], vis[t + 1], vis[t + 2]);
  }
  const b = renderOf(bodyM, base.body.source, bodyNor);
  meshes.push({ name: 'body', ...b, uv: base.body.uv, idx: Uint32Array.from(visIdx), mat: 'skin' });
  for (const [slot, w] of Object.entries(worn)) {
    const n = smoothNormals(w.m, w.item.source, w.item.indices);
    const r = renderOf(w.m, w.item.source, n);
    meshes.push({ name: slot, ...r, uv: w.item.uv, idx: w.item.indices, mat: slot, item: w.item });
  }
  for (const [name, g] of Object.entries(outfit.meshes)) meshes.push({ name, ...g, mat: name, flatUV: true });
  meshes.push({ name: 'neckerchief', pos: Float32Array.from(nk.necker.pos), nor: Float32Array.from(nk.necker.nor), uv: Float32Array.from(nk.necker.uv), idx: Uint32Array.from(nk.necker.idx), mat: 'neckerchief', flatUV: true });
  meshes.push({ name: 'neckerchief_back', pos: Float32Array.from(nk.back.pos), nor: Float32Array.from(nk.back.nor), uv: Float32Array.from(nk.back.uv), idx: Uint32Array.from(nk.back.idx), mat: 'neckerchief_back', flatUV: true });
  meshes.push({ name: 'woggle', pos: Float32Array.from(nk.woggle.pos), nor: Float32Array.from(nk.woggle.nor), uv: Float32Array.from(nk.woggle.uv), idx: Uint32Array.from(nk.woggle.idx), mat: 'woggle', flatUV: true });

  // ---- Textures ----
  const T = (f) => path.join(VAM, 'textures/view', f);
  const tex = {};
  tex.skin = { bytes: encode(readRGBA(T(F.skin), 1024), 'jpeg', 84), mime: 'image/jpeg' };
  tex.eyes = { bytes: encode(readRGBA(T('eye_brown.jpg'), 256), 'jpeg', 85), mime: 'image/jpeg' };
  tex.eyelashes = { bytes: encode(readRGBA(T('eyelashes01.webp'), 256), 'webp', 85), mime: 'image/webp' };
  tex.eyebrows = { bytes: encode(tint(readRGBA(T(F.brows + '.webp'), 256), '#2a1d16', { gain: 0.9 }), 'webp', 85), mime: 'image/webp' };
  tex.hair = { bytes: encode(tint(readRGBA(T(F.hair + '.webp'), 1024), F.hairColor), 'webp', 80), mime: 'image/webp' };
  // Neckerchief: 小童軍 yellow with two purple edge stripes (reference photo). The app re-paints it via the same UVs.
  {
    const img = blank(128, 4, [233, 180, 37, 255]);
    for (let x = 0; x < 128; x++) if ((x >= 18 && x < 33) || (x >= 95 && x < 110)) for (let y = 0; y < 4; y++) img.data.set([91, 63, 160, 255], (y * 128 + x) * 4);
    tex.necker = { bytes: encode(img, 'png'), mime: 'image/png' };
  }
  {
    const img = readRGBA(T('shoes02.jpg'), 512);
    for (let i = 0; i < img.data.length; i += 4) { const l = 0.3 * img.data[i] + 0.59 * img.data[i + 1] + 0.11 * img.data[i + 2]; const g = Math.min(255, 150 + l * 0.55); img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; }
    tex.shoes = { bytes: encode(img, 'jpeg', 80), mime: 'image/jpeg' };
  }

  // ---- GLB ----
  const doc = new Document();
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const buffer = doc.createBuffer();
  const scene = doc.createScene(id);
  const root = doc.createNode('figure_' + id);
  scene.addChild(root);
  const MAT = {
    skin: { tex: 'skin', rough: 0.62 },
    eyes: { tex: 'eyes', rough: 0.25 },
    eyelashes: { tex: 'eyelashes', mask: 0.3, double: true },
    eyebrows: { tex: 'eyebrows', mask: 0.3, double: true },
    hair: { tex: 'hair', mask: 0.5, double: true, rough: 0.55 },
    shirt: { color: srgb(COLOURS.shirt), double: true, rough: 0.82 },
    sleeve_bands: { color: srgb(COLOURS.trim), double: true, rough: 0.82 },
    collar: { color: srgb(COLOURS.trim), double: true, rough: 0.8 },
    trousers: { color: srgb(COLOURS.trousers), double: true, rough: 0.9 },
    shoes: { tex: 'shoes', rough: 0.6 },
    neckerchief: { tex: 'necker', rough: 0.8, double: true },
    neckerchief_back: { tex: 'necker', rough: 0.8, double: true },
    woggle: { color: [0.2, 0.35, 0.75, 1], rough: 0.45 },
  };
  const textures = {};
  for (const [k, t] of Object.entries(tex)) textures[k] = doc.createTexture(k).setImage(t.bytes).setMimeType(t.mime);
  for (const m of meshes) {
    const spec = MAT[m.mat];
    const mat = doc.createMaterial(m.name).setRoughnessFactor(spec.rough ?? 0.8).setMetallicFactor(0);
    if (spec.tex) mat.setBaseColorTexture(textures[spec.tex]);
    if (spec.color) mat.setBaseColorFactor(spec.color);
    if (spec.mask) mat.setAlphaMode('MASK').setAlphaCutoff(spec.mask);
    if (spec.double) mat.setDoubleSided(true);
    const prim = doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(m.pos).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(m.nor).setBuffer(buffer))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(m.flatUV ? Float32Array.from(m.uv) : flipV(m.uv)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.pos.length / 3 < 65536 ? Uint16Array.from(m.idx) : Uint32Array.from(m.idx)).setBuffer(buffer));
    const mesh = doc.createMesh(m.name).addPrimitive(prim);
    root.addChild(doc.createNode(m.name).setMesh(mesh));
  }
  // Anchors for later steps (badges, camera): metres, wearer's left = +X, facing +Z.
  const chest = jointM('spine_03');
  root.setExtras({
    generator: 'SCOUT3D bake_figure_v1.0', copyright: '© SCOUT SYSTEM', assets: 'MakeHuman CC0 (via vrm-avatar-maker, MIT tooling)',
    height: F.height, anchors: { ...nk.anchors, ...outfit.anchors, neck: neck.toArray(), chest: chest.toArray(), shoulderL: jointM('upperarm_l').toArray(), shoulderR: jointM('upperarm_r').toArray(), head: jointM('head').toArray() },
  });
  doc.getRoot().getAsset().copyright = '© SCOUT SYSTEM · SCOUT3D v1.0 · body/clothes: MakeHuman CC0';
  await MeshoptEncoder.ready;
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, EXTTextureWebP]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `grasshopper_${id}_v1.0.glb`);
  fs.writeFileSync(file, await io.writeBinary(doc));
  const tris = meshes.reduce((a, m) => a + m.idx.length / 3, 0);
  console.log(`✓ ${path.relative(process.cwd(), file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB  ${tris} tris  height ${F.height} m`);
}

const base = await loadAll({ vamAssets: VAM, mhTargets: MH });
for (const [id, F] of Object.entries(FIGURES)) if (!ONLY || ONLY === id) await bake(base, id, F);
