// 童軍規則、擺位、小隊章測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeAll, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';
import { resolveArt, findPatrol } from '../src/lib/picks.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const scout = read('src/data/scout_rules_v1.0.json');
const districts = read('src/data/districts_v1.0.json');
const patrols = read('src/data/patrols_v1.0.json');
const pub = (f) => existsSync(new URL(`../public${f}`, import.meta.url));
const by = (list, id) => list.find((p) => p.id === id);
const badge = (id) => scout.badges.find((b) => b.id === id);
const ALL_ON = { membership: true, hongKong: true, troop: true, region: true, district: true, patrol: true, meritorious: true };

test('童軍規則資料通過驗證', () => {
  assert.deepEqual(validateRules(scout), []);
  assert.equal(scout.section.id, 'scout');
  assert.equal(scout.fileVersion, 'v1.0');
});

test('呢版只有制服頁徽章（手冊 P.30：會員章、香港章、地域章、區章、旅章、小隊章）+ 優異旅團章', () => {
  assert.deepEqual(scout.badges.map((b) => b.id).sort(), ['district', 'hongKong', 'membership', 'meritorious', 'patrol', 'region', 'troop']);
  for (const id of ['membership', 'hongKong', 'troop', 'region', 'district', 'patrol']) assert.equal(badge(id).required, true, `${id} 係必備`);
  assert.equal(badge('meritorious').required, false);
});

for (const gender of ['boy', 'girl']) {
  test(`童軍（${gender}）：會員章喺左胸袋中央，香港章喺左袋蓋上面 3 cm（手冊 P.92–93）`, () => {
    const { B, top } = layout(gender, 'scout');
    const all = placeAll(scout, gender);
    const m = by(all, 'membership');
    const hk = by(all, 'hongKong');
    assert.ok(m.x > 0 && hk.x > 0, '要喺穿著者左邊（+x）');
    assert.equal(m.x, B.pocket.x);
    const flapTop = top - B.pocket.top;
    assert.ok(m.y < flapTop - B.pocket.flap && m.y > flapTop - B.pocket.h, '會員章要喺袋身入面');
    assert.ok(Math.abs(hk.y - hk.h / 2 - (flapTop + 3)) < 1e-9, '香港章底要喺袋蓋頂上 3 cm');
    assert.ok(hk.y + hk.h / 2 < top, '香港章唔可以出咗膊頭');
    assert.ok(B.pocket.x + B.pocket.w / 2 < B.torso.w / 2, '胸袋要喺身入面');
  });

  test(`童軍（${gender}）：右袖 旅章 → 地域章（前）＋區章（後）→ 小隊章（縫線上 3 cm）→ 優異旅團章（手冊 P.94–95、P.131、P.169）`, () => {
    const all = placeAll(scout, gender);
    const face = sleeveFace(gender, 'scout');
    const [troop, region, district, patrol, merit] = ['troop', 'region', 'district', 'patrol', 'meritorious'].map((id) => by(all, id));
    for (const p of [troop, region, district, patrol, merit]) assert.equal(p.mount, 'r');
    assert.ok(Math.abs(troop.v - troop.h / 2 - 2) < 1e-9, '旅章頂離肩膊縫 2 cm');
    const troopBottom = troop.v + troop.h / 2;
    for (const p of [region, district]) assert.ok(Math.abs(p.v - p.h / 2 - (troopBottom + 2)) < 1e-9, `${p.id} 要喺旅章下 2 cm`);
    assert.ok(region.u > 0 && district.u < 0, '地域章前、區章後');
    // 小隊章：底邊喺袖口縫線上方 3 cm、置中
    assert.equal(patrol.u, 0);
    assert.ok(Math.abs(face.cuffSeam - (patrol.v + patrol.h / 2) - 3) < 1e-9, '小隊章底離縫線 3 cm');
    // 次序（由上至下）同唔重疊
    const bottom = (p) => p.v + p.h / 2;
    const topOf = (p) => p.v - p.h / 2;
    assert.ok(bottom(region) < topOf(patrol), '小隊章要喺地域／區章下面');
    assert.ok(bottom(patrol) < topOf(merit), '優異旅團章要喺小隊章下面');
    assert.ok(bottom(merit) <= face.cuffSeam, '優異旅團章唔可以過咗縫線');
    for (const p of [troop, region, district, patrol, merit]) assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-9, `${p.id} 唔可以出咗袖面`);
  });
}

test('小隊章、會員章要宣誓後先顯示；團隊長除外寫咗落規則', () => {
  const all = placeAll(scout, 'boy');
  const ids = (inv) => visible(all, ALL_ON, { invested: inv }).map((p) => p.id).sort();
  assert.ok(ids(true).includes('patrol'));
  assert.ok(!ids(false).includes('patrol'));
  assert.ok(!ids(false).includes('membership'));
  assert.ok(ids(false).includes('troop'));
  assert.equal(shownReason(scout, { gender: 'boy', invested: false }, ALL_ON, 'patrol'), 'uninvested');
  assert.equal(shownReason(scout, { gender: 'boy', invested: true }, ALL_ON, 'patrol'), null);
  assert.ok(scout.notAllowed.some((n) => n.id === 'troopLeader'));
  assert.equal(badge('patrol').needsInvestiture, true);
});

test('32 個小隊（綱要 P.199–202），每隊有圖案同兩個隊色', () => {
  assert.equal(patrols.patrols.length, 32);
  const ids = new Set(patrols.patrols.map((p) => p.id));
  assert.equal(ids.size, 32);
  for (const p of patrols.patrols) {
    assert.ok(pub(p.file), `${p.id} 圖案唔見咗`);
    assert.equal(p.hex.length, 2);
    for (const h of p.hex) assert.match(h, /^#[0-9a-f]{6}$/);
    assert.ok(p.zh && p.en && p.colours.zh && p.colours.en);
  }
  // 抽查：獾 紫白；牡牛 全紅（兩格同色）；狼 黃黑
  assert.equal(findPatrol(patrols, 'badger').colours.zh, '紫白');
  const bull = findPatrol(patrols, 'bull');
  assert.equal(bull.hex[0], bull.hex[1]);
  assert.equal(findPatrol(patrols, 'wolf').colours.en, 'Yellow and Black');
});

test('小隊章圖案跟用戶揀：未揀 = 示例，揀咗 = 嗰隊', () => {
  const b = badge('patrol');
  const none = resolveArt(b, { patrolId: '' }, districts, patrols);
  assert.equal(none.example, true);
  assert.ok(pub(none.file));
  const fox = resolveArt(b, { patrolId: 'fox' }, districts, patrols);
  assert.equal(fox.file, '/badges/patrols/fox.png');
  assert.equal(fox.example, false);
  assert.equal(fox.patrol.zh, '狐狸');
  // 亂打 id：返去示例，唔會爆
  assert.equal(resolveArt(b, { patrolId: 'dragon' }, districts, patrols).example, true);
});

test('童軍身形：155 cm，袖夠長擺齊右袖所有章', () => {
  const { B, top } = layout('boy', 'scout');
  assert.equal(B.height, 155);
  assert.ok(B.head.y + B.head.h <= B.height);
  assert.equal(top, B.torso.y + B.torso.h);
  const face = sleeveFace('boy', 'scout');
  assert.ok(face.width >= 9 + 0.5, '袖面要闊過旅章');
});
