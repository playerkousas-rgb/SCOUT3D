// SCOUT3D v1.0 · © SCOUT SYSTEM
// 人台（v30 試做 B，ADR-0027；v31 定做第二款人形，ADR-0028；v33 換做 MakeHuman 真人＋真衫褲，ADR-0030）＋同一套厘米章位。
// v31：帽跟人台個頭（headBox）；旅巾、衣領、領帶、木章、肩帶用 Warped 由方塊位置變形貼身（bodyWarp）；笛繩、專章帶直接貼。
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOURS as C, shoulderTip } from './body.js';
import { material, plain } from './pixels.js';
import { skinMaterial } from './Anatomy.jsx';
import { TorsoBadges, SleeveBadges } from './Badges.jsx';
import { MANNEQUIN_DIR, bodyKey, decodePositions, vertexNormals, shell, torsoGroups, heightField, meshSurface, garmentRules, REGION, headBox, bodyWarp, neckField, tessellate, clothify, beltRing } from './mannequin.js';
import { expand, decodeUV, keepDistance, pushOut, hiddenBody, visibleFaces, armSideOf, cutItem, shirtLayer, decodeItem, pocketGeometry, pleatDepth, collarRing, rollTube } from './mh.js';

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

/** 載入人台（同一套拓撲：faces、regions 只載一次；身形按支部、性別）
 * v33：MakeHuman 真人身體（有 UV 縫嘅渲染版本＋皮膚貼圖）＋真衫褲、頭髮、鞋、眼、眉（每個身形 bake 好姿勢） */
export function useMannequin(section, gender) {
  const key = bodyKey(section, gender);
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    const D = MANNEQUIN_DIR;
    Promise.all([load(`${D}index.json`, 'json'), load(`${D}faces.bin`), load(`${D}regions.bin`), load(`${D}${key}.bin`), load(`${D}body_render_src.bin`), load(`${D}body_render_faces.bin`), load(`${D}body_uv.bin`)])
      .then(async ([index, f, r, b, rs, rf, uv]) => {
        const body = index.bodies[key];
        const items = {};
        await Promise.all(
          body.items.map(async (k) => {
            const [src, fc, iuv, reg, ip, hides] = await Promise.all([load(`${D}${k}_src.bin`), load(`${D}${k}_faces.bin`), load(`${D}${k}_uv.bin`), load(`${D}${k}_regions.bin`), load(`${D}${key}_${k}.bin`), index.items[k].hides ? load(`${D}${k}_hides.bin`) : null]);
            items[k] = decodeItem({ src, faces: fc, uv: iuv, regions: reg, pos: ip, hides }, index.unit, decodePositions, vertexNormals);
          }),
        );
        if (!live) return;
        const faces = new Uint16Array(f);
        const pos = decodePositions(new Int16Array(b), index.unit);
        const render = { src: new Uint16Array(rs), faces: new Uint16Array(rf), uv: decodeUV(new Uint16Array(uv)) };
        setData({ key, faces, regions: new Uint8Array(r), pos, nrm: vertexNormals(pos, faces), body, items, render });
      })
      .catch((e) => console.warn('mannequin', e));
    return () => {
      live = false;
    };
  }, [key]);
  return data && data.key === key ? data : null;
}

// v33 貼圖（皮膚、眼、髮、眉、衫褲鞋摺痕明暗）：灰階圖用線性（乘返顏色）
const texCache = new Map();
function mhTex(name, srgb = false, fill = '#ffffff') {
  if (!texCache.has(name)) {
    // 未載完先用一格底色（唔會一陣黑色皮膚／黑色衫）
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (c) {
      c.width = c.height = 1;
      const g = c.getContext('2d');
      g.fillStyle = fill;
      g.fillRect(0, 0, 1, 1);
    }
    const t = new THREE.Texture(c ?? undefined);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = !!c;
    new THREE.TextureLoader().load(`${MANNEQUIN_DIR}tex/${name}`, (img) => {
      // v33 第二輪：WebGL2 貼圖儲存（texStorage2D）大小固定 — 1×1 底色已上咗 GPU 就要先 dispose，先可以換大圖
      // （唔係女仔（後載）會一直用底色：光頭、皮膚冇紋理）
      t.dispose();
      t.image = img.image;
      t.needsUpdate = true;
    });
    texCache.set(name, t);
  }
  return texCache.get(name);
}

