// v30：外觀只留「流線」；人形試做 B（真人人台）（ADR-0027）。v31：A 已刪，只留 現有／人台（ADR-0028）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { layout } from '../src/three/body.js';
import { LOOKS, FIGURES, DEFAULT_FIGURE } from '../src/three/look.js';
import {
  bodyKey, REGION, decodePositions, vertexNormals, armFrame, shell, heightField, meshSurface, garmentRules, skirtRings,
} from '../src/three/mannequin.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const bin = (p) => readFileSync(new URL(`../public/models/mannequin/${p}`, import.meta.url));
const IDX = JSON.parse(bin('index.json'));
const FACES = (() => { const b = bin('faces.bin'); return new Uint16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); })();
const REGIONS = new Uint8Array(bin('regions.bin'));
const body = (key) => {
  const b = bin(`${key}.bin`);
  return decodePositions(new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)), IDX.unit);
};
const SECTIONS = ['grasshopper', 'cub', 'scout', 'venture', 'leader'];

test('外觀只留「流線」；人形有 現有／人台 兩款（v31 刪咗 A），預設現有', () => {
  assert.deepEqual(LOOKS, ['smooth']);
  assert.deepEqual(FIGURES, ['current', 'b']);
  assert.equal(DEFAULT_FIGURE, 'current');
  const app = src('src/App.jsx');
  assert.doesNotMatch(app, /toggleLook|scout3d\.look/);
  for (const f of ['src/three/Blocky.jsx', 'src/three/Badges.jsx', 'src/three/Scene.jsx', 'src/three/pixels.js', 'src/three/look.js']) {
    assert.doesNotMatch(src(f), /useDetailed|useSmooth|LookContext|roundedBox|plainBox|texOf\b/, f);
  }
});

test('現有公仔有五官同頭髮（唔係人台）；人台用自己嘅網格；A 已刪', () => {
  const b = src('src/three/Blocky.jsx');
  assert.match(b, /head: headFaces\(B\)/);
  assert.match(b, /figure === 'b'/);
  assert.match(b, /<Mannequin\b/);
  for (const f of ['src/three/Blocky.jsx', 'src/three/body.js', 'src/three/look.js', 'src/App.jsx', 'src/i18n.jsx']) assert.doesNotMatch(src(f), /figureLayout|HEAD_A|torsoA|figureA|PROFILE_A/, f);
});

test('人台檔：10 個身形、同一套三角形、區域表；檔案細（< 1.2 MB）', () => {
  const files = readdirSync(new URL('../public/models/mannequin/', import.meta.url));
  let total = 0;
  for (const f of files) total += statSync(new URL(`../public/models/mannequin/${f}`, import.meta.url)).size;
  assert.ok(total < 1.2e6, `${total} B`);
  assert.ok(files.includes('LICENSE.md'), '授權說明（CC0 身體 + Apache-2.0 工具）');
  assert.match(src('public/models/mannequin/LICENSE.md'), /CC0/);
  assert.match(IDX.source, /CC0/);
  assert.equal(REGIONS.length, IDX.vertices);
  assert.equal(FACES.length, IDX.triangles * 3);
  assert.ok(Math.max(...FACES) < IDX.vertices);
  assert.ok(Math.max(...REGIONS) <= 15);
  for (const s of SECTIONS) {
    for (const g of ['boy', 'girl']) {
      const key = bodyKey(s, g);
      assert.ok(IDX.bodies[key], key);
      assert.equal(bin(`${key}.bin`).length, IDX.vertices * 3 * 2, key);
    }
  }
  assert.equal(bodyKey('rover', 'boy'), 'venture_boy');
  assert.equal(bodyKey('leader', 'girl'), 'leader_girl');
});

test('人台身高同膊頂對齊 body.js（章嘅厘米位置照用）', () => {
  for (const s of SECTIONS) {
    for (const g of ['boy', 'girl']) {
      const L = layout(g, s);
      const pos = body(bodyKey(s, g));
      let top = -Infinity, bot = Infinity;
      for (let i = 1; i < pos.length; i += 3) { top = Math.max(top, pos[i]); bot = Math.min(bot, pos[i]); }
      assert.ok(Math.abs(bot) < 1.5, `${s} ${g} 腳底喺地（${bot}）`);
      assert.ok(Math.abs(top - L.B.height) < 3, `${s} ${g} 身高 ${top} vs ${L.B.height}`);
      const F = armFrame(IDX.bodies[bodyKey(s, g)].joints, 'l', L.top);
      assert.ok(Number.isFinite(F.seamY));
      // 膊頭關節喺膊頂（L.top）下面少少；縫線喺關節上面
      assert.ok(F.O[1] < L.top && F.O[1] > L.top - 9, `${s} ${g} 膊頭關節 ${F.O[1]} vs ${L.top}`);
      assert.ok(F.seamY > 0 && F.elbowY < 0 && F.wristY < F.elbowY);
    }
  }
});

test('無面容：眼縫、口填平（眼嘅高度，前面同一行頂點深淺差 < 1.2 cm；原本眼窩 2.6 cm）', () => {
  for (const key of ['venture_boy', 'grasshopper_girl', 'leader_girl', 'cub_boy']) {
    const pos = body(key);
    const head = [];
    for (let i = 0; i < REGIONS.length; i++) if (REGIONS[i] === REGION.head) head.push(i);
    let top = -Infinity, bot = Infinity, nose = -Infinity;
    for (const i of head) { top = Math.max(top, pos[i * 3 + 1]); bot = Math.min(bot, pos[i * 3 + 1]); nose = Math.max(nose, pos[i * 3 + 2]); }
    const hh = top - bot;
    const rows = new Map();
    for (const i of head) {
      const x = Math.abs(pos[i * 3]), y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (x < 2.5 || x > 4 || z < nose - 6 || y > top - 0.4 * hh || y < top - 0.6 * hh) continue;
      const k = Math.floor(y * 2);
      const r = rows.get(k) ?? [Infinity, -Infinity];
      rows.set(k, [Math.min(r[0], z), Math.max(r[1], z)]);
    }
    assert.ok(rows.size >= 6, key);
    for (const [k, [lo, hi]] of rows) assert.ok(hi - lo < 1.2, `${key} y=${k / 2}: ${(hi - lo).toFixed(2)}`);
  }
});

