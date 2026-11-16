// SCOUT3D v1.0 · © SCOUT SYSTEM
// v33（ADR-0030）：人台 = MakeHuman CC0 真人身體＋真衫褲（ffunch/vrm-avatar-maker 嘅素材，scripts/mannequin/build_mh.mjs bake 好姿勢）。
// 呢個檔只有純計算（冇 React）：展開有 UV 縫嘅 mesh、按「保留距離」幾何切衫（袖長、衫腳、褲腳）、揀邊啲身體三角形收埋。
import { REGION } from './mannequin.js';

/** 焊埋嘅頂點（welded）→ 有 UV 縫嘅渲染頂點（每個渲染頂點 = src[r]） */
export function expand(welded, src, itemSize = 3) {
  const out = new Float32Array(src.length * itemSize);
  for (let r = 0; r < src.length; r++) for (let k = 0; k < itemSize; k++) out[r * itemSize + k] = welded[src[r] * itemSize + k];
  return out;
}

/** Uint16 UV（0–65535）→ Float32 */
export function decodeUV(u16) {
  const out = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) out[i] = u16[i] / 65535;
  return out;
}

const ARM = new Set([REGION.upperarmL, REGION.upperarmR, REGION.lowerarmL, REGION.lowerarmR, REGION.handL, REGION.handR]);
const LEFT = new Set([REGION.upperarmL, REGION.lowerarmL, REGION.handL]);
export const armSideOf = (r) => (ARM.has(r) ? (LEFT.has(r) ? 'l' : 'r') : null);

/**
 * 每個頂點嘅「保留距離」（cm，正 = 留）。rules：
 *  top / bottom：y 上下限（null = 冇）；noArms：手臂區全部唔要；sleeve：{ frames, end: { l, r } }（沿手臂座標 y，手臂區頂點先計）。
 */
export function keepDistance(pos, regions, { top = null, bottom = null, sleeve = null, noArms = false }) {
  const n = pos.length / 3;
  const K = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = pos[i * 3 + 1];
    let k = 1e3;
    if (top !== null) k = Math.min(k, top - y);
    if (bottom !== null) k = Math.min(k, y - bottom);
    if (noArms && armSideOf(regions[i])) {
      K[i] = -1; // 褲、裙唔要手臂（件衫嘅長袖垂到褲頭下面）
      continue;
    }
    const side = sleeve && armSideOf(regions[i]);
    if (side) {
      const F = sleeve.frames[side];
      const along = F.toLocal([pos[i * 3], y, pos[i * 3 + 2]])[1];
      k = Math.min(k, along - sleeve.end[side]);
    }
    K[i] = k;
  }
  return K;
}

/**
 * 幾何切：沿 K = 0 將三角形切開（直邊，唔會一格格），K < 0 嗰邊唔要。
 * attrs = { position: [Float32Array, 3], normal: [.., 3], uv: [.., 2], … }（渲染頂點）；index = 三角形；K = 每個渲染頂點。
 * 回傳 { attrs（非 indexed）, count }。
 */
export function clipMesh(attrs, index, K) {
  const names = Object.keys(attrs);
  const out = Object.fromEntries(names.map((k) => [k, []]));
  const push = (i) => {
    for (const k of names) {
      const [a, s] = attrs[k];
      for (let q = 0; q < s; q++) out[k].push(a[i * s + q]);
    }
  };
  const pushLerp = (i, j) => {
    const t = K[i] / (K[i] - K[j]);
    for (const k of names) {
      const [a, s] = attrs[k];
      for (let q = 0; q < s; q++) out[k].push(a[i * s + q] + (a[j * s + q] - a[i * s + q]) * t);
    }
  };
  for (let f = 0; f < index.length; f += 3) {
    const v = [index[f], index[f + 1], index[f + 2]];
    const inside = v.map((i) => K[i] >= 0);
    const nIn = inside.filter(Boolean).length;
    if (nIn === 0) continue;
    if (nIn === 3) {
      v.forEach(push);
      continue;
    }
    // 轉到 v[0] 係「單獨」嗰個（nIn = 1：v0 喺入面；nIn = 2：v0 喺外面）
    const lone = inside.findIndex((x) => (nIn === 1 ? x : !x));
    const a = v[lone], b = v[(lone + 1) % 3], c = v[(lone + 2) % 3];
    if (nIn === 1) {
      push(a); pushLerp(a, b); pushLerp(a, c);
    } else {
      // 四邊形 b, c, ca, ab
      push(b); push(c); pushLerp(c, a);
      push(b); pushLerp(c, a); pushLerp(b, a);
    }
  }
  const res = {};
  for (const k of names) res[k] = [new Float32Array(out[k]), attrs[k][1]];
  return { attrs: res, count: res.position[0].length / 3 };
}

