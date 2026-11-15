// v23：幼童軍非基本章（2026 年 8 月版綱要 P.7 附圖）＋ 隊長／副隊長章（手冊 P.132；童軍綱要 P.12）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const pub = (f) => new URL(`../public${f}`, import.meta.url);
const cub = read('src/data/cub_rules_v1.0.json');
const scout = read('src/data/scout_rules_v1.0.json');
const OUTFIT = { gender: 'boy', invested: true };
const BASIC = { membership: true, hongKong: true, troop: true, region: true, district: true, meritorious: true };
const NONBASIC = cub.badges.filter((b) => b.group);
const top = (id) => (b) => b.id === id;
// 全部非基本章開（有選項就揀最後一個 = 最高級）；和平使者章熄（佢代替會員章）
const ALL = { ...BASIC, ...Object.fromEntries(NONBASIC.map((b) => [b.id, b.choices ? b.choices[b.choices.length - 1].id : true])), peace: false };
const shown = (rules, state, outfit = OUTFIT) => visible(placeFor(rules, outfit), state, { invested: outfit.invested });
const one = (list, id) => list.find(top(id));
const overlap = (a, b, ax = 'x', ay = 'y') =>
  Math.abs(a[ax] - b[ax]) < (a.w + b.w) / 2 - 0.01 && Math.abs(a[ay] - b[ay]) < (a.h + b.h) / 2 - 0.01;

test('v23 規則資料通過驗證；每個新章都有 default／圖案檔', () => {
  assert.deepEqual(validateRules(cub), []);
  assert.deepEqual(validateRules(scout), []);
  for (const b of [...NONBASIC, ...scout.badges.filter((x) => x.group)]) {
    if (b.choices) assert.ok(b.choices.some((c) => c.id === b.default), `${b.id} default`);
    const arts = b.choices ? b.choices.filter((c) => c.art).map((c) => c.art) : [b.art];
    for (const a of arts) {
      assert.ok(existsSync(pub(a.file)), `${b.id} 冇圖 ${a.file}`);
      assert.ok(statSync(pub(a.file)).size < 40 * 1024, `${a.file} 太大`);
    }
  }
});

test('幼童軍：綱要 P.7 附圖列明嘅非基本章齊（進度性獎章、核心範疇章、先修章、宗教章、隊長章、服務年星、活動徽章）', () => {
  const ids = new Set(cub.badges.map((b) => b.id));
  for (const id of ['progressAward', 'coreSkills', 'coreCaring', 'coreCommunity', 'coreFamily', 'scoutLink', 'faith', 'commemorative', 'peace', 'serviceStar', 'serviceStarGrasshopper', 'leaderBar', 'earthTribe', 'citizenEm', 'citizenNsa']) assert.ok(ids.has(id), id);
  assert.deepEqual(cub.badges.find(top('progressAward')).choices.map((c) => c.id), ['none', 'experience', 'adventure', 'advanced', 'bauhinia']);
  const act = cub.badges.filter((b) => b.group === 'activity');
  assert.equal(act.length, 37); // 綱要 P.25–26 索引：核心 9（積極公民另計）+ 興趣 28
  const three = act.filter((b) => b.choices).map((b) => b.id).sort();
  assert.deepEqual(three, ['actArchery', 'actAthletics', 'actCanoe', 'actFitness', 'actMusic', 'actOrienteering', 'actSwimmer']);
  for (const b of act) assert.ok(cub.areas.some((a) => a.id === b.area), `${b.id} 範疇`);
  assert.ok(text('src/data/cub_rules_v1.0.json').includes('v23SixerPosition'));
});

test('幼童軍右胸：進度性獎章喺右胸袋中央，先修章緊貼袋蓋，宗教章喺上面內側、紀念章外側', () => {
  const { B, top: T } = layout('boy', 'cub');
  const flapTop = T - B.pocket.top;
  const v = shown(cub, ALL);
  const pa = one(v, 'progressAward');
  assert.equal(pa.x, -B.pocket.x);
  assert.ok(pa.y < flapTop - B.pocket.flap && pa.y > flapTop - B.pocket.h);
  const sl = one(v, 'scoutLink');
  assert.ok(Math.abs(sl.y - sl.h / 2 - flapTop) < 0.01, '先修章底緊貼袋蓋頂');
  const f = one(v, 'faith');
  const c = one(v, 'commemorative');
  assert.ok(f.x > c.x, '宗教章喺內側（近中線 = x 大啲）');
  assert.ok(f.y - f.h / 2 >= sl.y + sl.h / 2, '宗教章喺先修章上面');
});

