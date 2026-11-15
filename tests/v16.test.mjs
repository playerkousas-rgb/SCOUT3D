// 領袖勳章及獎勵細則覆核（手冊 P.177–195、第 24/2025 號通告）同銅狼圖片測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const rules = JSON.parse(text('src/data/leader_rules_v1.0.json'));
const i18n = text('src/i18n.jsx');
const zh = i18n.slice(i18n.indexOf('  zh: {'), i18n.indexOf('  en: {'));
const en = i18n.slice(i18n.indexOf('  en: {'));
const app = text('src/App.jsx');
const badge = (id) => rules.badges.find((b) => b.id === id);
const outfit = (u, extra = {}) => ({ gender: 'boy', uniform: `u${u}`, invested: true, ...extra });
const shown = (u, state, extra) => visible(placeFor(rules, outfit(u, extra)), state, { invested: true, level: 'group' });

test('規則資料仍然通過驗證', () => {
  assert.deepEqual(validateRules(rules), []);
});

test('銅狼勳章：用用戶提供嘅圖片（150 × 200 比例、冇示意圖標籤）', () => {
  const wolf = badge('neckMedal').choices.find((c) => c.id === 'bronzeWolf');
  assert.equal(wolf.zh.name, '銅狼勳章');
  assert.equal(wolf.order, 2, '第 24/2025 號通告第 2 位');
  assert.equal(wolf.art.user, true);
  assert.equal(wolf.art.drawn, undefined);
  assert.equal(wolf.art.px[0] / wolf.art.px[1], 0.75, '同獅／龍一樣 3 : 4');
  // PNG 闊高 = px
  const buf = readFileSync(new URL(`../public${wolf.art.file}`, import.meta.url));
  assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], wolf.art.px);
  assert.match(rules.sources.WOSM.edition.zh, /用戶提供/);
  assert.doesNotMatch(JSON.stringify(rules.sources.WOSM), /示意|drawn/);
  assert.ok(app.includes("art.user ? 'info.artUser'"));
  assert.ok(!app.includes('art.drawn'));
});

test('等級：各獎勵 order 同第 24/2025 號通告一致', () => {
  const ord = (id, c) => (c ? badge(id).choices.find((x) => x.id === c).order : badge(id).rackOrder);
  const want = [
    ['gallantry', 'gold', 1], ['meritAward', 'meritCross', 9], ['meritAward', 'meritMedal', 11],
    ['meritAward', 'distinguishedService', 13], ['meritAward', 'goodService', 14], ['diamondJubilee', null, 16],
    ['millennium', 'star', 17], ['metroCamp', 'silver', 18], ['centenary', 'silver', 19], ['scoutCentre', null, 23],
    ['sp95', 'gold', 24], ['sp100', 'goldthree', 25], ['specialStar', 'eleven', 27], ['specialContribution', 'one', 28],
    ['longService', 'six', 31], ['neckMedal', 'goldLion', 3], ['neckMedal', 'silverDragon', 5], ['neckMedal', 'greenDragon', 6],
  ];
  for (const [id, c, n] of want) assert.equal(ord(id, c), n, `${id} ${c}`);
});

test('同一個獎勵只戴最高級一個：功績榮譽、長期服務都係單選', () => {
  for (const id of ['meritAward', 'longService', 'gallantry', 'neckMedal', 'serviceBars']) {
    const b = badge(id);
    assert.ok(b.choices && b.choices[0].id === 'none', id);
  }
  const names = badge('meritAward').choices.map((c) => c.zh.name);
  for (const n of ['功績榮譽十字章', '功績榮譽獎章', '優異服務獎章', '優良服務獎章']) assert.ok(names.includes(n), n);
});

test('長期服務獎章：15 年，之後每 10 年加一星（P.185）', () => {
  const yrs = Object.fromEntries(badge('longService').choices.filter((c) => c.art).map((c) => [c.id, c.years]));
  assert.deepEqual(yrs, { medal: 15, one: 25, two: 35, three: 45, four: 55, five: 65, six: 75 });
  for (const c of badge('longService').choices.filter((x) => x.art)) assert.ok(c.zh.name.includes(`${c.years} 年`), c.id);
});

