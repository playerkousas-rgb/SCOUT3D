// SCOUT3D v1.0 · © SCOUT SYSTEM
// v33（ADR-0030）：B 人台改用 MakeHuman CC0 真人身體＋真衫褲（來自 ffunch/vrm-avatar-maker 嘅 web/assets，
// 程式 MIT、素材 CC0）。呢個腳本喺 build 時做晒「調身形 → 套衫（.mhclo）→ 擺姿勢（手垂直、腳併埋）→ 縮放」，
// 輸出 public/models/mannequin/：每個支部／性別一個身形，衫褲頭髮鞋同眼眉一齊 bake 好位置，網頁只係載入。
//
//   node scripts/mannequin/build_mh.mjs <vrm-avatar-maker>/web/assets
//
// 身體：MakeHuman 巨集（年齡、性別、肌肉、體重、亞洲 85%）。座標 cm，y 向上，面向 +z，穿著者左邊 = +x。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as THREE from 'three';

const A = process.argv[2];
if (!A || !fs.existsSync(path.join(A, 'base.json'))) {
  console.error('usage: node scripts/mannequin/build_mh.mjs <vrm-avatar-maker>/web/assets');
  process.exit(1);
}
const OUT = new URL('../../public/models/mannequin/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

// ---- 讀 vrm-avatar-maker 嘅資產（同 web/lib/avatar-core.js 一樣嘅格式） ----
const TYPED = { f: Float32Array, I: Uint32Array, h: Int16Array, H: Uint16Array };
const view = (buf, [offset, count, kind]) => new TYPED[kind](buf, offset, count);
const json = (p) => JSON.parse(fs.readFileSync(path.join(A, p), 'utf8'));
const bin = (p) => {
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(A, p + '.gz')));
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
};
function unplane(buffer, layout) {
  for (const [offset, count, , flag] of Object.values(layout)) {
    if (flag !== 'planes' && flag !== 'xyz') continue;
    const u8 = new Uint8Array(buffer, offset, count * 2), copy = u8.slice();
    if (flag === 'planes') for (let i = 0; i < count; i++) { u8[i * 2] = copy[i]; u8[i * 2 + 1] = copy[count + i]; }
    else {
      const n = count / 3;
      for (let k = 0; k < 3; k++) for (let i = 0; i < n; i++) { const from = k * n + i, to = (i * 3 + k) * 2; u8[to] = copy[from]; u8[to + 1] = copy[count + from]; }
    }
  }
  return buffer;
}
function sparse(buffer, layout, name) {
  const gaps = view(buffer, layout[name + ':g']), idx = new Uint32Array(gaps.length);
  for (let i = 0, v = -1; i < gaps.length; i++) idx[i] = v += gaps[i];
  return { idx, d: view(buffer, layout[name + ':d']) };
}

const baseInfo = json('base.json'), baseBin = unplane(bin('base.bin'), baseInfo.layout);
const macroInfo = json('macros.json'), macroBin = unplane(bin('macros.bin'), macroInfo.layout);
const moreBin = unplane(bin(macroInfo.more.file.replace(/\.gz$/, '')), macroInfo.more.layout);
const rig = json('rig.json'), skinBin = unplane(bin('skin.bin'), rig.layout);
const N = baseInfo.vertexCount;
const targets = {};
for (const name of Object.keys(macroInfo.targets)) {
  if (macroInfo.layout[name + ':g']) targets[name] = sparse(macroBin, macroInfo.layout, name);
  if (macroInfo.more.layout[name + ':g']) targets[name] = sparse(moreBin, macroInfo.more.layout, name);
}
const rest = view(baseBin, baseInfo.layout.positions);
const bodySource = view(baseBin, baseInfo.layout.source);
const bodyUV = view(baseBin, baseInfo.layout.uv);
const bodyIdx = view(baseBin, baseInfo.layout.indices);
const baseJoints = view(skinBin, rig.layout.joints), baseWeights = view(skinBin, rig.layout.weights);