/** 喺原有材質（例如恤衫方塊貼圖：袋、鈕、肩章）上面再乘真衫嘅摺痕明暗（geometry 要有 uvShade） */
function shaded(m, tex) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.shadeMap = { value: tex };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 uvShade;\nvarying vec2 vShade;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvShade = uvShade;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D shadeMap;\nvarying vec2 vShade;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= texture2D(shadeMap, vShade).rgb;');
  };
  m.customProgramCacheKey = () => 'scout3d-shade';
  return m;
}

/** 真衫褲：切好嘅 attrs → BufferGeometry（uv → uvShade） */
function clippedGeometry(c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(c.attrs.position[0], 3));
  g.setAttribute('normal', new THREE.BufferAttribute(c.attrs.normal[0], 3));
  if (c.attrs.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(c.attrs.uv[0], 2));
    g.setAttribute('uvShade', new THREE.BufferAttribute(c.attrs.uv[0], 2));
  }
  return g;
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

export default function Mannequin({ section, gender, L, painted, shirtFaces, sleeveColour, long, pantsColour, pantsHem, trousers, sockColour, sockTop, skirt = null, belt = false, torsoItems, armItems, patchProps, selected, hats = null, warped = null, surfaced = null, outer = null, hair = null, pockets = false, neckRoll = null, shoeColour = C.shoeBlack }) {
  const M = useMannequin(section, gender);
  const B = L.B;
  const t = B.torso;
  const built = useMemo(() => {
    if (!M) return null;
    const { pos, nrm, faces, regions, body, items, render } = M;
    const tucked = section !== 'grasshopper';
    // v33：腰（褲頭／裙頭）跟真人身（大髀關節上面），唔再跟方塊公仔
    const waist = body.waist;
    const shirtBottom = tucked ? waist : waist - 9; // 小童軍唔塞：衫腳蓋過褲頭
    const G = garmentRules({ pos, regions, joints: body.joints, L, long, sleeveLen: B.sleeve.len, pantsHem, trousers, sockTop, shoeTop: Math.max(5, B.shoe.h + 1), tucked, tights: !!skirt, outer: outer && { bottom: outer.bottom, neckUp: outer.neckUp, sleeves: outer.sleeves, extra: outer.extra } });
    const frames = G.frames;
    const armR = new Set([REGION.upperarmL, REGION.upperarmR, REGION.lowerarmL, REGION.lowerarmR]);
    const sleeveEnd = { l: long ? frames.l.wristY + 1.5 : frames.l.seamY - B.sleeve.len, r: long ? frames.r.wristY + 1.5 : frames.r.seamY - B.sleeve.len };
    const shirtRule = { bottom: shirtBottom, sleeve: { frames, end: sleeveEnd } };
    const culottes = !!skirt?.pleats?.length;
    const pantsRule = { top: shirtBottom, bottom: pantsHem, noArms: true };
    const skirtRule = skirt && { top: waist + 0.5, bottom: skirt.hem, noArms: true };
    const shoeTop = body.joints.ankleL[1] + 2.5;
    // 皮膚：MakeHuman 渲染 mesh（有 UV 縫）＋貼圖；件衫入面嗰啲三角形收埋（衫切短咗嘅位照畫）
    const suit = items.shirt;
    const covers = [];
    if (suit?.hides) {
      const Ks = keepDistance(pos, regions, shirtRule);
      const Kp = keepDistance(pos, regions, pantsRule);
      const K = skirt ? Ks : Ks.map((k, i) => Math.max(k, Kp[i]));
      covers.push({ hides: suit.hides, K });
    }
    if (skirt && items.skirt?.hides) covers.push({ hides: items.skirt.hides, K: keepDistance(pos, regions, skirtRule) });
    if (items.shoes?.hides) covers.push({ hides: items.shoes.hides, K: keepDistance(pos, regions, { top: shoeTop }) });
    const hid = hiddenBody(pos.length / 3, covers);
    const skin = new THREE.BufferGeometry();
    skin.setAttribute('position', new THREE.BufferAttribute(expand(pos, render.src), 3));
    skin.setAttribute('normal', new THREE.BufferAttribute(expand(nrm, render.src), 3));
    skin.setAttribute('uv', new THREE.BufferAttribute(render.uv, 2));
    skin.setIndex(new THREE.BufferAttribute(visibleFaces(render.faces, render.src, hid), 1));
    // 恤衫：真衫（有領、有袖、有摺痕）按袖長、衫腳切；上身照用恤衫方塊貼圖（袋、鈕、肩章），再乘真衫明暗
    const { sh, isSleeve } = shirtLayer(suit, shirtRule);
    const tg = torsoGroups(sh, { w: t.w, h: t.h, d: t.d, cy: t.y + t.h / 2 }, isSleeve, { plainOutside: true });
    const shirt = new THREE.BufferGeometry();
    shirt.setAttribute('position', new THREE.BufferAttribute(tg.position, 3));
    shirt.setAttribute('uv', new THREE.BufferAttribute(tg.uv, 2));
    shirt.setAttribute('uvShade', new THREE.BufferAttribute(tg.uv2, 2));
    shirt.setAttribute('normal', new THREE.BufferAttribute(tg.normal, 3));
    shirt.setAttribute('color', alphaColour(tg.alpha));
    tg.groups.forEach((g) => shirt.addGroup(g.start, g.count, g.materialIndex));
    // v31 外衣（毛衣、背心、禮服外套）：恤衫外面再一層，用外衣方塊（同現有公仔一樣）投影貼圖；章、旅巾、笛繩貼外衣
    let layer = sh;
    let layerSleeve = isSleeve;
    let box = { w: t.w, d: t.d, y0: t.y, top: L.top };
    let outerGeo = null;
    if (outer && G.outer) {
      const os = clothify(shell(pos, nrm, faces, G.outer.keep, (i) => G.outer.offset(i) + 0.8), { smooth: 8, lift: 0.25 });
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
    const frontOpts = { axis: 'z', min: [-box.w / 2 - 6, box.y0 - 2], max: [box.w / 2 + 6, box.top + 10] };
    let front = heightField(layer.position, torsoIdx, frontOpts);
    // v33 第二輪：立體胸袋＋袋蓋（貼真衫；章、笛繩跟住袋面）
    let pocketGeo = null;
    let frontPos = layer.position;
    let frontIdx = torsoIdx;
    if (pockets && B.pocket && !outer) {
      const Q = B.pocket;
      const pg = pocketGeometry(front, [1, -1].map((sg) => ({ x: sg * Q.x, top: t.y + t.h - Q.top, w: Q.w, h: Q.h, flap: Q.flap })), { w: t.w, h: t.h, d: t.d, cy: t.y + t.h / 2 });
      const nL = layer.position.length / 3;
      frontPos = new Float32Array(layer.position.length + pg.position.length);
      frontPos.set(layer.position);
      frontPos.set(pg.position, layer.position.length);
      frontIdx = [...torsoIdx, ...pg.index.map((i) => i + nL)];
      front = heightField(frontPos, frontIdx, frontOpts);
      pocketGeo = new THREE.BufferGeometry();
      pocketGeo.setAttribute('position', new THREE.BufferAttribute(pg.position, 3));
      pocketGeo.setAttribute('uv', new THREE.BufferAttribute(pg.uv, 2));
      pocketGeo.setIndex(pg.index);
      pocketGeo.computeVertexNormals();
    }
    const torsoSurf = meshSurface(front, { axis: 'z', plane: box.d / 2 });
    const sleeves = {};
    const sleeveLayer = outer && !outer.sleeves ? sh : layer; // 背心冇袖：章喺恤衫袖
    for (const side of ['l', 'r']) {
      const F = frames[side];
      const sg = side === 'l' ? 1 : -1;
      const field = heightField(sleeveLayer.position, sleeveLayer.index, { axis: 'x', sign: sg, min: [-9, F.wristY - 2], max: [9, F.seamY + 6], transform: F.toLocal });
      sleeves[side] = { frame: F, surf: meshSurface(field, { axis: 'x', sign: sg, plane: B.sleeve.w / 2 }), matrix: new THREE.Matrix4().fromArray(F.matrix) };
    }
    // 褲：真褲（同件衫一齊嗰條牛仔褲）由褲頭切到褲腳；褲頭位推出少少（似褲頭）
    let pants = null;
    let tights = null;
    if (!skirt) {
      const top = shirtBottom;
      const pp = pushOut(suit.pos, suit.nrm, 0.35, (i) => 1 + Math.max(0, Math.min(1, (suit.pos[i * 3 + 1] - (top - 3.5)) / 1.5)) * 0.6);
      pants = clippedGeometry(cutItem({ ...suit, pos: pp }, keepDistance(suit.pos, suit.regions, pantsRule)));
    } else if (!culottes) {
      // 半截裙：肉色絲襪（貼身，由身體推出）
      tights = shellGeometry(clothify(shell(pos, nrm, faces, G.pants.keep, (i) => 0.08), { thick: 0.1, band: 0, lift: 0 }));
    }
    let skirtGeo = null;
    if (skirt && items.skirt) {
      const S = items.skirt;
      // 條裙（.mhclo）兩腳之間會拉低一個尖：裙腳最低去到兩側嘅裙腳
      let side = Infinity;
      for (let i = 0; i < S.pos.length / 3; i++) if (Math.abs(S.pos[i * 3]) > 6 && !armSideOf(S.regions[i])) side = Math.min(side, S.pos[i * 3 + 1]);
      const rule = { ...skirtRule, bottom: Math.max(skirt.hem, side === Infinity ? -1e3 : side + 0.3) };
      const c = cutItem(S, keepDistance(S.pos, S.regions, rule), 0.4);
      if (culottes) {
        // v33 第二輪：裙褲 = 真裙＋前後各兩條弓字直摺（腰頭下 6 cm 車死，向下漸深）；摺入面深色啲
        const tg = tessellate({ attrs: Object.fromEntries(Object.entries(c.attrs).map(([k, [a, n]]) => [k, { array: a, itemSize: n }])), groups: [] }, 0.6);
        const P = tg.attrs.position.array, Nn = tg.attrs.normal.array;
        let zs = 0, zn = 0;
        for (let i = 0; i < P.length; i += 3) if (P[i + 1] < waist - 6 && P[i + 1] > waist - 14) { zs += P[i + 2]; zn++; }
        const depth = 1.1;
        const d = pleatDepth(P, { angles: skirt.pleats, top: waist + 0.5, depth, width: 1.1, zc: zn ? zs / zn : 0 });
        const col = new Float32Array((P.length / 3) * 3);
        for (let i = 0; i < d.length; i++) {
          const nl = Math.hypot(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]) || 1;
          for (let q = 0; q < 3; q++) P[i * 3 + q] -= (Nn[i * 3 + q] / nl) * d[i];
          const q = d[i] / depth;
          const k = 1 - 0.25 * Math.sqrt(q) - 0.35 * q ** 3; // 摺入面暗少少、摺線（最深）一條深色
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
        }
        skirtGeo = clippedGeometry({ attrs: Object.fromEntries(Object.entries(tg.attrs).map(([k, v]) => [k, [v.array, v.itemSize]])) });
        skirtGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      } else skirtGeo = clippedGeometry(c);
    }
    const socks = sockTop > 0 ? shellGeometry(clothify(shell(pos, nrm, faces, G.socks.keep, G.socks.offset), { thick: 0.15, band: 2, lift: 0.12 })) : null;
    const shoes = items.shoes ? clippedGeometry(cutItem(items.shoes, keepDistance(items.shoes.pos, items.shoes.regions, { top: shoeTop }), 0.1)) : null;
    // 皮帶（幼童軍）：褲頭外面
    let beltGeo = null;
    let buckle = null;
    if (belt && !(outer && outer.bottom < waist + 1.6)) {
      const src = skirtGeo ?? pants;
      if (src) {
        const P = src.getAttribute('position').array;
        const br = beltRing(P, { top: waist + 0.6, h: 3, ease: 0.35 });
        if (br) {
          beltGeo = new THREE.BufferGeometry();
          beltGeo.setAttribute('position', new THREE.BufferAttribute(br.position, 3));
          beltGeo.setAttribute('normal', new THREE.BufferAttribute(br.normal, 3));
          beltGeo.setIndex(br.index);
          buckle = br.buckle;
        }
      }
    }
    // 方塊位置 → 人台嘅變形（旅巾、衣領、笛繩、專章帶…）
    const nS = layer.position.length / 3;
    const both = new Float32Array(layer.position.length + pos.length);
    both.set(layer.position);
    both.set(pos, layer.position.length);
    const skinIdx = [];
    for (let f = 0; f < faces.length; f += 3) {
      const r0 = regions[faces[f]], r1 = regions[faces[f + 1]], r2 = regions[faces[f + 2]];
      const ok = (r) => r === REGION.neck || r === REGION.torso || r === REGION.upperarmL || r === REGION.upperarmR;
      if (ok(r0) || ok(r1) || ok(r2)) skinIdx.push(faces[f] + nS, faces[f + 1] + nS, faces[f + 2] + nS);
    }
    const BW = bodyWarp({
      position: frontPos, index: frontIdx,
      topPosition: both, topIndex: [...layer.index, ...skinIdx],
      neckPosition: both, neckIndex: [...torsoIdx, ...skinIdx],
      joints: body.joints, torso: box, neck: { w: B.neck.w, d: B.neck.d },
      shoulder: { box: shoulderTip(L) + 0.5, body: Math.abs(body.joints.shoulderL[0]) + 3 },
    });
    // 帽：人台個頭嘅「方塊」＋真實半徑
    const hb = headBox(pos, regions);
    const headIdx = [];
    for (let f = 0; f < faces.length; f += 3) if (regions[faces[f]] === REGION.head && regions[faces[f + 1]] === REGION.head && regions[faces[f + 2]] === REGION.head) headIdx.push(faces[f], faces[f + 1], faces[f + 2]);
    const HF = neckField(pos, headIdx, { neck: [hb.cx, hb.top - hb.h, hb.z], head: [hb.cx, hb.top, hb.z], y0: hb.top - hb.h * 0.6, y1: hb.top - 0.5, maxR: hb.d });
    const cy = hb.y + hb.h / 2;
    const head = { ...hb, key: `m:${M.key}`, brow: hb.y + hb.h * 0.5 + 1.5, radiusAt: (th, y) => HF.at(th, cy + y) ?? 0 };
    // 眼、眉、眼睫毛
    const face = ['eyes', 'brows', 'lashes'].filter((k) => items[k]).map((k) => [k, clippedGeometry(cutItem(items[k], null))]);
    const rollSrc = { pos: layer.position, axis: [body.joints.neck[0], body.joints.neck[2]], y0: body.joints.neck[1] - 8, y1: body.joints.neck[1] + 6, rMax: B.neck.w / 2 + 4, frontAt: (x, y) => front.at(x, y), frontWarp: BW.frontWarp };
    return { rollSrc, skin, shirt, pocket: pocketGeo, outer: outerGeo, pants, tights, socks, shoes, skirt: skirtGeo, belt: beltGeo, buckle, torsoSurf, sleeves, warp: BW.warp, neckWarp: BW.neckWarp, frontWarp: BW.frontWarp, warpSurf: { snap: BW.warp, route: BW.route, mesh: true }, head, face };
  }, [M, L, long, pantsHem, trousers, sockTop, skirt?.hem, skirt?.pleats?.length, B.sleeve.len, B.shoe.h, t.w, t.h, t.d, t.y, outer?.key, belt, pockets]); // eslint-disable-line react-hooks/exhaustive-deps
  // v33：頭髮 = MakeHuman 真頭髮（男仔短髮、女仔齊肩 bob）；戴帽就帽口以上切走（唔會穿出帽）
  const hairCut = useMemo(() => {
    if (!M || !hair || !built) return null;
    const it = M.items[M.body.hair];
    if (!it) return null;
    const hb = built.head;
    // v33 第二輪：切喺帽口（以前最少切到眉上 3 cm，女領袖晚禮服帽下面會露一圈頭皮）
    const cut = hair.hatCut > 0 ? hair.hatCut : 0;
    const K = cut > 0 ? keepDistance(it.pos, it.regions, { top: hb.top - cut }) : null;
    // 帽口嗰度頭髮有幾厚：帽（方盒款）闊返咁多，包住頭髮切口
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    if (cut > 0) {
      for (let i = 0; i < it.pos.length; i += 3) {
        const y = it.pos[i + 1];
        if (y < hb.top - cut - 1.5 || y > hb.top - cut) continue;
        x0 = Math.min(x0, it.pos[i]); x1 = Math.max(x1, it.pos[i]);
        z0 = Math.min(z0, it.pos[i + 2]); z1 = Math.max(z1, it.pos[i + 2]);
      }
    }
    const pad = x1 > x0 ? { w: Math.max(0, Math.min(4, x1 - x0 - hb.w)), d: Math.max(0, Math.min(4, z1 - z0 - hb.d)) } : { w: 0, d: 0 };
    return { geo: clippedGeometry(cutItem(it, K)), pad };
  }, [M, built, hair?.hatCut]); // eslint-disable-line react-hooks/exhaustive-deps
  const hairGeo = hairCut?.geo ?? null;
  const hairPad = hairCut?.pad ?? { w: 0, d: 0 };
  useEffect(() => () => hairGeo?.dispose(), [hairGeo]);
  useEffect(() => () => built && ['skin', 'shirt', 'pocket', 'outer', 'pants', 'tights', 'socks', 'shoes', 'skirt', 'belt'].forEach((k) => built[k]?.dispose()), [built]);
  useEffect(() => () => built?.face.forEach(([, g]) => g.dispose()), [built]);

  // v33 第二輪：旅巾圈（卷起）跟真衫衣領，由頸後兜到前面巾圈
  const rollGeo = useMemo(() => {
    if (!built || !neckRoll) return null;
    const R = built.rollSrc;
    const { ring } = collarRing(R.pos, { axis: R.axis, y0: R.y0, y1: R.y1, rMax: R.rMax, rollH: neckRoll.rollH, rollT: neckRoll.rollT });
    const wog = R.frontWarp([0, neckRoll.wogY, neckRoll.wogZ]);
    const tube = rollTube(ring, { wog, rollH: neckRoll.rollH, rollT: neckRoll.rollT, surfaceZ: R.frontAt, axis: R.axis });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(tube.position, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(tube.uv, 2));
    g.setIndex(tube.index);
    tube.groups.forEach((q) => g.addGroup(q.start, q.count, q.materialIndex));
    g.computeVertexNormals();
    return g;
  }, [built, neckRoll?.wogY, neckRoll?.wogZ, neckRoll?.rollH, neckRoll?.rollT]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rollGeo?.dispose(), [rollGeo]);
  const rollMats = useMemo(() => (neckRoll ? neckRoll.canvases.map((c) => material(c, { painted, double: true })) : null), [neckRoll?.canvases, painted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rollMats?.forEach((m) => m.dispose()), [rollMats]);

  const skinKey = M?.body.skin ?? 'boy';
  const mats = useMemo(() => {
    const suitShade = mhTex('shade_suit.jpg');
    const shirtMats = shirtFaces.map((c) => {
      const m = shaded(material(c, { painted }), suitShade);
      m.vertexColors = true;
      m.alphaTest = 0.5;
      m.side = THREE.DoubleSide;
      return m;
    });
    shirtMats.push(shaded(cloth(sleeveColour, painted), suitShade));
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
    const hairCol = new THREE.Color(painted ? C.hair : '#6f7277').multiplyScalar(2);
    const grey = (name, alphaTest) => new THREE.MeshStandardMaterial({ map: mhTex(name, false, '#00000000'), color: hairCol, alphaTest, side: THREE.DoubleSide, roughness: 0.55 });
    const skinMat = painted ? new THREE.MeshStandardMaterial({ map: mhTex(`skin_${skinKey}.jpg`, true, C.skin), roughness: 0.58 }) : skinMaterial(false);
    const pocketMat = material(shirtFaces[4], { painted });
    pocketMat.side = THREE.DoubleSide;
    return {
      pocket: pocketMat,
      outer: outerMats,
      skin: skinMat,
      shirt: shirtMats,
      pants: shaded(cloth(pantsColour, painted, { vertexColors: false, alphaTest: 0, normalMap: null }), suitShade),
      tights: cloth(C.tights, painted),
      socks: cloth(sockColour, painted),
      shoes: shaded(cloth(shoeColour, painted, { vertexColors: false, alphaTest: 0, roughness: 0.4, normalMap: null }), mhTex('shade_shoes.jpg')),
      skirt: skirt ? shaded(cloth(skirt.colour, painted, { vertexColors: !!skirt.pleats?.length, alphaTest: 0, normalMap: null }), mhTex('shade_skirt.jpg')) : null,
      hair: grey(M?.body.hair === 'hairBob' ? 'hair_bob.webp' : 'hair_short.webp', 0.45),
      eyes: new THREE.MeshStandardMaterial({ map: painted ? mhTex('eyes.jpg', true, '#f4f1ec') : null, color: painted ? '#ffffff' : '#9a9da2', roughness: 0.25 }),
      brows: grey('brows.webp', 0.4),
      lashes: grey('lashes.webp', 0.4),
    };
  }, [shirtFaces, sleeveColour, pantsColour, sockColour, shoeColour, painted, skirt?.colour, skirt?.pleats?.length, outer?.faces, outer?.sleeveColour, skinKey, M?.body.hair]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => [mats.skin, mats.pocket, ...mats.shirt, ...(mats.outer ?? []), mats.pants, mats.tights, mats.socks, mats.shoes, mats.skirt, mats.hair, mats.eyes, mats.brows, mats.lashes].forEach((m) => m?.dispose()), [mats]);

  if (!built) return null;
  return (
    <group name="SCOUT3D mannequin (MakeHuman CC0)">
      <mesh geometry={built.skin} material={mats.skin} castShadow receiveShadow />
      {built.face.map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k]} />
      ))}
      <mesh geometry={built.shirt} material={mats.shirt} castShadow receiveShadow />
      {built.pocket && <mesh geometry={built.pocket} material={mats.pocket} castShadow receiveShadow />}
      {built.outer && mats.outer && <mesh geometry={built.outer} material={mats.outer} castShadow receiveShadow />}
      {built.pants && <mesh geometry={built.pants} material={mats.pants} castShadow receiveShadow />}
      {built.tights && <mesh geometry={built.tights} material={mats.tights} castShadow receiveShadow />}
      {built.socks && <mesh geometry={built.socks} material={mats.socks} castShadow receiveShadow />}
      {built.shoes && <mesh geometry={built.shoes} material={mats.shoes} castShadow receiveShadow />}
      {built.skirt && mats.skirt && <mesh geometry={built.skirt} material={mats.skirt} castShadow receiveShadow />}
      {built.belt && (
        <>
          <mesh geometry={built.belt}>
            <meshStandardMaterial color={C.belt} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[built.buckle.x, built.buckle.y, built.buckle.z]}>
            <boxGeometry args={[3.6, 2.6, 0.4]} />
            <meshStandardMaterial color={C.buckle} roughness={0.35} metalness={0.6} />
          </mesh>
        </>
      )}
      {torsoItems.map((p) => (
        <TorsoBadges key={p.key} items={[p]} surf={built.torsoSurf} selected={selected === p.id} {...patchProps} />
      ))}
      {hairGeo && <mesh geometry={hairGeo} material={mats.hair} castShadow receiveShadow />}
      {hats && hats({ ...B, head: hairPad.w || hairPad.d ? { ...built.head, w: built.head.w + hairPad.w, d: built.head.d + hairPad.d } : built.head })}
      {warped && (
        <Warped warp={built.warp} neckWarp={built.neckWarp} frontWarp={built.frontWarp}>
          {warped}
        </Warped>
      )}
      {surfaced && surfaced(built.warpSurf)}
      {rollGeo && rollMats && <mesh geometry={rollGeo} material={rollMats} castShadow receiveShadow />}
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
