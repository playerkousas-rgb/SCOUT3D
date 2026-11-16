// SCOUT3D v1.0 · © SCOUT SYSTEM
// 真人人台（v30 試做 B、v31 定做第二款人形；v33 起 MakeHuman CC0 身體，真衫褲見 mh.js）＋由身體表面推出嚟嘅殼（襪、絲襪、外衣）；章照用 badgeLayout.js 嘅厘米位置，
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
  const KK = [];
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
        KK.push(K[i]);
      }
      I.push(map[i]);
    }
  }
  const position = new Float32Array(P);
  return { position, normal: vertexNormals(position, I), alpha: new Float32Array(A), index: I, src, k: new Float32Array(KK) };
}

/**
 * v31b「真衫」：將由身體推出嚟嘅殼（shell）變做一件有厚度、有邊嘅布：
 * 1. smooth：只向外嘅平滑（inflateSmooth）— 布跨過身體凹位（背脊坑、胸肚之間），唔再似油上皮膚；
 * 2. 喺 k = 0 真係切開三角形（以前靠 alpha 切），邊位係幾何邊；
 * 3. 邊（領口、袖口、衫腳、褲腳）：k < band 嗰圈再厚 lift（摺邊）；
 * 4. Solidify：內層 = 外層沿法線向入 thick（反轉方向）＋ 邊位一圈側面。
 * 回傳同 shell 一樣格式（alpha 全部 1），outerTris = 外層三角形數（之後係內層同側面）。
 */
export function clothify(sh, { thick = 0.3, band = 1.5, lift = 0.18, smooth = 0 } = {}) {
  // 先喺未平滑嘅殼切 k = 0（平滑會令頂點上下滑 → 切口變鋸齒／褲頭前面凹 V），切完先平滑（邊界釘死）
  const P0 = sh.position, N0 = sh.normal, K0 = sh.k;
  const P = Array.from(P0), N = Array.from(N0), K = Array.from(K0), S = Array.from(sh.src);
  const edgeV = new Map();
  const nV0 = P0.length / 3;
  const cut = (a, b) => {
    const key = a < b ? a * nV0 + b : b * nV0 + a;
    if (edgeV.has(key)) return edgeV.get(key);
    const t = K[a] / (K[a] - K[b]);
    const id = P.length / 3;
    for (let q = 0; q < 3; q++) {
      P.push(P[a * 3 + q] + (P[b * 3 + q] - P[a * 3 + q]) * t);
      N.push(N[a * 3 + q] + (N[b * 3 + q] - N[a * 3 + q]) * t);
    }
    K.push(0);
    S.push(K[a] >= 0 ? S[a] : S[b]);
    edgeV.set(key, id);
    return id;
  };
  const I = [];
  const idx = sh.index;
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    const pos = v.map((i) => K[i] >= 0);
    const n = pos.filter(Boolean).length;
    if (n === 3) { I.push(...v); continue; }
    if (n === 0) continue;
    // 轉到特別嗰點喺第一位（保持方向）
    const odd = n === 1 ? pos.indexOf(true) : pos.indexOf(false);
    const a = v[odd], b = v[(odd + 1) % 3], c = v[(odd + 2) % 3];
    if (n === 1) {
      I.push(a, cut(a, b), cut(a, c));
    } else {
      const eb = cut(b, a), ec = cut(c, a);
      I.push(b, c, ec, b, ec, eb);
    }
  }
  // 冇用到嘅頂點唔理（index 只指有用嘅）；摺邊
  const nV = P.length / 3;
  if (smooth > 0) {
    const sm = inflateSmooth({ position: new Float32Array(P), index: I }, smooth).position;
    for (let i = 0; i < P.length; i++) P[i] = sm[i];
  }
  const Nn = vertexNormals(new Float32Array(P), I);
  for (let i = 0; i < nV; i++) {
    if (K[i] < 0) continue;
    const l = lift * (1 - smooth01((K[i] - band) / 0.6));
    if (l <= 0) continue;
    for (let q = 0; q < 3; q++) P[i * 3 + q] += Nn[i * 3 + q] * l;
  }
  const outer = new Float32Array(P);
  const Nout = vertexNormals(outer, I);
  // 內層
  const all = new Float32Array(nV * 6);
  all.set(outer);
  for (let i = 0; i < nV; i++) for (let q = 0; q < 3; q++) all[(nV + i) * 3 + q] = outer[i * 3 + q] - Nout[i * 3 + q] * thick;
  const outerTris = I.length / 3;
  const J = I.slice();
  for (let t = 0; t < I.length; t += 3) J.push(I[t] + nV, I[t + 2] + nV, I[t + 1] + nV);
  // 邊：只屬一個三角形嘅邊
  const cnt = new Map();
  for (let t = 0; t < I.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const u = I[t + e], w = I[t + ((e + 1) % 3)];
      const key = u < w ? u * nV + w : w * nV + u;
      cnt.set(key, (cnt.get(key) ?? 0) + 1);
    }
  }
  for (let t = 0; t < I.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const u = I[t + e], w = I[t + ((e + 1) % 3)];
      const key = u < w ? u * nV + w : w * nV + u;
      if (cnt.get(key) !== 1) continue;
      J.push(u, u + nV, w, w, u + nV, w + nV);
    }
  }
  const src = new Int32Array(nV * 2);
  for (let i = 0; i < nV; i++) src[i] = src[i + nV] = S[i];
  const kk = new Float32Array(nV * 2);
  for (let i = 0; i < nV; i++) kk[i] = kk[i + nV] = K[i];
  return { position: all, normal: vertexNormals(all, J), alpha: new Float32Array(nV * 2).fill(1), index: J, src, k: kk, outerTris };
}

/**
 * 上身殼分面：每個三角形按法線揀上身方塊六面其中一面（同 smoothBox 一樣次序），UV 用上身方塊嘅平面投影，
 * 所以 pixels.js 畫好嘅恤衫貼圖（胸袋、袋蓋、鈕、皮帶）照用，位置同方塊公仔一樣（厘米）。
 * isSleeve(三個舊頂點 index) → 用第 7 種材質（素色袖）。回傳非索引 geometry 數據 + groups。
 */
