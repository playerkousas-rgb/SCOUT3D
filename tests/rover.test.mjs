// 樂行童軍規則、擺位、肩章選項測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { validateRules, garmentsFor, variantOf } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, sleeveFace, hasSweater } from '../src/three/badgeLayout.js';
import { layout, strapLayout, neckerLayout, ROVER_VARIANTS, VENTURE_VARIANTS, roverVariant, isSenior, pumpParts, COLOURS, VEST_T, SWEATER_TOP } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const rover = read('src/data/rover_rules_v1.0.json');
const venture = read('src/data/venture_rules_v1.0.json');
const pub = (f) => existsSync(new URL(`../public${f}`, import.meta.url));
const by = (list, id) => list.find((p) => p.id === id);
const badge = (id) => rover.badges.find((b) => b.id === id);
const ALL_ON = { membership: true, hongKong: true, troop: true, region: true, district: true, meritorious: true, epaulette: 'rover' };
const OUTFIT = { gender: 'boy', invested: true };

test('樂行童軍規則資料通過驗證，喺支部切換排喺成年成員前面', () => {
  assert.deepEqual(validateRules(rover), []);
  assert.equal(rover.section.id, 'rover');
  assert.equal(rover.fileVersion, 'v1.0');
  // rules.js 用 vite 嘅 JSON import，node 直接 import 唔到：睇原始碼
  const src = readFileSync(new URL('../src/data/rules.js', import.meta.url), 'utf8');
  assert.match(src, /import ROVER from '\.\/rover_rules_v1\.0\.json'/);
  assert.match(src, /venture: VENTURE, rover: ROVER, leader: LEADER \}/, '樂行童軍喺成年成員前面');
  assert.match(readFileSync(new URL('../scripts/check_rules_v1.0.mjs', import.meta.url), 'utf8'), /'venture', 'rover', 'leader'\]/);
  assert.equal(rover.section.zh, '樂行童軍');
  assert.ok(isSenior('rover') && isSenior('venture') && !isSenior('scout'));
});

test('必備章 = 制服頁（手冊 P.42：會員章、香港章、地域章、區章、旅章）+ 樂行童軍肩章（用戶指示）；冇小隊章', () => {
  // v21：非基本章另外一組（group: 'extra'），唔計喺基本章入面
  assert.deepEqual(rover.badges.filter((b) => !b.group).map((b) => b.id).sort(), ['district', 'epaulette', 'hongKong', 'membership', 'meritorious', 'region', 'troop']);
  for (const id of ['membership', 'hongKong', 'troop', 'region', 'district', 'epaulette']) assert.equal(badge(id).required, true, `${id} 係必備`);
  assert.equal(badge('meritorious').required, false);
  assert.ok(!rover.badges.some((b) => b.dynamic === 'patrol'), '樂行童軍冇小隊章');
  // 必備章排喺前面
  const firstOptional = rover.badges.findIndex((b) => !b.required);
  assert.ok(rover.badges.slice(firstOptional).every((b) => !b.required), '必備章排先');
});

test('肩章有選項：未考獲（冇章）＋樂行童軍肩章（手冊 P.145 深綠色圖案），預設已考獲', () => {
  const b = badge('epaulette');
  assert.deepEqual(b.choices.map((c) => c.id), ['none', 'rover']);
  assert.equal(b.choices[0].art, null);
  assert.equal(b.choices[1].art.file, '/badges/rover_epaulette.png');
  assert.equal(b.art.file, '/badges/rover_epaulette.png');
  assert.equal(b.choices[1].art.page, '145');
  assert.ok(pub(b.choices[1].art.file));
  assert.equal(b.default, 'rover');
  assert.equal(b.needsInvestiture, true);
  assert.equal(b.zh.name, '樂行童軍肩章');
  assert.ok(b.sources.some((s) => s.ref === 'RTS' && s.page.includes('18')), '綱要 P.18 樂行童軍肩章');
  assert.match(b.zh.conditions, /啟導班/);
  // 手冊 P.145 原文（深資／樂行一齊講）保持原字
  assert.match(b.zh.quote, /深資童軍／樂行童軍/);
});

