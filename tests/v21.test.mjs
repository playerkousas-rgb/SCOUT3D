// v21：樂行童軍非基本章（綱要 P.12）＋成年成員獎章領袖標誌等（手冊 P.135–172）— SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { layout } from '../src/three/body.js';
import { placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { validateRules } from '../src/data/validate.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const rover = json('rover_rules_v1.0.json');
const leader = json('leader_rules_v1.0.json');
const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ROVER_BASE = { membership: true, hongKong: true, troop: true, region: true, district: true, epaulette: 'rover' };
const LEADER_BASE = { membership: true, hongKong: true, troop: true, epaulette: true };
const show = (rules, outfit, state) => visible(placeFor(rules, outfit), state, { invested: true });
const by = (list, id) => list.find((p) => p.id === id);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);
const bottom = (p) => p.y - p.h / 2;
const top = (p) => p.y + p.h / 2;

test('規則資料通過驗證；非基本章全部有圖、喺 extra 組、圖案檔存在', () => {
  for (const r of [rover, leader]) {
    assert.deepEqual(validateRules(r), []);
    for (const b of r.badges.filter((x) => x.group === 'extra')) {
      const arts = b.choices ? b.choices.filter((c) => c.art).map((c) => c.art) : [b.art];
      for (const a of arts) assert.ok(existsSync(new URL(`../public${a.file}`, import.meta.url)), a.file);
    }
  }
  const ids = (r) => r.badges.filter((b) => b.group === 'extra').map((b) => b.id);
  for (const id of ['roverAward', 'faith', 'commemorative', 'emblemBauhinia', 'emblemChief', 'emblemScoutAward', 'wings', 'serviceStar', 'peace', 'worldScout', 'earthTribe', 'heritage', 'citizenScam', 'airCrew', 'hkayp', 'helmsman', 'firstAid', 'lifesaving', 'community', 'atas'])
    assert.ok(ids(rover).includes(id), `樂行童軍有 ${id}`);
  for (const id of ['leaderEmblem', 'catholic', 'peace', 'commemorative', 'wings', 'worldScout', 'hkayp', 'lifesaving', 'atas']) assert.ok(ids(leader).includes(id), `成年成員有 ${id}`);
  // 成年成員：只限恤衫制服（編號 3–6）
  for (const b of leader.badges.filter((x) => x.group === 'extra')) assert.deepEqual(b.uniforms, ['u3', 'u4', 'u5', 'u6']);
});