export function torsoGroups(sh, box, isSleeve, { plainOutside = false } = {}) {
  const { w, h, d, cy } = box;
  const lists = [[], [], [], [], [], [], []];
  const p = sh.position;
  for (let t = 0; t < sh.index.length; t += 3) {
    const a = sh.index[t] * 3, b = sh.index[t + 1] * 3, c = sh.index[t + 2] * 3;
    // v31b：內層同邊位側面用素色（第 7 種材質）
    if ((sh.outerTris !== undefined && t / 3 >= sh.outerTris) || isSleeve(sh.index[t], sh.index[t + 1], sh.index[t + 2])) {
      lists[6].push(t);
      continue;
    }
    const n = cross([p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]);
    const ax = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
    const m = Math.max(...ax);
    let f = m === ax[0] ? (n[0] > 0 ? 0 : 1) : m === ax[1] ? (n[1] > 0 ? 2 : 3) : n[2] > 0 ? 4 : 5;
    // 膊頭向上嘅位：方塊頂面貼圖有領口圈（真人膊頭斜，會變咗一撻白），改用前／後幅
    if (f === 2) f = p[a + 2] + p[b + 2] + p[c + 2] >= 0 ? 4 : 5;
    // v33 真衫（比方塊闊／長）：方塊以外（兩側、衫腳下面、側面、底）用素色，唔好拉長貼圖邊（一條條橫紋）
    if (plainOutside) {
      const mx = Math.max(Math.abs(p[a]), Math.abs(p[b]), Math.abs(p[c]));
      const my = Math.min(p[a + 1], p[b + 1], p[c + 1]);
      if (f < 4 || mx > w / 2 - 0.3 || my < cy - h / 2) {
        lists[6].push(t);
        continue;
      }
    }
    lists[f].push(t);
  }
  const P = [], U = [], A = [], N = [], U2 = [];
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
        if (sh.uv2) U2.push(sh.uv2[i * 2], sh.uv2[i * 2 + 1]); // v33：真衫嘅摺痕明暗圖 UV
        // 前後幅：膊頭斜位（高過方塊頂）用頂下面 2.5 cm 嗰行顏色，唔好拉長衣領線
        const yy = f === 4 || f === 5 ? Math.min(y - cy, h / 2 - 2.5) : y - cy;
        U.push(...(f < 6 ? planarUV(f, x, yy, z, w, h, d) : [0.5, 0.5]));
      }
    }
    groups.push({ start, count: list.length * 3, materialIndex: f });
    start += list.length * 3;
  });
  return { position: new Float32Array(P), normal: new Float32Array(N), uv: new Float32Array(U), alpha: new Float32Array(A), uv2: sh.uv2 ? new Float32Array(U2) : null, groups };
}

/**
 * 高度圖：由某個方向望落個殼，每格記住最外面嗰層（正面 = 最大 z；袖外側 = 最大 s·x）。
 * axis = 'z'（格 = x、y）或 'x'（格 = z、y，sign = ±1）。用嚟將章貼返落衫面。
 */
export function heightField(position, index, { axis = 'z', sign = 1, min, max, cell = 0.5, transform = null, cull = true }) {
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
    if (cull && (axis === 'z' ? nz : nz * -sign) <= 0) continue;
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
  /** v31：第 v 行（座標 y）／第 u 列（座標 x）有資料嘅範圍 [lo, hi]（冇 → null） */
  let rows = null, cols = null;
  const span = (n, m, idx) => {
    const out = new Array(n).fill(null);
    for (let a = 0; a < n; a++) {
      let lo = Infinity, hi = -Infinity;
      for (let b = 0; b < m; b++) if (H[idx(a, b)] !== -Infinity) { lo = Math.min(lo, b); hi = Math.max(hi, b); }
      if (lo <= hi) out[a] = [lo, hi];
    }
    return out;
  };
  const rowRange = (y) => {
    rows ??= span(nv, nu, (v, u) => v * nu + u);
    const v = Math.round((y - min[1]) / cell);
    const r = v >= 0 && v < nv ? rows[v] : null;
    return r && [min[0] + r[0] * cell, min[0] + r[1] * cell];
  };
  const colRange = (x) => {
    cols ??= span(nu, nv, (u, v) => v * nu + u);
    const u = Math.round((x - min[0]) / cell);
    const r = u >= 0 && u < nu ? cols[u] : null;
    return r && [min[1] + r[0] * cell, min[1] + r[1] * cell];
  };
  return { at, nu, nv, rowRange, colRange };
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
export function garmentRules({ pos, regions, joints, L, long, sleeveLen, hem, pantsHem, trousers, sockTop, shoeTop, tucked = true, tights = false, outer = null }) {
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
        return 1.0 + (long ? 0.4 : 1.1) * smooth01(k);
      }
      const y = pos[i * 3 + 1];
      // v31b：衫同身之間約 1 cm（胸 1.0 → 衫腳 1.6）
      return 1.0 + 0.6 * smooth01((chestY - y) / Math.max(1, chestY - shirtHem));
    },
    frames,
  };
  // v31：外衣（毛衣、背心、禮服／晚禮服外套）：恤衫外面再一層；outer = { bottom, neckUp, sleeves, extra }
  // 外衣腳最低去到褲襠上面 2 cm（再低就變咗兩條褲管，褲襠露個窿）
  let crotch = -Infinity;
  if (outer) {
    let lo = Infinity;
    for (let i = 0; i < regions.length; i++) if (regions[i] === R.pelvis && Math.abs(pos[i * 3]) < 2) lo = Math.min(lo, pos[i * 3 + 1]);
    crotch = lo === Infinity ? -Infinity : lo;
  }
  const outerBottom = outer ? Math.max(outer.bottom, crotch + 2) : 0;
  const outerG = outer && {
    bottom: outerBottom,
    keep(i) {
      const r = regions[i];
      const y = pos[i * 3 + 1];
      const neck = L.top + 2.5 + (outer.neckUp ?? 0);
      if (r === R.torso || r === R.pelvis) return Math.min(y - outerBottom, neck - y);
      if ((r === R.upperlegL || r === R.upperlegR) && y > outerBottom - 4) return y - outerBottom;
      const side = armSide(r);
      if (!side || r === R.handL || r === R.handR) return null;
      if (!outer.sleeves) {
        // 背心：袖窿喺膊頭下面少少
        const k = along(i, side) - (frames[side].seamY - 2);
        return k > -3 ? k : null;
      }
      return Math.min(along(i, side) - (frames[side].wristY + 1), 10);
    },
    offset(i) {
      const base = shirt.offset(i); // v31b：外衣喺恤衫外面（恤衫厚 0.3 + 摺邊 0.18 → extra ≥ 0.5）
      return base + (outer.extra ?? 0.7);
    },
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
      // v31b：恤衫塞入褲：褲頭包住恤衫（恤衫 1.6 + 摺邊）→ 褲頭 2.4，向下 6 cm 收返到離身約 1.2 cm
      const top = tucked ? 1.2 * (1 - smooth01((pantsTop - 3 - y) / 6)) : 0;
      const base = 1.2 + top;
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
  return { shirt, pants, socks, shoes, frames, hem, outer: outerG };
}

