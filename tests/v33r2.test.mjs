// v33 第二輪（ADR-0030 補充）：真衫上面嘅立體胸袋、裙褲弓字褶、旅巾圈跟真衣領、女仔貼圖遲載
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePositions, vertexNormals, garmentRules, heightField } from '../src/three/mannequin.js';
import { shirtLayer, decodeItem, pocketGeometry, pleatDepth, collarRing, rollTube } from '../src/three/mh.js';
import { layout } from '../src/three/body.js';

const D = new URL('../public/models/mannequin/', import.meta.url);
const rd = (f) => { const x = fs.readFileSync(new URL(f, D)); return x.buffer.slice(x.byteOffset, x.byteOffset + x.length); };
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const regions = new Uint8Array(rd('regions.bin'));
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const item = (key, k) => decodeItem({ src: rd(`${k}_src.bin`), faces: rd(`${k}_faces.bin`), uv: rd(`${k}_uv.bin`), regions: rd(`${k}_regions.bin`), pos: rd(`${key}_${k}.bin`), hides: idx.items[k].hides ? rd(`${k}_hides.bin`) : null }, idx.unit, decodePositions, vertexNormals);
const body = (key) => decodePositions(new Int16Array(rd(`${key}.bin`)), idx.unit);

// 真恤衫（短袖、衫腳喺腰）
function realShirt(key) {
  const [sec, g] = key.split('_');
  const L = layout(g, sec);
  const B = L.B;
  const b = idx.bodies[key];
  const G = garmentRules({ pos: body(key), regions, joints: b.joints, L, long: false, sleeveLen: B.sleeve.len, pantsHem: 50, trousers: false, sockTop: 0, shoeTop: 6 });
  const fr = G.shirt.frames;
  const { sh, isSleeve } = shirtLayer(item(key, 'shirt'), { bottom: b.waist, sleeve: { frames: fr, end: { l: fr.l.seamY - B.sleeve.len, r: fr.r.seamY - B.sleeve.len } } });
  const torso = [];
  for (let i = 0; i < sh.index.length; i += 3) if (!isSleeve(sh.index[i], sh.index[i + 1], sh.index[i + 2])) torso.push(sh.index[i], sh.index[i + 1], sh.index[i + 2]);
  return { L, B, b, sh, torso };
}

test('v33r2 胸袋：袋身貼衫面（唔陷入）、袋蓋中間尖、有鈕；uv 同恤衫方塊正面一樣（袋線、鈕對得上）', () => {
  const flat = { at: (x, y) => 5 + 0.02 * x * x };
  const box = { w: 30, h: 40, d: 15, cy: 60 };
  const q = { x: 8, top: 70, w: 10, h: 12, flap: 4 };
  const g = pocketGeometry(flat, [q], box);
  const n = g.position.length / 3;
  assert.ok(n > 100 && g.index.length > 300);
  assert.ok(g.position.every(Number.isFinite));
  let minFlapCentre = Infinity, minFlapSide = Infinity;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [g.position[i * 3], g.position[i * 3 + 1], g.position[i * 3 + 2]];
    assert.ok(z >= flat.at(x, y) - 0.06, `陷入衫 ${z} < ${flat.at(x, y)}`);
    assert.ok(x > q.x - q.w / 2 - 0.9 && x < q.x + q.w / 2 + 0.9 && y > q.top - q.h - 0.01 && y < q.top + 0.31);
    // uv = 方塊正面投影
    assert.ok(Math.abs(g.uv[i * 2] - (x + box.w / 2) / box.w) < 1e-5);
    assert.ok(Math.abs(g.uv[i * 2 + 1] - (y - box.cy + box.h / 2) / box.h) < 1e-5);
    // 袋蓋（最出嗰層）
    if (z > flat.at(x, y) + 0.45 && y > q.top - q.flap - 1.3 && y < q.top - q.flap + 0.5) {
      if (Math.abs(x - q.x) < 0.3) minFlapCentre = Math.min(minFlapCentre, y);
      if (Math.abs(x - (q.x - q.w / 2)) < 0.3) minFlapSide = Math.min(minFlapSide, y);
    }
  }
  assert.ok(minFlapCentre < minFlapSide - 0.8, `袋蓋尖 ${minFlapCentre} vs 邊 ${minFlapSide}`);
});

