// SCOUT3D v1.0 · © SCOUT SYSTEM
// v30 試做 B：真人人台（Anny／MakeHuman CC0）＋衫褲殼＋同一套厘米章位（ADR-0027）。
// 只做咗恤衫、褲／裙、襪、鞋同章（上身、衫袖）；領巾、帽、笛繩、專章帶、毛衣、禮服未做（試做）。
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { COLOURS as C } from './body.js';
import { material, plain } from './pixels.js';
import { skinMaterial } from './Anatomy.jsx';
import { TorsoBadges, SleeveBadges } from './Badges.jsx';
import { MANNEQUIN_DIR, bodyKey, decodePositions, vertexNormals, shell, torsoGroups, heightField, meshSurface, garmentRules, skirtRings, REGION } from './mannequin.js';

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

export default function Mannequin({ section, gender, L, painted, shirtFaces, sleeveColour, long, pantsColour, pantsHem, trousers, sockColour, sockTop, skirt = null, torsoItems, armItems, patchProps, selected }) {
  const M = useMannequin(section, gender);
  const B = L.B;
  const t = B.torso;
  const built = useMemo(() => {
    if (!M) return null;
    const { pos, nrm, faces, regions, body } = M;
    const G = garmentRules({ pos, regions, joints: body.joints, L, long, sleeveLen: B.sleeve.len, pantsHem, trousers, sockTop, shoeTop: Math.max(5, B.shoe.h + 1), tucked: section !== 'grasshopper', tights: !!skirt });
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
    // 章：上身由正面投影（只用上身部分，唔包袖）；袖由外側投影（手臂座標）
    const torsoIdx = [];
    for (let i = 0; i < sh.index.length; i += 3) if (!isSleeve(sh.index[i], sh.index[i + 1], sh.index[i + 2])) torsoIdx.push(sh.index[i], sh.index[i + 1], sh.index[i + 2]);
    const front = heightField(sh.position, torsoIdx, { axis: 'z', min: [-t.w / 2 - 6, t.y - 2], max: [t.w / 2 + 6, L.top + 10] });
    const torsoSurf = meshSurface(front, { axis: 'z', plane: t.d / 2 });
    const sleeves = {};
    for (const side of ['l', 'r']) {
      const F = G.frames[side];
      const sg = side === 'l' ? 1 : -1;
      // 袖外側：成件恤衫（膊頭係上身部分）由手臂外面望入去，最外層 = 袖面
      const field = heightField(sh.position, sh.index, { axis: 'x', sign: sg, min: [-9, F.wristY - 2], max: [9, F.seamY + 6], transform: F.toLocal });
      sleeves[side] = { frame: F, surf: meshSurface(field, { axis: 'x', sign: sg, plane: B.sleeve.w / 2 }), matrix: new THREE.Matrix4().fromArray(F.matrix) };
    }
    const pants = shellGeometry(shell(pos, nrm, faces, G.pants.keep, G.pants.offset));
    const socks = sockTop > 0 ? shellGeometry(shell(pos, nrm, faces, G.socks.keep, G.socks.offset)) : null;
    const shoes = shellGeometry(shell(pos, nrm, faces, G.shoes.keep, G.shoes.offset));
    let skirtGeo = null;
    if (skirt) {
      const sk = skirtRings(pos, regions, { top: (B.waist ?? t.y + 3) + 2, hem: skirt.hem });
      skirtGeo = new THREE.BufferGeometry();
      skirtGeo.setAttribute('position', new THREE.BufferAttribute(sk.position, 3));
      skirtGeo.setAttribute('normal', new THREE.BufferAttribute(sk.normal, 3));
      skirtGeo.setIndex(sk.index);
    }
    return { skin, shirt, pants, socks, shoes, skirt: skirtGeo, torsoSurf, sleeves };
  }, [M, L, long, pantsHem, trousers, sockTop, skirt?.hem, B.sleeve.len, B.shoe.h, t.w, t.h, t.d, t.y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => built && ['skin', 'shirt', 'pants', 'socks', 'shoes', 'skirt'].forEach((k) => built[k]?.dispose()), [built]);

  const mats = useMemo(() => {
    const shirtMats = shirtFaces.map((c) => {
      const m = material(c, { painted });
      m.vertexColors = true;
      m.alphaTest = 0.5;
      m.side = THREE.DoubleSide;
      return m;
    });
    shirtMats.push(cloth(sleeveColour, painted));
    return {
      skin: skinMaterial(painted, true),
      shirt: shirtMats,
      pants: cloth(pantsColour, painted),
      socks: cloth(sockColour, painted),
      shoes: cloth(C.shoeBlack ?? '#1c1c20', painted, { roughness: 0.38, normalMap: null }),
      skirt: skirt ? cloth(skirt.colour, painted, { vertexColors: false, alphaTest: 0 }) : null,
    };
  }, [shirtFaces, sleeveColour, pantsColour, sockColour, painted, skirt?.colour]);
  useEffect(() => () => [mats.skin, ...mats.shirt, mats.pants, mats.socks, mats.shoes, mats.skirt].forEach((m) => m?.dispose()), [mats]);

  if (!built) return null;
  return (
    <group name="SCOUT3D mannequin (Anny · MakeHuman CC0)">
      <mesh geometry={built.skin} material={mats.skin} castShadow receiveShadow />
      <mesh geometry={built.shirt} material={mats.shirt} castShadow receiveShadow />
      <mesh geometry={built.pants} material={mats.pants} castShadow receiveShadow />
      {built.socks && <mesh geometry={built.socks} material={mats.socks} castShadow receiveShadow />}
      <mesh geometry={built.shoes} material={mats.shoes} castShadow receiveShadow />
      {built.skirt && mats.skirt && <mesh geometry={built.skirt} material={mats.skirt} castShadow receiveShadow />}
      {torsoItems.map((p) => (
        <TorsoBadges key={p.key} items={[p]} surf={built.torsoSurf} selected={selected === p.id} {...patchProps} />
      ))}
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