/**
 * v31：「只可以向外」嘅平滑（鞋用）：每個頂點向鄰居平均移，但唔准向入（法線方向分量 < 0 就攞走）。
 * 腳趾之間嘅罅會填平、腳趾頭變返一個鞋頭（唔再似光腳），鞋只會大啲唔會穿入腳。回傳新 position + normal。
 */
export function inflateSmooth(sh, iters = 24) {
  const P = Float32Array.from(sh.position);
  const nV = P.length / 3;
  const nb = Array.from({ length: nV }, () => new Set());
  for (let i = 0; i < sh.index.length; i += 3) {
    const a = sh.index[i], b = sh.index[i + 1], c = sh.index[i + 2];
    nb[a].add(b).add(c);
    nb[b].add(a).add(c);
    nb[c].add(a).add(b);
  }
  const boundary = new Uint8Array(nV);
  // 邊界（鞋口）：邊只屬一個三角形
  const edges = new Map();
  for (let i = 0; i < sh.index.length; i += 3) {
    for (const [u, v] of [[sh.index[i], sh.index[i + 1]], [sh.index[i + 1], sh.index[i + 2]], [sh.index[i + 2], sh.index[i]]]) {
      const k = u < v ? u * nV + v : v * nV + u;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  for (const [k, n] of edges) if (n === 1) { boundary[Math.floor(k / nV)] = 1; boundary[k % nV] = 1; }
  for (let it = 0; it < iters; it++) {
    const N = vertexNormals(P, sh.index);
    const Q = Float32Array.from(P);
    for (let i = 0; i < nV; i++) {
      if (boundary[i] || !nb[i].size) continue;
      let x = 0, y = 0, z = 0;
      for (const j of nb[i]) { x += P[j * 3]; y += P[j * 3 + 1]; z += P[j * 3 + 2]; }
      const m = nb[i].size;
      let dx = x / m - P[i * 3], dy = y / m - P[i * 3 + 1], dz = z / m - P[i * 3 + 2];
      const dn = dx * N[i * 3] + dy * N[i * 3 + 1] + dz * N[i * 3 + 2];
      if (dn < 0) { dx -= dn * N[i * 3]; dy -= dn * N[i * 3 + 1]; dz -= dn * N[i * 3 + 2]; }
      Q[i * 3] += dx * 0.6; Q[i * 3 + 1] += dy * 0.6; Q[i * 3 + 2] += dz * 0.6;
    }
    P.set(Q);
  }
  return { ...sh, position: P, normal: vertexNormals(P, sh.index) };
}

/**
 * 半截裙（試做 B）：由褲頭（top）到裙腳（hem）嘅筒。每 step cm 一圈，每個角度量身體（上身、盤骨、大髀）喺嗰個高度
 * 最外嘅半徑，加 ease；向下只會一樣闊或者更闊（裙唔會收入去跟大髀罅），裙腳再微微散開（flare）。
 * 回傳 { position, normal, index }（非索引就唔使；用 index）。
 */
export function skirtRings(pos, regions, { top, hem, ease = 0.8, step = 2, seg = 96, flare = 0.03, pleats = [], waistband = 2, thick = 0.3 }) {
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
  // v31b：直摺（弓字褶 / box pleat）：每個摺位向外凸一條、兩邊向入一條摺痕；腰頭下 6 cm 車死，向下漸深
  const PW = (8 / 180) * Math.PI; // 摺半闊（角度）
  const pleatAt = (th, y) => {
    if (!pleats.length) return 0;
    const depth = smooth01((top - waistband - 6 - y) / 8) * 0.9 + smooth01((top - waistband - y) / 6) * 0.15;
    let d = 0;
    for (const p of pleats) {
      let a = Math.abs(th - p) % (Math.PI * 2);
      if (a > Math.PI) a = Math.PI * 2 - a;
      if (a < PW) d += depth * (1 - a / PW) * 0.9; // 摺面向外
      else if (a < PW * 1.6) d -= depth * 0.45 * (1 - (a - PW) / (PW * 0.6)); // 摺痕向入
    }
    return d;
  };
  // 腰頭：上面 waistband cm 再闊 0.35（另一條布）
  const bandAt = (y) => (y > top - waistband - 0.01 ? 0.35 : 0);
  // 腰頭底加一圈（同腰頭一樣高度，但冇腰頭厚度）→ 有一級
  const rows2 = [];
  for (const g of rings) {
    rows2.push({ g, band: bandAt(g.y) });
    if (Math.abs(g.y - (top - waistband)) < 1e-6) rows2.push({ g: { ...g, y: g.y - 0.05 }, band: 0 });
  }
  const P = [];
  const I = [];
  for (const { g, band } of rows2) {
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      const rr = g.r[s % seg] + band + pleatAt(th, g.y);
      P.push(Math.sin(th) * rr, g.y, g.zc + Math.cos(th) * rr);
    }
  }
  const W = seg + 1;
  const NR = rows2.length;
  const quad = (a, b, c, d) => I.push(a, c, b, b, c, d);
  for (let j = 0; j < NR - 1; j++) for (let s = 0; s < seg; s++) quad(j * W + s, j * W + s + 1, (j + 1) * W + s, (j + 1) * W + s + 1);
  // Solidify：內層（向中心縮 thick，反轉）＋ 裙腳、腰頂兩圈側面
  const nOut = P.length / 3;
  const outerTris = I.length / 3;
  for (let j = 0; j < NR; j++) {
    const { g } = rows2[j];
    for (let s = 0; s <= seg; s++) {
      const i = (j * W + s) * 3;
      const dx = P[i], dz = P[i + 2] - g.zc;
      const r = Math.hypot(dx, dz) || 1;
      P.push(P[i] - (dx / r) * thick, P[i + 1], P[i + 2] - (dz / r) * thick);
    }
  }
  for (let t = 0; t < outerTris * 3; t += 3) I.push(I[t] + nOut, I[t + 2] + nOut, I[t + 1] + nOut);
  for (const j of [0, NR - 1]) {
    for (let s = 0; s < seg; s++) {
      const a = j * W + s, b = a + 1;
      if (j === 0) I.push(a, b, a + nOut, b, b + nOut, a + nOut);
      else I.push(a, a + nOut, b, b, a + nOut, b + nOut);
    }
  }
  const position = new Float32Array(P);
  return { position, normal: vertexNormals(position, I), index: I, rings, outerTris };
}

/**
 * v31b：皮帶圈（皮帶原本畫喺身體貼圖；而家褲／裙係獨立布料包住咗，所以另外起一條 3 cm 皮帶）。
 * 喺 P（褲或裙嘅外層頂點）入面 top..top-h 呢截，每個角度量最外半徑再加 ease → 一條環＋前面扣嘅位置。
 */
export function beltRing(P, { top, h = 3, seg = 64, ease = 0.25 }) {
  const lo = top - h - 0.5, hi = top + 0.5;
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    if (P[i + 1] < lo || P[i + 1] > hi) continue;
    zmin = Math.min(zmin, P[i + 2]);
    zmax = Math.max(zmax, P[i + 2]);
  }
  if (!Number.isFinite(zmin)) return null;
  const zc = (zmin + zmax) / 2;
  let r = new Array(seg).fill(0);
  for (let i = 0; i < P.length; i += 3) {
    if (P[i + 1] < lo || P[i + 1] > hi) continue;
    const x = P[i], z = P[i + 2] - zc;
    const s = ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * seg) % seg) + seg) % seg;
    r[s] = Math.max(r[s], Math.hypot(x, z));
  }
  for (let pass = 0; pass < 3; pass++) r = r.map((v, s) => Math.max(v, r[(s + 1) % seg], r[(s + seg - 1) % seg]));
  r = r.map((_, s) => (r[(s + seg - 1) % seg] + r[s] + r[(s + 1) % seg]) / 3 + ease);
  const BP = [];
  const BI = [];
  for (const y of [top - 0.1, top - h]) {
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      BP.push(Math.sin(th) * r[s % seg], y, zc + Math.cos(th) * r[s % seg]);
    }
  }
  const W = seg + 1;
  for (let s = 0; s < seg; s++) BI.push(s, s + W, s + 1, s + 1, s + W, s + 1 + W);
  const position = new Float32Array(BP);
  return { position, normal: vertexNormals(position, BI), index: BI, buckle: { x: 0, y: top - h / 2 - 0.05, z: zc + r[0] + 0.2 } };
}

