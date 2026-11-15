// v24：童軍專科徽章（綱要 P.45–47、P.84–86、P.124–125、P.146–147）、左袖菱形咬合（綱要 P.12 附圖）、專章帶（綱要 P.15–16）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible, shownReason, sleeveFace, profOverflow, sashActive } from '../src/three/badgeLayout.js';
import { layout, sashLayout, sashMesh, SASH } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const pub = (f) => new URL(`../public${f}`, import.meta.url);
const scout = read('src/data/scout_rules_v1.0.json');
const PROF = scout.badges.filter((b) => b.group === 'proficiency');
const OUTFIT = { gender: 'boy', invested: true };
const byArea = (a) => PROF.filter((b) => b.area === a);
const on = (list) => Object.fromEntries(list.map((b) => [b.id, true]));
// 每組揀幾個：教導 4、服務 6、技能 8、興趣 12 = 30
const PICK = [...byArea('instructor').slice(0, 4), ...byArea('service').slice(0, 6), ...byArea('pursuit').slice(0, 8), ...byArea('interest').slice(0, 12)];
const show = (state, { sash = false, gender = 'boy' } = {}) => visible(placeFor(scout, { ...OUTFIT, gender }), state, { invested: true, sash });
const sleeveOf = (list) => list.filter((p) => p.slot?.name === 'profL');
// 菱形唔重疊：|du|/(w/2) + |dv|/(h/2) ≥ 2（菱形距離）
const diamondApart = (a, b) => Math.abs(a.u - b.u) / ((a.w + b.w) / 4) + Math.abs(a.v - b.v) / ((a.h + b.h) / 4) >= 2 - 1e-6;

test('v24 規則資料通過驗證；111 個專科徽章：興趣 33、技能 35、服務 17、教導 26（綱要目錄）', () => {
  assert.deepEqual(validateRules(scout), []);
  assert.equal(PROF.length, 111);
  assert.deepEqual(
    ['interest', 'pursuit', 'service', 'instructor'].map((a) => byArea(a).length),
    [33, 35, 17, 26],
  );
  assert.deepEqual(scout.areas.map((a) => a.id), ['instructor', 'service', 'pursuit', 'interest'], '排序 = 專章帶由上至下（綱要 P.15 第 5.2 項）');
  assert.equal(new Set(PROF.map((b) => b.id)).size, 111);
  assert.equal(new Set(PROF.map((b) => b.art.file)).size, 111, '每個章一張圖');
});

test('每個專科徽章：圖檔存在（細過 6 KB）、來源係綱要、同組名同頁碼對得上', () => {
  const pages = { interest: [45, 47], pursuit: [84, 86], service: [124, 125], instructor: [146, 147] };
  let total = 0;
  for (const b of PROF) {
    assert.ok(existsSync(pub(b.art.file)), `${b.id} 冇圖`);
    const size = statSync(pub(b.art.file)).size;
    total += size;
    assert.ok(size < 6 * 1024, `${b.art.file} 太大（${size} B）`);
    assert.equal(b.art.ref, 'STS');
    const [lo, hi] = pages[b.area];
    assert.ok(+b.art.page >= lo && +b.art.page <= hi, `${b.id} 頁碼 ${b.art.page}`);
    assert.ok(b.art.file.startsWith(`/badges/scout_prof/${b.area}_`), b.art.file);
    assert.equal(b.anchor.slot, 'profL');
    assert.equal(b.sweater, false, '專章唔戴喺毛衣');
    assert.equal(b.size.wCm, b.size.hCm);
  }
  assert.ok(total < 300 * 1024, `專章圖合共 ${total} B（dist 5 MB 上限）`);
});

test('同名章：射箭、獨木舟、步操、氣象、風帆喺興趣組同技能組各有一個；拯溺係服務組', () => {
  const zh = (a) => new Set(byArea(a).map((b) => b.zh.name));
  for (const n of ['射箭章', '獨木舟章', '步操章', '氣象章', '風帆章']) assert.ok(zh('interest').has(n) && zh('pursuit').has(n), n);
  assert.ok(zh('service').has('拯溺章'));
});

