// SCOUT3D v1.0 · © SCOUT SYSTEM — garments sculpted from the body surface (offline bake).
//
// Our own shirt / trousers instead of fitted MakeHuman clothes: the garment is the body surface, cut
// cleanly by scalar fields (neck cylinder, hem plane, sleeve plane…), pushed out, relaxed and given a
// rim. Every edge and seam is therefore a known line — what badge placement needs ("2 cm below the
// shoulder seam", "0.5 cm above the sleeve hem").
//
// Mesh = { P, N, src, A, cut, T } — flat arrays. P positions, N normals, src = nearest base vertex (for
// skin weights later), A = per-vertex attributes (ATTR entries), cut = which field made the vertex
// (-1 = original), T = triangles.
import * as THREE from 'three';

export const ATTR = 5; // armL, armR, legL, legR, head (bone-weight membership)

/** Body surface (welded on base vertex indices) restricted to `keepTri`. */
export function bodySurface(P, N, tris, attrs, skin) {
  const m = { P: [], N: [], src: [], A: [], cut: [], T: [] };
  const map = new Map();
  const vid = (v) => {
    if (map.has(v)) return map.get(v);
    const i = m.src.length;
    map.set(v, i);
    m.P.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    m.N.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
    m.src.push(v);
    for (let k = 0; k < ATTR; k++) m.A.push(attrs[v * ATTR + k]);
    m.cut.push(-1);
    return i;
  };
  for (let t = 0; t < tris.length; t += 3) m.T.push(vid(tris[t]), vid(tris[t + 1]), vid(tris[t + 2]));
  m.skin = skin;
  m.B = [...m.P]; m.BN = [...m.N]; // the real body under the garment (keepOut measures from here)
  return m;
}

export const nV = (m) => m.src.length;
export const pos = (m, i) => new THREE.Vector3(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]);
export const nor = (m, i) => new THREE.Vector3(m.N[i * 3], m.N[i * 3 + 1], m.N[i * 3 + 2]);
const attr = (m, i) => m.A.slice(i * ATTR, i * ATTR + ATTR);

/**
 * Keep the part where field(mesh, i) >= 0. Triangles crossing the zero level are split exactly, so the
 * new edge is a clean iso-line. New vertices are tagged with `id` in `cut`.
 */
export function clip(m, field, id) {
  const n = nV(m), f = new Float64Array(n);
  for (let i = 0; i < n; i++) f[i] = field(m, i);
  const edgeV = new Map();
  const cutV = (a, b) => {
    const key = a < b ? a * 1e7 + b : b * 1e7 + a;
    if (edgeV.has(key)) return edgeV.get(key);
    const t = f[a] / (f[a] - f[b]);
    const i = nV(m);
    for (let k = 0; k < 3; k++) {
      m.P.push(m.P[a * 3 + k] + (m.P[b * 3 + k] - m.P[a * 3 + k]) * t);
      m.N.push(m.N[a * 3 + k] + (m.N[b * 3 + k] - m.N[a * 3 + k]) * t);
    }
    const nl = Math.hypot(m.N[i * 3], m.N[i * 3 + 1], m.N[i * 3 + 2]) || 1;
    for (let k = 0; k < 3; k++) m.N[i * 3 + k] /= nl;
    if (m.B) for (const key2 of ['B', 'BN']) for (let k = 0; k < 3; k++) m[key2].push(m[key2][a * 3 + k] + (m[key2][b * 3 + k] - m[key2][a * 3 + k]) * t);
    m.src.push(t < 0.5 ? m.src[a] : m.src[b]);
    for (let k = 0; k < ATTR; k++) m.A.push(m.A[a * ATTR + k] + (m.A[b * ATTR + k] - m.A[a * ATTR + k]) * t);
    m.cut.push(id);
    edgeV.set(key, i);
    return i;
  };
  const out = [];
  for (let t = 0; t < m.T.length; t += 3) {
    const v = [m.T[t], m.T[t + 1], m.T[t + 2]];
    const ins = v.map((x) => f[x] >= 0);
    const count = ins.filter(Boolean).length;
    if (count === 3) { out.push(...v); continue; }
    if (count === 0) continue;
    // Sutherland–Hodgman on one triangle, then fan.
    const poly = [];
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3];
      if (ins[k]) poly.push(a);
      if (ins[k] !== ins[(k + 1) % 3]) poly.push(cutV(a, b));
    }
    for (let k = 1; k + 1 < poly.length; k++) out.push(poly[0], poly[k], poly[k + 1]);
  }
  m.T = out;
  return compact(m);
}

