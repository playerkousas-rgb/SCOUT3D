// v33（ADR-0030）：B 人台換做 MakeHuman CC0 真人身體＋真衫褲（制服企姿、按制服切）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePositions, vertexNormals, REGION, garmentRules, torsoGroups } from '../src/three/mannequin.js';
import { expand, keepDistance, clipMesh, hiddenBody, visibleFaces, shirtLayer, decodeItem, cutItem } from '../src/three/mh.js';
import { layout } from '../src/three/body.js';

const D = new URL('../public/models/mannequin/', import.meta.url);
const rd = (f) => { const x = fs.readFileSync(new URL(f, D)); return x.buffer.slice(x.byteOffset, x.byteOffset + x.length); };
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const faces = new Uint16Array(rd('faces.bin'));
const regions = new Uint8Array(rd('regions.bin'));
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const item = (key, k) => decodeItem({ src: rd(`${k}_src.bin`), faces: rd(`${k}_faces.bin`), uv: rd(`${k}_uv.bin`), regions: rd(`${k}_regions.bin`), pos: rd(`${key}_${k}.bin`), hides: idx.items[k].hides ? rd(`${k}_hides.bin`) : null }, idx.unit, decodePositions, vertexNormals);
const body = (key) => decodePositions(new Int16Array(rd(`${key}.bin`)), idx.unit);
const KEYS = ['grasshopper', 'cub', 'scout', 'venture', 'leader'].flatMap((s) => [`${s}_boy`, `${s}_girl`]);

