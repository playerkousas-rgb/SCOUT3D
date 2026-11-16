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