for (const gender of ['boy', 'girl']) {
  test(`樂行童軍（${gender}）右胸袋：最高獎章標誌緊貼袋蓋由右至左；宗教章／公教章喺上層內側、紀念章外側；樂行童軍獎章喺袋中央`, () => {
    const { B, top: T } = layout(gender, 'rover');
    const flap = T - B.pocket.top;
    const v = show(rover, { gender, invested: true }, { ...ROVER_BASE, roverAward: 'bp', faith: 'catholicThree', commemorative: true, emblemBauhinia: true, emblemChief: true, emblemScoutAward: true });
    const [gb, cs, hs] = ['emblemBauhinia', 'emblemChief', 'emblemScoutAward'].map((id) => by(v, id));
    for (const p of [gb, cs, hs]) near(bottom(p), flap, `${p.id} 緊貼袋蓋`);
    // 右胸袋喺 -x；外側 = 更負。金紫荊最外、榮譽童軍最內（由右至左）
    assert.ok(gb.x < cs.x && cs.x < hs.x, '金紫荊（外）→ 總領袖 → 榮譽童軍（內）');
    near(cs.x, -B.pocket.x, '三個置中');
    const f = by(v, 'faith');
    const c = by(v, 'commemorative');
    near(bottom(f), flap + 3, '上層喺袋蓋上方 3 cm');
    near(bottom(c), flap + 3, '上層喺袋蓋上方 3 cm');
    assert.ok(f.x > c.x, '宗教章／公教章喺左（內側），紀念章喺右（外側）');
    assert.equal(f.art, '/badges/extra/catholic3.png');
    const ra = by(v, 'roverAward');
    near(ra.x, -B.pocket.x, '樂行童軍獎章喺右胸袋中央（綱要 P.12 ⑨）');
    assert.ok(ra.y < flap - B.pocket.flap, '喺袋蓋下面嘅袋身');
  });

  test(`樂行童軍（${gender}）左胸袋：服務年星貼袋蓋；飛行章 2 cm、香港章喺上面；和平使者章取代會員章`, () => {
    const { B, top: T } = layout(gender, 'rover');
    const flap = T - B.pocket.top;
    const alone = by(show(rover, { gender, invested: true }, ROVER_BASE), 'hongKong');
    near(bottom(alone), flap + 3, '只得香港章：袋蓋上方 3 cm（同以前一樣）');
    near(alone.h, 5.6, '香港章尺寸唔變');
    const v = show(rover, { gender, invested: true }, { ...ROVER_BASE, wings: 'flying', serviceStar: 'seven', peace: true });
    const star = by(v, 'serviceStar');
    const wings = by(v, 'wings');
    const hk = by(v, 'hongKong');
    near(bottom(star), flap, '服務年星緊貼袋蓋');
    assert.equal(star.art, '/badges/extra/service_star_rover_7.png');
    near(bottom(wings), flap + 2, '飛行章喺袋蓋上方 2 cm（上面有香港章）');
    assert.ok(bottom(hk) >= top(wings) + 0.4 - 1e-9, '香港章喺飛行章上面');
    for (const p of [star, wings, hk]) near(p.x, B.pocket.x, `${p.id} 置中`);
    assert.ok(!by(v, 'membership'), '和平使者章結合會員章，會員章唔再另外戴');
    assert.ok(by(v, 'peace'));
    assert.equal(shownReason(rover, { gender, invested: true }, { ...ROVER_BASE, peace: true }, 'membership'), 'replaced_peace');
  });

  test(`樂行童軍（${gender}）右袖：地域章／區章下面一行，最多四個，近前面排先；第五個唔顯示`, () => {
    const outfit = { gender, invested: true };
    const st = { ...ROVER_BASE, worldScout: true, earthTribe: true, plasticTide: true, heritage: true, citizenScam: true };
    const v = show(rover, outfit, st);
    const row = ['worldScout', 'earthTribe', 'plasticTide', 'heritage'].map((id) => by(v, id));
    const region = by(v, 'region');
    for (const p of row) {
      assert.equal(p.mount, 'r');
      near(p.v - p.h / 2, region.v + region.h / 2 + 1.5, '地域章底下 1.5 cm');
    }
    for (let i = 1; i < row.length; i++) assert.ok(row[i - 1].u > row[i].u, '右袖：u + = 前面；排先嘅近前');
    const face = sleeveFace(gender, 'rover');
    assert.ok(row[0].u + row[0].w / 2 <= face.width / 2 && row[3].u - row[3].w / 2 >= -face.width / 2, '唔出袖邊');
    assert.ok(!by(v, 'citizenScam'), '第五個唔顯示');
    assert.equal(shownReason(rover, outfit, st, 'citizenScam'), 'slotFull');
    // 熄咗一個，第五個就補位
    assert.ok(by(show(rover, outfit, { ...st, earthTribe: false }), 'citizenScam'));
  });

  test(`樂行童軍（${gender}）左袖：空勤（前）／青年獎勵計劃（中）／舵手（後）→ 急救／拯溺 → 社區參與；冇嘅由上面補上；ATAS 喺袖口`, () => {
    const outfit = { gender, invested: true };
    const all = { ...ROVER_BASE, airCrew: true, hkayp: 'gold', helmsman: true, firstAid: true, lifesaving: true, community: true, atas: true };
    const v = show(rover, outfit, all);
    const [air, ay, helm, fa, ls, ci, atas] = ['airCrew', 'hkayp', 'helmsman', 'firstAid', 'lifesaving', 'community', 'atas'].map((id) => by(v, id));
    for (const p of [air, ay, helm, fa, ls, ci, atas]) assert.equal(p.mount, 'l');
    near(air.v - air.h / 2, 2, '第一行頂離肩膊縫 2 cm');
    assert.ok(air.u < ay.u && ay.u < helm.u, '左袖：u − = 前面；空勤近前、舵手近後');
    assert.ok(Math.abs(ay.u) < 0.01, '青年獎勵計劃置中（兩邊章闊度差 0.01 cm）');
    assert.ok(fa.v - fa.h / 2 >= air.v + air.h / 2 + 1 - 1e-9 && fa.u < ls.u, '第二行：急救（前）拯溺（後）');
    assert.ok(ci.v - ci.h / 2 >= ls.v + ls.h / 2 + 1 - 1e-9);
    assert.equal(ay.art, '/badges/extra/hkayp_gold.png');
    const face = sleeveFace(gender, 'rover');
    near(atas.v + atas.h / 2, face.cuffSeam - 0.3, 'ATAS 喺袖口縫線上方');
    assert.ok(ci.v + ci.h / 2 < atas.v - atas.h / 2);
    // 只得急救章：補上第一行位置、置中
    const only = by(show(rover, outfit, { ...ROVER_BASE, firstAid: true }), 'firstAid');
    near(only.v - only.h / 2, 2, '冇第一行就由上面補');
    near(only.u, 0, '一個就置中');
  });

  test(`樂行童軍（${gender}）制服毛衣：非基本章唔戴，香港章照舊`, () => {
    const v = show(rover, { gender, invested: true, sweater: true }, { ...ROVER_BASE, wings: 'flying', faith: 'religious', firstAid: true });
    assert.ok(by(v, 'hongKong'));
    for (const id of ['wings', 'faith', 'firstAid']) assert.ok(!by(v, id), `${id} 唔戴喺毛衣`);
  });
}