test('來源：手冊 P.42–47、P.49、P.51、P.171；樂行童軍訓練綱要 P.10–11', () => {
  assert.ok(rover.sources.UH && rover.sources.RTS && !rover.sources.VTS);
  const s = JSON.stringify(rover);
  assert.ok(!/"ref":\s*"VTS"/.test(s), '唔可以引用深資童軍綱要');
  assert.ok(!/P\.170|p\.170|"170"/.test(s), '樂行童軍佩戴圖係 P.171，唔係 P.170');
  assert.ok(!/棗紅/.test(s) && !/maroon/i.test(s), '樂行童軍冇棗紅色');
  for (const id of ['shirt', 'trousers', 'socks', 'shoes']) assert.ok(rover.garments.find((g) => g.id === id).sources.some((x) => x.ref === 'RTS' && x.page === '10–11'));
});

for (const gender of ['boy', 'girl']) {
  test(`樂行童軍（${gender}）：肩章一對，平放喺雙肩肩帶上，方頭近膊頭`, () => {
    const L = layout(gender, 'rover');
    const S = strapLayout(L);
    const eps = placeAll(rover, gender).filter((p) => p.id === 'epaulette');
    assert.equal(eps.length, 2);
    const [l, r] = [eps.find((p) => p.x > 0), eps.find((p) => p.x < 0)];
    assert.ok(l && r, '兩邊膊頭各一個');
    assert.equal(l.x, -r.x);
    for (const p of eps) {
      assert.equal(p.facing, 'up');
      assert.equal(p.choice, 'rover');
      assert.equal(p.art, '/badges/rover_epaulette.png');
      assert.ok(Math.abs(p.y - (L.top + S.t)) < 1e-9, '喺肩帶面');
      assert.ok(Math.abs(p.x) + p.w / 2 <= S.outer + 1e-9, '唔可以出咗膊頭');
      assert.ok(Math.abs(p.x) - p.w / 2 >= S.inner - 1e-9, '唔可以入咗衣領');
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rot));
      assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(q).y > 0.999, '面向上');
      assert.ok(new THREE.Vector3(1, 0, 0).applyQuaternion(q).x * Math.sign(p.x) < -0.999, '圖案右（圓頭）向衣領');
    }
  });

  test(`樂行童軍（${gender}）：胸前同右袖照手冊 P.92–95、P.171，同深資童軍擺位一樣`, () => {
    const { B, top } = layout(gender, 'rover');
    const all = placeAll(rover, gender);
    const m = by(all, 'membership');
    const hk = by(all, 'hongKong');
    assert.equal(m.x, B.pocket.x);
    assert.ok(Math.abs(hk.y - hk.h / 2 - (top - B.pocket.top + 3)) < 1e-9, '香港章底喺袋蓋頂上 3 cm');
    const face = sleeveFace(gender, 'rover');
    const [troop, region, district, merit] = ['troop', 'region', 'district', 'meritorious'].map((id) => by(all, id));
    assert.ok(Math.abs(troop.v - troop.h / 2 - 2) < 1e-9, '旅章頂離肩膊縫 2 cm');
    for (const p of [region, district]) assert.ok(Math.abs(p.v - p.h / 2 - (troop.v + troop.h / 2 + 2)) < 1e-9);
    assert.ok(region.u > 0 && district.u < 0, '地域章前、區章後');
    assert.ok(region.v + region.h / 2 < merit.v - merit.h / 2, '優異旅團章喺最下');
    assert.ok(merit.v + merit.h / 2 <= face.cuffSeam, '唔可以落咗袖口');
    // 同深資童軍（手冊 P.170）擺位一樣，只係肩章圖案唔同
    // v21：香港章改用 slot（飛行章喺下面時要上移）、會員章俾和平使者章取代（hiddenBy），比較時唔理呢啲資料；非基本章（group: 'extra'）深資童軍冇
    const basic = new Set(rover.badges.filter((b) => !b.group).map((b) => b.id));
    const strip = (list) => list.map(({ art, choice, key, slot, hiddenBy, fit, ...p }) => ({ ...p, key: key.replace(/-(venture|rover)-/, '-') }));
    assert.deepEqual(strip(all.filter((p) => basic.has(p.id) && (!p.art || !p.art.includes('epaulette')))), strip(placeAll(venture, gender).filter((p) => !p.art || !p.art.includes('epaulette'))));
  });
}

