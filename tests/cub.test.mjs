// 幼童軍規則、擺位、自選圖案測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';
import { meritColour, meritYearOk, resolveArt, findDistrict, allDistricts, MERIT_ART } from '../src/lib/picks.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const cub = read('src/data/cub_rules_v1.0.json');
const grasshopper = read('src/data/grasshopper_rules_v1.0.json');
const districts = read('src/data/districts_v1.0.json');
const pub = (f) => existsSync(new URL(`../public${f}`, import.meta.url));
const by = (list, id) => list.find((p) => p.id === id);
const badge = (id) => cub.badges.find((b) => b.id === id);

test('幼童軍規則資料通過驗證', () => {
  assert.deepEqual(validateRules(cub), []);
  assert.equal(cub.section.id, 'cub');
  assert.equal(cub.fileVersion, 'v1.0');
});

test('第一版只有制服頁徽章（手冊 P.26–29、P.92–95、P.159）', () => {
  assert.deepEqual(cub.badges.map((b) => b.id).sort(), ['district', 'hongKong', 'membership', 'meritorious', 'region', 'troop']);
  for (const b of cub.badges) assert.ok(b.sources.length, `${b.id} 冇來源`);
});

for (const gender of ['boy', 'girl']) {
  test(`幼童軍（${gender}）：會員章喺左胸袋中央，香港章喺左袋蓋上面 3 cm（手冊 P.92–93）`, () => {
    const { B, top } = layout(gender, 'cub');
    const all = placeAll(cub, gender);
    const m = by(all, 'membership');
    const hk = by(all, 'hongKong');
    assert.equal(m.mount, 'torso');
    assert.ok(m.x > 0, '會員章要喺穿著者左邊（+x）');
    assert.equal(m.x, B.pocket.x);
    const flapTop = top - B.pocket.top;
    assert.ok(m.y < flapTop - B.pocket.flap && m.y > flapTop - B.pocket.h, '會員章要喺袋身入面');
    assert.equal(hk.x, B.pocket.x);
    assert.ok(Math.abs(hk.y - hk.h / 2 - (flapTop + 3)) < 1e-9, '香港章底要喺袋蓋頂上 3 cm');
  });

  test(`幼童軍（${gender}）：右袖 旅章 → 2 cm → 地域章（前）＋區章（後），相距 1 cm（手冊 P.94–95）`, () => {
    const all = placeAll(cub, gender);
    const troop = by(all, 'troop');
    const region = by(all, 'region');
    const district = by(all, 'district');
    for (const p of [troop, region, district]) assert.equal(p.mount, 'r');
    assert.ok(Math.abs(troop.v - troop.h / 2 - 2) < 1e-9, '旅章頂離肩膊縫 2 cm');
    const troopBottom = troop.v + troop.h / 2;
    for (const p of [region, district]) assert.ok(Math.abs(p.v - p.h / 2 - (troopBottom + 2)) < 1e-9, `${p.id} 要喺旅章下 2 cm`);
    // 右袖：u > 0 = 望住袖外側右手邊 = 穿著者前面
    assert.ok(region.u > 0, '地域章要喺前面');
    assert.ok(district.u < 0, '區章要喺後面');
    const gap = region.u - region.w / 2 - (district.u + district.w / 2);
    assert.ok(Math.abs(gap - 1) < 0.05, `兩個章相距約 1 cm（而家 ${gap}）`);
    const face = sleeveFace(gender, 'cub');
    assert.ok(region.u + region.w / 2 <= face.width / 2, '地域章唔可以出咗袖面');
  });

  test(`幼童軍（${gender}）：優異旅團章喺右袖下面，唔撞其他章（手冊 P.159）`, () => {
    const all = placeAll(cub, gender);
    const merit = by(all, 'meritorious');
    const face = sleeveFace(gender, 'cub');
    assert.equal(merit.mount, 'r');
    assert.ok(merit.v + merit.h / 2 <= face.cuffSeam, '要喺袖口縫線上面');
    const region = by(all, 'region');
    assert.ok(merit.v - merit.h / 2 > region.v + region.h / 2, '要喺地域章下面');
  });
}