function components(name, value) {
  const out = [];
  for (const p of macroInfo.macro.macrotargets[name].parts) {
    if (value > p.lowest && value < p.highest) {
      const pct = (value - p.lowest) / (p.highest - p.lowest);
      if (p.low) out.push([p.low, 1 - pct]);
      if (p.high) out.push([p.high, pct]);
    }
  }
  return out;
}
function morphBody(body) {
  const c = Object.fromEntries(['gender', 'age', 'muscle', 'weight'].map((k) => [k, components(k, body[k])]));
  const sum = Object.values(body.race).reduce((a, b) => a + b, 0) || 1;
  const stack = [];
  for (const [r, rw] of Object.entries(body.race)) {
    if (rw / sum <= 0.0001) continue;
    for (const [a, aw] of c.age) for (const [g, gw] of c.gender) stack.push([`${r}-${g}-${a}`, (rw / sum) * gw * aw]);
  }
  for (const [g, gw] of c.gender) for (const [a, aw] of c.age) for (const [mu, mw] of c.muscle) for (const [we, ww] of c.weight) stack.push([`universal-${g}-${a}-${mu}-${we}`, gw * aw * mw * ww]);
  const out = Float32Array.from(rest);
  for (const [name, w] of stack) {
    if (w <= 0.01 || !targets[name]) continue;
    const { idx, d } = targets[name], s = w * macroInfo.quant;
    for (let i = 0; i < idx.length; i++) { const v = idx[i] * 3; out[v] += d[i * 3] * s; out[v + 1] += d[i * 3 + 1] * s; out[v + 2] += d[i * 3 + 2] * s; }
  }
  return out;
}

function loadItem(id) {
  const info = json(`items/${id}.json`), b = unplane(bin(`items/${id}.bin`), info.layout), L = info.layout;
  const item = { id, info, source: view(b, L.source), uv: view(b, L.uv), indices: view(b, L.indices), refs: view(b, L.refs), weights: view(b, L.weights), offsets: view(b, L.offsets), hides: view(b, L.delete) };
  // 骨權重（經 .mhclo refs 插值，同 vrm-export.js itemSkin 一樣）
  const n = info.vertexCount, J = new Uint16Array(n * 4), W = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const acc = new Map();
    for (let r = 0; r < 3; r++) {
      const w = item.weights[v * 3 + r], bb = item.refs[v * 3 + r];
      if (!w) continue;
      for (let k = 0; k < 4; k++) { const bw = baseWeights[bb * 4 + k]; if (!bw) continue; const j = baseJoints[bb * 4 + k]; acc.set(j, (acc.get(j) ?? 0) + bw * w); }
    }
    const top = [...acc].filter(([, w]) => w > 0.001).sort((a, c) => c[1] - a[1]).slice(0, 4);
    const tot = top.reduce((s, [, w]) => s + w, 0) || 1;
    top.forEach(([j, w], k) => { J[v * 4 + k] = j; W[v * 4 + k] = w / tot; });
    if (!top.length) W[v * 4] = 1;
  }
  item.joints = J;
  item.skinW = W;
  return item;
}
function fitItem(item, cur) {
  const sc = item.info.scale;
  const axis = (a, k) => (sc[a] ? Math.abs(cur[sc[a][0] * 3 + k] - cur[sc[a][1] * 3 + k]) / sc[a][2] : 1);
  const s = [axis('x', 0), axis('y', 1), axis('z', 2)];
  const out = new Float32Array(item.info.vertexCount * 3);
  for (let i = 0; i < item.info.vertexCount; i++) {
    const r = [0, 1, 2].map((q) => item.refs[i * 3 + q] * 3), w = [0, 1, 2].map((q) => item.weights[i * 3 + q]);
    for (let k = 0; k < 3; k++) out[i * 3 + k] = w[0] * cur[r[0] + k] + w[1] * cur[r[1] + k] + w[2] * cur[r[2] + k] + item.offsets[i * 3 + k] * s[k];
  }
  return out;
}
function smoothNormals(pos, source, indices) {
  const acc = new Float32Array(pos.length);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    const ia = source[indices[i]] * 3, ib = source[indices[i + 1]] * 3, ic = source[indices[i + 2]] * 3;
    a.fromArray(pos, ia); b.fromArray(pos, ib).sub(a); c.fromArray(pos, ic).sub(a); b.cross(c);
    for (const v of [ia, ib, ic]) { acc[v] += b.x; acc[v + 1] += b.y; acc[v + 2] += b.z; }
  }
  for (let v = 0; v < acc.length; v += 3) { const l = Math.hypot(acc[v], acc[v + 1], acc[v + 2]) || 1; acc[v] /= l; acc[v + 1] /= l; acc[v + 2] /= l; }
  return acc;
}
function inflate(f, item, d) {
  const n = smoothNormals(f, item.source, item.indices);
  for (let i = 0; i < f.length; i++) f[i] += n[i] * d;
}
function skin(positions, joints, weights, M) {
  const out = new Float32Array(positions.length), e = M.map((m) => m.elements);
  for (let v = 0; v < positions.length / 3; v++) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    let ox = 0, oy = 0, oz = 0;
    for (let k = 0; k < 4; k++) {
      const w = weights[v * 4 + k]; if (!w) continue;
      const m = e[joints[v * 4 + k]];
      ox += w * (m[0] * x + m[4] * y + m[8] * z + m[12]); oy += w * (m[1] * x + m[5] * y + m[9] * z + m[13]); oz += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
    }
    out[v * 3] = ox; out[v * 3 + 1] = oy; out[v * 3 + 2] = oz;
  }
  return out;
}