test('肩章選項：揀「未考獲」唔顯示；未宣誓唔顯示', () => {
  const all = placeFor(rover, OUTFIT);
  assert.equal(visible(all, ALL_ON, { invested: true }).filter((p) => p.id === 'epaulette').length, 2);
  assert.equal(visible(all, { ...ALL_ON, epaulette: 'none' }, { invested: true }).filter((p) => p.id === 'epaulette').length, 0);
  assert.equal(visible(all, ALL_ON, { invested: false }).filter((p) => p.id === 'epaulette').length, 0);
  assert.equal(shownReason(rover, { ...OUTFIT, invested: false }, ALL_ON, 'epaulette'), 'uninvested');
  assert.equal(shownReason(rover, OUTFIT, { ...ALL_ON, epaulette: 'none' }, 'epaulette'), 'off');
  assert.equal(shownReason(rover, OUTFIT, ALL_ON, 'epaulette'), null);
});

test('樂行童軍身形：沿用深資童軍 168 cm；肩帶擺得落肩章，旅巾遮唔晒', () => {
  for (const g of ['boy', 'girl']) {
    const L = layout(g, 'rover');
    const S = strapLayout(L);
    assert.deepEqual(L.B, layout(g, 'venture').B);
    assert.ok(S.len >= badge('epaulette').size.wCm + 0.3, '肩帶長過肩章');
    assert.ok(S.outer - 0.3 - badge('epaulette').size.wCm / 2 > neckerLayout(L).outer / 2, '肩章中間喺旅巾外面');
  }
});

test('樂行童軍三款制服：深綠色軟帽；海款白頂帽 + 深資／樂行海童軍帽章；空款灰藍軟帽（手冊 P.42–47、P.102）', () => {
  assert.deepEqual(rover.variants.map((v) => v.id), ['land', 'sea', 'air']);
  assert.equal(ROVER_VARIANTS.land.beret, COLOURS.beret, '深綠色軟帽');
  assert.equal(ROVER_VARIANTS.land.shirt, COLOURS.cubShirt);
  assert.equal(ROVER_VARIANTS.land.leg, COLOURS.cubGreen);
  assert.equal(ROVER_VARIANTS.sea.hat, 'seaLeader');
  assert.equal(ROVER_VARIANTS.sea.shirt, COLOURS.seaShirt);
  assert.equal(ROVER_VARIANTS.air.shirt, COLOURS.airShirt);
  assert.equal(ROVER_VARIANTS.air.beret, VENTURE_VARIANTS.air.beret, '灰藍色軟帽');
  assert.equal(roverVariant('xx'), ROVER_VARIANTS.land);
  assert.equal(variantOf(rover, 'air').id, 'air');
  assert.match(rover.garments.find((g) => g.id === 'hat').zh.rule, /深綠色軟帽/);
  const sea = garmentsFor(rover, 'sea');
  assert.match(sea.find((g) => g.id === 'hat').zh.rule, /樂行海童軍帽章/);
  assert.match(sea.find((g) => g.id === 'shirt').zh.rule, /白色/);
  assert.ok(rover.review.userChecks.some((u) => u.item === 'capBadge'), '綱要「成員帽章」同手冊「童軍帽章」唔同：用戶確認跟手冊');
});

test('下身（手冊 P.42–47、P.51；綱要 P.11）：女半截裙配襪褲 + 非綁帶中跟皮鞋；長褲配黑襪 + 綁帶', () => {
  const tr = rover.garments.find((g) => g.id === 'trousers');
  assert.ok(tr.sources.some((s) => s.ref === 'UH' && s.page.includes('51')));
  assert.match(tr.zh.rule, /女性樂行童軍長褲制服（手冊 P\.51）/);
  assert.match(rover.garments.find((g) => g.id === 'shoes').zh.rule, /非綁帶、中跟（配半截裙）/);
  assert.match(rover.garments.find((g) => g.id === 'socks').zh.rule, /襪褲（配半截裙）/);
});

