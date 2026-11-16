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

// v33（ADR-0030）：「童軍中性底」身形測試已退役 — 人台改用 MakeHuman 真人身體（見 tests/v33.test.mjs）

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