// ---- 骨 ----
const BI = Object.fromEntries(rig.bones.map((b, i) => [b.name, i]));
function point(cur, end) {
  const list = end.cube ? rig.cubes[end.cube] : end.mean;
  const p = new THREE.Vector3();
  for (const i of list) { p.x += cur[i * 3]; p.y += cur[i * 3 + 1]; p.z += cur[i * 3 + 2]; }
  return p.divideScalar(list.length);
}
/** 制服企姿：上臂差唔多垂直（離身少少）、前臂微微向前、腳併埋。回傳每條骨嘅世界矩陣 */
function uniformPose(cur) {
  const heads = rig.bones.map((b) => point(cur, b.head)), tails = rig.bones.map((b) => point(cur, b.tail));
  const M = rig.bones.map(() => new THREE.Matrix4());
  const aim = (name, dir) => {
    const i = BI[name];
    const h = heads[i].clone().applyMatrix4(M[i]), t = tails[i].clone().applyMatrix4(M[i]);
    const q = new THREE.Quaternion().setFromUnitVectors(t.sub(h).normalize(), dir.clone().normalize());
    const turn = new THREE.Matrix4().makeTranslation(h.x, h.y, h.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-h.x, -h.y, -h.z));
    const moved = rig.bones.map(() => false);
    rig.bones.forEach((b, j) => { moved[j] = j === i || (b.parent >= 0 && moved[b.parent]); });
    moved.forEach((m, j) => { if (m) M[j].premultiply(turn); });
  };
  for (const [s, sg] of [['l', 1], ['r', -1]]) {
    aim(`upperarm_${s}`, new THREE.Vector3(sg * 0.13, -1, -0.02));
    aim(`lowerarm_${s}`, new THREE.Vector3(sg * 0.06, -1, 0.1));
    aim(`hand_${s}`, new THREE.Vector3(sg * 0.02, -1, 0.04));
    // 腳：膝頭、腳眼向中間收（企直併腳）
    const hip = heads[BI[`thigh_${s}`]];
    aim(`thigh_${s}`, new THREE.Vector3(-sg * 0.035, -1, 0.0));
    aim(`calf_${s}`, new THREE.Vector3(-sg * 0.005, -1, -0.03));
    void hip;
  }
  return { M, heads: heads.map((h, i) => h.clone().applyMatrix4(M[i])), tails: tails.map((t, i) => t.clone().applyMatrix4(M[i])) };
}

// ---- 區域（同 Anny 版 REGION 一樣，用主要骨權重分） ----
const REGION_OF_BONE = (name) => {
  if (/^(head|jaw|eye_|tongue|teeth|special|levator|oris|orbicularis|temporalis|risorius)/.test(name)) return 0;
  if (/^neck/.test(name)) return 1;
  if (/^(spine_0[23]|clavicle|breast)/.test(name)) return 2;
  if (/^(spine_01|pelvis|Root)/.test(name)) return /^spine_01/.test(name) ? 2 : 3;
  const side = name.endsWith('_l') ? 0 : 1;
  if (/^upperarm/.test(name)) return 4 + side;
  if (/^lowerarm/.test(name)) return 6 + side;
  if (/^(hand|thumb|index|middle|ring|pinky|metacarpal)/.test(name)) return 8 + side;
  if (/^thigh/.test(name)) return 10 + side;
  if (/^calf/.test(name)) return 12 + side;
  if (/^(foot|ball|toe)/.test(name)) return 14 + side;
  return 2;
};
const boneRegion = rig.bones.map((b) => REGION_OF_BONE(b.name));
function dominantRegion(J, W, v) {
  let best = 0, bw = -1;
  for (let k = 0; k < 4; k++) if (W[v * 4 + k] > bw) { bw = W[v * 4 + k]; best = J[v * 4 + k]; }
  return boneRegion[best];
}