for (const gender of ['boy', 'girl']) {
  test(`成年成員（${gender}）右胸袋上層：獎章領袖標誌袋蓋上方 3 cm；公教章內側；最多兩個；有勳章時喺勳章上面`, () => {
    const { B, top: T } = layout(gender, 'leader');
    const flap = T - B.pocket.top;
    const outfit = { gender, invested: true, uniform: 'u3' };
    const alone = by(show(leader, outfit, { ...LEADER_BASE, leaderEmblem: 'scoutAward' }), 'leaderEmblem');
    near(bottom(alone), flap + 3, '袋蓋上方 3 cm');
    near(alone.x, -B.pocket.x, '置中');
    assert.equal(alone.art, '/badges/extra/leader_scoutAward.png');
    const st = { ...LEADER_BASE, leaderEmblem: 'bp', catholic: true, peace: true };
    const v = show(leader, outfit, st);
    const e = by(v, 'leaderEmblem');
    const c = by(v, 'catholic');
    assert.ok(c.x > e.x, '公教章喺左（內側），領袖標誌喺右（外側）（手冊 P.136）');
    assert.ok(!by(v, 'peace'), '最多兩個：和平使者章排後唔顯示');
    assert.equal(shownReason(leader, outfit, st, 'peace'), 'slotFull');
    // 同和平使者章：領袖標誌喺左（內側）
    const v2 = show(leader, outfit, { ...LEADER_BASE, leaderEmblem: 'bp', peace: true });
    assert.ok(by(v2, 'leaderEmblem').x > by(v2, 'peace').x, '領袖標誌喺和平使者章左方（內側）');
    // 有勳章：喺勳章頂上面
    const v3 = show(leader, outfit, { ...LEADER_BASE, leaderEmblem: 'scoutAward', gallantry: 'bronze' });
    const medal = by(v3, 'gallantry');
    assert.ok(bottom(by(v3, 'leaderEmblem')) >= top(medal) + 0.4 - 1e-9, '獎章領袖標誌喺勳章上面（手冊 P.135）');
    // 一般場合勳條：喺勳條上面
    const v4 = show(leader, { ...outfit, occasion: 'general' }, { ...LEADER_BASE, catholic: true, gallantry: 'bronze', meritAward: 'meritMedal', longService: 'gold', diamondJubilee: true });
    const rib = v4.filter((p) => p.kind === 'ribbon');
    assert.ok(rib.length >= 2);
    assert.ok(bottom(by(v4, 'catholic')) >= Math.max(...rib.map(top)) + 0.4 - 1e-9, '公教章喺勳條上面（手冊 P.140）');
  });

  test(`成年成員（${gender}）左胸袋：飛行章／跳傘章／寰宇童軍章（手冊 P.150、P.154、P.166–167）`, () => {
    const { B, top: T } = layout(gender, 'leader');
    const flap = T - B.pocket.top;
    const outfit = { gender, invested: true, uniform: 'u4' };
    for (const w of ['flying', 'parachute']) near(bottom(by(show(leader, outfit, { ...LEADER_BASE, wings: w }), 'wings')), flap + 3, `${w} 單獨：3 cm`);
    near(bottom(by(show(leader, outfit, { ...LEADER_BASE, worldScout: true }), 'worldScout')), flap + 3, '寰宇童軍章單獨：3 cm');
    const fly = show(leader, outfit, { ...LEADER_BASE, wings: 'flying', worldScout: true });
    near(bottom(by(fly, 'wings')), flap + 2, '飛行章同寰宇童軍章：飛行章 2 cm');
    assert.ok(bottom(by(fly, 'worldScout')) >= top(by(fly, 'wings')) + 0.4 - 1e-9, '寰宇童軍章喺上面');
    near(by(fly, 'worldScout').x, B.pocket.x, '上下排時置中');
    const para = show(leader, outfit, { ...LEADER_BASE, wings: 'parachute', worldScout: true });
    near(bottom(by(para, 'wings')), flap + 3, '跳傘章同寰宇童軍章並排：3 cm');
    near(bottom(by(para, 'worldScout')), flap + 3, '並排');
    assert.ok(by(para, 'wings').x < by(para, 'worldScout').x, '左胸袋喺 +x：跳傘章喺右（內側、x 細啲）');
  });

  test(`成年成員（${gender}）左袖：青年獎勵計劃金章喺上、拯溺布章喺下；ATAS 喺服務段章下面`, () => {
    const outfit = { gender, invested: true, uniform: 'u3' };
    const v = show(leader, outfit, { ...LEADER_BASE, hkayp: true, lifesaving: true, atas: true, serviceBars: 'four' });
    const [ay, ls, atas, bars] = ['hkayp', 'lifesaving', 'atas', 'serviceBars'].map((id) => by(v, id));
    near(ay.v - ay.h / 2, 2, '袖上方');
    assert.ok(ls.v - ls.h / 2 >= ay.v + ay.h / 2 + 1 - 1e-9, '拯溺布章喺下面（手冊 P.156）');
    assert.ok(atas.v - atas.h / 2 >= bars.v + bars.h / 2 - 1e-9, 'ATAS 唔撞服務段章');
    const only = by(show(leader, outfit, { ...LEADER_BASE, lifesaving: true }), 'lifesaving');
    near(only.v - only.h / 2, 2, '只得拯溺布章就喺最上');
  });
}