test('領帶制服（手冊 P.49、P.113）：樂行童軍深綠、樂行海童軍黑、樂行空童軍深藍', () => {
  assert.match(garmentsFor(rover, 'land').find((g) => g.id === 'tie').zh.rule, /深綠色/);
  assert.match(garmentsFor(rover, 'sea').find((g) => g.id === 'tie').zh.rule, /黑色/);
  assert.match(garmentsFor(rover, 'air').find((g) => g.id === 'tie').zh.rule, /深藍色/);
  assert.equal(ROVER_VARIANTS.land.tie, COLOURS.tieGreen);
  assert.equal(ROVER_VARIANTS.sea.tie, COLOURS.tieBlack);
  assert.equal(ROVER_VARIANTS.air.tie, COLOURS.tieNavy);
  assert.equal(VENTURE_VARIANTS.land.tie, COLOURS.tieMaroon, '深資童軍唔受影響');
  const a = placeFor(rover, OUTFIT).map((p) => p.key).sort();
  const b = placeFor(rover, { ...OUTFIT, neckwear: 'tie' }).map((p) => p.key).sort();
  assert.deepEqual(a, b, '領帶唔影響徽章');
});

test('制服毛衣（手冊 P.121–122）：只戴會員章、香港章、旅章、肩章；肩章喺毛衣肩帶上', () => {
  assert.ok(hasSweater(rover));
  const sw = { ...OUTFIT, sweater: true };
  const all = placeFor(rover, sw);
  assert.deepEqual([...new Set(all.map((p) => p.id))].sort(), ['epaulette', 'hongKong', 'membership', 'troop']);
  const shirt = placeFor(rover, OUTFIT);
  for (const id of ['membership', 'hongKong']) assert.ok(Math.abs(by(all, id).z - by(shirt, id).z - VEST_T) < 1e-9);
  const L = layout('boy', 'rover');
  for (const p of all.filter((x) => x.id === 'epaulette')) assert.ok(Math.abs(p.y - (L.top + SWEATER_TOP + L.B.strap.t)) < 1e-9, '肩章喺毛衣肩帶面');
  assert.equal(shownReason(rover, sw, ALL_ON, 'district'), 'sweater');
  assert.equal(shownReason(rover, sw, ALL_ON, 'epaulette'), null);
  assert.equal(ROVER_VARIANTS.land.sweater, COLOURS.sweaterGreen);
  assert.equal(ROVER_VARIANTS.sea.sweater, COLOURS.sweaterNavy);
  assert.equal(ROVER_VARIANTS.air.sweater, COLOURS.sweaterNavy);
  assert.ok(rover.review.userChecks.some((u) => u.item === 'roverSeaAirSweater'), '樂行海／空童軍深藍毛衣：用戶確認');
});

test('地域章／區章只得一個（例：銀禧區冇地域章）就放中間（用戶指示）；兩個都有就照手冊並排', () => {
  for (const r of [rover, venture, read('src/data/scout_rules_v1.0.json'), read('src/data/cub_rules_v1.0.json')]) {
    const all = placeFor(r, OUTFIT);
    const st = { ...ALL_ON, patrol: true, epaulette: r.section.id === 'venture' ? 'venture' : 'rover' };
    const both = visible(all, st, { invested: true });
    assert.ok(by(both, 'region').u > 0 && by(both, 'district').u < 0, `${r.section.id} 兩個都有：地域章前、區章後`);
    const noRegion = visible(all, st, { invested: true, unavailable: ['region'] });
    assert.equal(by(noRegion, 'region'), undefined);
    assert.equal(by(noRegion, 'district').u, 0, `${r.section.id} 冇地域章：區章放中間`);
    assert.equal(by(noRegion, 'district').v, by(both, 'district').v, '高度唔變');
    const offDistrict = visible(all, { ...st, district: false }, { invested: true });
    assert.equal(by(offDistrict, 'region').u, 0, '只得地域章：都放中間');
    assert.ok(all.find((p) => p.id === 'district').u < 0, '原本嘅位置資料唔改');
  }
});

