// 深資童軍規則、擺位、肩章選項測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { validateRules, garmentsFor, variantOf } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, sleeveFace, hasSweater } from '../src/three/badgeLayout.js';
import { layout, strapLayout, neckerLayout, VENTURE_VARIANTS, ventureVariant, ventureLegwear, COLOURS, VEST_T, SWEATER_TOP } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const venture = read('src/data/venture_rules_v1.0.json');
const pub = (f) => existsSync(new URL(`../public${f}`, import.meta.url));
const by = (list, id) => list.find((p) => p.id === id);
const badge = (id) => venture.badges.find((b) => b.id === id);
const ALL_ON = { membership: true, hongKong: true, troop: true, region: true, district: true, meritorious: true, epaulette: 'venture' };
const OUTFIT = { gender: 'boy', invested: true };

test('深資童軍規則資料通過驗證', () => {
  assert.deepEqual(validateRules(venture), []);
  assert.equal(venture.section.id, 'venture');
  assert.equal(venture.fileVersion, 'v1.0');
});

test('必備章 = 制服頁（手冊 P.36：會員章、香港章、地域章、區章、旅章）+ 深資童軍肩章（用戶指示）；冇小隊章', () => {
  assert.deepEqual(venture.badges.map((b) => b.id).sort(), ['district', 'epaulette', 'hongKong', 'membership', 'meritorious', 'region', 'troop']);
  for (const id of ['membership', 'hongKong', 'troop', 'region', 'district', 'epaulette']) assert.equal(badge(id).required, true, `${id} 係必備`);
  assert.equal(badge('meritorious').required, false);
  assert.ok(!venture.badges.some((b) => b.dynamic === 'patrol'), '深資童軍冇小隊章');
});

test('肩章有選項：未考獲（冇章）＋深資童軍肩章（手冊 P.145 圖案），預設已考獲', () => {
  const b = badge('epaulette');
  assert.deepEqual(b.choices.map((c) => c.id), ['none', 'venture']);
  assert.equal(b.choices[0].art, null);
  assert.equal(b.choices[1].art.file, '/badges/venture_epaulette.png');
  assert.equal(b.choices[1].art.page, '145');
  assert.ok(pub(b.choices[1].art.file));
  assert.equal(b.default, 'venture');
  assert.equal(b.needsInvestiture, true);
});

test('驗證：選項資料唔齊就 fail', () => {
  const bad = structuredClone(venture);
  const b = bad.badges.find((x) => x.id === 'epaulette');
  b.default = 'rover';
  b.choices = b.choices.filter((c) => c.art); // 冇「未考獲」選項
  const errors = validateRules(bad);
  assert.ok(errors.some((e) => e.includes('default')));
  assert.ok(errors.some((e) => e.includes('冇章')));
  const bad2 = structuredClone(venture);
  bad2.badges.find((x) => x.id === 'epaulette').anchor.part = 'torso';
  assert.ok(validateRules(bad2).some((e) => e.includes('shoulder')));
});

for (const gender of ['boy', 'girl']) {
  test(`深資童軍（${gender}）：肩章一對，平放喺雙肩肩帶上，方頭近膊頭`, () => {
    const L = layout(gender, 'venture');
    const S = strapLayout(L);
    const eps = placeAll(venture, gender).filter((p) => p.id === 'epaulette');
    assert.equal(eps.length, 2);
    const [l, r] = [eps.find((p) => p.x > 0), eps.find((p) => p.x < 0)];
    assert.ok(l && r, '兩邊膊頭各一個');
    for (const p of eps) {
      assert.equal(p.facing, 'up');
      assert.equal(p.choice, 'venture');
      assert.ok(Math.abs(p.y - (L.top + S.t)) < 1e-9, '喺肩帶面');
      assert.ok(Math.abs(p.x) + p.w / 2 <= S.outer + 1e-9, '唔可以出咗膊頭');
      assert.ok(Math.abs(p.x) - p.w / 2 >= S.inner - 1e-9, '唔可以入咗衣領');
      assert.ok(p.h <= S.w, '肩章闊唔大過肩帶');
    }
    assert.equal(l.x, -r.x);
    // 用 three.js 計：圖案左（方頭、徽號）要指向膊頭（|x| 大嗰邊），貼片面向上
    for (const p of eps) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rot));
      const artRight = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      assert.ok(normal.y > 0.999, '面向上');
      assert.ok(artRight.x * Math.sign(p.x) < -0.999, '圖案右（圓頭）向衣領');
    }
  });

  test(`深資童軍（${gender}）：胸前同右袖照手冊 P.92–95、P.170`, () => {
    const { B, top } = layout(gender, 'venture');
    const all = placeAll(venture, gender);
    const m = by(all, 'membership');
    const hk = by(all, 'hongKong');
    assert.equal(m.x, B.pocket.x);
    const flapTop = top - B.pocket.top;
    assert.ok(Math.abs(hk.y - hk.h / 2 - (flapTop + 3)) < 1e-9, '香港章底喺袋蓋頂上 3 cm');
    const face = sleeveFace(gender, 'venture');
    const [troop, region, district, merit] = ['troop', 'region', 'district', 'meritorious'].map((id) => by(all, id));
    assert.ok(Math.abs(troop.v - troop.h / 2 - 2) < 1e-9, '旅章頂離肩膊縫 2 cm');
    for (const p of [region, district]) assert.ok(Math.abs(p.v - p.h / 2 - (troop.v + troop.h / 2 + 2)) < 1e-9);
    assert.ok(region.u > 0 && district.u < 0, '地域章前、區章後');
    assert.ok(region.v + region.h / 2 < merit.v - merit.h / 2, '優異旅團章喺最下');
    assert.ok(merit.v + merit.h / 2 <= face.cuffSeam, '唔可以落咗袖口');
    for (const p of [troop, region, district, merit]) assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-9, `${p.id} 要擺得落袖外側`);
  });
}

