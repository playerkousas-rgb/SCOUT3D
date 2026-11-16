// SCOUT3D v1.0 · © SCOUT SYSTEM
// v30 試做 B：真人人台（Anny／MakeHuman CC0 身體）＋由身體表面推出嚟嘅衫褲殼；章照用 badgeLayout.js 嘅厘米位置，
// 再由正面（袖就由側面）投影貼返落衫面（ADR-0027）。呢個檔只有純計算（冇 React），node 測試得到。
import { planarUV } from './look.js';

export const MANNEQUIN_DIR = '/models/mannequin/';
/** 樂行童軍同深資童軍同一套尺寸 */
export const bodyKey = (section, gender) => `${section === 'rover' ? 'venture' : section}_${gender === 'girl' ? 'girl' : 'boy'}`;
export const REGION = {
  head: 0, neck: 1, torso: 2, pelvis: 3, upperarmL: 4, upperarmR: 5, lowerarmL: 6, lowerarmR: 7, handL: 8, handR: 9,
  upperlegL: 10, upperlegR: 11, lowerlegL: 12, lowerlegR: 13, footL: 14, footR: 15,
};

/** Int16（單位 1/unit cm）→ Float32 cm */
export function decodePositions(int16, unit) {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) out[i] = int16[i] / unit;
  return out;
}

