// v23b：童軍嘅金紫荊獎章標誌、深資童軍先修章、和平使者章、地球部落／「積極公民」獎章（綱要 P.12–15）；
// 深資／樂行年星同最高獎章標誌、成人獎章領袖標誌（手冊 P.129–130、P.134–135）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible } from '../src/three/badgeLayout.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const R = Object.fromEntries(['cub', 'scout', 'venture', 'rover', 'leader'].map((s) => [s, read(`src/data/${s}_rules_v1.0.json`)]));
const BASIC = { membership: true, hongKong: true, troop: true, region: true, district: true, patrol: true, meritorious: true };
const OUTFIT = { gender: 'boy', invested: true };
const shown = (rules, state, outfit = OUTFIT) => visible(placeFor(rules, outfit), state, { invested: outfit.invested });
const one = (list, id) => list.find((b) => b.id === id);
const ids = (s) => new Set(R[s].badges.map((b) => b.id));
const EARTH = ['earthTribe', 'plasticTide', 'natureChampions', 'goSolar'];
const CITIZEN = ['citizenScam', 'citizenChild', 'citizenDrug', 'citizenEmergency', 'citizenGreen'];

test('v23b 童軍規則資料通過驗證；新章來源指向童軍綱要', () => {
  assert.deepEqual(validateRules(R.scout), []);
  for (const id of ['emblemBauhinia', 'ventureLink', 'peace', ...EARTH, ...CITIZEN]) {
    const b = R.scout.badges.find((x) => x.id === id);
    assert.ok(b, id);
    assert.ok(b.sources.some((s) => s.ref === 'STS'), `${id} 要引綱要`);
    assert.ok(R.scout.sources[b.art.ref], `${id} art.ref 要喺 scout sources 入面`);
  }
});

test('深資（紅 1–6）同樂行（藍 1–7）都有服務年星，仲有以前支部嘅年星（手冊 P.129–130）', () => {
  const n = (s, id) => R[s].badges.find((b) => b.id === id).choices.filter((c) => c.art).length;
  assert.equal(n('venture', 'serviceStar'), 6);
  assert.equal(n('rover', 'serviceStar'), 7);
  for (const id of ['serviceStarScout', 'serviceStarCub', 'serviceStarGrasshopper']) assert.ok(ids('venture').has(id) && ids('rover').has(id), id);
  assert.ok(ids('rover').has('serviceStarVenture'));
});

test('最高獎章標誌（手冊 P.134）：童軍有金紫荊，深資有金紫荊＋總領袖，樂行有三個；幼童軍冇（佢係第一個有最高獎章嘅支部）', () => {
  assert.ok(ids('scout').has('emblemBauhinia') && !ids('scout').has('emblemChief'));
  for (const id of ['emblemBauhinia', 'emblemChief']) assert.ok(ids('venture').has(id), id);
  for (const id of ['emblemBauhinia', 'emblemChief', 'emblemScoutAward']) assert.ok(ids('rover').has(id), id);
  assert.ok(![...ids('cub')].some((id) => id.startsWith('emblem')));
});

test('成人獎章領袖標誌（手冊 P.135）：一次只可以揀一個，袋蓋上方 3 cm', () => {
  const b = R.leader.badges.find((x) => x.id === 'leaderEmblem');
  assert.deepEqual(b.choices.map((c) => c.id), ['none', 'scoutAward', 'bp']);
  assert.equal(R.leader.slots[b.anchor.slot].layers.find((L) => L.id === b.anchor.layer).gapCm, 3);
});

test('地球部落同「積極公民」：幼童軍、童軍、深資、樂行都有；機電先鋒／國家安全大使只係幼童軍綱要有', () => {
  for (const s of ['cub', 'scout', 'venture', 'rover']) for (const id of [...EARTH, ...CITIZEN]) assert.ok(ids(s).has(id), `${s} ${id}`);
  for (const id of ['citizenEm', 'citizenNsa']) {
    assert.ok(ids('cub').has(id));
    for (const s of ['scout', 'venture', 'rover']) assert.ok(!ids(s).has(id), `${s} 綱要冇 ${id}`);
  }
});

test('童軍右袋蓋：金紫荊獎章標誌喺外側（右），深資童軍先修章喺內側；只戴一個就置中', () => {
  const both = shown(R.scout, { ...BASIC, emblemBauhinia: true, ventureLink: true });
  const e = one(both, 'emblemBauhinia');
  const l = one(both, 'ventureLink');
  assert.ok(e.x < l.x, '穿著者右邊 = −x；標誌要喺更外側');
  assert.ok(Math.abs(e.y - e.h / 2 - (l.y - l.h / 2)) < 0.01, '同一條底線（緊貼袋蓋）');
  const alone = one(shown(R.scout, { ...BASIC, emblemBauhinia: true }), 'emblemBauhinia');
  const linkAlone = one(shown(R.scout, { ...BASIC, ventureLink: true }), 'ventureLink');
  assert.ok(alone.x < 0, '喺穿著者右邊');
  assert.ok(Math.abs(alone.x - linkAlone.x) < 0.01, '單獨一個都喺袋蓋中央');
  assert.ok(alone.x < l.x && alone.x > e.x, '單獨時喺兩個並排嘅中間');
});

test('童軍和平使者章代替會員章（綱要 P.12「會員章 或 和平使者章」）', () => {
  const list = shown(R.scout, { ...BASIC, peace: true });
  assert.ok(one(list, 'peace'));
  assert.ok(!one(list, 'membership'));
});

test('童軍右袖：四個圓章一行喺地域／區章同小隊章之間，唔重疊；第五個唔顯示', () => {
  const state = { ...BASIC, ...Object.fromEntries([...EARTH, ...CITIZEN].map((id) => [id, true])) };
  const list = shown(R.scout, state);
  const row = list.filter((b) => [...EARTH, ...CITIZEN].includes(b.id));
  assert.equal(row.length, 4);
  const rg = one(list, 'region');
  const pt = one(list, 'patrol');
  for (const b of row) {
    assert.ok(b.v - b.h / 2 >= rg.v + rg.h / 2 - 0.01, `${b.id} 要喺地域章下面`);
    assert.ok(b.v + b.h / 2 <= pt.v - pt.h / 2 + 0.01, `${b.id} 要喺小隊章上面`);
  }
  for (let i = 0; i < row.length; i++) for (let j = i + 1; j < row.length; j++) assert.ok(Math.abs(row[i].u - row[j].u) >= (row[i].w + row[j].w) / 2 - 0.01, '唔可以重疊');
});
