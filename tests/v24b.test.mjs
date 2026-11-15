// v24b：各支部先修章、深資童軍議會最新附圖（和平使者章、左右袖）、童軍左袖排滿、幼童軍維持 11 個同三級制度章
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const pub = (f) => new URL(`../public${f}`, import.meta.url);
const R = Object.fromEntries(['cub', 'scout', 'venture', 'rover'].map((s) => [s, read(`src/data/${s}_rules_v1.0.json`)]));
const one = (list, id) => list.find((p) => p.id === id);
const badge = (r, id) => r.badges.find((b) => b.id === id);
const OUTFIT = { gender: 'boy', invested: true };
const BASE = { membership: true, hongKong: true, troop: true, region: true, district: true };
const show = (r, state, outfit = OUTFIT) => visible(placeFor(r, outfit), { ...BASE, ...state }, { invested: true });
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

test('v24b 規則資料通過驗證', () => {
  for (const [k, r] of Object.entries(R)) assert.deepEqual(validateRules(r), [], k);
});

test('先修章：幼童軍 → 童軍先修章；童軍 → 童軍＋深資童軍先修章；深資 → 深資＋樂行童軍先修章；樂行 → 樂行童軍先修章', () => {
  const want = { cub: ['scoutLink'], scout: ['ventureLink', 'scoutLink'], venture: ['ventureLink', 'roverLink'], rover: ['roverLink'] };
  for (const [s, ids] of Object.entries(want)) {
    for (const id of ids) {
      const b = badge(R[s], id);
      assert.ok(b, `${s} 有 ${id}`);
      assert.equal(b.group, 'extra');
      assert.equal(b.anchor.slot, 'pocketR');
      assert.equal(b.anchor.layer, 'flap');
      assert.equal(b.sweater, false);
    }
  }
  assert.equal(badge(R.scout, 'scoutLink').art.file, badge(R.cub, 'scoutLink').art.file, '童軍先修章同幼童軍用同一個圖案');
  assert.equal(badge(R.venture, 'roverLink').art.file, '/badges/extra/rover_link.png');
  assert.equal(badge(R.rover, 'roverLink').art.file, '/badges/extra/rover_link.png');
  const f = pub('/badges/extra/rover_link.png');
  assert.ok(existsSync(f) && statSync(f).size < 20_000);
  assert.deepEqual(pngSize(readFileSync(f)), badge(R.venture, 'roverLink').art.px);
  assert.ok(badge(R.scout, 'scoutLink').sources.some((x) => x.ref === 'UH' && x.page === '142'), '手冊 P.142');
  assert.ok(badge(R.venture, 'roverLink').sources.some((x) => x.ref === 'VTS' && x.page === '57'), '深資童軍綱要 P.57');
  assert.ok(!R.rover.notAllowed.some((n) => n.id === 'preEntry'), '樂行童軍唔再寫「先修章未有示範」');
  assert.ok(!R.venture.notAllowed.find((n) => n.id === 'preEntry').zh.includes('先修章'));
});

test('先修章喺右胸袋袋蓋上、支部最高獎章標誌內側（左方）；先修章最內側', () => {
  const { B, top } = layout('boy', 'scout');
  const flapTop = top - B.pocket.top;
  const cases = [
    ['scout', ['emblemBauhinia', 'ventureLink', 'scoutLink']],
    ['venture', ['emblemBauhinia', 'emblemChief', 'ventureLink', 'roverLink']],
    ['rover', ['emblemBauhinia', 'emblemChief', 'emblemScoutAward', 'roverLink']],
  ];
  for (const [s, ids] of cases) {
    const st = Object.fromEntries(ids.map((id) => [id, true]));
    const on = show(R[s], st);
    const xs = ids.map((id) => {
      const p = one(on, id);
      assert.ok(p, `${s} ${id} 顯示`);
      return p.x;
    });
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `${s}：${ids[i]} 喺 ${ids[i - 1]} 內側（左方）`);
    assert.ok(xs.every((x) => x < 0), '右胸（x −）');
    if (s === 'scout') for (const id of ids) assert.ok(Math.abs(one(on, id).y - one(on, id).h / 2 - flapTop) < 1e-9, `${id} 緊貼袋蓋`);
  }
  // 只戴先修章：置中喺袋蓋
  for (const [s, id] of [['scout', 'scoutLink'], ['rover', 'roverLink']]) {
    const { B: B2 } = layout('boy', s);
    assert.ok(Math.abs(one(show(R[s], { [id]: true }), id).x + B2.pocket.x) < 1e-9, `${s} ${id} 置中`);
  }
});