/**
 * v31：人台個頭嘅「方塊」（俾帽用，帽一向跟 B.head 計）：頂 = 頭頂；闊／深喺眉以上量（唔計鼻、耳）；
 * 底 = 下巴（頭部前面最低點）。回傳同 body.js B.head 一樣嘅格式 { w, h, d, y, z }。
 */
export function headBox(pos, regions) {
  let top = -Infinity, bot = Infinity;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] !== REGION.head) continue;
    top = Math.max(top, pos[i * 3 + 1]);
    bot = Math.min(bot, pos[i * 3 + 1]);
  }
  const hh = top - bot;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] !== REGION.head) continue;
    const y = pos[i * 3 + 1];
    if (y > top - 0.12 * hh || y < top - 0.36 * hh) continue;
    x0 = Math.min(x0, pos[i * 3]);
    x1 = Math.max(x1, pos[i * 3]);
    z0 = Math.min(z0, pos[i * 3 + 2]);
    z1 = Math.max(z1, pos[i * 3 + 2]);
  }
  const zc = (z0 + z1) / 2;
  let chin = top;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] !== REGION.head || pos[i * 3 + 2] < zc + 0.35 * (z1 - z0) / 2 || Math.abs(pos[i * 3]) > 2) continue;
    chin = Math.min(chin, pos[i * 3 + 1]);
  }
  const r = (v) => Math.round(v * 100) / 100;
  return { w: r(x1 - x0), d: r(z1 - z0), h: r(top - chin), y: r(chin), z: r(zc), top: r(top), cx: r((x0 + x1) / 2) };
}

/**
 * v31：人台頭髮 = 頭皮外面一層殼（同衫褲一樣由身體推出嚟）。髮腳跟 anatomy.js hairDrop（按頭高縮放），
 * 戴帽時帽口（頭頂落 hatCut cm）以上冇頭髮（唔會穿出帽）。厚度近髮腳薄、頭頂厚，加少少一撮撮嘅起伏。
 */
export function hairRules({ pos, regions, head, drop, hatCut = 0, scale = 1 }) {
  const ok = (r) => r === REGION.head || r === REGION.neck;
  const zc = head.z;
  const at = (i) => {
    const x = pos[i * 3] - head.cx, y = pos[i * 3 + 1], z = pos[i * 3 + 2] - zc;
    return { th: Math.atan2(x, z), fromTop: head.top - y };
  };
  return {
    keep(i) {
      if (!ok(regions[i])) return null;
      const { th, fromTop } = at(i);
      let k = drop(th) * scale - fromTop;
      if (hatCut > 0) k = Math.min(k, fromTop - hatCut * scale);
      return k;
    },
    offset(i) {
      const { th, fromTop } = at(i);
      const k = drop(th) * scale - fromTop;
      const clump = 0.12 * Math.pow(Math.abs(Math.sin(th * 30 + fromTop * 0.4)), 0.6);
      // 帽口下面由薄（0.1）漸漸變返正常厚度：唔會頂穿帽帶
      const rc = hatCut > 0 ? smooth01((fromTop - hatCut * scale) / 1.5) : 1;
      return 0.1 + (0.15 + 0.45 * smooth01(k / 3) + clump) * rc;
    },
  };
}

/**
 * v31：頸嘅「極座標高度圖」：喺每個高度 y、每個角度 θ（0 = 前，+x = 左），由頸中軸（neck → head 關節連線）
 * 水平射出去，最近嘅表面（頸皮膚／衣領）離中軸幾遠。由入面射出，所以搵到嘅係頸，唔會係膊頭。
 */
