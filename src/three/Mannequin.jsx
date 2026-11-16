// SCOUT3D v1.0 · © SCOUT SYSTEM
// 人台（v30 試做 B，ADR-0027；v31 定做第二款人形，ADR-0028）：Anny／MakeHuman CC0 身體＋衫褲殼＋同一套厘米章位。
// v31：帽跟人台個頭（headBox）；旅巾、衣領、領帶、木章、肩帶用 Warped 由方塊位置變形貼身（bodyWarp）；笛繩、專章帶直接貼。
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOURS as C, shoulderTip } from './body.js';
import { material, plain } from './pixels.js';
import { skinMaterial } from './Anatomy.jsx';
import { TorsoBadges, SleeveBadges } from './Badges.jsx';
import { MANNEQUIN_DIR, bodyKey, decodePositions, vertexNormals, shell, torsoGroups, heightField, meshSurface, garmentRules, skirtRings, REGION, headBox, bodyWarp, neckField, tessellate, inflateSmooth, hairRules } from './mannequin.js';
import { hairDrop } from './anatomy.js';

const cache = new Map();
function load(url, kind) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return kind === 'json' ? r.json() : r.arrayBuffer();
      }),
    );
  }
  return cache.get(url);
}

/** 載入人台（同一套拓撲：faces、regions 只載一次；身形按支部、性別） */
export function useMannequin(section, gender) {
  const key = bodyKey(section, gender);
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all([load(`${MANNEQUIN_DIR}index.json`, 'json'), load(`${MANNEQUIN_DIR}faces.bin`), load(`${MANNEQUIN_DIR}regions.bin`), load(`${MANNEQUIN_DIR}${key}.bin`)])
      .then(([index, f, r, b]) => {
        if (!live) return;
        const faces = new Uint16Array(f);
        const pos = decodePositions(new Int16Array(b), index.unit);
        setData({ key, faces, regions: new Uint8Array(r), pos, nrm: vertexNormals(pos, faces), body: index.bodies[key] });
      })
      .catch((e) => console.warn('mannequin', e));
    return () => {
      live = false;
    };
  }, [key]);
  return data && data.key === key ? data : null;
}

function alphaColour(alpha) {
  const c = new Float32Array(alpha.length * 4);
  for (let i = 0; i < alpha.length; i++) {
    c[i * 4] = c[i * 4 + 1] = c[i * 4 + 2] = 1;
    c[i * 4 + 3] = alpha[i];
  }
  return new THREE.BufferAttribute(c, 4);
}

function shellGeometry(sh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(sh.position, 3));
  g.setAttribute('color', alphaColour(sh.alpha));
  g.setAttribute('normal', new THREE.BufferAttribute(sh.normal, 3));
  g.setIndex(sh.index);
  return g;
}

function cloth(colour, painted, extra = {}) {
  const m = material(plain(4, 4, colour), { painted });
  m.vertexColors = true;
  m.alphaTest = 0.5;
  m.side = THREE.DoubleSide;
  Object.assign(m, extra);
  return m;
}

/**
 * 將一嚿 geometry（喺 rel 座標：Warped 組入面，cm）切細再逐點變形；法線用變形嘅 Jacobian（有限差分）轉。
 */