test('深資：和平使者章戴喺左胸袋中央，代替世界童軍會員章（深資童軍議會「左胸口」附圖）', () => {
  const { B } = layout('boy', 'venture');
  const on = show(R.venture, { peace: true });
  const p = one(on, 'peace');
  assert.ok(p);
  assert.equal(p.x, B.pocket.x, '左胸袋中央');
  assert.ok(!one(on, 'membership'), '唔再另外戴會員章');
  assert.equal(shownReason(R.venture, OUTFIT, { ...BASE, peace: true }, 'membership'), 'replaced_peace');
  assert.ok(badge(R.venture, 'peace').sources.some((x) => x.ref === 'VSC'));
  assert.ok(R.venture.sources.VSC, '登記咗深資童軍議會附圖做來源');
  // 宗教章同紀念章而家可以一齊戴喺右袋蓋上方
  const two = show(R.venture, { faith: 'religious', commemorative: true });
  assert.ok(one(two, 'faith') && one(two, 'commemorative'));
});

const VENTURE_L = { hkayp: 'gold', airCrew: 'advanced', seaBadge: 'helmsman', firstAid: true, lifesaving: true, community: true };
const vState = () => {
  const s = {};
  for (const [id, v] of Object.entries(VENTURE_L)) {
    const b = badge(R.venture, id);
    s[id] = b.choices ? b.choices[b.choices.length - 1].id : v;
  }
  return s;
};

test('深資左袖（深資童軍議會「左袖」附圖）：香港青年獎勵計劃最高；航空（前）海上（後）喺兩側；下面急救章 → 拯溺布章 → 社區參與章（4 cm）', () => {
  const face = sleeveFace('boy', 'venture');
  const on = show(R.venture, vState()).filter((p) => p.mount === 'l');
  const [ay, air, sea, aid, ls, ci] = ['hkayp', 'airCrew', 'seaBadge', 'firstAid', 'lifesaving', 'community'].map((id) => one(on, id));
  for (const p of [ay, aid, ls, ci]) assert.ok(Math.abs(p.u) < 1e-9, `${p.id} 喺中央`);
  assert.ok(air.u < -ay.w / 2 && sea.u > ay.w / 2, '航空前（u −）、海上後，喺香港青年獎勵計劃獎章兩側');
  assert.equal(air.v, sea.v);
  assert.ok(air.v > ay.v && air.v - air.h / 2 < ay.v + ay.h / 2, '兩側章低過香港青年獎勵計劃獎章，但同佢有部分同一高度（咬合）');
  assert.ok(ay.v - ay.h / 2 === 2, '由膊頭下 2 cm 開始');
  assert.ok(aid.v - aid.h / 2 >= air.v + air.h / 2, '急救章喺兩側章下面');
  assert.ok(ls.v - ls.h / 2 > aid.v + aid.h / 2 && ci.v - ci.h / 2 > ls.v + ls.h / 2, '急救章 → 拯溺布章 → 社區參與章');
  assert.equal(ci.w, 4);
  assert.equal(ci.h, 4);
  assert.ok(ci.v + ci.h / 2 <= face.cuffSeam);
});

test('深資左袖：只戴航空活動徽章都喺前面一側（唔會走去中間）；冇香港青年獎勵計劃就由膊頭下 2 cm 開始', () => {
  const st = vState();
  const only = show(R.venture, { hkayp: st.hkayp, airCrew: st.airCrew }).filter((p) => p.mount === 'l');
  assert.ok(one(only, 'airCrew').u < -1, '前面一側');
  const noAyp = show(R.venture, { airCrew: st.airCrew, seaBadge: st.seaBadge, firstAid: true }).filter((p) => p.mount === 'l');
  const air = one(noAyp, 'airCrew');
  assert.equal(air.v - air.h / 2, 2, '冇上層就唔向上移');
  assert.ok(one(noAyp, 'firstAid').v - one(noAyp, 'firstAid').h / 2 >= air.v + air.h / 2);
});