test('教導組（綱要 P.146–147）：每個都有原組別嘅同名章', () => {
  const base = new Set(PROF.filter((b) => b.area !== 'instructor').map((b) => b.zh.name.replace(/章$/, '')));
  for (const b of byArea('instructor')) {
    assert.match(b.zh.name, /教導章$/);
    assert.ok(base.has(b.zh.name.replace(/教導章$/, '')), b.zh.name);
    assert.match(b.en.name, /^Instructor /);
  }
  const names = byArea('instructor').map((b) => b.zh.name.replace(/教導章$/, ''));
  for (const n of ['釣魚', '抱石', '營火', '單車', '天象', '露營', '先鋒工程', '編程', '樹木護理', '拯溺']) assert.ok(names.includes(n), n);
});

for (const gender of ['boy', 'girl']) {
  // v24b 用戶指示：童軍專科徽章可以排滿成隻袖（唔再限 8 個）
  test(`左袖（${gender}）：揀 30 個 → 排滿成隻袖 18 個，一行三個、上一行兩個……咬合七行（綱要 P.12 附圖）`, () => {
    const list = sleeveOf(show(on(PICK), { gender }));
    assert.equal(list.length, 18);
    const rows = [...new Set(list.map((p) => Math.round(p.v * 10)))].sort((a, b) => a - b);
    assert.equal(rows.length, 7);
    assert.deepEqual(rows.map((r) => list.filter((p) => Math.round(p.v * 10) === r).length), [3, 2, 3, 2, 3, 2, 3]);
    assert.ok(Math.min(...list.map((p) => p.v - p.h / 2)) >= 1, '最上一行仲喺袖上面（離膊頭 ≥ 1 cm）');
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) assert.ok(diamondApart(list[i], list[j]), `${list[i].id} 同 ${list[j].id} 疊埋`);
    const face = sleeveFace(gender, 'scout');
    for (const p of list) {
      assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-6, `${p.id} 出咗袖面`);
      assert.ok(p.v + p.h / 2 <= face.cuffSeam, `${p.id} 低過袖口縫線`);
      assert.equal(p.mount, 'l');
    }
  });
}

test('左袖排序：教導組喺最上面一行、近前面先；之後服務組（綱要 P.12 附圖、P.15 第 5.2 項）', () => {
  const list = sleeveOf(show(on(PICK)));
  const topV = Math.min(...list.map((p) => p.v));
  const topRow = list.filter((p) => Math.abs(p.v - topV) < 0.05).sort((a, b) => a.u - b.u); // 左袖：u 細 = 近前面
  assert.deepEqual(topRow.map((p) => p.id), byArea('instructor').slice(0, 3).map((b) => b.id));
  const shownIds = new Set(list.map((p) => p.id));
  assert.ok(byArea('instructor').slice(0, 4).every((b) => shownIds.has(b.id)), '4 個教導章都顯示');
  assert.ok(byArea('service').slice(0, 4).every((b) => shownIds.has(b.id)));
  assert.ok(!byArea('interest').some((b) => shownIds.has(b.id)), '興趣組排最後，放唔落');
});

test('只揀 2 個：同一行、喺袖口縫線上面（由袖口排起），近前面先', () => {
  const list = sleeveOf(show(on(byArea('service').slice(0, 2))));
  assert.equal(list.length, 2);
  assert.equal(list[0].v, list[1].v);
  const face = sleeveFace('boy', 'scout');
  for (const p of list) assert.ok(Math.abs(p.v + p.h / 2 - (face.cuffSeam - 0.4)) < 0.02);
  const first = list.find((p) => p.id === byArea('service')[0].id);
  assert.ok(first.u < 0, '第一個近前面（左袖 u − = 前）');
});