test('幼童軍左胸：隊長章喺會員章下面、袋身入面；服務年星喺左袋蓋，幼童軍嗰枚喺內側', () => {
  const { B, top: T } = layout('boy', 'cub');
  const flapTop = T - B.pocket.top;
  for (const ch of ['second', 'sixer']) {
    const v = shown(cub, { ...ALL, leaderBar: ch });
    const m = one(v, 'membership');
    const lb = one(v, 'leaderBar');
    assert.equal(lb.choice, ch);
    assert.equal(lb.x, m.x);
    assert.ok(lb.y + lb.h / 2 <= m.y - m.h / 2, `${ch} 喺會員章下面`);
    assert.ok(lb.y - lb.h / 2 >= flapTop - B.pocket.h, `${ch} 喺袋身入面`);
  }
  const v = shown(cub, ALL);
  const a = one(v, 'leaderBar');
  const second = one(shown(cub, { ...ALL, leaderBar: 'second' }), 'leaderBar');
  assert.ok(second.h < a.h, '副隊長章扁啲（手冊 P.132 圖案比例）');
  const s1 = one(v, 'serviceStar');
  const s2 = one(v, 'serviceStarGrasshopper');
  assert.ok(s1.x < s2.x, '幼童軍服務年星喺內側（近中線）');
  assert.ok(Math.abs(s1.y - s1.h / 2 - flapTop) < 0.01);
  // 未宣誓：隊長章、服務年星都唔顯示
  const u = shown(cub, ALL, { gender: 'boy', invested: false });
  assert.ok(!u.some((p) => ['leaderBar', 'serviceStar'].includes(p.id)));
});

test('幼童軍和平使者章代替會員章（綱要 P.7「會員章／和平使者章」）', () => {
  const v = shown(cub, { ...ALL, peace: true });
  assert.ok(one(v, 'peace'));
  assert.ok(!one(v, 'membership'));
  assert.equal(shownReason(cub, OUTFIT, { ...ALL, peace: true }, 'membership'), 'replaced_peace');
});

test('幼童軍左袖：核心範疇章菱形（綠上、紅前、黃後、紫下），活動徽章由袖口排起一行四、一行三，唔重疊', () => {
  const face = sleeveFace('boy', 'cub');
  const v = shown(cub, ALL).filter((p) => p.mount === 'l');
  const [g, r, y, pu] = ['coreSkills', 'coreCaring', 'coreCommunity', 'coreFamily'].map((id) => one(v, id));
  assert.equal(g.choice, 'gold');
  assert.ok(g.v < r.v && r.v === y.v && y.v < pu.v);
  assert.ok(r.u < 0 && y.u > 0, '左袖 u − = 前面：紅色喺前、黃色喺後（附圖）');
  assert.equal(g.u, 0);
  assert.equal(pu.u, 0);
  const act = v.filter((p) => p.id.startsWith('act'));
  assert.equal(act.length, 11, '最多 11 個（4 + 3 + 4）');
  const rows = [...new Set(act.map((p) => p.v))].sort((a, b) => b - a);
  assert.deepEqual(rows.map((rv) => act.filter((p) => p.v === rv).length), [4, 3, 4]);
  assert.ok(Math.abs(rows[0] + act[0].h / 2 - (face.cuffSeam - 0.5)) < 0.02, '第一行底喺袖口縫線上 0.5 cm');
  assert.ok(act.find((p) => p.v === rows[0] && p.u < -3), '第一個由前面排起');
  const all = [...act, g, r, y, pu];
  // 六角形（尖頂、闊 w = 對邊距離）：中心距離 ≥ w 就唔會重疊（咬合排列嘅外框會疊，唔用方框判斷）
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(all[i].u - all[j].u, all[i].v - all[j].v);
      assert.ok(d >= Math.max(all[i].w, all[j].w) - 0.01, `${all[i].key} 同 ${all[j].key} 重疊`);
    }
  }
  assert.ok(Math.min(...act.map((p) => p.v - p.h / 2)) > pu.v + pu.h / 2, '活動徽章喺核心範疇章下面');
  for (const p of all) assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2, `${p.key} 出咗袖`);
  // 第 12 個起：呢一行已經揀滿
  const twelfth = cub.badges.filter((b) => b.group === 'activity')[11].id;
  assert.equal(shownReason(cub, OUTFIT, ALL, twelfth), 'slotFull');
});