export function neckField(position, index, { neck, head, y0, y1, step = 0.5, seg = 72, maxR = Infinity }) {
  const ny = Math.max(1, Math.ceil((y1 - y0) / step)) + 1;
  const R = new Float32Array(ny * seg).fill(Infinity);
  const axisAt = (y) => {
    const k = (y - neck[1]) / Math.max(1e-6, head[1] - neck[1]);
    return [neck[0] + (head[0] - neck[0]) * k, neck[2] + (head[2] - neck[2]) * k];
  };
  const dirs = Array.from({ length: seg }, (_, s) => [Math.sin((s / seg) * Math.PI * 2), Math.cos((s / seg) * Math.PI * 2)]);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ya = position[a + 1], yb = position[b + 1], yc = position[c + 1];
    const lo = Math.min(ya, yb, yc), hi = Math.max(ya, yb, yc);
    if (hi < y0 || lo > y1) continue;
    const j0 = Math.max(0, Math.ceil((lo - y0) / step)), j1 = Math.min(ny - 1, Math.floor((hi - y0) / step));
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * step;
      // 三角形同水平面 y 嘅交線（線段 p–q）
      const P = [];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const yu = position[u + 1], yv = position[v + 1];
        if ((yu - y) * (yv - y) > 0 || yu === yv) continue;
        const k = (y - yu) / (yv - yu);
        P.push([position[u] + (position[v] - position[u]) * k, position[u + 2] + (position[v + 2] - position[u + 2]) * k]);
      }
      if (P.length < 2) continue;
      const [cx, cz] = axisAt(y);
      const p = [P[0][0] - cx, P[0][1] - cz], q = [P[1][0] - cx, P[1][1] - cz];
      const e = [q[0] - p[0], q[1] - p[1]];
      for (let s = 0; s < seg; s++) {
        const d = dirs[s];
        // 射線 r·d 同線段 p + u·e 相交
        const den = d[0] * e[1] - d[1] * e[0];
        if (Math.abs(den) < 1e-9) continue;
        const u = (d[1] * p[0] - d[0] * p[1]) / den;
        if (u < -1e-6 || u > 1 + 1e-6) continue;
        const r = (p[0] * e[1] - p[1] * e[0]) / den;
        if (r > 0.3 && r < R[j * seg + s]) R[j * seg + s] = r;
      }
    }
  }
  // 太遠（射中膊頭／下巴）當冇；冇資料嘅格（下面：手臂嘅洞；上面：下巴遮住）用上／下最近嗰格（當直筒）
  for (let s = 0; s < seg; s++) {
    for (let j = 0; j < ny; j++) if (R[j * seg + s] > maxR) R[j * seg + s] = Infinity;
    for (let j = 1; j < ny; j++) if (R[j * seg + s] === Infinity) R[j * seg + s] = R[(j - 1) * seg + s];
    for (let j = ny - 2; j >= 0; j--) if (R[j * seg + s] === Infinity) R[j * seg + s] = R[(j + 1) * seg + s];
  }
  /** 半徑（θ、y 雙線性；冇資料 → null） */
  const at = (th, y) => {
    let fs = ((th / (Math.PI * 2)) * seg) % seg;
    if (fs < 0) fs += seg;
    const fj = Math.min(ny - 1.001, Math.max(0, (y - y0) / step));
    const s0 = Math.floor(fs), j0 = Math.floor(fj), ds = fs - s0, dj = fj - j0;
    let sum = 0, wsum = 0;
    for (const [s, j, wt] of [[s0, j0, (1 - ds) * (1 - dj)], [(s0 + 1) % seg, j0, ds * (1 - dj)], [s0, j0 + 1, (1 - ds) * dj], [(s0 + 1) % seg, j0 + 1, ds * dj]]) {
      const r = R[j * seg + s];
      if (r === Infinity) continue;
      sum += r * wt;
      wsum += wt;
    }
    return wsum > 1e-6 ? sum / wsum : null;
  };
  return { at, axisAt };
}

/**
 * v31：「方塊世界 → 人台」嘅變形（旅巾、衣領、領帶、木章、肩帶、笛繩、專章帶都用）。
 * 方塊公仔嘅配件係對住上身方塊（w × d，y0–top）同頸方塊（neck.w × neck.d，top 以上）擺。
 * 上身：每點量離前／後／左／右／膊頂幾遠（t，最大嗰面 = 最近嗰面，近角位 softmax 加權），擺返去衫面外面同樣 t；
 * 頸：方塊頸外面 t（圓角矩形距離）、角度 θ → 人台頸（neckField）外面 t。
 * warp 用上身；neckWarp（衣領、旅巾圈）用頸。離表面太遠（> maxT）或者好入面（< −4）就唔郁。
 * shoulder = { box: 方塊膊頭外邊 x, body: 人台膊頭外邊 x }（膊頂按比例收窄）。
 * position／index：上身最外層（唔包袖）；topPosition／topIndex：膊頂（包埋袖，膊頭三角肌係手臂區）；
 * neckPosition／neckIndex：頸、上身皮膚＋恤衫（唔好包個頭：下巴會擋住）；joints：neck、head。
 */