test('肩章選項：揀「未考獲」唔顯示；未宣誓唔顯示', () => {
  const all = placeFor(venture, OUTFIT);
  assert.equal(visible(all, ALL_ON, { invested: true }).filter((p) => p.id === 'epaulette').length, 2);
  assert.equal(visible(all, { ...ALL_ON, epaulette: 'none' }, { invested: true }).filter((p) => p.id === 'epaulette').length, 0);
  assert.equal(visible(all, ALL_ON, { invested: false }).filter((p) => p.id === 'epaulette').length, 0);
  assert.equal(shownReason(venture, { ...OUTFIT, invested: false }, ALL_ON, 'epaulette'), 'uninvested');
  assert.equal(shownReason(venture, OUTFIT, { ...ALL_ON, epaulette: 'none' }, 'epaulette'), 'off');
  assert.equal(shownReason(venture, OUTFIT, ALL_ON, 'epaulette'), null);
});

test('深資童軍身形：約 168 cm，比童軍高；肩帶擺得落肩章', () => {
  for (const g of ['boy', 'girl']) {
    const L = layout(g, 'venture');
    const S = strapLayout(L);
    assert.ok(L.B.head.y + L.B.head.h >= 165 && L.B.head.y + L.B.head.h <= 170);
    assert.ok(L.top > layout(g, 'scout').top);
    assert.ok(S.len >= badge('epaulette').size.wCm + 0.3, '肩帶長過肩章');
    assert.ok(L.B.skirtBottom < L.B.leg.top && L.B.skirtBottom > 40, '半截裙及膝');
    // 旅巾唔可以完全遮住肩章（肩章外邊喺旅巾巾卷外面）
    const N = neckerLayout(L);
    assert.ok(S.outer - 0.3 - badge('epaulette').size.wCm / 2 > N.outer / 2, '肩章中間喺旅巾外面');
  }
  assert.equal(strapLayout(layout('boy', 'scout')), null, '童軍身形未有肩帶');
});

test('深資童軍三款制服：顏色跟手冊 P.36–41；徽章一樣（手冊 P.170）', () => {
  assert.deepEqual(venture.variants.map((v) => v.id), ['land', 'sea', 'air']);
  assert.equal(VENTURE_VARIANTS.land.beret, COLOURS.maroon);
  assert.equal(VENTURE_VARIANTS.sea.hat, 'seaLeader');
  assert.equal(VENTURE_VARIANTS.air.shirt, COLOURS.airShirt);
  assert.equal(ventureVariant('xx'), VENTURE_VARIANTS.land);
  assert.equal(variantOf(venture, 'sea').id, 'sea');
  const sea = garmentsFor(venture, 'sea');
  assert.match(sea.find((g) => g.id === 'hat').zh.rule, /領袖白頂帽/);
  assert.match(sea.find((g) => g.id === 'shirt').zh.rule, /白色/);
  assert.ok(pub('/badges/venture_sea_cap_badge.png'));
  for (const v of venture.variants) assert.ok(v.garments.every((g) => g.sources.some((s) => s.ref === 'UH')));
});

