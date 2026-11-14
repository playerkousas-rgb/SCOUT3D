// 徽章擺位回歸測試 · SCOUT3D · © SCOUT SYSTEM
// 位置全部由規則 JSON 計出嚟；呢度鎖死手冊寫明嘅距離，同埋「唔可以疊埋、唔可以出咗袖」。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { placeAll, visible, sleeveFace } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';

const rules = JSON.parse(readFileSync(new URL('../src/data/grasshopper_rules_v1.0.json', import.meta.url), 'utf8'));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}：${a} ≠ ${b}`);
const top = (p) => p.v - p.h / 2;
const bottom = (p) => p.v + p.h / 2;

for (const gender of ['boy', 'girl']) {
  const all = placeAll(rules, gender);
  const get = (key) => all.find((p) => p.key === key);
  const face = sleeveFace(gender);

  test(`${gender}：右袖 — 旅章喺肩膊縫線下 2 cm，區章喺旅章下 2 cm（手冊 P.24）`, () => {
    near(top(get('troop')), 2, '旅章頂');
    near(top(get('district')) - bottom(get('troop')), 2, '旅章同區章距離');
    assert.equal(get('troop').mount, 'r');
    assert.equal(get('district').mount, 'r');
    assert.equal(get('meritorious').mount, 'r');
    near(bottom(get('meritorious')), face.cuffSeam - 0.3, '優異旅團章喺袖口縫線上方');
  });

  test(`${gender}：左袖 — 進步獎章 2×2，下行紅啡、上行藍綠，紅色靠穿著者前方`, () => {
    const s = [1, 2, 3, 4].map((n) => get(`progress-${n}`));
    for (const p of s) assert.equal(p.mount, 'l');
    near(bottom(s[0]), face.cuffSeam - 0.3, '紅色底邊');
    near(s[0].v, s[1].v, '紅啡同一行');
    near(s[2].v, s[3].v, '藍綠同一行');
    near(s[0].v - s[2].v, 2, '上下兩行相連');
    near(s[1].u - s[0].u, 2, '同一行相連');
    // 左袖外側：u < 0 = 望嘅人左手邊 = 穿著者前方（+z）
    assert.ok(s[0].u < 0 && s[2].u < 0, '紅、藍喺穿著者前方');
    const award = get('grasshopperAward');
    assert.equal(award.mount, 'l');
    near(top(s[2]) - bottom(award), 1, '小草蜢獎章喺進步獎章上方 1 cm');
  });

  test(`${gender}：上身 — 團員章穿著者左胸，紀念章右胸`, () => {
    const { B } = layout(gender);
    const m = get('membership');
    const c = get('commemorative');
    assert.ok(m.x > 0, '團員章喺 +x（穿著者左）');
    assert.ok(c.x < 0, '紀念章喺 -x（穿著者右）');
    for (const p of [m, c]) assert.ok(Math.abs(p.x) + p.w / 2 <= B.torso.w / 2, `${p.id} 出咗件衫`);
  });

  test(`${gender}：同一面嘅章唔可以疊埋，亦唔可以出咗袖`, () => {
    for (const side of ['l', 'r']) {
      const list = all.filter((p) => p.mount === side);
      for (const p of list) {
        assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-9, `${p.key} 闊過袖`);
        assert.ok(top(p) >= 0 && bottom(p) <= face.cuffSeam + 1e-9, `${p.key} 出咗袖`);
      }
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const overlapU = Math.abs(a.u - b.u) < (a.w + b.w) / 2 - 1e-9;
          const overlapV = Math.abs(a.v - b.v) < (a.h + b.h) / 2 - 1e-9;
          assert.ok(!(overlapU && overlapV), `${a.key} 同 ${b.key} 疊埋`);
        }
    }
  });
}

test('開關：未宣誓唔顯示團員章；進步獎章按步數顯示', () => {
  const all = placeAll(rules, 'boy');
  const state = { membership: true, progress: 3, troop: true };
  const v = visible(all, state, { invested: false });
  assert.ok(!v.some((p) => p.id === 'membership'));
  assert.deepEqual(v.filter((p) => p.id === 'progress').map((p) => p.step), [1, 2, 3]);
  assert.ok(v.some((p) => p.id === 'troop'));
  assert.ok(!v.some((p) => p.id === 'district'));
});

test('每個徽章圖案檔都存在，而且有官方文件來源', () => {
  for (const b of rules.badges) {
    for (const art of Array.isArray(b.art) ? b.art : [b.art]) {
      assert.ok(existsSync(new URL(`../public${art.file}`, import.meta.url)), `${art.file} 唔存在`);
      assert.ok(rules.sources[art.ref] && art.page, `${b.id} 圖案冇來源`);
    }
  }
});