test('衫褲殼：恤衫唔包手、頭；褲喺褲頭同褲腳之間；殼喺皮膚外面', () => {
  const L = layout('boy', 'venture');
  const pos = body('venture_boy');
  const nrm = vertexNormals(pos, FACES);
  const G = garmentRules({ pos, regions: REGIONS, joints: IDX.bodies.venture_boy.joints, L, long: false, sleeveLen: L.B.sleeve.len, pantsHem: 4, trousers: true, sockTop: 20, shoeTop: 8 });
  const sh = shell(pos, nrm, FACES, G.shirt.keep, G.shirt.offset);
  const regs = new Set([...sh.src].map((i) => REGIONS[i]));
  for (const r of [REGION.head, REGION.handL, REGION.handR, REGION.footL, REGION.lowerlegL]) assert.ok(!regs.has(r), `恤衫唔包 ${r}`);
  assert.ok(regs.has(REGION.torso) && regs.has(REGION.upperarmL));
  for (let k = 0; k < sh.src.length; k += 37) {
    const i = sh.src[k];
    const d = Math.hypot(sh.position[k * 3] - pos[i * 3], sh.position[k * 3 + 1] - pos[i * 3 + 1], sh.position[k * 3 + 2] - pos[i * 3 + 2]);
    assert.ok(d > 0.3 && d < 4, `離皮膚 ${d}`);
  }
  const pants = shell(pos, nrm, FACES, G.pants.keep, G.pants.offset);
  let hi = -Infinity, lo = Infinity;
  for (let k = 0; k < pants.src.length; k++) { if (pants.alpha[k] < 0.5) continue; hi = Math.max(hi, pants.position[k * 3 + 1]); lo = Math.min(lo, pants.position[k * 3 + 1]); }
  assert.ok(hi < L.B.waist + 5 && lo > 2, `褲 ${lo}–${hi}`);
  // 塞入褲：大髀嘅恤衫喺褲頭下 1 cm 停
  const legShirt = [...sh.src].filter((i, k) => sh.alpha[k] >= 0.5 && (REGIONS[i] === REGION.upperlegL || REGIONS[i] === REGION.upperlegR));
  for (const i of legShirt) assert.ok(pos[i * 3 + 1] > L.B.waist, '塞入褲');
});

test('章貼衫面：高度圖 + meshSurface 將方塊面上嘅點搬去衫面', () => {
  // 一個斜面三角形（z = 10 − 0.1·y）
  const position = new Float32Array([-10, 0, 10, 10, 0, 10, 0, 20, 8]);
  const field = heightField(position, [0, 1, 2], { min: [-10, 0], max: [10, 20], cell: 0.5 });
  assert.ok(Math.abs(field.at(0, 10) - 9) < 1e-3);
  assert.equal(field.at(50, 50), null);
  const S = meshSurface(field, { plane: 5 });
  const q = S.snap([0, 10, 5.15]);
  assert.ok(Math.abs(q[2] - 9.15) < 1e-3, '保留離面 0.15 cm');
  assert.deepEqual(S.snap([0, 10, 20]), [0, 10, 20], '離面太遠唔郁');
});

test('i18n：人形掣中英文都有，字短（唔會擠爆掣列）', () => {
  const i18n = src('src/i18n.jsx');
  for (const k of ['view.figureCurrent', 'view.figureB']) {
    const vals = [...i18n.matchAll(new RegExp(`'${k.replace('.', '\\.')}': '([^']+)'`, 'g'))].map((m) => m[1]);
    assert.equal(vals.length, 2, k);
    for (const v of vals) assert.ok(v.length <= 18, `${k}: ${v}`);
  }
});

test('半截裙（B）：每個角度都包住盤骨同大髀（唔會穿出皮膚），向下唔會收窄', () => {
  for (const key of ['venture_girl', 'leader_girl']) {
    const g = key.split('_')[0];
    const L = layout('girl', g);
    const pos = body(key);
    const top = L.B.waist + 2, hem = top - 30;
    const sk = skirtRings(pos, REGIONS, { top, hem });
    assert.ok(sk.index.length > 0);
    const seg = sk.rings[0].r.length;
    for (let j = 1; j < sk.rings.length; j++) {
      for (let s = 0; s < seg; s++) assert.ok(sk.rings[j].r[s] >= sk.rings[j - 1].r[s] - 1e-9, '向下唔收窄');
    }
    const legs = new Set([REGION.pelvis, REGION.upperlegL, REGION.upperlegR, REGION.torso]);
    for (let i = 0; i < REGIONS.length; i++) {
      if (!legs.has(REGIONS[i])) continue;
      const y = pos[i * 3 + 1];
      if (y > top - 1 || y < hem + 1) continue;
      const ring = sk.rings.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a));
      const x = pos[i * 3], z = pos[i * 3 + 2] - ring.zc;
      const s = ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * seg) % seg) + seg) % seg;
      assert.ok(Math.hypot(x, z) < ring.r[s] + 0.3, `${key} y=${y.toFixed(1)}`);
    }
  }
});