test('深資童軍下身：男長褲；女預設半截裙 + 襪褲，可以改長褲 + 黑襪（手冊 P.50–51）', () => {
  assert.deepEqual(ventureLegwear('boy', 'skirt'), { skirt: false, laced: true, sock: COLOURS.blackSock });
  assert.deepEqual(ventureLegwear('girl', undefined), { skirt: true, laced: false, sock: COLOURS.tights });
  assert.deepEqual(ventureLegwear('girl', 'trousers'), { skirt: false, laced: true, sock: COLOURS.blackSock });
  const tr = venture.garments.find((g) => g.id === 'trousers');
  assert.ok(tr.sources.some((s) => s.ref === 'UH' && s.page.includes('50–51')), '女性長褲制服跟手冊 P.50–51');
  // 用戶已確認／指出嘅項目唔再係衝突
  for (const id of ['girlTrousers', 'tie', 'airCapBadge']) assert.ok(!venture.conflicts.some((c) => c.id === id), `${id} 已解決`);
  for (const id of ['tieInvestiture', 'ventureSeaAirSweater']) assert.ok(!venture.conflicts.some((c) => c.id === id), `${id} 用戶已確認`);
  for (const id of ['girlTrousers', 'tieUniform', 'airCapBadge', 'sweater', 'tieInvestiture', 'ventureSeaAirSweater', 'skirtShoes']) assert.ok(venture.review.userChecks.some((u) => u.item === id), `${id} 記錄喺 userChecks`);
});

test('領帶制服（手冊 P.48、P.113）：深資童軍棗紅、深資海童軍黑、深資空童軍深藍', () => {
  assert.match(garmentsFor(venture, 'land').find((g) => g.id === 'tie').zh.rule, /棗紅色/);
  assert.match(garmentsFor(venture, 'sea').find((g) => g.id === 'tie').zh.rule, /黑色/);
  assert.match(garmentsFor(venture, 'air').find((g) => g.id === 'tie').zh.rule, /深藍色/);
  assert.equal(VENTURE_VARIANTS.land.tie, COLOURS.tieMaroon);
  assert.equal(VENTURE_VARIANTS.sea.tie, COLOURS.tieBlack);
  assert.equal(VENTURE_VARIANTS.air.tie, COLOURS.tieNavy);
  // 領帶唔影響徽章
  const a = placeFor(venture, OUTFIT).map((p) => p.key).sort();
  const b = placeFor(venture, { ...OUTFIT, neckwear: 'tie' }).map((p) => p.key).sort();
  assert.deepEqual(a, b);
});

test('制服毛衣（手冊 P.122）：深資童軍只戴會員章、香港章、旅章、肩章；肩章喺毛衣肩帶上', () => {
  const sw = { ...OUTFIT, sweater: true };
  const all = placeFor(venture, sw);
  assert.deepEqual([...new Set(all.map((p) => p.id))].sort(), ['epaulette', 'hongKong', 'membership', 'troop']);
  const shirt = placeFor(venture, OUTFIT);
  for (const id of ['membership', 'hongKong']) {
    const a = by(shirt, id), b = by(all, id);
    assert.equal(a.x, b.x); assert.equal(a.y, b.y);
    assert.ok(Math.abs(b.z - a.z - VEST_T) < 1e-9, `${id} 向外移一個毛衣厚度`);
  }
  assert.deepEqual(by(all, 'troop'), by(shirt, 'troop'), '旅章喺毛衣袖同一位置');
  const L = layout('boy', 'venture');
  for (const p of all.filter((x) => x.id === 'epaulette')) assert.ok(Math.abs(p.y - (L.top + SWEATER_TOP + L.B.strap.t)) < 1e-9, '肩章喺毛衣肩帶面');
  assert.equal(shownReason(venture, sw, ALL_ON, 'district'), 'sweater');
  assert.equal(shownReason(venture, sw, ALL_ON, 'meritorious'), 'sweater');
  assert.equal(shownReason(venture, sw, ALL_ON, 'epaulette'), null);
});

test('制服毛衣：童軍、幼童軍都有；小隊章、地域／區章唔戴喺毛衣上', () => {
  const scout = read('src/data/scout_rules_v1.0.json');
  const cub = read('src/data/cub_rules_v1.0.json');
  const grass = read('src/data/grasshopper_rules_v1.0.json');
  for (const r of [scout, cub, venture]) {
    assert.deepEqual(validateRules(r), []);
    assert.ok(hasSweater(r), `${r.section.id} 有毛衣`);
    assert.deepEqual(r.badges.filter((b) => b.sweater).map((b) => b.id).filter((id) => id !== 'epaulette').sort(), ['hongKong', 'membership', 'troop']);
  }
  assert.ok(!hasSweater(grass), '小童軍冇制服毛衣（手冊 P.121「小童軍除外」）');
  const ids = new Set(placeFor(scout, { gender: 'girl', invested: true, sweater: true }).map((p) => p.id));
  assert.deepEqual([...ids].sort(), ['hongKong', 'membership', 'troop']);
  assert.match(garmentsFor(scout, 'sea').find((g) => g.id === 'sweater').zh.rule, /深藍色/);
  assert.match(garmentsFor(scout, 'land').find((g) => g.id === 'sweater').zh.rule, /深草青色/);
  // 有毛衣嘅支部，章冇寫 sweater 就 fail
  const bad = structuredClone(scout);
  delete bad.badges[0].sweater;
  assert.ok(validateRules(bad).some((e) => e.includes('sweater')));
});