test('未能顯示嘅數目（用戶指示：放唔落要講明）', () => {
  assert.deepEqual(profOverflow(scout, on(PICK)), { on: 30, sash: 0, sleeve: 18, hidden: 12 });
  assert.deepEqual(profOverflow(scout, on(PICK), { sash: true }), { on: 30, sash: 16, sleeve: 14, hidden: 0 });
  assert.deepEqual(profOverflow(scout, on(PICK.slice(0, 5))), { on: 5, sash: 0, sleeve: 5, hidden: 0 });
  assert.deepEqual(profOverflow(scout, on(PICK.slice(0, 20)), { sash: true }), { on: 20, sash: 16, sleeve: 4, hidden: 0 });
  assert.equal(shownReason(scout, OUTFIT, on(PICK), PICK[29].id), 'slotFull');
  assert.equal(shownReason(scout, { ...OUTFIT, sash: true }, on(PICK.slice(0, 20)), PICK[19].id), null, '第 20 個喺袖');
});

test('專章帶：頭 16 個戴喺帶上（教導 → 服務 → 技能 → 興趣），第 17 個起戴喺左袖', () => {
  const list = show(on(PICK), { sash: true });
  const onS = list.filter((p) => p.onSash).sort((a, b) => a.sashIndex - b.sashIndex);
  assert.equal(onS.length, 16);
  const order = PICK.slice(0, 16).map((b) => b.id);
  assert.deepEqual(onS.map((p) => p.id), order);
  const sl = sleeveOf(list);
  assert.equal(sl.length, 14);
  assert.deepEqual(new Set(sl.map((p) => p.id)), new Set(PICK.slice(16, 30).map((b) => b.id)));
  for (const p of onS) {
    assert.equal(p.mount, 'torso');
    assert.equal(p.slot, undefined);
    assert.equal(p.rot.length, 3);
  }
});