/** 沿法線推出去（cm）；mask(i) → 0–1 */
export function pushOut(pos, nrm, d, mask = null) {
  const out = Float32Array.from(pos);
  for (let i = 0; i < pos.length / 3; i++) {
    const m = mask ? mask(i) : 1;
    if (!m) continue;
    for (let k = 0; k < 3; k++) out[i * 3 + k] += nrm[i * 3 + k] * d * m;
  }
  return out;
}

/**
 * 身體收埋嘅三角形：件衫蓋住（hides）而且頂點喺切口入面 margin cm 以上先收（切短咗嘅衫唔會見窿）。
 * covers = [{ hides: Uint16Array, K: Float32Array（身體焊埋頂點嘅保留距離） }]
 * 回傳每個焊埋頂點 0／1。
 */
export function hiddenBody(nV, covers, margin = 2.5) {
  const hid = new Uint8Array(nV);
  for (const { hides, K } of covers) for (const v of hides) if (K[v] > margin) hid[v] = 1;
  return hid;
}

/** 渲染三角形：三個角都收埋先唔畫 */
export function visibleFaces(renderFaces, renderSrc, hid) {
  const out = [];
  for (let f = 0; f < renderFaces.length; f += 3) {
    const a = renderFaces[f], b = renderFaces[f + 1], c = renderFaces[f + 2];
    if (hid[renderSrc[a]] && hid[renderSrc[b]] && hid[renderSrc[c]]) continue;
    out.push(a, b, c);
  }
  return out.length > 65535 ? new Uint32Array(out) : new Uint16Array(out);
}

/** 一件 MakeHuman 嘢（衫、褲、裙、髮、鞋…）：推出去 out cm，按 K（焊埋頂點）切；extra = 每個焊埋頂點嘅額外屬性 */
export function cutItem(it, K, out = 0, extra = {}) {
  const p = out ? pushOut(it.pos, it.nrm, out) : it.pos;
  const attrs = { position: [expand(p, it.src), 3], normal: [expand(it.nrm, it.src), 3], uv: [it.uv, 2] };
  for (const [k, a] of Object.entries(extra)) attrs[k] = [expand(a, it.src, 1), 1];
  return clipMesh(attrs, it.faces, K ? expand(K, it.src, 1) : new Float32Array(it.src.length).fill(1));
}

/**
 * 恤衫層（同 shell() 一樣格式，俾 torsoGroups、heightField、bodyWarp 用）：真衫按袖長、衫腳切，推出 0.35 cm。
 * rule = keepDistance 嘅規則。回傳 { sh, isSleeve }。
 */
export function shirtLayer(suit, rule, out = 0.35) {
  const armW = Float32Array.from(suit.regions, (r) => (armSideOf(r) ? 1 : 0));
  const cs = cutItem(suit, keepDistance(suit.pos, suit.regions, rule), out, { arm: armW });
  const n = cs.count;
  const sh = { position: cs.attrs.position[0], normal: cs.attrs.normal[0], alpha: new Float32Array(n).fill(1), index: Array.from({ length: n }, (_, i) => i), uv2: cs.attrs.uv[0] };
  const arm = cs.attrs.arm[0];
  return { sh, isSleeve: (a, b, c) => arm[a] > 0.5 && arm[b] > 0.5 && arm[c] > 0.5 };
}

/** 讀返 build_mh.mjs 嘅一件嘢（ArrayBuffer 已經載入）：decode 位置、UV，計法線 */
export function decodeItem({ src, faces, uv, regions, pos, hides }, unit, decodePositions, vertexNormals) {
  const it = { src: new Uint16Array(src), faces: new Uint16Array(faces), uv: decodeUV(new Uint16Array(uv)), regions: new Uint8Array(regions), pos: decodePositions(new Int16Array(pos), unit), hides: hides ? new Uint16Array(hides) : null };
  const wf = new Uint16Array(it.faces.length);
  for (let i = 0; i < wf.length; i++) wf[i] = it.src[it.faces[i]];
  it.nrm = vertexNormals(it.pos, wf);
  return it;
}