/** Drop unused vertices. */
export function compact(m) {
  const used = new Int32Array(nV(m)).fill(-1);
  const o = { P: [], N: [], src: [], A: [], cut: [], T: [], skin: m.skin };
  if (m.B) { o.B = []; o.BN = []; }
  for (const v of m.T) {
    if (used[v] >= 0) continue;
    used[v] = o.src.length;
    o.P.push(m.P[v * 3], m.P[v * 3 + 1], m.P[v * 3 + 2]);
    o.N.push(m.N[v * 3], m.N[v * 3 + 1], m.N[v * 3 + 2]);
    o.src.push(m.src[v]);
    o.A.push(...attr(m, v));
    o.cut.push(m.cut[v]);
    if (m.B) { o.B.push(m.B[v * 3], m.B[v * 3 + 1], m.B[v * 3 + 2]); o.BN.push(m.BN[v * 3], m.BN[v * 3 + 1], m.BN[v * 3 + 2]); }
  }
  o.T = m.T.map((v) => used[v]);
  // Drop slivers left by cutting exactly through a vertex.
  const T = [];
  for (let t = 0; t < o.T.length; t += 3) {
    const a = pos(o, o.T[t]), b = pos(o, o.T[t + 1]), c = pos(o, o.T[t + 2]);
    if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-24) T.push(o.T[t], o.T[t + 1], o.T[t + 2]);
  }
  o.T = T;
  return o;
}

export function clone(m) {
  const o = { P: [...m.P], N: [...m.N], src: [...m.src], A: [...m.A], cut: [...m.cut], T: [...m.T], skin: m.skin };
  if (m.B) { o.B = [...m.B]; o.BN = [...m.BN]; }
  return o;
}

/** Boundary edges as [a, b, third] with the triangle's winding. */
export function boundary(m) {
  const count = new Map(), dir = new Map();
  for (let t = 0; t < m.T.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = m.T[t + k], b = m.T[t + (k + 1) % 3], c = m.T[t + (k + 2) % 3];
    const key = a < b ? a * 1e7 + b : b * 1e7 + a;
    count.set(key, (count.get(key) || 0) + 1);
    dir.set(key, [a, b, c]);
  }
  const out = [];
  for (const [key, c] of count) if (c === 1) out.push(dir.get(key));
  return out;
}

function neighbours(m) {
  const nb = Array.from({ length: nV(m) }, () => new Set());
  for (let t = 0; t < m.T.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = m.T[t + k], b = m.T[t + (k + 1) % 3];
    nb[a].add(b); nb[b].add(a);
  }
  return nb.map((s) => [...s]);
}

/** Face-area weighted vertex normals. */
export function recomputeNormals(m) {
  const acc = new Float64Array(m.P.length);
  for (let t = 0; t < m.T.length; t += 3) {
    const [ia, ib, ic] = [m.T[t], m.T[t + 1], m.T[t + 2]];
    const a = pos(m, ia), b = pos(m, ib).sub(a), c = pos(m, ic).sub(a);
    const nn = b.cross(c);
    for (const v of [ia, ib, ic]) { acc[v * 3] += nn.x; acc[v * 3 + 1] += nn.y; acc[v * 3 + 2] += nn.z; }
  }
  for (let v = 0; v < nV(m); v++) {
    const l = Math.hypot(acc[v * 3], acc[v * 3 + 1], acc[v * 3 + 2]) || 1;
    for (let k = 0; k < 3; k++) m.N[v * 3 + k] = acc[v * 3 + k] / l;
  }
}

/** Move every vertex out along its normal by d(i) metres. Keeps a copy of the body point in `B`. */
export function offset(m, d) {
  if (!m.B) { m.B = [...m.P]; m.BN = [...m.N]; }
  for (let i = 0; i < nV(m); i++) {
    const s = typeof d === 'function' ? d(m, i) : d;
    for (let k = 0; k < 3; k++) m.P[i * 3 + k] += m.N[i * 3 + k] * s;
  }
}

/**
 * Laplacian relax (removes anatomy: navel, ribs, knees). Boundary vertices only slide along the
 * boundary, so cut lines stay clean. `weight(i)` (0..1) scales the move.
 */