test('服務段章：只限恤衫左袖，第一段喺袖口縫線上方 3 cm，向上疊（P.184、P.189）', () => {
  const b = badge('serviceBars');
  assert.deepEqual(b.uniforms, ['u3', 'u4', 'u5', 'u6']);
  assert.deepEqual(b.choices.filter((c) => c.art).map((c) => c.count), [1, 2, 3, 4]);
  for (const c of b.choices.filter((x) => x.art)) assert.ok(existsSync(new URL(`../public${c.art.file}`, import.meta.url)), c.art.file);
  const face = sleeveFace('boy', 'leader');
  const ps = placeFor(rules, outfit(3)).filter((p) => p.id === 'serviceBars');
  assert.equal(ps.length, 4);
  for (const p of ps) {
    assert.equal(p.mount, 'l', '左袖');
    assert.equal(p.u, 0, '中央');
    assert.ok(Math.abs(p.v + p.h / 2 - (face.cuffSeam - 3)) < 1e-9, '底喺縫線上方 3 cm');
  }
  const h = ps.map((p) => p.h);
  assert.ok(h[0] < h[1] && h[1] < h[2] && h[2] < h[3], '段數多就高啲');
  // 禮服、晚禮服、制服毛衣都唔戴
  for (const u of ['1', '2']) assert.ok(!placeFor(rules, outfit(u)).some((p) => p.id === 'serviceBars'), `編號 ${u}`);
  assert.ok(!placeFor(rules, outfit(3, { sweater: true })).some((p) => p.id === 'serviceBars'), '毛衣');
});

test('服務段章：獲頒長期服務獎章之後唔再戴（P.189）', () => {
  const ids = (s) => shown(3, s).map((p) => p.id);
  assert.ok(ids({ serviceBars: 'three' }).includes('serviceBars'));
  assert.ok(!ids({ serviceBars: 'three', longService: 'medal' }).includes('serviceBars'));
  assert.ok(ids({ serviceBars: 'three', longService: 'none' }).includes('serviceBars'));
  assert.equal(shownReason(rules, outfit(3), { serviceBars: 'two', longService: 'one' }, 'serviceBars', { level: 'group' }), 'replaced');
  assert.ok(zh.includes("'badge.why.replaced'") && en.includes("'badge.why.replaced'"));
});

test('特殊貢獻星章只可以同第十次嘅特殊貢獻徽章一齊戴（P.183）', () => {
  const ids = (s) => shown(1, s).map((p) => `${p.id}:${p.choice ?? ''}`);
  assert.ok(ids({ specialContribution: 'three' }).includes('specialContribution:three'));
  assert.ok(!ids({ specialContribution: 'three', specialStar: 'eleven' }).includes('specialContribution:three'));
  assert.ok(ids({ specialContribution: 'ten', specialStar: 'eleven' }).includes('specialContribution:ten'));
  assert.ok(ids({ specialContribution: 'ten', specialStar: 'eleven' }).includes('specialStar:eleven'));
  assert.equal(shownReason(rules, outfit(1), { specialContribution: 'five', specialStar: 'twelve' }, 'specialContribution', { level: 'group' }), 'limited');
  assert.ok(zh.includes("'badge.why.limited'") && en.includes("'badge.why.limited'"));
});

test('四個或以上勳章重疊、最高等級喺最上面；由內至外按等級', () => {
  const state = { gallantry: 'gold', meritAward: 'meritCross', longService: 'two', metroCamp: 'silver' };
  const rack = shown(3, state).filter((p) => p.rack);
  assert.equal(rack.length, 4);
  assert.ok(rack.every((p) => p.overlap));
  const byOrder = [...rack].sort((a, b) => a.order - b.order);
  assert.equal(byOrder[0].id, 'gallantry');
  assert.ok(byOrder.every((p, i) => i === 0 || p.z < byOrder[i - 1].z), '高等級喺上面');
  // 右胸（-x）：內側 = 近中線 = x 大啲
  assert.ok(byOrder.every((p, i) => i === 0 || p.x < byOrder[i - 1].x), '由內至外');
  const three = shown(3, { gallantry: 'gold', meritAward: 'meritCross', longService: 'two' }).filter((p) => p.rack);
  assert.ok(three.every((p) => !p.overlap), '兩至三個並排');
});

test('文件之間嘅分別：拎走過時嘅「恤衫之後先做」，加勳條同其他獎勵', () => {
  const ids = rules.conflicts.map((c) => c.id);
  assert.ok(!ids.includes('medalsOnShirt'));
  assert.ok(ids.includes('ribbonsGeneral') && ids.includes('otherAwards'));
  const gaps = rules.conflicts.find((c) => c.id === 'medalPrecedenceGaps');
  assert.doesNotMatch(gaps.zh, /冇鋼狼|冇銅狼/);
});

test('勳章摘要寫明英勇、功績榮譽、長期服務（之前用戶搵唔到）', () => {
  for (const k of ['功績榮譽', '長期服務', '英勇']) assert.ok(zh.includes(`'badges.awards': '勳章及獎勵：`) && zh.match(/'badges\.awards': '([^']*)'/)[1].includes(k), k);
  assert.match(en.match(/'badges\.awards': '([^']*)'/)[1], /merit, long service/);
});