/**
 * v33 第二輪：立體胸袋＋袋蓋（貼住恤衫正面高度圖 field）。pockets = [{ x, top, w, h, flap }]（cm，top = 袋頂 y）。
 * 袋身微微鼓起、四邊有袋邊；袋蓋中間尖（同恤衫貼圖一樣：中間低 1.2 cm）、厚 0.3、腳翹少少；鈕喺袋蓋尖。
 * uv = 方塊正面投影（box = { w, h, d, cy }），所以恤衫貼圖嘅袋線、鈕照樣對得上。回傳 { position, index, uv }（cm）。
 */
export function pocketGeometry(field, pockets, box, { thick = 0.2, puff = 0.3, flapT = 0.3, step = 0.5 } = {}) {
  const P = [], U = [], I = [];
  const uvOf = (x, y) => [(x + box.w / 2) / box.w, (y - box.cy + box.h / 2) / box.h];
  const base = (x, y) => field.at(x, y) ?? field.at(x, y - 1) ?? 0;
  const add = (x, y, z) => {
    P.push(x, y, z);
    U.push(...uvOf(x, y));
    return P.length / 3 - 1;
  };
  // 一塊格網（f(u, v) → [x, y, z]），加埋四邊落到 floor(x, y) 嘅牆
  const patch = (nu, nv, f, floor) => {
    const id = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) id.push(add(...f(i / nu, j / nv)));
    const at = (i, j) => id[j * (nu + 1) + i];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) I.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    // 邊：順住外圈（逆時針，由外面望），每段落牆
    const ring = [];
    for (let i = 0; i <= nu; i++) ring.push([i, 0]);
    for (let j = 1; j <= nv; j++) ring.push([nu, j]);
    for (let i = nu - 1; i >= 0; i--) ring.push([i, nv]);
    for (let j = nv - 1; j >= 1; j--) ring.push([0, j]);
    const down = ring.map(([i, j]) => {
      const q = at(i, j);
      const x = P[q * 3], y = P[q * 3 + 1];
      return add(x, y, floor(x, y));
    });
    for (let k = 0; k < ring.length; k++) {
      const a = at(...ring[k]), b = at(...ring[(k + 1) % ring.length]);
      const c = down[(k + 1) % ring.length], d = down[k];
      I.push(a, d, c, a, c, b);
    }
  };
  for (const q of pockets) {
    const x0 = q.x - q.w / 2, y0 = q.top - q.h;
    const nu = Math.max(4, Math.ceil(q.w / step)), nv = Math.max(4, Math.ceil(q.h / step));
    const bump = (x, y) => puff * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - x0) / q.w))) * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - y0) / q.h)));
    const body = (x, y) => base(x, y) + thick + bump(x, y);
    // 袋身：(u, v) → 由袋底（v = 0）到袋頂
    patch(nu, nv, (u, v) => {
      const x = x0 + u * q.w, y = y0 + v * q.h;
      return [x, y, body(x, y)];
    }, (x, y) => base(x, y) - 0.05);
    // 袋蓋：闊 0.4 cm、頂高過袋口 0.3 cm；底 = 中間低 1.2 cm 嘅尖
    const fw = q.w + 0.4, fx0 = q.x - fw / 2, ftop = q.top + 0.3;
    const fbot = (x) => q.top - q.flap - 1.2 * (1 - Math.min(1, Math.abs(x - q.x) / (fw / 2)));
    const fz = (x, y, v) => body(Math.min(Math.max(x, x0), x0 + q.w), Math.min(y, q.top)) + flapT + 0.15 * v;
    patch(Math.max(4, Math.ceil(fw / step)), 6, (u, v) => {
      const x = fx0 + u * fw;
      // v = 0 → 袋蓋底（尖）、1 → 頂
      const y = fbot(x) + (ftop - fbot(x)) * v;
      return [x, y, fz(x, y, 1 - v)];
    }, (x, y) => body(Math.min(Math.max(x, x0), x0 + q.w), Math.min(y, q.top)) - 0.02);
    // 鈕（袋蓋尖上面，1.4 cm，八邊形）
    const by = q.top - q.flap - 0.35, bz = fz(q.x, by, 0.9) + 0.12;
    const c = add(q.x, by, bz + 0.12);
    const rim = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      rim.push(add(q.x + 0.7 * Math.cos(a), by + 0.7 * Math.sin(a), bz));
    }
    for (let k = 0; k < 8; k++) I.push(c, rim[k], rim[(k + 1) % 8]);
  }
  return { position: new Float32Array(P), index: I, uv: new Float32Array(U) };
}