export function relax(m, iters, lambda = 0.5, weight = () => 1) {
  const nb = neighbours(m);
  const onB = new Uint8Array(nV(m)), bnb = Array.from({ length: nV(m) }, () => []);
  for (const [a, b] of boundary(m)) { onB[a] = onB[b] = 1; bnb[a].push(b); bnb[b].push(a); }
  for (let it = 0; it < iters; it++) {
    const P = [...m.P];
    for (let i = 0; i < nV(m); i++) {
      const list = onB[i] ? bnb[i] : nb[i];
      if (!list.length) continue;
      const w = lambda * weight(i);
      for (let k = 0; k < 3; k++) {
        let s = 0; for (const j of list) s += P[j * 3 + k];
        m.P[i * 3 + k] = P[i * 3 + k] + w * (s / list.length - P[i * 3 + k]);
      }
    }
  }
}

/**
 * Remove small bumps (nipples, navel rim): each vertex moves along its normal to the median height of
 * the surface within `radius`. Larger shapes (chest, belly) survive; only `select`ed vertices move.
 */
export function medianFlatten(m, radius, select = () => true) {
  const n = nV(m), r2 = radius * radius, move = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!select(m, i)) continue;
    const px = m.P[i * 3], py = m.P[i * 3 + 1], pz = m.P[i * 3 + 2], nx = m.N[i * 3], ny = m.N[i * 3 + 1], nz = m.N[i * 3 + 2];
    const h = [];
    for (let j = 0; j < n; j++) {
      const dx = m.P[j * 3] - px, dy = m.P[j * 3 + 1] - py, dz = m.P[j * 3 + 2] - pz;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      if (m.N[j * 3] * nx + m.N[j * 3 + 1] * ny + m.N[j * 3 + 2] * nz < 0.3) continue; // same side only
      h.push(dx * nx + dy * ny + dz * nz);
    }
    h.sort((a, b) => a - b);
    move[i] = Math.min(0, h[h.length >> 1]);
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) m.P[i * 3 + k] += m.N[i * 3 + k] * move[i];
}

/**
 * Morphological opening of the radial distance from a vertical axis (x = 0, z = axisZ): removes bumps
 * narrower than `radius` (chest mounds, nipples) while keeping broad shapes. Only `select`ed vertices.
 */
export function openRadial(m, radius, axisZ, select) {
  const n = nV(m), idx = [];
  for (let i = 0; i < n; i++) if (select(m, i)) idx.push(i);
  const r = new Map(idx.map((i) => [i, Math.hypot(m.P[i * 3], m.P[i * 3 + 2] - axisZ)]));
  const near = new Map();
  const r2 = radius * radius;
  for (const i of idx) {
    const list = [];
    for (const j of idx) {
      const dx = m.P[j * 3] - m.P[i * 3], dy = m.P[j * 3 + 1] - m.P[i * 3 + 1], dz = m.P[j * 3 + 2] - m.P[i * 3 + 2];
      if (dx * dx + dy * dy + dz * dz <= r2) list.push(j);
    }
    near.set(i, list);
  }
  const ero = new Map(idx.map((i) => [i, Math.min(...near.get(i).map((j) => r.get(j)))]));
  for (const i of idx) {
    const o = Math.max(...near.get(i).map((j) => ero.get(j)));
    const ri = r.get(i);
    if (o < ri && ri > 1e-6) { const s = o / ri; m.P[i * 3] *= s; m.P[i * 3 + 2] = axisZ + (m.P[i * 3 + 2] - axisZ) * s; }
  }
}

/** Never closer to the body than `min` metres (along the body normal). */
export function keepOut(m, min) {
  for (let i = 0; i < nV(m); i++) {
    const p = pos(m, i), b = new THREE.Vector3(m.B[i * 3], m.B[i * 3 + 1], m.B[i * 3 + 2]);
    const n = new THREE.Vector3(m.BN[i * 3], m.BN[i * 3 + 1], m.BN[i * 3 + 2]);
    const d = p.clone().sub(b).dot(n);
    const s = typeof min === 'function' ? min(m, i) : min;
    if (d < s) for (let k = 0; k < 3; k++) m.P[i * 3 + k] += n.getComponent(k) * (s - d);
  }
}

/**
 * Hang cloth straight down from its widest part: around `axis` (a point + direction), each vertex's
 * radial distance is pulled towards the largest radius seen above it (same angular bin).
 * select(i) -> strength 0..1 (0 = untouched).
 */