test('v33r2 胸袋喺真衫：袋喺 B.pocket 位（兩邊對稱），袋面高過件衫、章跟住袋面', () => {
  const { L, B, sh, torso } = realShirt('scout_boy');
  const t = B.torso;
  const field = heightField(sh.position, torso, { axis: 'z', min: [-t.w / 2 - 6, t.y - 2], max: [t.w / 2 + 6, L.top + 10] });
  const Q = B.pocket;
  const g = pocketGeometry(field, [1, -1].map((s) => ({ x: s * Q.x, top: t.y + t.h - Q.top, w: Q.w, h: Q.h, flap: Q.flap })), { w: t.w, h: t.h, d: t.d, cy: t.y + t.h / 2 });
  assert.ok(g.position.every(Number.isFinite));
  // 袋中間高過件衫 0.15–1 cm
  const both = new Float32Array(sh.position.length + g.position.length);
  both.set(sh.position);
  both.set(g.position, sh.position.length);
  const nS = sh.position.length / 3;
  const f2 = heightField(both, [...torso, ...g.index.map((i) => i + nS)], { axis: 'z', min: [-t.w / 2 - 6, t.y - 2], max: [t.w / 2 + 6, L.top + 10] });
  for (const s of [1, -1]) {
    const x = s * Q.x, y = t.y + t.h - Q.top - Q.h * 0.6;
    const d = f2.at(x, y) - field.at(x, y);
    assert.ok(d > 0.15 && d < 1, `袋面高 ${d.toFixed(2)}`);
  }
  const src0 = src('src/three/Mannequin.jsx');
  assert.match(src0, /pocketGeometry\(front/);
  assert.match(src0, /front = heightField\(frontPos, frontIdx/); // 章、笛繩跟袋面
  assert.match(src('src/three/Blocky.jsx'), /pockets=\{cub\}/);
});

test('v33r2 裙褲：前後各兩條弓字直摺；腰頭下車死冇摺、向下漸深；摺位以外唔郁', () => {
  const P = [];
  const ang = [];
  for (let y = 40; y <= 72; y += 2) for (let a = -Math.PI; a < Math.PI; a += 0.05) { P.push(13 * Math.sin(a), y, 13 * Math.cos(a)); ang.push([a, y]); }
  const pleats = [-0.35, 0.35, Math.PI - 0.35, Math.PI + 0.35];
  const d = pleatDepth(new Float32Array(P), { angles: pleats, top: 72, depth: 1.1, width: 1.1 });
  let maxSewn = 0, maxFar = 0, maxLow = 0;
  ang.forEach(([a, y], i) => {
    const near = pleats.some((p) => { let e = Math.abs(a - p) % (Math.PI * 2); if (e > Math.PI) e = Math.PI * 2 - e; return e < 0.03; });
    const far = pleats.every((p) => { let e = Math.abs(a - p) % (Math.PI * 2); if (e > Math.PI) e = Math.PI * 2 - e; return e > 0.2; });
    if (y > 66) maxSewn = Math.max(maxSewn, d[i]);
    if (far) maxFar = Math.max(maxFar, d[i]);
    if (near && y < 55) maxLow = Math.max(maxLow, d[i]);
  });
  assert.equal(maxSewn, 0);
  assert.equal(maxFar, 0);
  assert.ok(maxLow > 0.8, `摺深 ${maxLow}`);
  const M = src('src/three/Mannequin.jsx');
  assert.match(M, /pleatDepth\(P, \{ angles: skirt\.pleats/);
  assert.match(M, /vertexColors: !!skirt\.pleats\?\.length/);
});

test('v33r2 旅巾圈：跟真衣領（頸後擱喺領頂、包埋翻領）；前面兩條落到巾圈、唔陷入衫', () => {
  for (const key of ['scout_boy', 'cub_girl', 'grasshopper_boy', 'leader_girl']) {
    const { L, B, b, sh, torso } = realShirt(key);
    const t = B.torso;
    const axis = [b.joints.neck[0], b.joints.neck[2]];
    const rMax = B.neck.w / 2 + 4;
    const { ring, yt } = collarRing(sh.position, { axis, y0: b.joints.neck[1] - 8, y1: b.joints.neck[1] + 6, rMax });
    assert.ok(Array.from(yt).every(Number.isFinite));
    const back = ring(Math.PI), side = ring(Math.PI / 2);
    for (const p of [back, side]) {
      assert.ok(p.every(Number.isFinite));
      const r = Math.hypot(p[0] - axis[0], p[2] - axis[1]);
      assert.ok(r > B.neck.w / 2 - 0.5 && r < rMax + 2, `${key} 圈半徑 ${r.toFixed(1)}`);
      assert.ok(p[1] > b.joints.neck[1] - 8 && p[1] < b.joints.neck[1] + 6, `${key} 圈高 ${p[1].toFixed(1)}`);
    }
    // 頸後最高嗰度：唔高過衣領頂
    const s = Math.round(18);
    assert.ok(back[1] <= yt[s] + 0.01);
    const front = heightField(sh.position, torso, { axis: 'z', min: [-t.w / 2 - 6, t.y - 2], max: [t.w / 2 + 6, L.top + 10] });
    const wogY = L.top - B.necker.wogDrop;
    const wog = [0, wogY, (front.at(0, wogY) ?? t.d / 2) + 0.6];
    const tube = rollTube(ring, { wog, surfaceZ: (x, y) => front.at(x, y), axis });
    assert.ok(tube.position.every(Number.isFinite), key);
    assert.equal(tube.groups.length, 2);
    assert.deepEqual(tube.groups.map((g) => g.materialIndex), [0, 1]);
    // 第一點 = 巾圈頂（兩邊）
    const p0 = [tube.position[0], tube.position[1], tube.position[2]];
    assert.ok(Math.abs(p0[1] - (wogY + 1)) < 2.5, `${key} 落到巾圈 ${p0[1].toFixed(1)} vs ${wogY}`);
  }
});

test('v33r2 Blocky／Mannequin：人台唔再用方塊旅巾圈、上截巾尾；背後三角接到巾圈；貼圖遲載換大圖前 dispose', () => {
  const Bk = src('src/three/Blocky.jsx');
  assert.match(Bk, /figure !== 'b' && <group userData=\{\{ warp: 'neck' \}\}>/);
  assert.match(Bk, /figure !== 'b' && <Plane size=\{\[N\.tail\.w, N\.len \+ 1\]\}/);
  assert.match(Bk, /neckRoll=\{invested && !tie && !VL\?\.bowTie/);
  assert.match(Bk, /const backUp = figure === 'b' \? 3 : 0;/);
  assert.match(Bk, /backBridge: \{ w: Math\.min\(G\.back\.w, G\.inner \+ 2\)/);
  const M = src('src/three/Mannequin.jsx');
  assert.match(M, /t\.dispose\(\);\s*t\.image = img\.image;/);
  assert.match(M, /collarRing\(R\.pos/);
  assert.match(M, /rollTube\(ring/);
});

test('v33r2 戴帽：頭髮切喺帽口（唔再切到眉上 3 cm 露頭皮）；方盒帽按帽口頭髮厚度闊返', () => {
  const M = src('src/three/Mannequin.jsx');
  assert.match(M, /const cut = hair\.hatCut > 0 \? hair\.hatCut : 0;/);
  assert.doesNotMatch(M, /hb\.top - hb\.brow - 3/);
  assert.match(M, /Math\.min\(4, x1 - x0 - hb\.w\)/);
  assert.match(M, /w: built\.head\.w \+ hairPad\.w, d: built\.head\.d \+ hairPad\.d/);
  assert.match(src('src/three/Blocky.jsx'), /shoeColour=\{cub \? C\.shoeBlack : C\.shoe\}/);
});