test('幼童軍未宣誓：冇會員章，其他章照戴', () => {
  const outfit = { gender: 'boy', invested: false };
  const state = Object.fromEntries(cub.badges.map((b) => [b.id, true]));
  const shown = visible(placeFor(cub, outfit), state, { invested: false }).map((p) => p.id);
  assert.ok(!shown.includes('membership'));
  for (const id of ['hongKong', 'troop', 'region', 'district']) assert.ok(shown.includes(id), id);
  assert.equal(shownReason(cub, outfit, state, 'membership'), 'uninvested');
});

test('優異旅團章顏色：1999 紅、2000 紫、2001 藍，每 3 年輪一次（手冊 P.159：2016 藍）', () => {
  assert.equal(meritColour(1999), 'red');
  assert.equal(meritColour(2000), 'purple');
  assert.equal(meritColour(2001), 'blue');
  assert.equal(meritColour(2016), 'blue');
  assert.equal(meritColour(2017), 'red');
  assert.equal(meritColour(2018), 'purple');
  assert.equal(meritColour(2026), 'red');
  const now = new Date('2026-11-14');
  assert.ok(meritYearOk(1999, now));
  assert.ok(meritYearOk(2027, now));
  assert.ok(!meritYearOk(1998, now));
  assert.ok(!meritYearOk(2028, now));
  assert.ok(!meritYearOk('20x6', now));
  for (const a of Object.values(MERIT_ART)) assert.ok(pub(a.file), a.file);
});

test('優異旅團章圖案：同一設計，只換年份同顏色', () => {
  const a = resolveArt(badge('meritorious'), { meritYear: 2000 }, districts);
  assert.equal(a.kind, 'merit');
  assert.equal(a.year, 2000);
  assert.equal(a.colour, 'purple');
  assert.equal(a.base, MERIT_ART.purple.file);
});

test('地域及區：44 個區齊，每個圖案都喺 public/', () => {
  const all = allDistricts(districts);
  assert.equal(all.length, 44);
  assert.equal(new Set(all.map((x) => x.district.id)).size, 44, 'id 唔可以重複');
  for (const { district } of all) assert.ok(pub(district.file), district.file);
  for (const r of districts.regions) if (r.badge) assert.ok(pub(r.badge.file), r.badge.file);
});

test('揀區：區章、地域章跟住轉；總會總部屬下冇地域章', () => {
  const tw = resolveArt(badge('district'), { districtId: 'tsuen_wan' }, districts);
  const twRegion = resolveArt(badge('region'), { districtId: 'tsuen_wan' }, districts);
  const hit = findDistrict(districts, 'tsuen_wan');
  assert.equal(tw.file, hit.district.file);
  assert.equal(twRegion.file, hit.region.badge.file);
  const ahq = findDistrict(districts, 'silver_jubilee_district');
  assert.equal(ahq.region.badge, null);
  assert.equal(resolveArt(badge('region'), { districtId: 'silver_jubilee_district' }, districts), null);
  assert.ok(resolveArt(badge('district'), { districtId: 'silver_jubilee_district' }, districts).file);
  // 冇地域章 → 唔顯示，原因 noArt
  const state = { region: true };
  assert.equal(shownReason(cub, { gender: 'boy', invested: true }, state, 'region', { unavailable: ['region'] }), 'noArt');
});

test('未揀區：用手冊示例色塊', () => {
  for (const id of ['district', 'region']) {
    const a = resolveArt(badge(id), { districtId: '' }, districts);
    assert.equal(a.example, true, id);
    assert.ok(pub(a.file), a.file);
  }
});

test('兩個支部嘅區章都可以揀', () => {
  for (const rules of [grasshopper, cub]) assert.equal(rules.badges.find((b) => b.id === 'district').dynamic, 'district');
});
