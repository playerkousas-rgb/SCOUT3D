// v31：刪走 A、深化人台 B（方塊配件 → 人台變形：笛繩路線、旅巾前面、外衣、鞋）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePositions, vertexNormals, REGION, shell, bodyWarp, garmentRules, heightField, warpPolyline, inflateSmooth } from '../src/three/mannequin.js';
import { layout, strapLayout, shoulderTip, neckerLayout, lanyardPoints, lanyardBackPoints } from '../src/three/body.js';

const D = new URL('../public/models/mannequin/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const faces = new Uint16Array(fs.readFileSync(new URL('faces.bin', D)).buffer.slice(0));
const regions = new Uint8Array(fs.readFileSync(new URL('regions.bin', D)));
const armR = new Set([REGION.upperarmL, REGION.upperarmR, REGION.lowerarmL, REGION.lowerarmR]);

function setup(key, outer = null) {
  const [sec, g] = key.split('_');
  const b = fs.readFileSync(new URL(`${key}.bin`, D));
  const pos = decodePositions(new Int16Array(b.buffer, b.byteOffset, b.length / 2), idx.unit);
  const nrm = vertexNormals(pos, faces);
  const L = layout(g, sec);
  const B = L.B, t = B.torso, body = idx.bodies[key];
  const G = garmentRules({ pos, regions, joints: body.joints, L, long: false, sleeveLen: B.sleeve.len, pantsHem: 4, trousers: true, sockTop: 0, shoeTop: 6, outer });
  const sh = shell(pos, nrm, faces, G.shirt.keep, G.shirt.offset);
  const torsoIdx = [];
  for (let i = 0; i < sh.index.length; i += 3) {
    if ([0, 1, 2].every((q) => armR.has(regions[sh.src[sh.index[i + q]]]))) continue;
    torsoIdx.push(sh.index[i], sh.index[i + 1], sh.index[i + 2]);
  }
  const nS = sh.position.length / 3;
  const both = new Float32Array(sh.position.length + pos.length);
  both.set(sh.position);
  both.set(pos, sh.position.length);
  const skinIdx = [];
  for (let f = 0; f < faces.length; f += 3) {
    const ok = (r) => r === REGION.neck || r === REGION.torso || r === REGION.upperarmL || r === REGION.upperarmR;
    if (ok(regions[faces[f]]) || ok(regions[faces[f + 1]]) || ok(regions[faces[f + 2]])) skinIdx.push(faces[f] + nS, faces[f + 1] + nS, faces[f + 2] + nS);
  }
  const W = bodyWarp({
    position: sh.position, index: torsoIdx, topPosition: both, topIndex: [...sh.index, ...skinIdx], neckPosition: both, neckIndex: [...torsoIdx, ...skinIdx],
    joints: body.joints, torso: { w: t.w, d: t.d, y0: t.y, top: L.top }, neck: { w: B.neck.w, d: B.neck.d },
    shoulder: { box: shoulderTip(L) + 0.5, body: Math.abs(body.joints.shoulderL[0]) + 3 },
  });
  return { pos, nrm, L, B, t, G, W, body };
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('v31 heightField：rowRange／colRange 係有資料嘅範圍', () => {
  // 一塊 x −2..3、y 0..4 嘅平面（z = 1）
  const position = new Float32Array([-2, 0, 1, 3, 0, 1, 3, 4, 1, -2, 4, 1]);
  const hf = heightField(position, [0, 1, 2, 0, 2, 3], { min: [-5, -5], max: [5, 5], cell: 0.5 });
  assert.deepEqual(hf.rowRange(2), [-2, 3]);
  assert.deepEqual(hf.colRange(0), [0, 4]);
  assert.equal(hf.rowRange(4.9), null);
  assert.equal(hf.at(0, 2), 1);
});

test('v31 warpPolyline：變唔到嘅點用前後點嘅位移插值（唔會斷開）', () => {
  const pts = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
  const warp = ([x, y, z]) => (x === 1 || x === 2 ? [x, y, z] : [x, y + 2, z]);
  const out = warpPolyline(pts, warp);
  for (const p of out) assert.ok(Math.abs(p[1] - 2) < 1e-9, `y ${p[1]}`);
});

test('v31 人台笛繩：前後兩段連續（每步 < 3.5 cm）、前面落袋嗰段喺心口前面', () => {
  for (const key of ['leader_boy', 'leader_girl', 'venture_girl', 'scout_boy']) {
    const { L, t, W } = setup(key);
    const st = strapLayout(L, {}) ?? strapLayout(L, { virtual: true });
    const args = { L, strap: st, z: t.d / 2 + 0.3, thick: 0.55, side: 1, end: 'pocketMouth' };
    const front = W.route(lanyardPoints(args), 0.55);
    const back = W.route(lanyardBackPoints(args), 0.55);
    for (const r of [front, back]) for (let i = 1; i < r.length; i++) assert.ok(dist(r[i - 1], r[i]) < 3.5, `${key} 步 ${i} ${dist(r[i - 1], r[i]).toFixed(2)}`);
    // 方塊上身中線前面 → 人台前面：膊頭下面 6 cm 嘅點 z 一定 > 0（唔會俾側面／背後吸走）
    for (const p of front) if (p[1] < L.top - 6) assert.ok(p[2] > 0, `${key} ${p.map((v) => v.toFixed(1))}`);
    // 推出衫面：點唔會喺正面衫面入面
    for (const p of front) {
      if (p[1] > L.top - 6) continue;
      const f = W.F.at(p[0], p[1]);
      if (f !== null && f > 0) assert.ok(p[2] >= f - 0.05, `${key} 陷入 ${p.map((v) => v.toFixed(1))} F ${f.toFixed(1)}`);
    }
  }
});

test('v31 旅巾前面兩條（frontWarp）：唔會俾領口後面／膊頂拉到身後（冇尖角）', () => {
  for (const key of ['cub_boy', 'scout_boy', 'venture_girl', 'leader_boy']) {
    const { L, W } = setup(key);
    const N = neckerLayout(L);
    for (let k = 0; k <= 1.0001; k += 0.1) {
      for (const dx of [-N.tail.w / 2, 0, N.tail.w / 2]) {
        const p = [N.a[0] + (N.b[0] - N.a[0]) * k + dx, N.a[1] + (N.b[1] - N.a[1]) * k, N.front + 0.35];
        const q = W.frontWarp(p);
        assert.ok(q[2] > 0, `${key} k ${k.toFixed(1)} → ${q.map((v) => v.toFixed(1))}`);
      }
    }
  }
});

test('v31 外衣（禮服外套）：衫腳唔會低過褲襠 + 2 cm（褲襠唔會露窿）', () => {
  const { G, pos } = setup('leader_boy', { bottom: 60, neckUp: 0.5, sleeves: true, extra: 0.8 });
  let crotch = Infinity;
  for (let i = 0; i < regions.length; i++) if (regions[i] === REGION.pelvis && Math.abs(pos[i * 3]) < 2) crotch = Math.min(crotch, pos[i * 3 + 1]);
  assert.ok(G.outer.bottom >= crotch + 2 - 1e-6);
  assert.ok(G.outer.bottom > 60);
});

test('v31 鞋：inflateSmooth 整體向外（最多向入 1 cm，平均向外）', () => {
  const { pos, nrm, G } = setup('grasshopper_boy');
  const sh = shell(pos, nrm, faces, G.shoes.keep, G.shoes.offset);
  const sm = inflateSmooth(sh);
  assert.equal(sm.position.length, sh.position.length);
  let moved = 0, sum = 0;
  for (let i = 0; i < sh.position.length; i += 3) {
    const d = [0, 1, 2].map((q) => sm.position[i + q] - sh.position[i + q]);
    const n = [0, 1, 2].map((q) => sh.normal[i + q]);
    const dot = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    assert.ok(dot > -1, `vertex ${i / 3} dot ${dot}`);
    sum += dot;
    if (Math.hypot(...d) > 1e-3) moved++;
  }
  assert.ok(moved > 0);
  assert.ok(sum / (sh.position.length / 3) > 0, '平均向外');
});