/**
 * v33 第二輪：裙褲（弓字褶）— 喺條真裙嘅表面壓入直摺：angles = 摺位（atan2(x, z)，0 = 正前），
 * 腰頭下 sewn cm 車死（冇摺），之後向下漸深去到 depth cm；V 形（闊 width cm）。回傳每個頂點嘅向入深度。
 */
export function pleatDepth(pos, { angles, top, sewn = 6, ramp = 6, depth = 0.9, width = 1.2, zc = 0 }) {
  const n = pos.length / 3;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2] - zc;
    const k = Math.min(1, Math.max(0, (top - sewn - y) / ramp));
    if (!k) continue;
    const r = Math.hypot(x, z) || 1;
    const th = Math.atan2(x, z);
    let best = Infinity;
    for (const a of angles) {
      let d = Math.abs(th - a) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      best = Math.min(best, d * r); // 弧長
    }
    const t = Math.max(0, 1 - best / width);
    out[i] = depth * k * t * t;
  }
  return out;
}

/**
 * v33 第二輪：旅巾圈跟真衫衣領。由衫嘅頂點（頸附近，離頸軸 < rMax）逐個角度（θ = atan2(dx, dz)，0 = 正前）量衣領頂 yt、
 * 衣領外半徑；圈中心 = 衣領頂（低 rollH × 0.15）、衣領（連翻領）外面 rollT × 0.45。回傳 ring(θ) → [x, y, z]。
 */
export function collarRing(pos, { axis, y0, y1, rMax, rollH = 2.4, rollT = 2.2, seg = 36 }) {
  const [ax, az] = axis;
  const bin = (x, z) => {
    let th = Math.atan2(x - ax, z - az);
    if (th < 0) th += Math.PI * 2;
    return Math.min(seg - 1, Math.floor((th / (Math.PI * 2)) * seg));
  };
  const yt = new Float32Array(seg).fill(-Infinity);
  const n = pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (y < y0 || y > y1 || Math.hypot(x - ax, z - az) > rMax) continue;
    const s = bin(x, z);
    if (y > yt[s]) yt[s] = y;
  }
  const fill = (A, bad) => {
    for (let pass = 0; pass < seg; pass++) {
      let ok = true;
      for (let s = 0; s < seg; s++) {
        if (!bad(A[s])) continue;
        const a = A[(s + seg - 1) % seg], b = A[(s + 1) % seg];
        if (!bad(a) && !bad(b)) A[s] = (a + b) / 2;
        else if (!bad(a)) A[s] = a;
        else if (!bad(b)) A[s] = b;
        else ok = false;
      }
      if (ok) break;
    }
  };
  const smooth = (A, k = 2) => {
    for (let it = 0; it < k; it++) {
      const B = Float32Array.from(A);
      for (let s = 0; s < seg; s++) A[s] = (B[(s + seg - 1) % seg] + 2 * B[s] + B[(s + 1) % seg]) / 4;
    }
  };
  fill(yt, (v) => v === -Infinity);
  smooth(yt, 6);
  const yr = yt.map((v) => v - rollH * 0.15); // 擱喺衣領頂（後面翻領會遮住低過領頂嘅嘢）
  const rr = new Float32Array(seg).fill(-Infinity);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const r = Math.hypot(x - ax, z - az);
    if (r > rMax) continue;
    const s = bin(x, z);
    if (y > yr[s] - 3.5 && y < yr[s] + 1.2 && r > rr[s]) rr[s] = r; // 包埋翻領（向外、低啲）
  }
  fill(rr, (v) => v === -Infinity);
  smooth(rr, 6);
  const ring = (th) => {
    let f = ((th / (Math.PI * 2)) * seg - 0.5) % seg;
    if (f < 0) f += seg;
    const s0 = Math.floor(f), k = f - s0, s1 = (s0 + 1) % seg;
    const y = yr[s0] * (1 - k) + yr[s1] * k;
    const r = rr[s0] * (1 - k) + rr[s1] * k + rollT * 0.45;
    return [ax + r * Math.sin(th), y, az + r * Math.cos(th)];
  };
  return { ring, yt, rr };
}

