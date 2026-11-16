// v32：「童軍中性底」（12 歲、中性、頭身 1:6.5、腿身 1:1）＋ 衫裙褲做獨立布料（厚度、摺邊、直摺、皮帶）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePositions, vertexNormals, REGION, shell, garmentRules, clothify, skirtRings, beltRing } from '../src/three/mannequin.js';
import { layout } from '../src/three/body.js';

const D = new URL('../public/models/mannequin/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const faces = new Uint16Array(fs.readFileSync(new URL('faces.bin', D)).buffer.slice(0));
const regions = new Uint8Array(fs.readFileSync(new URL('regions.bin', D)));
const load = (key) => {
  const b = fs.readFileSync(new URL(`${key}.bin`, D));
  return decodePositions(new Int16Array(b.buffer, b.byteOffset, b.length / 2), idx.unit);
};

test('v32 所有支部、男女都用同一個「童軍中性底」', () => {
  assert.equal(idx.base.name, 'scout-neutral-v31b');
  assert.equal(idx.base.phenotype.gender, 0.5);
  assert.equal(idx.base.phenotype.cupsize, 0);
  assert.ok(idx.base.phenotype.age > 0.34 && idx.base.phenotype.age < 0.37, '約 12 歲（Anny：1/3 = 11 歲、2/3 = 25 歲）');
  for (const [key, b] of Object.entries(idx.bodies)) {
    assert.equal(b.base, 'scout-neutral-v31b', key);
    assert.equal(b.years, 12, key);
  }
});

test('v32 頭身比約 1:6.5、腿身約 1:1（童軍／深資／領袖）', () => {
  for (const key of ['scout_boy', 'scout_girl', 'venture_boy', 'venture_girl', 'leader_boy', 'leader_girl']) {
    const m = idx.bodies[key].measure;
    assert.ok(m.headRatio >= 6.3 && m.headRatio <= 6.8, `${key} headRatio ${m.headRatio}`);
    assert.ok(m.crotchRatio >= 0.48 && m.crotchRatio <= 0.52, `${key} crotchRatio ${m.crotchRatio}`);
  }
});

test('v32 男女人台一樣（中性底，只係頭髮唔同）', () => {
  const a = load('scout_boy'), b = load('scout_girl');
  let d = 0;
  for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
  assert.ok(d < 0.1, `max diff ${d}`);
});

test('v32 膊頭闊約等於盤骨闊、胸／肚／臀最少', () => {
  const pos = load('scout_girl');
  const R = REGION;
  let x0 = Infinity, x1 = -Infinity, hx0 = Infinity, hx1 = -Infinity;
  let zf = -Infinity, zb = Infinity;
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i], x = pos[i * 3], z = pos[i * 3 + 2];
    if (r === R.torso) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); zf = Math.max(zf, z); zb = Math.min(zb, z); }
    if (r === R.pelvis) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); zf = Math.max(zf, z); zb = Math.min(zb, z); }
  }
  const sh = x1 - x0, hip = hx1 - hx0;
  assert.ok(sh >= hip * 0.95 && sh <= hip * 1.45, `shoulder ${sh.toFixed(1)} hip ${hip.toFixed(1)}`);
  assert.ok(zf - zb < 20, `上身前後深 ${(zf - zb).toFixed(1)} cm`);
});

function shirtShell(key) {
  const pos = load(key);
  const nrm = vertexNormals(pos, faces);
  const [sec, g] = key.split('_');
  const L = layout(g, sec);
  const G = garmentRules({ pos, regions, joints: idx.bodies[key].joints, L, long: false, sleeveLen: L.B.sleeve.len, pantsHem: 60, trousers: false, sockTop: 0, shoeTop: 6 });
  return { pos, nrm, G, L };
}

test('v32 clothify：布有厚度（外層＋反轉內層＋邊），冇 NaN，切口係幾何邊', () => {
  const { pos, nrm, G } = shirtShell('scout_boy');
  const sh = shell(pos, nrm, faces, G.shirt.keep, G.shirt.offset);
  const c = clothify(sh, { thick: 0.3, smooth: 8 });
  assert.ok(c.outerTris > 0 && c.index.length / 3 > c.outerTris * 2, '有內層同邊');
  for (const v of c.position) assert.ok(Number.isFinite(v));
  // 內層同外層相距約 0.3 cm
  const nV = c.position.length / 6;
  let sum = 0;
  for (let i = 0; i < nV; i += 50) sum += Math.hypot(c.position[i * 3] - c.position[(i + nV) * 3], c.position[i * 3 + 1] - c.position[(i + nV) * 3 + 1], c.position[i * 3 + 2] - c.position[(i + nV) * 3 + 2]);
  const avg = sum / Math.ceil(nV / 50);
  assert.ok(avg > 0.25 && avg < 0.35, `thick ${avg}`);
});

test('v32 褲頭包住塞入去嘅恤衫；褲管離腳約 1 cm', () => {
  const { pos, G, L } = shirtShell('scout_boy');
  const top = (L.B.waist) + 1;
  let pantsAtTop = Infinity, shirtAtTop = 0, legGap = Infinity;
  for (let i = 0; i < regions.length; i++) {
    const y = pos[i * 3 + 1];
    if (regions[i] === REGION.torso && Math.abs(y - top) < 1) {
      pantsAtTop = Math.min(pantsAtTop, G.pants.offset(i));
      shirtAtTop = Math.max(shirtAtTop, G.shirt.offset(i));
    }
    if (regions[i] === REGION.upperlegL && y < top - 12 && y > top - 30) legGap = Math.min(legGap, G.pants.offset(i));
  }
  assert.ok(pantsAtTop > shirtAtTop + 0.3, `褲 ${pantsAtTop} 恤衫 ${shirtAtTop}`);
  assert.ok(legGap >= 0.9 && legGap <= 2.5, `褲管 ${legGap}`);
});

test('v32 半截裙／裙褲：直筒唔係錐形、有腰頭、有直摺、有厚度；皮帶圈喺裙頭外面', () => {
  const pos = load('venture_girl');
  const L = layout('girl', 'venture');
  const top = L.B.waist + 2, hem = 60;
  const plain = skirtRings(pos, regions, { top, hem, ease: 2.1, flare: 0.02 });
  const r0 = plain.rings[plain.rings.length - 1].r, rTop = plain.rings[0].r;
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(avg(r0) / avg(rTop) < 1.35, `裙腳／裙頭 ${avg(r0) / avg(rTop)}（唔係錐）`);
  assert.ok(plain.index.length / 3 > plain.outerTris * 2, '有內層');
  const pleated = skirtRings(pos, regions, { top, hem, ease: 2.1, pleats: [-0.35, 0.35, Math.PI - 0.35, Math.PI + 0.35], flare: 0.06 });
  // 摺位（前中偏左）喺裙腳比冇摺嗰款凸出
  const P = pleated.position, Q = plain.position;
  const seg = 96, W = seg + 1;
  const lastRow = (arr) => (arr.length / 3 / 2) / W - 1;
  const s = Math.round((0.35 / (Math.PI * 2)) * seg);
  const iP = (lastRow(P) * W + s) * 3, iQ = (lastRow(Q) * W + s) * 3;
  assert.ok(Math.hypot(P[iP], P[iP + 2]) > Math.hypot(Q[iQ], Q[iQ + 2]) * 0.98, '有直摺');
  const br = beltRing(plain.position, { top: L.B.waist + 1.6, h: 3 });
  assert.ok(br && br.buckle.z > 0, '皮帶扣喺前面');
});