/** 頂點法線（面積加權） */
export function vertexNormals(pos, faces) {
  const n = new Float32Array(pos.length);
  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f] * 3, b = faces[f + 1] * 3, c = faces[f + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      n[i] += nx;
      n[i + 1] += ny;
      n[i + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * 手臂座標（同 Blocky 嘅 Arm group 一樣用法）：原點 = 膊頭關節，−Y = 上臂方向，+Z ≈ 前，+X ≈ 穿著者左。
 * seamY = 肩膊縫線（膊頂 L.top 嗰點）喺呢個座標嘅 y；toLocal／toWorld 轉換點。
 */
export function armFrame(joints, side, top) {
  const s = side === 'l' ? 'L' : 'R';
  const O = joints[`shoulder${s}`];
  const E = joints[`elbow${s}`];
  const Yl = norm(sub(O, E));
  let Zl = [0, 0, 1];
  Zl = norm(sub(Zl, Yl.map((c) => c * dot(Zl, Yl))));
  const Xl = cross(Yl, Zl);
  const toLocal = (p) => {
    const d = sub(p, O);
    return [dot(d, Xl), dot(d, Yl), dot(d, Zl)];
  };
  const toWorld = (q) => [O[0] + Xl[0] * q[0] + Yl[0] * q[1] + Zl[0] * q[2], O[1] + Xl[1] * q[0] + Yl[1] * q[1] + Zl[1] * q[2], O[2] + Xl[2] * q[0] + Yl[2] * q[1] + Zl[2] * q[2]];
  // 肩膊縫線：膊頂高度、關節正上方
  const seamY = toLocal([O[0], top, O[2]])[1];
  const elbowY = toLocal(E)[1];
  const wristY = toLocal(joints[`wrist${s}`])[1];
  // three.js Matrix4（column-major）：局部 → 世界
  const matrix = [Xl[0], Xl[1], Xl[2], 0, Yl[0], Yl[1], Yl[2], 0, Zl[0], Zl[1], Zl[2], 0, O[0], O[1], O[2], 1];
  return { O, Xl, Yl, Zl, toLocal, toWorld, seamY, elbowY, wristY, matrix };
}

/**
 * 由身體推出嚟嘅殼（衫、褲、襪、鞋）。
 * keep(i) → 頂點 i 嘅「保留距離」（cm，正 = 保留；用最細嗰個切口），null = 唔係呢件嘢。
 * offset(i) → 離皮膚幾多 cm。切口用頂點 alpha（0.5 + k / 8）＋ alphaTest：切邊係直線，唔會一格格。
 * 回傳 { position, alpha, index, src }（index 指返呢個殼自己嘅頂點；src = 每個殼頂點對應嘅身體頂點）。
 */
export function shell(pos, nrm, faces, keep, offset) {
  const nV = pos.length / 3;
  const K = new Float32Array(nV);
  const use = new Uint8Array(nV);
  for (let i = 0; i < nV; i++) {
    const k = keep(i);
    if (k === null || k === undefined) continue;
    K[i] = k;
    use[i] = 1;
  }
  const map = new Int32Array(nV).fill(-1);
  const P = [];
  const A = [];
  const I = [];
  const src = [];
  for (let f = 0; f < faces.length; f += 3) {
    const v = [faces[f], faces[f + 1], faces[f + 2]];
    if (!use[v[0]] || !use[v[1]] || !use[v[2]]) continue;
    if (K[v[0]] < -3 && K[v[1]] < -3 && K[v[2]] < -3) continue;
    for (const i of v) {
      if (map[i] < 0) {
        map[i] = P.length / 3;
        const o = offset(i);
        P.push(pos[i * 3] + nrm[i * 3] * o, pos[i * 3 + 1] + nrm[i * 3 + 1] * o, pos[i * 3 + 2] + nrm[i * 3 + 2] * o);
        A.push(Math.min(1, Math.max(0, 0.5 + K[i] / 8)));
        src.push(i);
      }
      I.push(map[i]);
    }
  }
  const position = new Float32Array(P);
  return { position, normal: vertexNormals(position, I), alpha: new Float32Array(A), index: I, src };
}

/**
 * 上身殼分面：每個三角形按法線揀上身方塊六面其中一面（同 smoothBox 一樣次序），UV 用上身方塊嘅平面投影，
 * 所以 pixels.js 畫好嘅恤衫貼圖（胸袋、袋蓋、鈕、皮帶）照用，位置同方塊公仔一樣（厘米）。
 * isSleeve(三個舊頂點 index) → 用第 7 種材質（素色袖）。回傳非索引 geometry 數據 + groups。
 */
export function torsoGroups(sh, box, isSleeve) {
  const { w, h, d, cy } = box;
  const lists = [[], [], [], [], [], [], []];
  const p = sh.position;
  for (let t = 0; t < sh.index.length; t += 3) {
    const a = sh.index[t] * 3, b = sh.index[t + 1] * 3, c = sh.index[t + 2] * 3;
    if (isSleeve(sh.index[t], sh.index[t + 1], sh.index[t + 2])) {
      lists[6].push(t);
      continue;
    }
    const n = cross([p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]);
    const ax = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
    const m = Math.max(...ax);
    let f = m === ax[0] ? (n[0] > 0 ? 0 : 1) : m === ax[1] ? (n[1] > 0 ? 2 : 3) : n[2] > 0 ? 4 : 5;
    // 膊頭向上嘅位：方塊頂面貼圖有領口圈（真人膊頭斜，會變咗一撻白），改用前／後幅
    if (f === 2) f = p[a + 2] + p[b + 2] + p[c + 2] >= 0 ? 4 : 5;
    lists[f].push(t);
  }
  const P = [], U = [], A = [], N = [];
  const groups = [];
  let start = 0;
  lists.forEach((list, f) => {
    for (const t of list) {
      for (let q = 0; q < 3; q++) {
        const i = sh.index[t + q];
        const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
        P.push(x, y, z);
        N.push(sh.normal[i * 3], sh.normal[i * 3 + 1], sh.normal[i * 3 + 2]);
        A.push(sh.alpha[i]);
        // 前後幅：膊頭斜位（高過方塊頂）用頂下面 2.5 cm 嗰行顏色，唔好拉長衣領線
        const yy = f === 4 || f === 5 ? Math.min(y - cy, h / 2 - 2.5) : y - cy;
        U.push(...(f < 6 ? planarUV(f, x, yy, z, w, h, d) : [0.5, 0.5]));
      }
    }
    groups.push({ start, count: list.length * 3, materialIndex: f });
    start += list.length * 3;
  });
  return { position: new Float32Array(P), normal: new Float32Array(N), uv: new Float32Array(U), alpha: new Float32Array(A), groups };
}

/**
 * 高度圖：由某個方向望落個殼，每格記住最外面嗰層（正面 = 最大 z；袖外側 = 最大 s·x）。
 * axis = 'z'（格 = x、y）或 'x'（格 = z、y，sign = ±1）。用嚟將章貼返落衫面。
 */
export function heightField(position, index, { axis = 'z', sign = 1, min, max, cell = 0.5, transform = null }) {
  const nu = Math.max(1, Math.ceil((max[0] - min[0]) / cell)) + 1;
  const nv = Math.max(1, Math.ceil((max[1] - min[1]) / cell)) + 1;
  const H = new Float32Array(nu * nv).fill(-Infinity);
  const pt = (i) => {
    const q = [position[i * 3], position[i * 3 + 1], position[i * 3 + 2]];
    const r = transform ? transform(q) : q;
    return axis === 'z' ? [r[0], r[1], r[2]] : [r[2], r[1], sign * r[0]];
  };
  for (let t = 0; t < index.length; t += 3) {
    const A = pt(index[t]), B = pt(index[t + 1]), C = pt(index[t + 2]);
    // 只要向外嘅三角形（由外面望係逆時針）
    const nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    if ((axis === 'z' ? nz : nz * -sign) <= 0) continue;
    const u0 = Math.max(0, Math.floor((Math.min(A[0], B[0], C[0]) - min[0]) / cell));
    const u1 = Math.min(nu - 1, Math.ceil((Math.max(A[0], B[0], C[0]) - min[0]) / cell));
    const v0 = Math.max(0, Math.floor((Math.min(A[1], B[1], C[1]) - min[1]) / cell));
    const v1 = Math.min(nv - 1, Math.ceil((Math.max(A[1], B[1], C[1]) - min[1]) / cell));
    const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let v = v0; v <= v1; v++) {
      for (let u = u0; u <= u1; u++) {
        const x = min[0] + u * cell, y = min[1] + v * cell;
        const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / den;
        const l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / den;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const z = l1 * A[2] + l2 * B[2] + l3 * C[2];
        const k = v * nu + u;
        if (z > H[k]) H[k] = z;
      }
    }
  }
  /** 雙線性插值；四格有一格冇資料就用有資料嘅平均；全部冇 → null */
  const at = (x, y) => {
    const fu = (x - min[0]) / cell, fv = (y - min[1]) / cell;
    const u = Math.floor(fu), v = Math.floor(fv);
    if (u < 0 || v < 0 || u >= nu - 1 || v >= nv - 1) return null;
    const du = fu - u, dv = fv - v;
    const c = [[H[v * nu + u], (1 - du) * (1 - dv)], [H[v * nu + u + 1], du * (1 - dv)], [H[(v + 1) * nu + u], (1 - du) * dv], [H[(v + 1) * nu + u + 1], du * dv]];
    let s = 0, wsum = 0;
    for (const [z, wt] of c) {
      if (z === -Infinity) continue;
      s += z * wt;
      wsum += wt;
    }
    return wsum > 1e-6 ? s / wsum : null;
  };
  return { at, nu, nv };
}

/**
 * 俾 snapToSurface 用嘅「網格表面」：S.snap(p) 將原本喺方塊表面外 t cm 嘅點搬去衫面外 t cm。
 * 上身：plane = 方塊正面 z（torso.d / 2）；袖：plane = 袖方塊外側 x（sleeve.w / 2），sign = 左 +1／右 −1。
 */
export function meshSurface(field, { axis = 'z', plane, sign = 1, maxT = 2.5 }) {
  return {
    mesh: true,
    snap([x, y, z]) {
      if (axis === 'z') {
        const t = z - plane;
        if (t < -1 || t > maxT) return [x, y, z];
        const f = field.at(x, y);
        return f === null ? [x, y, z] : [x, y, f + t];
      }
      const t = sign * x - plane;
      if (t < -1 || t > maxT) return [x, y, z];
      const f = field.at(z, y);
      return f === null ? [x, y, z] : [sign * (f + t), y, z];
    },
  };
}

/** 衫褲各件嘅參數（由 Blocky 傳入）→ keep／offset 函數。joints、L 用 cm。 */
export function garmentRules({ pos, regions, joints, L, long, sleeveLen, hem, pantsHem, trousers, sockTop, shoeTop, tucked = true, tights = false }) {
  const R = REGION;
  const t = L.B.torso;
  const shirtHem = t.y;
  const chestY = L.top - (L.top - shirtHem) * 0.35;
  // 塞入褲：大髀上面嗰截恤衫喺褲頭下 1 cm 就停（唔係會喺褲襠穿出嚟）；小童軍（唔塞）去到衫腳
  const pantsTop = (L.B.waist ?? shirtHem + 3) + 2;
  const legCut = tucked ? Math.max(shirtHem, pantsTop - 1) : shirtHem;
  const frames = { l: armFrame(joints, 'l', L.top), r: armFrame(joints, 'r', L.top) };
  const armSide = (r) => (r === R.upperarmL || r === R.lowerarmL || r === R.handL ? 'l' : r === R.upperarmR || r === R.lowerarmR || r === R.handR ? 'r' : null);
  const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const along = (i, side) => frames[side].toLocal(P(i))[1]; // 沿手臂（向下 = 負）
  const sleeveEnd = (side) => (long ? frames[side].wristY + 1.5 : frames[side].seamY - sleeveLen);
  const shirt = {
    keep(i) {
      const r = regions[i];
      const y = pos[i * 3 + 1];
      // 領口：膊頂以上 2.5 cm 就係頸（露皮膚）
      if (r === R.torso || r === R.pelvis) return Math.min(y - shirtHem, L.top + 2.5 - y);
      if ((r === R.upperlegL || r === R.upperlegR) && y > legCut - 4) return y - legCut;
      const side = armSide(r);
      if (!side || r === R.handL || r === R.handR) return null;
      if (!long && (r === R.lowerarmL || r === R.lowerarmR)) {
        const k = along(i, side) - sleeveEnd(side);
        return k > -3 ? k : null;
      }
      return Math.min(along(i, side) - sleeveEnd(side), 10);
    },
    offset(i) {
      const r = regions[i];
      const side = armSide(r);
      if (side) {
        const k = Math.min(1, Math.max(0, (frames[side].seamY - along(i, side)) / Math.max(1, sleeveLen)));
        return 0.8 + (long ? 0.5 : 1.3) * smooth01(k);
      }
      const y = pos[i * 3 + 1];
      return 0.75 + 0.75 * smooth01((chestY - y) / Math.max(1, chestY - shirtHem));
    },
    frames,
  };
  // 褲頭收埋喺恤衫入面（皮帶位）：pantsTop 喺上面計咗
  const hipY = L.B.leg.top;
  const isLeg = (r) => r === R.upperlegL || r === R.upperlegR || r === R.lowerlegL || r === R.lowerlegR || r === R.footL || r === R.footR;
  // 褲管：每隻腳每 2 cm 一格計中心同最大半徑（相鄰格平均）；成格一齊向外推到「褲管半徑」（長褲由大髀慢慢收、
  // 短褲一樣闊），保留橫切面形狀（唔會一點點凹凸），亦唔會好似緊身褲咁貼住小腿
  const legSide = (r) => (r === R.upperlegL || r === R.lowerlegL ? 'l' : r === R.upperlegR || r === R.lowerlegR ? 'r' : null);
  const bins = { l: new Map(), r: new Map() };
  const binOf = (y) => Math.round(y / 2);
  for (let i = 0; i < regions.length; i++) {
    const sd = legSide(regions[i]);
    if (!sd) continue;
    const b = binOf(pos[i * 3 + 1]);
    const e = bins[sd].get(b) ?? { x: 0, z: 0, n: 0, r: 0 };
    e.x += pos[i * 3];
    e.z += pos[i * 3 + 2];
    e.n++;
    bins[sd].set(b, e);
  }
  for (const m of Object.values(bins)) for (const e of m.values()) { e.x /= e.n; e.z /= e.n; }
  for (let i = 0; i < regions.length; i++) {
    const sd = legSide(regions[i]);
    if (!sd) continue;
    const e = bins[sd].get(binOf(pos[i * 3 + 1]));
    e.r = Math.max(e.r, Math.hypot(pos[i * 3] - e.x, pos[i * 3 + 2] - e.z));
  }
  const binR = (sd, y) => {
    const b = binOf(y);
    let s = 0, n = 0;
    for (let q = -2; q <= 2; q++) {
      const e = bins[sd].get(b + q);
      if (e) { s += e.r; n++; }
    }
    return n ? s / n : 0;
  };
  const thighY = hipY - Math.max(4, (hipY - pantsHem) * 0.15);
  const rThigh = Math.max(binR('l', thighY), binR('r', thighY), 4);
  const legEase = (sd, y) => {
    const k = Math.min(1, Math.max(0, (thighY - y) / Math.max(1, thighY - pantsHem)));
    const target = trousers ? rThigh * (0.9 - 0.24 * k) : rThigh * (0.98 + 0.04 * k);
    return Math.max(0, target - binR(sd, y)) * smooth01((thighY + 3 - y) / 6);
  };
  const pants = {
    keep(i) {
      const r = regions[i];
      if (!(r === R.torso || r === R.pelvis || isLeg(r))) return null;
      const y = pos[i * 3 + 1];
      return Math.min(pantsTop - y, y - pantsHem);
    },
    offset(i) {
      const y = pos[i * 3 + 1];
      if (tights) return 0.12; // 半截裙下面嘅絲襪：貼身
      const base = 0.45 + 0.35 * smooth01((pantsTop - y) / 4) + 0.3 * smooth01((hipY - y) / 6);
      const sd = legSide(regions[i]);
      return sd ? base + legEase(sd, y) : base;
    },
  };
  const socks = {
    keep(i) {
      const r = regions[i];
      if (!(r === R.lowerlegL || r === R.lowerlegR || r === R.footL || r === R.footR)) return null;
      return sockTop - pos[i * 3 + 1];
    },
    offset: () => 0.22,
  };
  const shoes = {
    keep(i) {
      const r = regions[i];
      if (!(r === R.lowerlegL || r === R.lowerlegR || r === R.footL || r === R.footR)) return null;
      return shoeTop - pos[i * 3 + 1];
    },
    offset: (i) => 0.45 + 0.35 * smooth01((shoeTop - pos[i * 3 + 1]) / 3),
  };
  return { shirt, pants, socks, shoes, frames, hem };
}

/**
 * 半截裙（試做 B）：由褲頭（top）到裙腳（hem）嘅筒。每 step cm 一圈，每個角度量身體（上身、盤骨、大髀）喺嗰個高度
 * 最外嘅半徑，加 ease；向下只會一樣闊或者更闊（裙唔會收入去跟大髀罅），裙腳再微微散開（flare）。
 * 回傳 { position, normal, index }（非索引就唔使；用 index）。
 */
export function skirtRings(pos, regions, { top, hem, ease = 0.8, step = 2, seg = 48, flare = 0.05 }) {
  const R = REGION;
  const rows = [];
  for (let y = top; y > hem - 1e-6; y -= step) rows.push(Math.max(hem, y));
  if (rows[rows.length - 1] > hem + 1e-6) rows.push(hem);
  const ok = (r) => r === R.torso || r === R.pelvis || r === R.upperlegL || r === R.upperlegR || r === R.lowerlegL || r === R.lowerlegR;
  // 每圈、每個角度（扇形）量身體最外嘅半徑（中心 = 前後中點），咁裙就唔會切入盤骨嘅「角」（橢圓會）
  let prev = null;
  const rings = rows.map((y, j) => {
    let zmin = Infinity, zmax = -Infinity;
    const band = [];
    for (let i = 0; i < regions.length; i++) {
      if (!ok(regions[i]) || Math.abs(pos[i * 3 + 1] - y) > step) continue;
      band.push(i);
      zmin = Math.min(zmin, pos[i * 3 + 2]);
      zmax = Math.max(zmax, pos[i * 3 + 2]);
    }
    const zc = band.length ? (zmin + zmax) / 2 : prev ? prev.zc : 0;
    let r = new Array(seg).fill(0);
    for (const i of band) {
      const x = pos[i * 3], z = pos[i * 3 + 2] - zc;
      const th = Math.atan2(x, z);
      const s = ((Math.round((th / (Math.PI * 2)) * seg) % seg) + seg) % seg;
      r[s] = Math.max(r[s], Math.hypot(x, z));
    }
    // 空扇形用左右最大；再做圓周平滑（3 格最大 → 5 格平均）
    for (let pass = 0; pass < 2; pass++) r = r.map((v, s) => Math.max(v, r[(s + 1) % seg], r[(s + seg - 1) % seg]));
    r = r.map((_, s) => (r[(s + seg - 2) % seg] + r[(s + seg - 1) % seg] + r[s] + r[(s + 1) % seg] + r[(s + 2) % seg]) / 5 + ease);
    if (prev) r = r.map((v, s) => Math.max(v, prev.r[s]));
    const k = rows.length > 1 ? j / (rows.length - 1) : 0;
    const out = { y, zc: prev ? (zc + prev.zc) / 2 : zc, r };
    prev = out;
    return { ...out, r: r.map((v) => v * (1 + flare * k * k)) };
  });
  const P = [];
  const I = [];
  for (const g of rings) {
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      const rr = g.r[s % seg];
      P.push(Math.sin(th) * rr, g.y, g.zc + Math.cos(th) * rr);
    }
  }
  const W = seg + 1;
  for (let j = 0; j < rings.length - 1; j++) {
    for (let s = 0; s < seg; s++) {
      const a = j * W + s, b = a + 1, c = a + W, d = c + 1;
      I.push(a, c, b, b, c, d);
    }
  }
  const position = new Float32Array(P);
  return { position, normal: vertexNormals(position, I), index: I, rings };
}