test('成年成員：禮服、晚禮服、制服毛衣唔戴非基本章', () => {
  const st = { ...LEADER_BASE, leaderEmblem: 'scoutAward', catholic: true, wings: 'flying', hkayp: true, atas: true };
  for (const outfit of [{ uniform: 'u1' }, { uniform: 'u2' }, { uniform: 'u3', sweater: true }]) {
    const v = show(leader, { gender: 'boy', invested: true, ...outfit }, st);
    for (const id of ['leaderEmblem', 'catholic', 'wings', 'hkayp', 'atas']) assert.ok(!by(v, id), `${outfit.uniform}${outfit.sweater ? '＋毛衣' : ''} 唔戴 ${id}`);
  }
});

test('介面：其他獎章及徽章一組、i18n 中英齊、規定分頁有說明', () => {
  const app = text('src/App.jsx');
  assert.ok(app.includes("b.group === 'extra'") && app.includes("t('badges.extra')"));
  const i18n = text('src/i18n.jsx');
  for (const k of ['badges.extra', 'badges.extraNoteRover', 'badges.extraNoteLeader', 'badge.why.slotFull', 'badge.why.replaced_peace']) assert.equal(i18n.split(`'${k}':`).length, 3, `${k} 中英各一`);
  const guide = text('src/rulesGuide.js');
  assert.ok(guide.includes('badges.extraNoteRover') && guide.includes('badges.extraNoteLeader'));
});