/**
 * 旅巾圈＋前面兩條（卷起）：由巾圈頂（穿著者左，s = +1）→ 頸邊 → 頸後 → 另一邊 → 巾圈頂（s = −1）。
 * ring：collarRing().ring；wog = [x, y, z] 巾圈頂中間；side = 頸邊轉落前面嘅角度；surfaceZ(x, y) → 衫前面 z（推出唔陷入）。
 * 橫切面 = 扁橢圓（高 rollH、厚 rollT × 0.8）。uv：u = 繞一圈（0–1）、v = 每邊由巾圈量起嘅長度 ÷ vLen。
 * 回傳 { position, uv, index, groups: [{ start, count, materialIndex: 0 | 1 }] }（0 = 穿著者左、1 = 右）。
 */
export function rollTube(ring, { wog, side = 1.15, rollH = 2.4, rollT = 2.2, surfaceZ = null, vLen = 20, ringSeg = 10, axis = [0, 0] }) {
  const path = (s) => {
    // s = +1：+x 邊。頸後中間 θ = π；頸邊 θ = s × side
    const pts = [];
    const ps = ring(s * side);
    const W = [wog[0] + s * 1.4, wog[1] + 1.0, wog[2]];
    // 頸邊嘅切線方向（向前、向下）
    const e = 0.05;
    const a = ring(s * (side - e));
    const tan = [a[0] - ps[0], a[1] - ps[1], a[2] - ps[2]].map((v) => v / e);
    const tl = Math.hypot(...tan) || 1;
    const dist = Math.hypot(W[0] - ps[0], W[1] - ps[1], W[2] - ps[2]);
    const c1 = ps.map((v, q) => v + (tan[q] / tl) * dist * 0.35);
    const c2 = [W[0] + s * 0.6, W[1] + dist * 0.35, W[2]];
    const nF = Math.max(6, Math.ceil(dist / 0.8));
    for (let i = 0; i <= nF; i++) {
      const t = i / nF, u = 1 - t;
      const p = [0, 1, 2].map((q) => u * u * u * W[q] + 3 * u * u * t * c2[q] + 3 * u * t * t * c1[q] + t * t * t * ps[q]);
      if (surfaceZ && i < nF) {
        const f = surfaceZ(p[0], p[1]);
        if (f !== null && f !== undefined && p[2] < f + rollT * 0.4) p[2] = f + rollT * 0.4;
      }
      pts.push(p);
    }
    // 頸邊 → 頸後
    const nB = 24;
    for (let i = 1; i <= nB; i++) pts.push(ring(s * (side + ((Math.PI - side) * i) / nB)));
    return pts;
  };
  const P = [], U = [], I = [], groups = [];
  for (const [g, s] of [[0, 1], [1, -1]]) {
    const pts = path(s);
    const start = I.length;
    const base = P.length / 3;
    let arc = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i) arc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const tl = Math.hypot(...T) || 1;
      T = T.map((v) => v / tl);
      // 向外 = 由頸軸水平向外，減去切線分量
      let O = [p[0] - axis[0], 0, p[2] - axis[1]];
      const od = O[0] * T[0] + O[2] * T[2];
      O = [O[0] - od * T[0], -od * T[1], O[2] - od * T[2]];
      const ol = Math.hypot(...O) || 1;
      O = O.map((v) => v / ol);
      const Bv = [T[1] * O[2] - T[2] * O[1], T[2] * O[0] - T[0] * O[2], T[0] * O[1] - T[1] * O[0]];
      for (let k = 0; k <= ringSeg; k++) {
        const ang = (k / ringSeg) * Math.PI * 2;
        const cu = Math.cos(ang) * rollT * 0.32, cv = Math.sin(ang) * rollH * 0.68; // 卷起嘅巾：扁身（約 3.3 × 1.4 cm）
        P.push(p[0] + O[0] * cu + Bv[0] * cv, p[1] + O[1] * cu + Bv[1] * cv, p[2] + O[2] * cu + Bv[2] * cv);
        U.push(k / ringSeg, arc / vLen);
      }
    }
    const R = ringSeg + 1;
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < ringSeg; k++) {
        const a = base + i * R + k, b = a + 1, c = a + R, d = c + 1;
        if (s > 0) I.push(a, c, b, b, c, d);
        else I.push(a, b, c, b, d, c);
      }
    }
    groups.push({ start, count: I.length - start, materialIndex: g });
  }
  return { position: new Float32Array(P), uv: new Float32Array(U), index: I, groups };
}