// ---- 身體拓撲（焊埋：UV 縫唔斷，衫殼、變形用；渲染用有縫版本＋貼圖） ----
const used = [...new Set(bodySource)].sort((a, b) => a - b);
const weld = new Int32Array(N).fill(-1);
used.forEach((v, i) => { weld[v] = i; });
const NW = used.length;
const renderSrc = new Uint16Array(bodySource.length);
for (let r = 0; r < bodySource.length; r++) renderSrc[r] = weld[bodySource[r]];
const facesW = new Uint16Array(bodyIdx.length);
for (let i = 0; i < bodyIdx.length; i++) facesW[i] = renderSrc[bodyIdx[i]];
const regionsW = new Uint8Array(NW);
for (let i = 0; i < NW; i++) regionsW[i] = dominantRegion(baseJoints, baseWeights, used[i]);

// ---- 各支部身形 ----
// 年齡（MakeHuman：0.1875 = 11 歲、0.5 = 25 歲）；肩峰高 = 方塊公仔嘅 L.top（章位一致）
const ageV = (y) => (y <= 11 ? (y - 1) / 10 * 0.1875 : y <= 25 ? 0.1875 + (y - 11) / 14 * 0.3125 : 0.5 + (y - 25) / 65 * 0.5);
const RACE = { african: 0, asian: 0.85, caucasian: 0.15 };
const BODIES = {
  grasshopper_boy: { years: 7, gender: 0.8, top: 92 },
  grasshopper_girl: { years: 7, gender: 0.2, top: 92 },
  cub_boy: { years: 9.5, gender: 0.85, top: 108 },
  cub_girl: { years: 9.5, gender: 0.15, top: 108 },
  scout_boy: { years: 12.5, gender: 0.9, top: 127 },
  scout_girl: { years: 12.5, gender: 0.1, top: 127 },
  venture_boy: { years: 16, gender: 0.95, top: 138 },
  venture_girl: { years: 16, gender: 0.05, top: 138 },
  leader_boy: { years: 30, gender: 1, top: 141.3 },
  leader_girl: { years: 30, gender: 0, top: 131.4 },
};
const ITEMS = {
  shirt: 'male_casualsuit01', // 有領恤衫（塞入褲）＋牛仔褲（剪短做短褲）：網頁按支部切袖、切褲腳
  skirt: 'female_elegantsuit01', // 半截裙（只用裙嗰截）
  hairShort: 'short02',
  hairBob: 'toigo_blunt_bob',
  shoes: 'shoes01',
  brows: 'eyebrow001',
  lashes: 'eyelashes01',
  eyes: 'low-poly',
};
const items = Object.fromEntries(Object.entries(ITEMS).map(([k, id]) => [k, loadItem(id)]));
const UNIT = 40; // Int16 = cm × 40（±819 cm，0.25 mm）
const q16 = (f, scale, dy) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i += 3) { o[i] = Math.round(f[i] * scale * UNIT); o[i + 1] = Math.round((f[i + 1] - dy) * scale * UNIT); o[i + 2] = Math.round(f[i + 2] * scale * UNIT); } return o; };

const index = { version: 1, unit: UNIT, source: 'MakeHuman CC0 body & clothes via ffunch/vrm-avatar-maker (CC0 assets, MIT code)', regions: ['head', 'neck', 'torso', 'pelvis', 'upperarmL', 'upperarmR', 'lowerarmL', 'lowerarmR', 'handL', 'handR', 'upperlegL', 'upperlegR', 'lowerlegL', 'lowerlegR', 'footL', 'footR'], vertices: NW, triangles: facesW.length / 3, body: { welded: NW, render: renderSrc.length, faces: facesW.length / 3 }, items: {}, bodies: {} };