export function bodyWarp({ position, index, topPosition = position, topIndex = index, neckPosition, neckIndex, joints, torso, neck, shoulder = null, cell = 0.5, soft = 3 }) {
  const { w, d, y0, top } = torso;
  const M = 10;
  const yr = [y0 - 6, top + 8];
  // 唔使揀向外嘅三角形：每條射線最外嗰個交點一定係外表面（殼喺膊頭／袖接駁位有啲三角形方向唔一致，揀咗會穿窿）
  const hf = (axis, sign, lo, hi, transform = null, pos = position, idx = index) => heightField(pos, idx, { axis, sign, min: lo, max: hi, cell, transform, cull: false });
  const F = hf('z', 1, [-w / 2 - M, yr[0]], [w / 2 + M, yr[1]]);
  const K = hf('z', 1, [-w / 2 - M, yr[0]], [w / 2 + M, yr[1]], (q) => [-q[0], q[1], -q[2]]);
  const SL = hf('x', 1, [-d / 2 - M, yr[0]], [d / 2 + M, yr[1]]);
  const SR = hf('x', -1, [-d / 2 - M, yr[0]], [d / 2 + M, yr[1]]);
  const T = hf('z', 1, [-w / 2 - M, -d / 2 - M], [w / 2 + M, d / 2 + M], (q) => [q[0], -q[2], q[1]], topPosition, topIndex);
  const N = neckField(neckPosition, neckIndex, { neck: joints.neck, head: joints.head, y0: top - 4, y1: top + 12, maxR: Math.max(neck.w, neck.d) * 0.85 });
  const band = (v, lo, hi, r = 1.5) => smooth01((v - lo + r) / r) * smooth01((hi - v + r) / r);
  const x0 = neck.w / 2;
  const zOff = joints.shoulderL ? joints.shoulderL[2] : 0;

  const sx = shoulder ? shoulder.box : w / 2;
  // 方塊：頸邊 x0 → 膊頭 shoulder.box；人台：頸底邊 rN → 膊頭 shoulder.body（人台頸底闊、膊頭窄，中間短好多）。
  // 離頸 2 cm 以內（衣領、旅巾圈）唔縮，再出就按比例縮（lateral 俾 scaleX 同頸嗰邊共用，兩邊對得上）
  const lateral = (t) => (t <= 2 ? t : 2 + (t - 2) * shrink);
  const scaleX = (x) => {
    if (!shoulder || Math.abs(x) <= x0) return x;
    return Math.sign(x) * (rN + lateral(Math.abs(x) - x0));
  };
  // 方塊面比人台嗰度闊（例如腰、膊頭前後）：中間一半唔郁，外面一截按比例收入人台輪廓（range）入面
  const squeeze = (q, half, range) => {
    if (!range) return q;
    const lim = q >= 0 ? range[1] - 0.4 : -range[0] - 0.4;
    const aq = Math.abs(q);
    if (lim >= half || aq <= half * 0.5) return q;
    const a = half * 0.5;
    const k = Math.max(0, (lim - a) / (half - a));
    return Math.sign(q) * Math.min(lim, a + (aq - a) * k);
  };
  // 前／後「面」嘅闊度：由中線向兩邊行，到表面退後超過 d × 0.35（已經轉咗去側面／腋下）就停
  // （行 rowRange 會連側面都計埋：女仔胸口向前，x 去到邊位前面表面其實係側面 / 背後）
  const faceCache = new Map();
  const faceRange = (Fd, key, y) => {
    const yk = Math.round(y * 2) / 2;
    const ck = key + yk;
    if (faceCache.has(ck)) return faceCache.get(ck);
    let ref = -Infinity;
    for (let x = -3; x <= 3; x += 0.5) ref = Math.max(ref, Fd.at(x, yk) ?? -Infinity);
    let out = null;
    if (ref > -Infinity) {
      const edge = (sg) => {
        let x = 0;
        while (Math.abs(x) < w / 2 + M - 1) {
          const f = Fd.at(x + sg * 0.5, yk);
          if (f === null || f < ref - d * 0.35) break;
          x += sg * 0.5;
        }
        return x;
      };
      out = [edge(-1), edge(1)];
    }
    faceCache.set(ck, out);
    return out;
  };
  // 前／後面每條直線（x）向上行到幾高仲係同一塊面（突然跳後 > 1.5 cm 即係過咗領口，見到後面衣領）
  const topCache = new Map();
  const faceTop = (Fd, key, x) => {
    const xk = Math.round(x * 2) / 2;
    const ck = key + xk;
    if (topCache.has(ck)) return topCache.get(ck);
    let y = top - 8, prev = Fd.at(xk, y);
    if (prev !== null) {
      while (y < top + 8) {
        const f = Fd.at(xk, y + 0.5);
        if (f === null || f < prev - 1.5) break;
        prev = f;
        y += 0.5;
      }
    }
    const out = prev === null ? null : y;
    topCache.set(ck, out);
    return out;
  };
  // 面上 (x, y) 嘅高度：過咗領口就用領口嗰點
  const faceAt = (Fd, key, x, y) => {
    const ft = faceTop(Fd, key, x);
    if (ft !== null && y > ft) return Fd.at(x, ft);
    return Fd.at(x, y);
  };
  const torsoMap = (x, y, z) => {
    const c = [];
    const vy = band(y, -Infinity, top, 1);
    const vx = band(x, -w / 2, w / 2, 2), vz = band(z, -d / 2, d / 2, 2);
    if (vy * vx > 1e-3) {
      c.push({ t: z - d / 2, v: vy * vx, fn: (t) => { const xx = squeeze(x, w / 2, faceRange(F, 'F', y)); const f = faceAt(F, 'F', xx, y); return f === null ? null : [xx, y, f + t]; } });
      c.push({ t: -z - d / 2, v: vy * vx, fn: (t) => { const xx = -squeeze(-x, w / 2, faceRange(K, 'K', y)); const f = faceAt(K, 'K', -xx, y); return f === null ? null : [xx, y, -(f + t)]; } });
    }
    // 側面：膊頂以上冇（嗰度係方塊袖頂，跟膊頂）
    const vs = band(y, -Infinity, top - 1, 1);
    if (vs * vz > 1e-3) {
      c.push({ t: x - w / 2, v: vs * vz, fn: (t) => { const zz = squeeze(z, d / 2, SL.rowRange(y)); const f = SL.at(zz, y); return f === null ? null : [f + t, y, zz]; } });
      c.push({ t: -x - w / 2, v: vs * vz, fn: (t) => { const zz = squeeze(z, d / 2, SR.rowRange(y)); const f = SR.at(zz, y); return f === null ? null : [-(f + t), y, zz]; } });
    }
    // 膊頂：方塊膊頭去到袖頂外邊（shoulder.box），人台膊頭窄啲（shoulder.body）— 由頸邊起按比例收返
    // 膊頂只管膊頂高度或以上嘅點（下面嘅歸前／後／側面；背後三角頂唔會俾膊頂斜面拉落衫入面）
    const vxs = band(x, -sx, sx, 2) * smooth01((y - top + 0.6) / 0.6);
    if (vxs * vz > 1e-3) {
      // 人台膊頭前後中線唔一定喺 z = 0（女仔身向前）：跟膊頭關節嘅 z
      const xs = scaleX(x);
      c.push({
        t: y - top,
        v: vxs * vz,
        fn: (t) => {
          // 前後：以膊頭關節為中心收入嗰度膊頭嘅前後範圍
          const cr = T.colRange(xs);
          const zs = cr ? zOff + squeeze(z, d / 2, [-cr[1] - zOff, -cr[0] - zOff]) : z + zOff;
          const f = T.at(xs, -zs);
          return f === null || f < top - 6 ? null : [xs, f + t, zs];
        },
      });
    }
    return blend(c);
  };
  const blend = (c0) => {
    // 冇表面資料（例如腋下、手臂嘅洞）嘅面唔計
    const c = [];
    for (const q of c0) {
      const m = q.fn(q.t);
      if (m) c.push({ ...q, m });
    }
    if (!c.length) return null;
    let tmax = -Infinity;
    for (const q of c) tmax = Math.max(tmax, q.t);
    let sw = 0;
    const out = [0, 0, 0];
    for (const q of c) {
      const wt = q.v * Math.exp(soft * (q.t - tmax));
      if (wt < 1e-4) continue;
      const m = q.m;
      out[0] += m[0] * wt;
      out[1] += m[1] * wt;
      out[2] += m[2] * wt;
      sw += wt;
    }
    return sw > 1e-6 ? { t: tmax, p: [out[0] / sw, out[1] / sw, out[2] / sw] } : null;
  };
  const rc = Math.min(neck.w, neck.d) * 0.3;
  // 頸底高度（每個角度）：頸外面 1.5 cm 嗰點嘅膊頂／心口面高度
  const BASE_SEG = 72;
  const base = new Float32Array(BASE_SEG);
  for (let s = 0; s < BASE_SEG; s++) {
    const th = (s / BASE_SEG) * Math.PI * 2;
    const r0 = N.at(th, top + 3) ?? neck.w / 2;
    const [cx, cz] = N.axisAt(top + 3);
    const f = T.at(cx + Math.sin(th) * (r0 + 1.5), -(cz + Math.cos(th) * (r0 + 1.5)));
    base[s] = f === null || f < top - 6 || f > top + 6 ? NaN : f;
  }
  for (let s = 0; s < BASE_SEG; s++) if (Number.isNaN(base[s])) base[s] = top;
  const smoothBase = base.map((_, s) => {
    let sum = 0;
    for (let q = -3; q <= 3; q++) sum += base[(s + q + BASE_SEG) % BASE_SEG];
    return sum / 7;
  });
  const baseAt = (th) => {
    let f = ((th / (Math.PI * 2)) * BASE_SEG) % BASE_SEG;
    if (f < 0) f += BASE_SEG;
    const s0 = Math.floor(f), k = f - s0;
    return smoothBase[s0] * (1 - k) + smoothBase[(s0 + 1) % BASE_SEG] * k;
  };
  // 人台頸底兩邊離中線幾遠
  const sideR = (th) => {
    const y = baseAt(th) + 0.5;
    const r = N.at(th, y);
    return r === null ? x0 : Math.abs(N.axisAt(y)[0] + Math.sin(th) * r);
  };
  const rN = (sideR(Math.PI / 2) + sideR(-Math.PI / 2)) / 2;
  const shrink = shoulder ? Math.max(0.2, (shoulder.body - rN - 2) / (shoulder.box - x0 - 2)) : 1;
  const neckMap = (x, y, z) => {
    // 圓角矩形 SDF
    const qx = Math.abs(x) - (neck.w / 2 - rc), qz = Math.abs(z) - (neck.d / 2 - rc);
    const t = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rc;
    const th = Math.atan2(x, z);
    // 方塊膊頂（top）→ 人台頸底（膊頭／心口同頸交界，前低後高），成條頸跟住上落
    const y2 = y + baseAt(th) - top;
    const yy = Math.max(y2, top - 3);
    const r = N.at(th, yy);
    if (r === null) return null;
    const [cx, cz] = N.axisAt(yy);
    // 向兩邊出（肩帶頭）同膊頂一樣按比例收窄，唔係肩帶喺頸邊會摺埋
    const sn = Math.sin(th), cs = Math.cos(th);
    // 前後一樣收窄啲（人台頸後面差唔多同背脊平，方塊頸後面離背脊 3–4 cm）
    const fb = t <= 2 ? t : 2 + (t - 2) * 0.5;
    const tt = t + (lateral(t) - t) * sn * sn + (fb - t) * cs * cs;
    return { t, p: [cx + sn * (r + tt), y2, cz + Math.cos(th) * (r + tt)] };
  };
  // 上身（衫面、膊頂）：旅巾尾、背後三角、肩帶、笛繩、專章帶、木章、章
  const warp = ([x, y, z], maxT = 2.5) => {
    const a = torsoMap(x, y, z);
    if (!a || a.t > maxT || a.t < -4) return [x, y, z];
    return a.p;
  };
  // 頸（衣領、旅巾圈）：圍住人台頸，跟頸底前低後高
  const neckWarp = ([x, y, z], maxT = 8) => {
    const n = neckMap(x, y, z);
    if (!n || n.t > maxT || n.t < -4) return warp([x, y, z], maxT);
    return n.p;
  };
  // 人台座標：點喺衫入面（前、後、左、右、膊頂五個方向都喺表面下面）就由最淺嗰個方向推出去表面 + off
  const pushOut = (p, off) => {
    const [x, y, z] = p;
    const c = [];
    const f = F.at(x, y), k = K.at(-x, y), l = SL.at(z, y), r = SR.at(z, y), tp = T.at(x, -z);
    // [深度, 軸, 方向, 尺度]：揀「深度 ÷ 嗰個方向半闊」最細嗰個（腋下推去側面，唔會推過去前面）
    // 前後只喺前／後「面」範圍內推；膊頂只推膊頂附近嘅點（腋下嘅點留喺手臂下面，唔會俾人推上膊頭／去前面）
    const inFace = (rg, q) => rg && q >= rg[0] - 0.5 && q <= rg[1] + 0.5;
    // 任何一個方向已經喺表面外面 → 唔使推（用齊所有方向判斷，唔理面嘅範圍）
    for (const [v, dpt] of [[f, f + off - z], [k, k + off + z], [l, l + off - x], [r, r + off + x], [tp, tp + off - y]]) if (v !== null && dpt <= 0) return p;
    if (f !== null && inFace(faceRange(F, 'F', y), x)) c.push([f + off - z, 2, 1, d / 2]);
    if (k !== null && inFace(faceRange(K, 'K', y), -x)) c.push([k + off + z, 2, -1, d / 2]);
    if (l !== null) c.push([l + off - x, 0, 1, w / 2]);
    if (r !== null) c.push([r + off + x, 0, -1, w / 2]);
    if (tp !== null && y > top - 4) c.push([tp + off - y, 1, 1, d / 2]);
    if (!c.length || c.some((q) => q[0] <= 0)) return p;
    let best = c[0];
    for (const q of c) if (q[0] / q[3] < best[0] / best[3]) best = q;
    const out = [x, y, z];
    out[best[1]] += best[2] * best[0];
    return out;
  };
  // 笛繩：方塊路線嘅轉角點逐點變形（變唔到嘅用前後點嘅位移插值）→ 再切細 → 每點推出衫面（唔會陷入衫入面斷開一截截）
  const route = (pts, off = 0.5, step = 1.2) => {
    const P = warpPolyline(pts, warp, 3);
    // 方塊入面好深嘅轉角、或者側面正中（腋下：喺手臂下面兜過去）：前後兩段唔推出（本來就收埋喺手臂下面）
    const deep = pts.map((p) => { const a = torsoMap(...p); return (!!a && a.t < -2) || (Math.abs(p[2]) < d / 4 && Math.abs(p[0]) >= w / 2 - 1 && p[1] < top - 4); });
    const out = [P[0]];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const hide = deep[i - 1] || deep[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
      for (let j = 1; j <= n; j++) {
        const q = [0, 1, 2].map((c) => a[c] + (b[c] - a[c]) * (j / n));
        out.push(hide ? q : pushOut(q, off));
      }
    }
    return out;
  };
  // 前面平放嘅嘢（旅巾前面兩條、領呔）：只用正面投影（x 收入前面範圍、z = 衫面 + t）；
  // 高過衫面嘅部分（頸前面）用嗰條直線最高有資料嗰點嘅 z — 唔會俾膊頂拉過去摺起
  const frontWarp = ([x, y, z], maxT = 8) => {
    const t = z - d / 2;
    if (t > maxT || t < -4) return [x, y, z];
    const xx = squeeze(x, w / 2, faceRange(F, 'F', y));
    const f = faceAt(F, 'F', xx, y);
    if (f === null) return warp([x, y, z], maxT);
    return [xx, y, f + t];
  };
  return { warp, neckWarp, frontWarp, snap: warp, route, pushOut, mesh: true, F, K, SL, SR, T, N, torsoMap, neckMap };
}