test('深資全部開：左袖同段章、金帶唔重疊，全部喺袖面入面', () => {
  const face = sleeveFace('boy', 'venture');
  const extras = R.venture.badges.filter((b) => b.group === 'extra');
  const all = Object.fromEntries(extras.map((b) => [b.id, b.choices ? b.choices[b.choices.length - 1].id : true]));
  const on = show(R.venture, all).filter((p) => p.mount === 'l' || p.mount === 'r');
  const rect = (p) => [p.u - p.w / 2, p.u + p.w / 2, p.v - p.h / 2, p.v + p.h / 2];
  for (let i = 0; i < on.length; i++) {
    for (let j = i + 1; j < on.length; j++) {
      const [a, b] = [on[i], on[j]];
      if (a.mount !== b.mount) continue;
      const [A, C] = [rect(a), rect(b)];
      const ov = Math.min(A[1], C[1]) - Math.max(A[0], C[0]) > 0.01 && Math.min(A[3], C[3]) - Math.max(A[2], C[2]) > 0.01;
      assert.ok(!ov, `${a.key} 同 ${b.key} 重疊`);
    }
  }
  for (const p of on) {
    assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-9, `${p.key} 出咗袖`);
    assert.ok(p.v + p.h / 2 <= face.cuffSeam + 1e-9, `${p.key} 落咗袖口`);
  }
});

test('深資右袖：世界童軍組織徽章 4 cm、最多四個，一行喺地域章／區章下面；冇急救章同社區參與章', () => {
  const WOSM = ['earthTribe', 'plasticTide', 'natureChampions', 'goSolar', 'heritage', 'worldScout'];
  for (const id of WOSM) {
    const b = badge(R.venture, id);
    assert.equal(b.size.wCm, 4, id);
    assert.equal(b.anchor.slot, 'sleeveR');
  }
  assert.ok(!R.venture.slots.sleeveR.layers.some((l) => l.id === 'aid'));
  const face = sleeveFace('boy', 'venture');
  const two = show(R.venture, { earthTribe: true, plasticTide: true }).filter((p) => p.slot?.layer === 'row');
  assert.ok(two.every((p) => p.w === 4), '兩個：照 4 cm');
  const four = show(R.venture, Object.fromEntries(WOSM.map((id) => [id, true]))).filter((p) => p.slot?.layer === 'row');
  assert.equal(four.length, 4);
  const region = one(show(R.venture, {}), 'region');
  for (const p of four) {
    assert.ok(p.w >= 3.5, `${p.id} 仲有 ≥ 3.5 cm（袖面得 ${face.width} cm）`);
    assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2, `${p.id} 喺袖面入面`);
    assert.ok(p.v - p.h / 2 > region.v + region.h / 2);
  }
  assert.equal(shownReason(R.venture, OUTFIT, { ...BASE, ...Object.fromEntries(WOSM.map((id) => [id, true])) }, 'worldScout'), 'slotFull');
});

test('童軍左袖專科徽章：最多 18 個（排滿成隻袖，用戶指示）', () => {
  assert.equal(R.scout.slots.profL.layers[0].max, 18);
  assert.equal(R.scout.slots.profL.sash.max, 16);
});

test('幼童軍：活動徽章仍然最多 11 個；七個三級制度章同四個核心範疇章都係一個開關揀一個級別（用戶確認）', () => {
  assert.equal(R.cub.slots.activityL.layers[0].max, 11);
  const graded = R.cub.badges.filter((b) => b.anchor?.slot === 'activityL' && b.choices).map((b) => b.id).sort();
  assert.deepEqual(graded, ['actArchery', 'actAthletics', 'actCanoe', 'actFitness', 'actMusic', 'actOrienteering', 'actSwimmer']);
  for (const id of [...graded, 'coreSkills', 'coreCaring', 'coreCommunity', 'coreFamily']) {
    assert.deepEqual(badge(R.cub, id).choices.map((c) => c.id), ['none', 'bronze', 'silver', 'gold'], id);
    assert.equal(badge(R.cub, id).default, 'none');
  }
});