// 共用拓撲
const wr = (name, typed) => fs.writeFileSync(path.join(OUT, name), Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength));
const uv16 = (uv) => { const o = new Uint16Array(uv.length); for (let i = 0; i < uv.length; i++) o[i] = Math.round(Math.min(1, Math.max(0, uv[i])) * 65535); return o; };
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.bin') || f === 'index.json') fs.unlinkSync(path.join(OUT, f));
wr('faces.bin', facesW);
wr('regions.bin', regionsW);
wr('body_render_src.bin', renderSrc);
wr('body_render_faces.bin', new Uint16Array(bodyIdx));
wr('body_uv.bin', uv16(bodyUV));
for (const [k, it] of Object.entries(items)) {
  const n = it.info.vertexCount;
  const reg = new Uint8Array(n);
  for (let v = 0; v < n; v++) reg[v] = dominantRegion(it.joints, it.skinW, v);
  const big = it.source.length > 65535;
  wr(`${k}_src.bin`, big ? new Uint32Array(it.source) : new Uint16Array(it.source));
  wr(`${k}_faces.bin`, new Uint16Array(it.indices));
  wr(`${k}_uv.bin`, uv16(it.uv));
  wr(`${k}_regions.bin`, reg);
  // 衫褲蓋住嘅身體頂點（.mhclo delete_verts → 焊埋編號）：網頁只收埋「真係喺件衫入面」嗰啲（衫切短咗唔會穿窿）
  const hid = [...new Set([...it.hides].map((v) => weld[v]).filter((v) => v >= 0))].sort((a, b) => a - b);
  if (hid.length) wr(`${k}_hides.bin`, new Uint16Array(hid));
  index.items[k] = { hides: hid.length, id: it.id, vertices: n, render: it.source.length, triangles: it.indices.length / 3, texture: it.info.texture, cutout: !!it.info.cutout };
}

for (const [key, spec] of Object.entries(BODIES)) {
  const cur = morphBody({ gender: spec.gender, age: ageV(spec.years), muscle: 0.5, weight: 0.45, race: RACE });
  const P = uniformPose(cur);
  const bodyPosed = skin(cur, baseJoints, baseWeights, P.M);
  // 地面 = 腳底；縮放令肩峰 = L.top
  let floor = Infinity;
  for (const v of used) floor = Math.min(floor, bodyPosed[v * 3 + 1]);
  const ua = P.heads[BI.upperarm_l];
  let acro = -Infinity;
  for (const v of used) {
    const x = bodyPosed[v * 3], y = bodyPosed[v * 3 + 1], r = regionsW[weld[v]];
    if ((r === 2 || r === 4) && Math.abs(x - ua.x) < 0.25 && y < P.heads[BI.neck_01].y) acro = Math.max(acro, y);
  }
  const scale = (spec.top / (acro - floor)) / 1; // 單位：decimeter → cm
  const posW = new Float32Array(NW * 3);
  used.forEach((v, i) => { for (let k = 0; k < 3; k++) posW[i * 3 + k] = bodyPosed[v * 3 + k]; });
  wr(`${key}.bin`, q16(posW, scale, floor));
  const J = (name, end = 'head') => { const p = (end === 'head' ? P.heads : P.tails)[BI[name]]; return [+(p.x * scale).toFixed(2), +((p.y - floor) * scale).toFixed(2), +(p.z * scale).toFixed(2)]; };
  const joints = {
    shoulderL: J('upperarm_l'), shoulderR: J('upperarm_r'), elbowL: J('lowerarm_l'), elbowR: J('lowerarm_r'), wristL: J('hand_l'), wristR: J('hand_r'),
    hipL: J('thigh_l'), hipR: J('thigh_r'), kneeL: J('calf_l'), kneeR: J('calf_r'), ankleL: J('foot_l'), ankleR: J('foot_r'), neck: J('neck_01'), head: J('head'),
  };
  let top = -Infinity;
  for (const v of used) top = Math.max(top, bodyPosed[v * 3 + 1]);
  const height = +((top - floor) * scale).toFixed(1);
  // 衫褲等：套落未擺姿勢嘅身 → 一樣嘅骨矩陣擺姿勢
  const girl = spec.gender < 0.5;
  const wear = Object.keys(items).filter((k) => (girl ? k !== 'hairShort' : k !== 'hairBob' && k !== 'skirt'));
  for (const k of wear) {
    const it = items[k];
    const f = fitItem(it, cur);
    if (k === 'shirt' || k === 'skirt') inflate(f, it, 0.03);
    wr(`${key}_${k}.bin`, q16(skin(f, it.joints, it.skinW, P.M), scale, floor));
  }
  const headY = joints.head[1];
  index.bodies[key] = { items: wear, hair: girl ? 'hairBob' : 'hairShort', skin: girl ? 'girl' : 'boy', years: spec.years, gender: spec.gender, height, top: spec.top, scale: +scale.toFixed(4), joints, waist: +((P.heads[BI.thigh_l].y + (girl ? 0.5 : 0.75) - floor) * scale).toFixed(2), measure: { headY } };
  console.log(key, 'height', height, 'acro→', spec.top, 'scale', scale.toFixed(3));
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log('items', Object.fromEntries(Object.entries(index.items).map(([k, v]) => [k, v.vertices])));