/**
 * v31：笛繩路線變形：逐點變形；變唔到嘅點（方塊袖頂前面、腋下 — 人台冇對應表面）用前後變到嘅點嘅位移線性插值，
 * 條繩唔會斷開一截截。
 */
export function warpPolyline(points, warp, maxT = 3) {
  const out = points.map((p) => warp(p, maxT));
  const ok = out.map((q, i) => q[0] !== points[i][0] || q[1] !== points[i][1] || q[2] !== points[i][2]);
  const d = out.map((q, i) => [q[0] - points[i][0], q[1] - points[i][1], q[2] - points[i][2]]);
  return points.map((p, i) => {
    if (ok[i]) return out[i];
    let a = i - 1, b = i + 1;
    while (a >= 0 && !ok[a]) a--;
    while (b < points.length && !ok[b]) b++;
    if (a < 0 && b >= points.length) return p;
    const da = a >= 0 ? d[a] : d[b], db = b < points.length ? d[b] : d[a];
    const k = a >= 0 && b < points.length ? (i - a) / (b - a) : 0;
    return [0, 1, 2].map((q) => p[q] + da[q] * (1 - k) + db[q] * k);
  });
}

/**
 * 將三角形切細（最長邊 > maxEdge 就喺中點一開二，最多 iters 輪），保留 groups（多材質方塊）同 position／normal／uv／color。
 * 輸入輸出都係 { attrs: { name: { array, itemSize } }, groups: [{ start, count, materialIndex }] }（非索引）。
 */