export function warpGeometry(src, rel, warp, maxT, maxEdge = 1.2) {
  const g0 = src.index ? src.toNonIndexed() : src;
  const attrs = {};
  for (const k of ['position', 'normal', 'uv']) {
    const a = g0.getAttribute(k);
    if (a) attrs[k] = { array: Float32Array.from(a.array), itemSize: a.itemSize };
  }
  if (g0 !== src) g0.dispose();
  // 去 Warped 座標
  const nm = new THREE.Matrix3().getNormalMatrix(rel);
  const v = new THREE.Vector3();
  const P = attrs.position.array;
  for (let i = 0; i < P.length; i += 3) {
    v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(rel);
    P[i] = v.x; P[i + 1] = v.y; P[i + 2] = v.z;
  }
  if (attrs.normal) {
    const Nn = attrs.normal.array;
    for (let i = 0; i < Nn.length; i += 3) {
      v.set(Nn[i], Nn[i + 1], Nn[i + 2]).applyMatrix3(nm).normalize();
      Nn[i] = v.x; Nn[i + 1] = v.y; Nn[i + 2] = v.z;
    }
  }
  const tg = tessellate({ attrs, groups: src.groups.map((q) => ({ ...q })) }, maxEdge);
  const Q = tg.attrs.position.array;
  const Nq = tg.attrs.normal?.array;
  const inv = rel.clone().invert();
  const ninv = new THREE.Matrix3().getNormalMatrix(inv);
  const e = 0.35; // 高度圖係雙線性：差分步長大啲，法線先順（唔會一格格）
  const W = (x, y, z) => warp([x, y, z], maxT);
  for (let i = 0; i < Q.length; i += 3) {
    const x = Q[i], y = Q[i + 1], z = Q[i + 2];
    const p = W(x, y, z);
    if (Nq) {
      const d = [0, 1, 2].map((k) => {
        const a = W(x + (k === 0 ? e : 0), y + (k === 1 ? e : 0), z + (k === 2 ? e : 0));
        const b = W(x - (k === 0 ? e : 0), y - (k === 1 ? e : 0), z - (k === 2 ? e : 0));
        return new THREE.Vector3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      });
      // n' ∝ (b×c) nx + (c×a) ny + (a×b) nz（J 嘅餘因子）
      const n = new THREE.Vector3()
        .addScaledVector(new THREE.Vector3().crossVectors(d[1], d[2]), Nq[i])
        .addScaledVector(new THREE.Vector3().crossVectors(d[2], d[0]), Nq[i + 1])
        .addScaledVector(new THREE.Vector3().crossVectors(d[0], d[1]), Nq[i + 2]);
      if (n.lengthSq() > 1e-12) n.normalize().applyMatrix3(ninv).normalize();
      else n.set(Nq[i], Nq[i + 1], Nq[i + 2]).applyMatrix3(ninv).normalize();
      Nq[i] = n.x; Nq[i + 1] = n.y; Nq[i + 2] = n.z;
    }
    v.set(p[0], p[1], p[2]).applyMatrix4(inv);
    Q[i] = v.x; Q[i + 1] = v.y; Q[i + 2] = v.z;
  }
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(tg.attrs)) out.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize));
  tg.groups.forEach((q) => out.addGroup(q.start, q.count, q.materialIndex));
  out.computeBoundingSphere();
  return out;
}

/**
 * 包住嘅 mesh 全部由「方塊公仔」位置變形去人台身上（每格畫面檢查：新 mesh／geometry 換咗／位置郁咗先重新計）。
 */
export function Warped({ warp, neckWarp = null, frontWarp = null, maxT = 8, children }) {
  const ref = useRef();
  const apply = () => {
    const root = ref.current;
    if (!root || !warp) return;
    root.updateWorldMatrix(true, true);
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const ud = o.userData;
      const rel = inv.clone().multiply(o.matrixWorld);
      // 祖先 group 有 userData.warp === 'neck'（衣領、旅巾圈）就用頸變形
      // 'front'（旅巾前面兩條）就只用正面投影
      let mode = null;
      for (let q = o; q && q !== root && !mode; q = q.parent) mode = q.userData?.warp ?? null;
      const fn = mode === 'neck' && neckWarp ? neckWarp : mode === 'front' && frontWarp ? frontWarp : warp;
      const key = rel.elements.map((x) => x.toFixed(3)).join(',');
      if (o.geometry === ud.warpOut && ud.warpKey === key && ud.warpFn === fn) return;
      const src = o.geometry === ud.warpOut ? ud.warpSrc : o.geometry;
      const out = warpGeometry(src, rel, fn, maxT);
      if (ud.warpOut) ud.warpOut.dispose();
      Object.assign(ud, { warpSrc: src, warpOut: out, warpKey: key, warpFn: fn });
      o.geometry = out;
    });
  };
  useLayoutEffect(apply);
  useFrame(apply);
  return <group ref={ref}>{children}</group>;
}