test('肩帶同肩章去到膊頭（袖頂外邊，用戶指正）', () => {
  for (const sec of ['venture', 'rover']) {
    for (const g of ['boy', 'girl']) {
      const L = layout(g, sec);
      const S = strapLayout(L);
      const tip = L.armX + L.B.sleeve.w / 2;
      assert.ok(S.outer > L.B.torso.w / 2 + 3, '肩帶出咗身邊、蓋住袖頂');
      assert.ok(S.outer <= tip && S.outer >= tip - 0.5, '肩帶去到膊頭');
      const eps = placeAll(sec === 'rover' ? rover : venture, g).filter((p) => p.id === 'epaulette');
      for (const p of eps) assert.ok(Math.abs(p.x) + p.w / 2 >= tip - 1, '肩章方頭貼住膊頭');
      const SW = strapLayout(L, { sweater: true });
      assert.ok(Math.abs(SW.boxY - SW.boxT / 2 - L.top) < 1e-9, '著毛衣：肩帶盒由膊頭起，袖頂冇隙');
      assert.ok(Math.abs(SW.boxY + SW.boxT / 2 - (SW.base + SW.t)) < 1e-9);
    }
  }
});

test('非綁帶中跟皮鞋：方塊砌，腳弓位係空，鞋面見到襪褲（用戶指正）', () => {
  const B = layout('girl', 'rover').B;
  const parts = pumpParts(B.shoe);
  const kinds = new Set(parts.map((p) => p.kind));
  assert.deepEqual([...kinds].sort(), ['shoe', 'tights']);
  const heel = parts.find((p) => p.part === 'heel');
  const fore = parts.find((p) => p.part === 'fore');
  const arch = parts.find((p) => p.part === 'arch');
  // 中跟同鞋掌之間：地面上冇未轉角嘅方塊；腳弓斜落去，中間離地
  const heelFront = heel.pos[2] + heel.size[2] / 2;
  const foreBack = fore.pos[2] - fore.size[2] / 2;
  assert.ok(foreBack - heelFront > 8, '腳弓位有成 8 cm 長');
  const mid = (heelFront + foreBack) / 2;
  for (const p of parts.filter((q) => !q.rot)) {
    const z0 = p.pos[2] - p.size[2] / 2, z1 = p.pos[2] + p.size[2] / 2;
    if (z0 < mid && z1 > mid) assert.ok(p.pos[1] - p.size[1] / 2 > 2, `${p.part} 唔可以塞住腳弓位`);
  }
  const archBottomAtMid = arch.pos[1] - arch.size[1] / 2 / Math.cos(arch.rot[0]);
  assert.ok(archBottomAtMid > 1, '腳弓中間離地（有窿）');
  assert.ok(arch.rot[0] > 0.1, '腳弓由中跟斜落鞋掌');
  // 鞋面見到襪褲：腳趾面高過鞋頭黑色
  const toes = parts.find((p) => p.part === 'toes');
  assert.ok(toes.pos[1] + toes.size[1] / 2 > fore.size[1] + 1, '腳趾面見到肉色');
  for (const p of parts) assert.ok(p.pos[1] + p.size[1] / 2 <= B.shoe.h + 0.6, `${p.part} 唔可以高過鞋`);
});

test('用戶確認：帽章、樂行海／空童軍毛衣、領帶宣誓後先戴、身形；唔再係待確認', () => {
  for (const id of ['capBadge', 'roverSeaAirSweater', 'tieInvestiture', 'figure']) {
    assert.ok(!rover.conflicts.some((c) => c.id === id), `${id} 唔再係衝突`);
    assert.ok(rover.review.userChecks.some((u) => u.item === id), `${id} 記錄喺 userChecks`);
  }
  assert.ok(!/待確認|to be confirmed/.test(JSON.stringify(rover)));
});