export function tessellate({ attrs, groups }, maxEdge = 1.5, iters = 6) {
  const names = Object.keys(attrs);
  const pos = attrs.position;
  const n = pos.array.length / 3;
  const G = groups.length ? groups : [{ start: 0, count: n, materialIndex: 0 }];
  const out = Object.fromEntries(names.map((k) => [k, []]));
  const outGroups = [];
  const m2 = maxEdge * maxEdge;
  for (const g of G) {
    // 每個三角形 = 每個屬性三組值
    let tris = [];
    for (let v = g.start; v < g.start + g.count; v += 3) {
      tris.push(names.map((k) => {
        const s = attrs[k].itemSize, a = attrs[k].array;
        return [0, 1, 2].map((j) => Array.from(a.subarray((v + j) * s, (v + j + 1) * s)));
      }));
    }
    const pi = names.indexOf('position');
    for (let it = 0; it < iters; it++) {
      const next = [];
      let split = false;
      for (const T of tris) {
        const P = T[pi];
        const e = [0, 1, 2].map((j) => {
          const a = P[j], b = P[(j + 1) % 3];
          return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
        });
        const j = e.indexOf(Math.max(...e));
        if (e[j] <= m2) { next.push(T); continue; }
        split = true;
        const mid = T.map((A) => A[j].map((c, q) => (c + A[(j + 1) % 3][q]) / 2));
        // 三角形 (a, b, c)，邊 j = (j, j+1) 中點 m → (j, m, j+2) 同 (m, j+1, j+2)
        const j1 = (j + 1) % 3, j2 = (j + 2) % 3;
        next.push(T.map((A, k) => [A[j], mid[k], A[j2]]));
        next.push(T.map((A, k) => [mid[k], A[j1], A[j2]]));
      }
      tris = next;
      if (!split) break;
    }
    const start = out.position.length / 3;
    for (const T of tris) names.forEach((k, ki) => { for (const v of T[ki]) out[k].push(...v); });
    outGroups.push({ start, count: out.position.length / 3 - start, materialIndex: g.materialIndex ?? 0 });
  }
  return {
    attrs: Object.fromEntries(names.map((k) => [k, { array: new Float32Array(out[k]), itemSize: attrs[k].itemSize }])),
    groups: groups.length ? outGroups : [],
  };
}