test('v33 來源：MakeHuman CC0（經 vrm-avatar-maker），LICENSE 講清楚；Anny 版已刪', () => {
  assert.match(idx.source, /MakeHuman CC0/);
  const lic = src('public/models/mannequin/LICENSE.md');
  assert.match(lic, /CC0/);
  assert.match(lic, /vrm-avatar-maker/);
  assert.ok(!fs.existsSync(new URL('../scripts/mannequin/build_mannequin.py', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../scripts/mannequin/build_mh.mjs', import.meta.url)));
  assert.doesNotMatch(src('src/three/Mannequin.jsx'), /hairRules|skirtRings|Anny/);
});

test('v33 每個身形：男仔短髮、女仔 bob＋半截裙；衫、鞋、五官齊；頂點數對得上', () => {
  for (const key of KEYS) {
    const b = idx.bodies[key];
    const girl = key.endsWith('girl');
    assert.equal(b.hair, girl ? 'hairBob' : 'hairShort', key);
    for (const k of ['shirt', 'shoes', 'eyes', 'brows', 'lashes', b.hair]) assert.ok(b.items.includes(k), `${key} ${k}`);
    assert.equal(b.items.includes('skirt'), girl, key);
    for (const k of b.items) assert.equal(new Int16Array(rd(`${key}_${k}.bin`)).length, idx.items[k].vertices * 3, `${key} ${k}`);
    assert.equal(body(key).length, idx.vertices * 3);
  }
});

test('v33 制服企姿：手垂直（手腕喺膊頭下面、唔會打開）、腳併埋（腳眼窄過盤骨）', () => {
  for (const key of KEYS) {
    const J = idx.bodies[key].joints;
    const h = idx.bodies[key].height;
    for (const s of ['L', 'R']) {
      const sh = J[`shoulder${s}`], wr = J[`wrist${s}`], hip = J[`hip${s}`], an = J[`ankle${s}`];
      assert.ok(sh[1] - wr[1] > 0.25 * h, `${key} 手垂落 ${sh[1]} → ${wr[1]}`);
      assert.ok(Math.abs(wr[0] - sh[0]) < 0.05 * h, `${key} 手冇打開 ${(wr[0] - sh[0]).toFixed(1)}`);
      assert.ok(Math.abs(an[0]) <= Math.abs(hip[0]) + 0.5, `${key} 腳併埋 ${an[0]} vs ${hip[0]}`);
    }
    // 腰喺大髀關節上面
    assert.ok(idx.bodies[key].waist > J.hipL[1] && idx.bodies[key].waist < J.hipL[1] + 0.08 * h, key);
  }
});

test('v33 clipMesh：沿 K = 0 切成直邊，屬性插值；冇 K < 0 嘅點', () => {
  // 一個三角形，一點喺外面
  const position = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]);
  const uv = new Float32Array([0, 0, 1, 0, 0, 1]);
  const K = new Float32Array([1, 1, -1]); // y = 1 切
  const c = clipMesh({ position: [position, 3], uv: [uv, 2] }, [0, 1, 2], K);
  assert.equal(c.count, 6); // 四邊形 = 兩個三角形
  const P = c.attrs.position[0];
  for (let i = 1; i < P.length; i += 3) assert.ok(P[i] <= 1 + 1e-6, `y ${P[i]}`);
  const c2 = clipMesh({ position: [position, 3] }, [0, 1, 2], new Float32Array([-1, -1, -1]));
  assert.equal(c2.count, 0);
});

test('v33 恤衫：短袖切喺 B.sleeve.len、長袖去到手腕；衫腳喺腰（小草蜢唔塞，蓋過褲頭）', () => {
  for (const key of ['scout_boy', 'venture_girl', 'grasshopper_boy', 'leader_boy']) {
    const [sec, g] = key.split('_');
    const L = layout(g, sec);
    const B = L.B;
    const b = idx.bodies[key];
    const pos = body(key);
    const G = garmentRules({ pos, regions, joints: b.joints, L, long: false, sleeveLen: B.sleeve.len, pantsHem: 50, trousers: false, sockTop: 0, shoeTop: 6 });
    const fr = G.shirt.frames;
    const bottom = sec === 'grasshopper' ? b.waist - 9 : b.waist;
    const suit = item(key, 'shirt');
    for (const long of [false, true]) {
      const end = { l: long ? fr.l.wristY + 1.5 : fr.l.seamY - B.sleeve.len, r: long ? fr.r.wristY + 1.5 : fr.r.seamY - B.sleeve.len };
      const { sh, isSleeve } = shirtLayer(suit, { bottom, sleeve: { frames: fr, end } });
      let lowSleeve = Infinity, lowBody = Infinity;
      for (let i = 0; i < sh.index.length; i += 3) {
        const a = sh.index[i];
        const p = [sh.position[a * 3], sh.position[a * 3 + 1], sh.position[a * 3 + 2]];
        if (isSleeve(a, sh.index[i + 1], sh.index[i + 2])) lowSleeve = Math.min(lowSleeve, fr.l.toLocal(p[0] > 0 ? p : [-p[0], p[1], p[2]])[1]);
        else lowBody = Math.min(lowBody, p[1]);
      }
      if (!long) assert.ok(Math.abs(lowSleeve - end.l) < 1.2, `${key} 袖口 ${lowSleeve.toFixed(1)} vs ${end.l.toFixed(1)}`);
      else assert.ok(lowSleeve < fr.l.elbowY - 5, `${key} 長袖過手肘 ${lowSleeve.toFixed(1)}`);
      assert.ok(lowBody >= bottom - 0.6 && lowBody < bottom + 3, `${key} 衫腳 ${lowBody.toFixed(1)} vs ${bottom}`);
      // 冇 NaN
      assert.ok(sh.position.every(Number.isFinite));
    }
  }
});

test('v33 恤衫貼圖：方塊以外（兩側、衫腳下面、側面）用素色，唔拉長貼圖邊', () => {
  const key = 'cub_boy';
  const L = layout('boy', 'cub');
  const t = L.B.torso;
  const b = idx.bodies[key];
  const G = garmentRules({ pos: body(key), regions, joints: b.joints, L, long: false, sleeveLen: L.B.sleeve.len, pantsHem: 50, trousers: false, sockTop: 0, shoeTop: 6 });
  const fr = G.shirt.frames;
  const { sh, isSleeve } = shirtLayer(item(key, 'shirt'), { bottom: b.waist, sleeve: { frames: fr, end: { l: fr.l.seamY - 15, r: fr.r.seamY - 15 } } });
  const tg = torsoGroups(sh, { w: t.w, h: t.h, d: t.d, cy: t.y + t.h / 2 }, isSleeve, { plainOutside: true });
  assert.ok(tg.uv2 && tg.uv2.length === (tg.position.length / 3) * 2, '摺痕明暗 UV');
  for (const g of tg.groups) {
    if (g.materialIndex !== 4) continue;
    for (let i = g.start; i < g.start + g.count; i++) {
      assert.ok(Math.abs(tg.position[i * 3]) <= t.w / 2 + 2, '前幅喺方塊闊度入面');
    }
  }
  assert.ok(tg.groups[4].count > 0 && tg.groups[6].count > 0);
});

test('v33 身體：件衫入面嘅三角形收埋，切短咗嘅位（前臂、膝頭）照畫', () => {
  const key = 'scout_boy';
  const pos = body(key);
  const suit = item(key, 'shirt');
  const L = layout('boy', 'scout');
  const b = idx.bodies[key];
  const G = garmentRules({ pos, regions, joints: b.joints, L, long: false, sleeveLen: L.B.sleeve.len, pantsHem: 50, trousers: false, sockTop: 0, shoeTop: 6 });
  const fr = G.shirt.frames;
  const rule = { bottom: b.waist, sleeve: { frames: fr, end: { l: fr.l.seamY - L.B.sleeve.len, r: fr.r.seamY - L.B.sleeve.len } } };
  const Ks = keepDistance(pos, regions, rule);
  const Kp = keepDistance(pos, regions, { top: b.waist, bottom: 50, noArms: true });
  const hid = hiddenBody(pos.length / 3, [{ hides: suit.hides, K: Ks.map((k, i) => Math.max(k, Kp[i])) }]);
  let torsoHid = 0, torsoAll = 0, foreHid = 0, kneeHid = 0;
  for (let i = 0; i < regions.length; i++) {
    const y = pos[i * 3 + 1];
    if (regions[i] === REGION.torso && y < b.joints.neck[1] - 8 && y > b.waist + 4) { torsoAll++; torsoHid += hid[i]; }
    if (regions[i] === REGION.lowerarmL || regions[i] === REGION.lowerarmR) foreHid += hid[i];
    if ((regions[i] === REGION.lowerlegL || regions[i] === REGION.lowerlegR) && y < 50 - 3) kneeHid += hid[i];
  }
  assert.ok(torsoHid / torsoAll > 0.8, `上身收埋 ${torsoHid}/${torsoAll}`);
  assert.equal(foreHid, 0, '前臂（短袖下面）照畫');
  assert.equal(kneeHid, 0, '褲腳下面照畫');
  const rs = new Uint16Array(rd('body_render_src.bin'));
  const rf = new Uint16Array(rd('body_render_faces.bin'));
  const vis = visibleFaces(rf, rs, hid);
  assert.ok(vis.length < rf.length && vis.length > rf.length * 0.4);
});

test('v33 褲、裙唔包手臂（件衫長袖垂到褲頭下面）；裙冇兩腳之間嘅尖', () => {
  const key = 'venture_girl';
  const b = idx.bodies[key];
  const suit = item(key, 'shirt');
  const c = cutItem(suit, keepDistance(suit.pos, suit.regions, { top: b.waist, bottom: 50, noArms: true }), 0, { r: Float32Array.from(suit.regions) });
  const R = c.attrs.r[0];
  for (let i = 0; i < R.length; i++) assert.ok(![REGION.lowerarmL, REGION.lowerarmR, REGION.handL, REGION.handR].includes(Math.round(R[i])) || false);
  const sk = item(key, 'skirt');
  assert.ok(expand(sk.pos, sk.src).every(Number.isFinite));
  assert.match(src('src/three/Mannequin.jsx'), /兩腳之間會拉低一個尖/);
});

test('v33 Mannequin.jsx：真頭髮戴帽切帽口以上；鞋、眼、眉、眼睫毛有畫；方塊企領唔再加', () => {
  const m = src('src/three/Mannequin.jsx');
  assert.match(m, /hb\.top - cut/);
  for (const k of ["'eyes', 'brows', 'lashes'", 'shade_suit.jpg', 'shade_skirt.jpg', 'shade_shoes.jpg', 'skin_${skinKey}.jpg']) assert.ok(m.includes(k), k);
  assert.match(src('src/three/Blocky.jsx'), /真衫本身有衣領，唔再加方塊企領/);
});