export function hang(m, { origin, dir, side = new THREE.Vector3(1, 0, 0), bins = 36, select, from = -Infinity }) {
  const d = dir.clone().normalize();
  const s0 = side.clone().sub(d.clone().multiplyScalar(side.dot(d))).normalize();
  const f0 = new THREE.Vector3().crossVectors(s0, d).normalize();
  const items = [];
  for (let i = 0; i < nV(m); i++) {
    const k = select(m, i);
    if (k <= 0) continue;
    const q = pos(m, i).sub(origin);
    const along = q.dot(d);
    const radial = q.clone().sub(d.clone().multiplyScalar(along));
    const r = radial.length();
    const phi = Math.atan2(radial.dot(s0), radial.dot(f0));
    items.push({ i, k, along, r, radial, b: Math.floor(((phi + Math.PI) / (2 * Math.PI)) * bins) % bins });
  }
  // "Above" = smaller `along` (dir points down the garment).
  items.sort((x, y) => x.along - y.along);
  const run = new Float64Array(bins).fill(0);
  for (const it of items) {
    if (it.along >= from) {
      const nbMax = Math.max(run[it.b], 0.985 * run[(it.b + 1) % bins], 0.985 * run[(it.b + bins - 1) % bins]);
      const target = Math.max(it.r, nbMax);
      const r = it.r + it.k * (target - it.r);
      if (it.r > 1e-6) {
        const p = it.radial.clone().multiplyScalar(r / it.r - 1);
        for (let k = 0; k < 3; k++) m.P[it.i * 3 + k] += p.getComponent(k);
      }
    }
    run[it.b] = Math.max(run[it.b], it.r);
  }
}

/**
 * Rim: a strip from each boundary edge back towards the body, so edges read as cloth thickness.
 * Uses its own copies of the edge vertices so the outer surface keeps smooth normals.
 */
export function rim(m, depth, skip = () => false) {
  const copies = new Map();
  const copy = (v, inward) => {
    const key = v * 2 + (inward ? 1 : 0);
    if (copies.has(key)) return copies.get(key);
    const i = nV(m);
    const NN = m.BN ?? m.N; // inward = towards the body
    for (let k = 0; k < 3; k++) m.P.push(m.P[v * 3 + k] - (inward ? NN[v * 3 + k] * depth : 0));
    if (m.B) { for (let k = 0; k < 3; k++) m.B.push(m.B[v * 3 + k]); for (let k = 0; k < 3; k++) m.BN.push(m.BN[v * 3 + k]); }
    m.N.push(m.N[v * 3], m.N[v * 3 + 1], m.N[v * 3 + 2]);
    m.src.push(m.src[v]); m.A.push(...attr(m, v)); m.cut.push(m.cut[v]);
    copies.set(key, i);
    return i;
  };
  const edges = boundary(m).filter(([a, b]) => !skip(a, b));
  const T = [];
  for (const [a, b] of edges) {
    const oa = copy(a, false), ob = copy(b, false), ia = copy(a, true), ib = copy(b, true);
    T.push(ob, oa, ia, ob, ia, ib);
  }
  m.T.push(...T);
}

/**
 * Extend the boundary loop made by cut `id` straight down (a hanging hem). radiusAt(p, drop) returns the
 * new point for a loop point p at `drop` metres below.
 */
export function extendDown(m, id, drops, place, isHem = (v) => m.cut[v] === id) {
  const edges = boundary(m).filter(([a, b]) => isHem(a) && isHem(b));
  const rowOf = new Map();
  const vtx = (v, k) => {
    const key = v * 16 + k;
    if (rowOf.has(key)) return rowOf.get(key);
    const q = place(pos(m, v), drops[k]);
    const i = nV(m);
    m.P.push(q.x, q.y, q.z); m.N.push(m.N[v * 3], m.N[v * 3 + 1], m.N[v * 3 + 2]);
    if (m.B) { m.B.push(q.x, q.y, q.z); m.BN.push(m.N[v * 3], m.N[v * 3 + 1], m.N[v * 3 + 2]); }
    m.src.push(m.src[v]); m.A.push(...attr(m, v)); m.cut.push(k === drops.length - 1 ? id : -1);
    rowOf.set(key, i);
    return i;
  };
  for (const [a, b] of edges) {
    let pa = a, pb = b;
    for (let k = 0; k < drops.length; k++) {
      const na = vtx(a, k), nb = vtx(b, k);
      m.T.push(pb, pa, na, pb, na, nb);
      pa = na; pb = nb;
    }
  }
  for (const v of new Set(edges.flatMap(([a, b]) => [a, b]))) m.cut[v] = -1;
}

/** Render arrays (positions, normals, indices). Normals are rebuilt from the final shape. */
export function toRender(m) {
  recomputeNormals(m);
  return { pos: Float32Array.from(m.P), nor: Float32Array.from(m.N), uv: new Float32Array(nV(m) * 2), idx: Uint32Array.from(m.T) };
}

export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