for (const gender of ['boy', 'girl']) {
  test(`專章帶（${gender}）幾何：13 cm 闊、由左肩（+x）落右腰（−x）、章喺帶綠色範圍內同上身入面`, () => {
    const L = layout(gender, 'scout');
    const S = sashLayout(L);
    assert.equal(SASH.widthCm, 13);
    assert.equal(SASH.edgeCm, 0.75);
    assert.ok(S.cTop > 0 && S.k > 0, '頂喺穿著者左、向穿著者右斜落');
    assert.ok(S.y2 < L.B.waist && S.y2 > L.B.torso.y - 3, '帶最低點喺腰（右褲袋口附近）');
    const half = SASH.badgeSide / 2;
    const h = half * (Math.cos(S.rotZ) + Math.sin(S.rotZ));
    for (const q of S.slots) {
      const across = (q.x - (S.cTop - S.k * (S.top - q.y))) * Math.cos(S.theta); // 離中線（垂直）
      assert.ok(Math.abs(across) + half <= SASH.widthCm / 2 - SASH.edgeCm + 1e-6, `slot ${q.i} 壓住紅邊`);
      assert.ok(q.x - h >= -S.hw - 1e-6 && q.x + h <= S.hw, `slot ${q.i} 出咗上身`);
      assert.ok(q.y + h <= S.top && q.y - h >= L.B.torso.y, `slot ${q.i} 高度`);
    }
    // 2 × 2 一組：同組四個唔疊（帶方向計，正方形）；組次序附圖（一）：1 左下、2 右下、3 左上、4 右上
    for (let i = 0; i < S.slots.length; i++) {
      for (let j = i + 1; j < S.slots.length; j++) {
        const a = S.slots[i];
        const b = S.slots[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const u = Math.abs(dx * Math.sin(S.theta) + dy * Math.cos(S.theta)); // 沿帶
        const v = Math.abs(dx * -Math.cos(S.theta) + dy * Math.sin(S.theta)); // 橫向
        assert.ok(u >= SASH.badgeSide - 1e-6 || v >= SASH.badgeSide - 1e-6, `slot ${i}、${j} 疊埋`);
      }
    }
    const s = S.slots;
    assert.ok(s[2].y > s[0].y && s[3].y > s[1].y, '3、4 喺 1、2 上面');
    assert.ok(s[4].y < s[0].y, '第二組喺第一組下面');
    assert.ok(Math.abs(S.rotZ - (Math.PI / 4 - S.theta)) < 1e-9, '章頂沿帶方向轉 45°（附圖二）');
  });
}

test('專章帶 mesh：前、後、右側、膊頂；u 喺 0–1，頂點貼住上身外面', () => {
  const L = layout('boy', 'scout');
  const S = sashLayout(L);
  const m = sashMesh(S);
  assert.equal(m.positions.length / 3, m.uvs.length / 2);
  assert.equal(m.indices.length % 6, 0);
  const quads = m.indices.length / 6;
  assert.equal(quads, (S.sections.length - 1) * 2 + 2);
  for (let i = 0; i < m.uvs.length; i += 2) assert.ok(m.uvs[i] >= -1e-9 && m.uvs[i] <= 1 + 1e-9);
  for (let i = 0; i < m.positions.length; i += 3) {
    const [x, y, z] = m.positions.slice(i, i + 3);
    assert.ok(Math.abs(x) <= S.hw + S.t + 1e-6 && Math.abs(z) <= S.front + S.t + 1e-6 && y <= S.top + S.t + 1e-6, `頂點 ${i / 3}`);
  }
  assert.ok(S.z < 8.5 + 0.35, '帶同章喺旅巾後面（旅巾放喺專章帶外，綱要 P.16 第 6.4 項）');
});

test('專章帶只限整齊制服：著毛衣就唔戴（綱要 P.15 第 4.2 項）；其他支部冇專章帶', () => {
  const st = on(PICK);
  assert.equal(sashActive(scout, { ...OUTFIT, sash: true }, st), true);
  assert.equal(sashActive(scout, { ...OUTFIT, sash: true, sweater: true }, st), false);
  assert.equal(sashActive(scout, { ...OUTFIT, sash: false }, st), false);
  for (const id of ['cub', 'venture', 'rover', 'leader', 'grasshopper']) {
    const r = read(`src/data/${id}_rules_v1.0.json`);
    assert.equal(sashActive(r, { ...OUTFIT, sash: true }, st), false, id);
  }
  // 著毛衣：專章全部唔戴
  const sw = visible(placeFor(scout, { ...OUTFIT, sweater: true }), on(PICK), { invested: true });
  assert.equal(sw.filter((p) => p.id.startsWith('prof')).length, 0);
});

test('唔可以戴喺專章帶嘅章（綱要 P.15 第 5.3 項）：地球部落、積極公民唔係 profL', () => {
  for (const b of scout.badges.filter((x) => x.group === 'extra')) assert.notEqual(b.anchor.slot, 'profL', b.id);
});

test('海童軍、空童軍：專章位置同陸上一樣', () => {
  const base = show(on(PICK), { sash: true });
  for (const variant of ['sea', 'air']) {
    const v = visible(placeFor(scout, { ...OUTFIT, variant }), on(PICK), { invested: true, sash: true });
    assert.deepEqual(v, base, variant);
  }
});

test('v24 介面：專科徽章格仔、專章帶開關、未能顯示提示；中英齊；規定分頁有專章帶', () => {
  const app = text('src/App.jsx');
  assert.ok(app.includes('function ProficiencyGrid'));
  assert.ok(app.includes("t('badges.profHidden')"));
  assert.ok(app.includes("t('badges.sash')"));
  const i18n = text('src/i18n.jsx');
  for (const k of ['badges.prof', 'badges.profNote', 'badges.sash', 'badges.sashSweater', 'badges.sashHint', 'badges.profCount', 'badges.profCountSash', 'badges.profHidden', 'badges.profClear', 'badges.sashRule']) {
    assert.equal(i18n.split(`'${k}':`).length - 1, 2, `${k} 中英各一`);
  }
  assert.ok(text('src/rulesGuide.js').includes("'badges.sashRule'"));
});
