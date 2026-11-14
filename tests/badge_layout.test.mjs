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

/* ---------- 學校運動上衣、背心 ---------- */
import { placeSchool, placeFor, shownReason } from '../src/three/badgeLayout.js';
import { neckerLayout } from '../src/three/body.js';

/** 點 (x, y) 喺倒三角（頂闊 w、高 h、尖喺 y = 0）入面 */
const inTri = (x, y, w, h) => y >= 0 && y <= h && Math.abs(x) <= (w / 2) * (y / h) + 1e-9;
/** 圓形離三角兩條斜邊夠唔夠遠 */
const circleInTri = (x, y, r, w, h) => {
  const k = w / 2 / h; // |x| = k y
  return [1, -1].every((s) => (k * y - s * x) / Math.hypot(1, k) >= r - 1e-9) && y - r >= 0 && y + r <= h;
};
const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-9 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 1e-9;

for (const gender of ['boy', 'girl']) {
  for (const vest of [false, true]) {
    const N = neckerLayout(layout(gender), { vest });
    const tip = N.back.top - N.back.h;

    test(`${gender}${vest ? '＋背心' : ''}：學校運動上衣（手冊 P.24）— 團員章喺領巾尖，進步章喺巾尾末端`, () => {
      const all = placeSchool(rules, gender, 'uh', { vest });
      const m = all.find((p) => p.id === 'membership');
      assert.equal(m.facing, 'back');
      assert.ok(circleInTri(m.x, m.y - tip, m.w / 2, N.back.w, N.back.h), '團員章出咗領巾尖');
      assert.ok(!all.some((p) => p.id === 'grasshopperAward'), '手冊冇小草蜢獎章');
      const s = (n) => all.find((p) => p.key === `progress-${n}`);
      for (const n of [1, 2, 3, 4]) assert.equal(s(n).facing, 'front');
      // 人看的角度：望住穿著者，左邊巾尾（穿著者右，-x）放紅、藍
      assert.ok(s(1).x < 0 && s(3).x < 0 && s(2).x > 0 && s(4).x > 0);
      near(s(3).y - s(1).y, 2, '紅藍相連');
      const tailBottom = N.tail.top - N.tail.len;
      for (const n of [1, 2, 3, 4]) {
        const p = s(n);
        assert.ok(Math.abs(Math.abs(p.x) - N.tail.x) + p.w / 2 <= N.tail.w / 2 + 1e-9, `progress-${n} 闊過巾尾`);
        assert.ok(p.y - p.h / 2 >= tailBottom + N.tail.tip, `progress-${n} 落咗巾尾尖`);
      }
      assert.ok(!overlap(s(1), s(2)) && !overlap(s(3), s(4)));
    });

    test(`${gender}${vest ? '＋背心' : ''}：學校運動上衣（指引 P.9 附圖）— 全部喺領巾尖，唔疊、唔出界`, () => {
      const all = placeSchool(rules, gender, 'gsg', { vest });
      assert.equal(all.length, 6);
      for (const p of all) {
        assert.equal(p.facing, 'back');
        const y = p.y - tip;
        if (p.shape === 'circle') assert.ok(circleInTri(p.x, y, p.w / 2, N.back.w, N.back.h), `${p.key} 出咗領巾尖`);
        else
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
            assert.ok(inTri(p.x + (dx * p.w) / 2, y + (dy * p.h) / 2, N.back.w, N.back.h), `${p.key} 出咗領巾尖`);
      }
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!overlap(all[i], all[j]), `${all[i].key} 同 ${all[j].key} 疊埋`);
      // 附圖（企喺後面望）：團員章左、小草蜢獎章右；藍喺最左、綠喺最右；紅喺團員章下面
      const g = (k) => all.find((p) => p.key === k);
      assert.ok(g('membership').x > 0 && g('grasshopperAward').x < 0, '後面望：左邊 = 穿著者左（+x）');
      assert.ok(g('progress-3').x > g('membership').x && g('progress-4').x < g('grasshopperAward').x);
      near(g('progress-1').x, g('membership').x, '紅喺團員章下面');
      assert.ok(g('progress-1').y < g('membership').y);
    });
  }
}

test('背心：團員章移去背心面，紀念章俾背心遮住', () => {
  const base = { gender: 'boy', invested: true };
  const a = placeFor(rules, base).find((p) => p.id === 'membership');
  const b = placeFor(rules, { ...base, vest: true }).find((p) => p.id === 'membership');
  assert.ok(b.z > a.z);
  assert.equal(shownReason(rules, { ...base, vest: true }, { commemorative: true }, 'commemorative'), 'vest');
  assert.equal(shownReason(rules, { ...base, school: true }, { troop: true }, 'troop'), 'school');
  assert.equal(shownReason(rules, { ...base, school: true, invested: false }, { progress: 2 }, 'progress'), 'schoolUninvested');
  assert.equal(shownReason(rules, { ...base, invested: false }, { membership: true }, 'membership'), 'uninvested');
  assert.equal(shownReason(rules, base, { membership: true }, 'membership'), null);
});