export default function Mannequin({ section, gender, L, painted, shirtFaces, sleeveColour, long, pantsColour, pantsHem, trousers, sockColour, sockTop, skirt = null, torsoItems, armItems, patchProps, selected, hats = null, warped = null, surfaced = null, outer = null, hair = null }) {
  const M = useMannequin(section, gender);
  const B = L.B;
  const t = B.torso;
  const built = useMemo(() => {
    if (!M) return null;
    const { pos, nrm, faces, regions, body } = M;
    const G = garmentRules({ pos, regions, joints: body.joints, L, long, sleeveLen: B.sleeve.len, pantsHem, trousers, sockTop, shoeTop: Math.max(5, B.shoe.h + 1), tucked: section !== 'grasshopper', tights: !!skirt, outer: outer && { bottom: outer.bottom, neckUp: outer.neckUp, sleeves: outer.sleeves, extra: outer.extra } });
    // 皮膚
    const skin = new THREE.BufferGeometry();
    skin.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    skin.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    skin.setIndex(new THREE.BufferAttribute(faces, 1));
    // 恤衫：上身用恤衫貼圖（上身方塊平面投影），袖素色
    const sh = shell(pos, nrm, faces, G.shirt.keep, G.shirt.offset);
    const armR = new Set([REGION.upperarmL, REGION.upperarmR, REGION.lowerarmL, REGION.lowerarmR]);
    const isSleeve = (a, b, c) => armR.has(regions[sh.src[a]]) && armR.has(regions[sh.src[b]]) && armR.has(regions[sh.src[c]]);
    const tg = torsoGroups(sh, { w: t.w, h: t.h, d: t.d, cy: t.y + t.h / 2 }, isSleeve);
    const shirt = new THREE.BufferGeometry();
    shirt.setAttribute('position', new THREE.BufferAttribute(tg.position, 3));
    shirt.setAttribute('uv', new THREE.BufferAttribute(tg.uv, 2));
    shirt.setAttribute('normal', new THREE.BufferAttribute(tg.normal, 3));
    shirt.setAttribute('color', alphaColour(tg.alpha));
    tg.groups.forEach((g) => shirt.addGroup(g.start, g.count, g.materialIndex));
    // v31 外衣（毛衣、背心、禮服外套）：恤衫外面再一層，用外衣方塊（同現有公仔一樣）投影貼圖；章、旅巾、笛繩貼外衣
    let layer = sh;
    let layerSleeve = isSleeve;
    let box = { w: t.w, d: t.d, y0: t.y, top: L.top };
    let outerGeo = null;
    if (outer && G.outer) {
      const os = shell(pos, nrm, faces, G.outer.keep, G.outer.offset);
      const isO = (a, b, c) => armR.has(regions[os.src[a]]) && armR.has(regions[os.src[b]]) && armR.has(regions[os.src[c]]);
      const og = torsoGroups(os, { w: outer.box[0], h: outer.box[1], d: outer.box[2], cy: outer.cy }, isO);
      outerGeo = new THREE.BufferGeometry();
      outerGeo.setAttribute('position', new THREE.BufferAttribute(og.position, 3));
      outerGeo.setAttribute('uv', new THREE.BufferAttribute(og.uv, 2));
      outerGeo.setAttribute('normal', new THREE.BufferAttribute(og.normal, 3));
      outerGeo.setAttribute('color', alphaColour(og.alpha));
      og.groups.forEach((g) => outerGeo.addGroup(g.start, g.count, g.materialIndex));
      layer = os;
      layerSleeve = isO;
      box = { w: outer.box[0], d: outer.box[2], y0: outer.bottom, top: outer.top };
    }
    // 章：上身由正面投影（只用上身部分，唔包袖）；袖由外側投影（手臂座標）
    const torsoIdx = [];
    for (let i = 0; i < layer.index.length; i += 3) if (!layerSleeve(layer.index[i], layer.index[i + 1], layer.index[i + 2])) torsoIdx.push(layer.index[i], layer.index[i + 1], layer.index[i + 2]);
    const front = heightField(layer.position, torsoIdx, { axis: 'z', min: [-box.w / 2 - 6, box.y0 - 2], max: [box.w / 2 + 6, box.top + 10] });
    const torsoSurf = meshSurface(front, { axis: 'z', plane: box.d / 2 });
    const sleeves = {};
    const sleeveLayer = outer && !outer.sleeves ? sh : layer; // 背心冇袖：章喺恤衫袖
    for (const side of ['l', 'r']) {
      const F = G.frames[side];
      const sg = side === 'l' ? 1 : -1;
      // 袖外側：成件衫（膊頭係上身部分）由手臂外面望入去，最外層 = 袖面
      const field = heightField(sleeveLayer.position, sleeveLayer.index, { axis: 'x', sign: sg, min: [-9, F.wristY - 2], max: [9, F.seamY + 6], transform: F.toLocal });
      sleeves[side] = { frame: F, surf: meshSurface(field, { axis: 'x', sign: sg, plane: B.sleeve.w / 2 }), matrix: new THREE.Matrix4().fromArray(F.matrix) };
    }
    const pants = shellGeometry(shell(pos, nrm, faces, G.pants.keep, G.pants.offset));
    const socks = sockTop > 0 ? shellGeometry(shell(pos, nrm, faces, G.socks.keep, G.socks.offset)) : null;
    // v31：鞋向外平滑（腳趾罅填平，唔再似黑色光腳）
    const shoes = shellGeometry(inflateSmooth(shell(pos, nrm, faces, G.shoes.keep, G.shoes.offset)));
    let skirtGeo = null;
    if (skirt) {
      const sk = skirtRings(pos, regions, { top: (B.waist ?? t.y + 3) + 2, hem: skirt.hem });
      skirtGeo = new THREE.BufferGeometry();
      skirtGeo.setAttribute('position', new THREE.BufferAttribute(sk.position, 3));
      skirtGeo.setAttribute('normal', new THREE.BufferAttribute(sk.normal, 3));
      skirtGeo.setIndex(sk.index);
    }
    // v31：方塊位置 → 人台嘅變形（旅巾、衣領、笛繩、專章帶…）。上身殼（唔包袖）；膊頂包埋袖同頸、上身皮膚；頸用頸、上身皮膚＋恤衫
    const nS = layer.position.length / 3;
    const both = new Float32Array(layer.position.length + pos.length);
    both.set(layer.position);
    both.set(pos, layer.position.length);
    const skinIdx = [];
    for (let f = 0; f < faces.length; f += 3) {
      const r0 = regions[faces[f]], r1 = regions[faces[f + 1]], r2 = regions[faces[f + 2]];
      // 皮膚：頸、上身、上臂（女仔頸區去到膊頭，恤衫殼嗰度有窿）；一個角喺呢啲區就要
      const ok = (r) => r === REGION.neck || r === REGION.torso || r === REGION.upperarmL || r === REGION.upperarmR;
      if (ok(r0) || ok(r1) || ok(r2)) skinIdx.push(faces[f] + nS, faces[f + 1] + nS, faces[f + 2] + nS);
    }
    const BW = bodyWarp({
      position: layer.position, index: torsoIdx,
      topPosition: both, topIndex: [...layer.index, ...skinIdx],
      neckPosition: both, neckIndex: [...torsoIdx, ...skinIdx],
      joints: body.joints, torso: box, neck: { w: B.neck.w, d: B.neck.d },
      shoulder: { box: shoulderTip(L) + 0.5, body: Math.abs(body.joints.shoulderL[0]) + 3 },
    });
    // 帽：人台個頭嘅「方塊」（位置、大細）＋真實半徑（由頭中軸水平射出去量；帽帶、軟帽貼頭皮）
    const hb = headBox(pos, regions);
    const headIdx = [];
    for (let f = 0; f < faces.length; f += 3) if (regions[faces[f]] === REGION.head && regions[faces[f + 1]] === REGION.head && regions[faces[f + 2]] === REGION.head) headIdx.push(faces[f], faces[f + 1], faces[f + 2]);
    const HF = neckField(pos, headIdx, { neck: [hb.cx, hb.top - hb.h, hb.z], head: [hb.cx, hb.top, hb.z], y0: hb.top - hb.h * 0.6, y1: hb.top - 0.5, maxR: hb.d });
    const cy = hb.y + hb.h / 2;
    // 眉：人台眼大約喺下巴同頭頂正中，眉再高 1.5 cm（軟帽膠邊離眉 2 cm）
    const head = { ...hb, key: `m:${M.key}`, brow: hb.y + hb.h * 0.5 + 1.5, radiusAt: (th, y) => HF.at(th, cy + y) ?? 0 };
    return { skin, shirt, outer: outerGeo, pants, socks, shoes, skirt: skirtGeo, torsoSurf, sleeves, warp: BW.warp, neckWarp: BW.neckWarp, frontWarp: BW.frontWarp, warpSurf: { snap: BW.warp, route: BW.route, mesh: true }, head };
  }, [M, L, long, pantsHem, trousers, sockTop, skirt?.hem, B.sleeve.len, B.shoe.h, t.w, t.h, t.d, t.y, outer?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // v31：頭髮 = 頭皮外面一層殼（髮腳同現有公仔一樣 hairDrop；戴帽就帽口以上冇頭髮）
  const hairGeo = useMemo(() => {
    if (!M || !hair || !built) return null;
    const { pos, nrm, faces, regions } = M;
    const hb = built.head;
    // 人台頂帽係跟眉擺（帽口離眉 2 cm；後面帽口高啲），人台個頭又高過方塊頭：戴帽就眉上 3 cm 以上收埋（唔會穿出帽、帽口下面唔會露頭皮）
    const cut = hair.hatCut > 0 ? Math.max(hair.hatCut, hb.top - hb.brow - 3) : 0;
    const R = hairRules({ pos, regions, head: hb, drop: (th) => hairDrop(th, hair.style, hb.h), hatCut: cut });
    // 人台個頭啲三角形大（1–2 cm）：切細到 0.5 cm，再加一撮撮由頭頂梳落嚟嘅坑紋同深淺（唔係一嚿黑色頭盔）
    const g0 = shellGeometry(shell(pos, nrm, faces, R.keep, R.offset));
    const g1 = g0.toNonIndexed();
    g0.dispose();
    const attrs = {};
    for (const k of ['position', 'normal', 'color']) {
      const a = g1.getAttribute(k);
      attrs[k] = { array: Float32Array.from(a.array), itemSize: a.itemSize };
    }
    g1.dispose();
    const tg = tessellate({ attrs, groups: [] }, 0.5);
    const P = tg.attrs.position.array, Nn = tg.attrs.normal.array, Cc = tg.attrs.color.array;
    // 灰色模式（未上色）：同現有公仔一樣灰色頭髮
    const dark = new THREE.Color(painted ? C.hair : '#6f7277'), hi = new THREE.Color(painted ? C.hairHi ?? C.hair : '#9a9da2');
    for (let i = 0, v = 0; i < P.length; i += 3, v += 4) {
      const th = Math.atan2(P[i] - hb.cx, P[i + 2] - hb.z);
      const fromTop = hb.top - P[i + 1];
      const swirl = th * 34 + fromTop * 0.5;
      const clump = Math.pow(Math.abs(Math.sin(swirl)), 0.6);
      const fine = 0.5 + 0.5 * Math.sin(th * 97 + fromTop * 3.1);
      const off = (0.22 * clump + 0.05 * fine) * Math.min(1, fromTop / 3, cut > 0 ? Math.max(0, (fromTop - cut) / 1.5) : 1);
      const n = Math.hypot(Nn[i], Nn[i + 1], Nn[i + 2]) || 1;
      for (let q = 0; q < 3; q++) P[i + q] += (Nn[i + q] / n) * off;
      const k = 0.25 + 0.75 * clump * (0.7 + 0.3 * fine);
      Cc[v] = dark.r + (hi.r - dark.r) * k;
      Cc[v + 1] = dark.g + (hi.g - dark.g) * k;
      Cc[v + 2] = dark.b + (hi.b - dark.b) * k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.BufferAttribute(Cc, 4));
    // 法線用切細時插值嘅（平滑），坑紋靠輪廓同深淺
    for (let i = 0; i < Nn.length; i += 3) {
      const n = Math.hypot(Nn[i], Nn[i + 1], Nn[i + 2]) || 1;
      Nn[i] /= n; Nn[i + 1] /= n; Nn[i + 2] /= n;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    return g;
  }, [M, built, hair?.style, hair?.hatCut, painted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => hairGeo?.dispose(), [hairGeo]);
  const hairMat = useMemo(() => cloth('#ffffff', painted, { roughness: 0.45, metalness: 0.05, normalMap: null }), [painted]);
  useEffect(() => () => hairMat.dispose(), [hairMat]);
  useEffect(() => () => built && ['skin', 'shirt', 'outer', 'pants', 'socks', 'shoes', 'skirt'].forEach((k) => built[k]?.dispose()), [built]);

  const mats = useMemo(() => {
    const shirtMats = shirtFaces.map((c) => {
      const m = material(c, { painted });
      m.vertexColors = true;
      m.alphaTest = 0.5;
      m.side = THREE.DoubleSide;
      return m;
    });
    shirtMats.push(cloth(sleeveColour, painted));
    const outerMats = outer
      ? [
          ...outer.faces.map((c) => {
            const m = material(c, { painted, alpha: true });
            m.vertexColors = true;
            m.alphaTest = 0.5;
            m.transparent = false;
            m.side = THREE.DoubleSide;
            return m;
          }),
          cloth(outer.sleeveColour, painted),
        ]
      : null;
    return {
      outer: outerMats,
      skin: skinMaterial(painted, true),
      shirt: shirtMats,
      pants: cloth(pantsColour, painted),
      socks: cloth(sockColour, painted),
      shoes: cloth(C.shoeBlack ?? '#1c1c20', painted, { roughness: 0.38, normalMap: null }),
      skirt: skirt ? cloth(skirt.colour, painted, { vertexColors: false, alphaTest: 0 }) : null,
    };
  }, [shirtFaces, sleeveColour, pantsColour, sockColour, painted, skirt?.colour, outer?.faces, outer?.sleeveColour]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => [mats.skin, ...mats.shirt, ...(mats.outer ?? []), mats.pants, mats.socks, mats.shoes, mats.skirt].forEach((m) => m?.dispose()), [mats]);

  if (!built) return null;
  return (
    <group name="SCOUT3D mannequin (Anny · MakeHuman CC0)">
      <mesh geometry={built.skin} material={mats.skin} castShadow receiveShadow />
      <mesh geometry={built.shirt} material={mats.shirt} castShadow receiveShadow />
      {built.outer && mats.outer && <mesh geometry={built.outer} material={mats.outer} castShadow receiveShadow />}
      <mesh geometry={built.pants} material={mats.pants} castShadow receiveShadow />
      {built.socks && <mesh geometry={built.socks} material={mats.socks} castShadow receiveShadow />}
      <mesh geometry={built.shoes} material={mats.shoes} castShadow receiveShadow />
      {built.skirt && mats.skirt && <mesh geometry={built.skirt} material={mats.skirt} castShadow receiveShadow />}
      {torsoItems.map((p) => (
        <TorsoBadges key={p.key} items={[p]} surf={built.torsoSurf} selected={selected === p.id} {...patchProps} />
      ))}
      {hairGeo && <mesh geometry={hairGeo} material={hairMat} castShadow receiveShadow />}
      {hats && hats({ ...B, head: built.head })}
      {warped && (
        <Warped warp={built.warp} neckWarp={built.neckWarp} frontWarp={built.frontWarp}>
          {warped}
        </Warped>
      )}
      {surfaced && surfaced(built.warpSurf)}
      {['l', 'r'].map((side) => {
        const S = built.sleeves[side];
        return (
          <group key={side} matrixAutoUpdate={false} matrix={S.matrix}>
            {armItems(side).map((p) => (
              <SleeveBadges key={p.key} items={[p]} side={side} sleeveW={B.sleeve.w} sleeveD={B.sleeve.d} seamY={S.frame.seamY} surf={S.surf} selected={selected === p.id} {...patchProps} />
            ))}
          </group>
        );
      })}
    </group>
  );
}