test('幼童軍活動徽章：少過一行就由前面格位排起；三級章跟揀咗嘅級數', () => {
  const st = { ...BASIC, actCamper: true, actMusic: 'silver' };
  const v = shown(cub, st).filter((p) => p.id.startsWith('act'));
  assert.equal(v.length, 2);
  const m = one(v, 'actMusic');
  assert.equal(m.choice, 'silver');
  assert.ok(m.art.endsWith('act_music_silver.png'));
  assert.ok(v.every((p) => p.u < 0), '左袖前面（u −）兩格');
});

test('幼童軍右袖：世界童軍組織／積極公民一行最多四個，唔撞地域章同優異旅團章', () => {
  const v = shown(cub, ALL).filter((p) => p.mount === 'r');
  const row = v.filter((p) => p.slot?.name === 'sleeveR');
  assert.equal(row.length, 4);
  const reg = one(v, 'region');
  const mer = one(v, 'meritorious');
  for (const p of row) {
    assert.ok(p.v - p.h / 2 > reg.v + reg.h / 2, `${p.id} 喺地域章下面`);
    assert.ok(p.v + p.h / 2 <= mer.v - mer.h / 2 + 0.01, `${p.id} 喺優異旅團章上面`);
  }
  assert.equal(shownReason(cub, OUTFIT, ALL, 'citizenNsa'), 'slotFull');
});

test('童軍：隊長／副隊長／團隊長章喺左胸袋會員章下面（綱要 P.12）；團隊長唔戴小隊章', () => {
  const S = { ...BASIC, patrol: true, modelScout: 'none', serviceStar: 'five', serviceStarCub: 'four', serviceStarGrasshopper: 'three' };
  assert.deepEqual(scout.badges.find(top('leaderBar')).choices.map((c) => c.id), ['none', 'assistant', 'leader', 'troopLeader']);
  for (const ch of ['assistant', 'leader', 'troopLeader']) {
    const v = shown(scout, { ...S, leaderBar: ch });
    const m = one(v, 'membership');
    const lb = one(v, 'leaderBar');
    assert.equal(lb.x, m.x);
    assert.ok(lb.y + lb.h / 2 <= m.y - m.h / 2);
    assert.equal(!!one(v, 'patrol'), ch !== 'troopLeader');
  }
  assert.equal(shownReason(scout, OUTFIT, { ...S, leaderBar: 'troopLeader' }, 'patrol'), 'replaced_leaderBar');
  const v = shown(scout, S);
  const stars = ['serviceStar', 'serviceStarCub', 'serviceStarGrasshopper'].map((id) => one(v, id));
  assert.ok(stars[0].x < stars[1].x && stars[1].x < stars[2].x, '童軍 → 幼童軍 → 小童軍，由內至外');
});

test('v23 介面：活動徽章細格仔、說明文字中英齊', () => {
  const app = text('src/App.jsx');
  assert.ok(app.includes('function ActivityGrid'));
  assert.ok(app.includes("cub: 'badges.extraNoteCub'"));
  const i18n = text('src/i18n.jsx');
  for (const k of ['badges.extraNoteCub', 'badges.activity', 'badges.activityNote', 'badges.activityCount', 'badge.why.replaced_leaderBar']) {
    assert.equal(i18n.split(`'${k}':`).length - 1, 2, `${k} 中英各一`);
  }
});
