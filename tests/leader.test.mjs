// 成年成員（領袖）規則、層級、職級、擺位測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeAll, visible, shownReason, levelOk } from '../src/three/badgeLayout.js';
import { layout, strapLayout, isSenior, leaderUniform, leaderLegwear, LEADER_VARIANTS, COLOURS } from '../src/three/body.js';
import { ranksFor, fixRank, rankRowOf, rankCap, resolveArt, leaderNeckwear } from '../src/lib/picks.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const leader = read('src/data/leader_rules_v1.0.json');
const pub = (f) => existsSync(new URL(`../public${f}`, import.meta.url));
const badge = (id) => leader.badges.find((b) => b.id === id);
const ALL_ON = { membership: true, hongKong: true, hkTitle: true, troop: true, ahq: true, region: true, district: true, epaulette: true, retiredPin: true, meritorious: true };
const shownIds = (gender, level, state = ALL_ON) => visible(placeAll(leader, gender), state, { invested: true, level }).map((p) => p.id);

test('成年成員規則資料通過驗證，喺支部切換最後', () => {
  assert.deepEqual(validateRules(leader), []);
  assert.equal(leader.section.id, 'leader');
  assert.equal(leader.fileVersion, 'v1.0');
  const src = readFileSync(new URL('../src/data/rules.js', import.meta.url), 'utf8');
  assert.match(src, /import LEADER from '\.\/leader_rules_v1\.0\.json'/);
  assert.match(src, /rover: ROVER, leader: LEADER \}/);
  assert.ok(isSenior('leader'), '成年成員有肩帶');
});

test('四個單位層級；職級跟層級篩選（手冊 P.94–95、P.103–104）', () => {
  assert.deepEqual(leader.levels.map((l) => l.id), ['group', 'district', 'region', 'hq']);
  const ids = (lv) => ranksFor(leader, lv).map((r) => r.id);
  assert.ok(ids('group').includes('sectionLeader') && ids('group').includes('instructor'));
  assert.ok(!ids('group').includes('districtCommissioner'));
  assert.ok(ids('hq').includes('chiefCommissioner') && ids('hq').includes('chiefScout'));
  assert.ok(ids('region').includes('regionalScouter') && !ids('region').includes('hqScouter'));
  assert.ok(ids('district').includes('districtSectionLeader'));
  // 轉層級：唔屬於新層級嘅職級改做第一個
  assert.equal(fixRank(leader, 'group', 'sectionLeader'), 'sectionLeader');
  assert.equal(fixRank(leader, 'hq', 'sectionLeader'), ids('hq')[0]);
});

test('每個職級都有一個肩章同帽章，圖案檔存在（手冊 P.103–104）', () => {
  const ep = badge('epaulette');
  assert.equal(ep.dynamic, 'rank');
  assert.equal(ep.required, true);
  for (const r of leader.ranks) {
    const row = rankRowOf(ep, r.id);
    assert.ok(row, `${r.id} 有肩章`);
    assert.ok(pub(row.art.file), row.art.file);
    assert.ok(pub(row.cap.file), row.cap.file);
    assert.equal(rankCap(leader, r.id).file, row.cap.file);
  }
  assert.equal(rankRowOf(ep, 'sectionLeader').cap.file, '/badges/leader/cap_green.png', '團長綠色帽章');
  assert.equal(rankRowOf(ep, 'assistantSectionLeader').cap.file, '/badges/leader/cap_red.png', '副團長紅色帽章');
  assert.equal(rankRowOf(ep, 'groupScoutLeader').cap.file, '/badges/leader/cap_blue.png', '旅長藍色帽章');
  assert.equal(resolveArt(ep, { rank: 'sectionLeader' }, null, null).file, '/badges/leader/epaulette_sl.png');
});

test('右袖跟層級：旅 = 旅章 + 地域／區並排；區 = 香港肩章 + 地域／區；地域 = 香港肩章 + 地域章置中；總部 = 香港肩章 + 總會總部章置中', () => {
  for (const g of ['boy', 'girl']) {
    const grp = shownIds(g, 'group');
    assert.ok(grp.includes('troop') && !grp.includes('hkTitle') && grp.includes('region') && grp.includes('district') && !grp.includes('ahq'));
    const dis = shownIds(g, 'district');
    assert.ok(dis.includes('hkTitle') && !dis.includes('troop') && dis.includes('region') && dis.includes('district'));
    assert.ok(!dis.includes('meritorious'), '優異旅團章只係旅');
    const reg = visible(placeAll(leader, g), ALL_ON, { invested: true, level: 'region' });
    assert.deepEqual(reg.filter((p) => ['region', 'district', 'ahq'].includes(p.id)).map((p) => [p.id, p.u, !!p.centred]), [['region', 0, true]]);
    const hq = visible(placeAll(leader, g), ALL_ON, { invested: true, level: 'hq' });
    const ahq = hq.find((p) => p.id === 'ahq');
    assert.ok(ahq && ahq.u === 0 && hq.some((p) => p.id === 'hkTitle'));
    assert.ok(!hq.some((p) => p.id === 'region' || p.id === 'district'));
  }
  // 香港肩章同旅章喺同一個位（膊頭下 2 cm）
  const P = placeAll(leader, 'boy');
  const hk = P.find((p) => p.id === 'hkTitle'), tr = P.find((p) => p.id === 'troop');
  assert.equal(hk.v, tr.v);
  assert.equal(shownReason(leader, { gender: 'boy', invested: true }, ALL_ON, 'troop', { level: 'hq' }), 'level');
  assert.ok(levelOk({ levels: ['group'] }, null), '其他支部冇層級就唔篩');
});

test('職級肩章喺肩帶膊頭嗰頭，徽號向衣領；「R」字樣別針喺肩章近膊頭嗰半（手冊 P.105–106、P.172）', () => {
  for (const g of ['boy', 'girl']) {
    const L = layout(g, 'leader');
    const S = strapLayout(L);
    const P = placeAll(leader, g);
    for (const [k, sx] of [['l', 1], ['r', -1]]) {
      const e = P.find((p) => p.key === `epaulette-${k}`);
      const pin = P.find((p) => p.key === `retiredPin-${k}`);
      assert.ok(Math.abs(e.x) + e.h / 2 <= S.outer + 1e-6, '唔出膊頭');
      assert.ok(Math.abs(e.x) - e.h / 2 > S.inner, '喺衣領外面');
      assert.ok(sx * pin.x > sx * e.x, 'R 別針近膊頭');
      assert.ok(Math.abs(pin.x - e.x) + pin.h / 2 <= e.h / 2, 'R 別針喺肩章入面');
      assert.equal(e.rot[3], 'YXZ');
      assert.equal(e.rot[1], (sx * Math.PI) / 2);
    }
  }
  // 冇肩章就冇 R 別針
  assert.ok(!shownIds('boy', 'group', { ...ALL_ON, epaulette: false }).includes('retiredPin'));
  assert.equal(shownReason(leader, { gender: 'boy', invested: true }, { ...ALL_ON, epaulette: false }, 'retiredPin', { level: 'group' }), 'needsHost');
});

test('成年方塊人：男 172 cm、女 160 cm；肩帶闊度唔跟比例', () => {
  const m = layout('boy', 'leader').B, f = layout('girl', 'leader').B;
  assert.equal(m.height, 172);
  assert.equal(f.height, 160);
  assert.equal(m.strap.w, 4.4);
  assert.equal(f.strap.w, 4.4);
  assert.ok(m.head.y + m.head.h <= 172.5 && m.head.y + m.head.h >= 167, '頭頂接近身高');
  assert.ok(m.shortsBottom > m.longSockTop, '短褲腳高過長襪頂');
});

test('制服編號：5 男短褲、6 女長褲；女編號 3／4 半截裙配肉色襪褲；4 領帶', () => {
  assert.equal(leaderUniform('girl', 'u5'), 'u6');
  assert.equal(leaderUniform('boy', 'u6'), 'u5');
  assert.equal(leaderUniform('boy', 'zz'), 'u3');
  const g3 = leaderLegwear('girl', 'u3');
  assert.ok(g3.skirt && !g3.laced && g3.sock === COLOURS.tights);
  const g6 = leaderLegwear('girl', 'u6');
  assert.ok(!g6.skirt && g6.laced && g6.sock === COLOURS.blackSock);
  assert.ok(leaderLegwear('boy', 'u5').shorts);
  assert.ok(leaderLegwear('boy', 'u4').tie && !leaderLegwear('boy', 'u3').tie);
  // 領帶顏色：陸上深綠、海黑、空深藍（手冊 P.113）
  assert.equal(LEADER_VARIANTS.land.tie, COLOURS.tieGreen);
  assert.equal(LEADER_VARIANTS.sea.tie, COLOURS.tieBlack);
  assert.equal(LEADER_VARIANTS.air.tie, COLOURS.tieNavy);
  assert.equal(LEADER_VARIANTS.sea.hat, 'seaLeader');
});

test('領巾、巾圈、木章資格（手冊 P.108–111、P.115–116）', () => {
  const base = { leaderNecker: 'association', leaderWoggle: 'gilwell', woodBadge: true, training: 'none' };
  let n = leaderNeckwear(leader, base, { level: 'group', rank: 'sectionLeader' });
  assert.equal(n.necker, 'unit', '旅層級唔可以戴會巾');
  assert.ok(!n.gilwellWoggle && !n.woodBadge, '未完成第 4 階段：冇基維爾巾圈、冇木章');
  n = leaderNeckwear(leader, { ...base, training: 'basic' }, { level: 'district', rank: 'districtScouter' });
  assert.equal(n.necker, 'association');
  assert.ok(n.gilwellWoggle && !n.woodBadge, '第 4 階段：基維爾巾圈，未有木章');
  n = leaderNeckwear(leader, { ...base, leaderNecker: 'gilwell', woodBadge: false, leaderWoggle: 'scout', training: 'woodBadge' }, { level: 'hq', rank: 'leaderTrainerInCharge' });
  assert.ok(n.necker === 'gilwell' && n.gilwellWoggle && n.woodBadge, '基維爾領巾一定配基維爾巾圈同木章');
  assert.equal(n.beads, 4);
  assert.ok(n.trainer);
  assert.equal(leaderNeckwear(leader, { training: 'woodBadge', woodBadge: true }, { level: 'hq', rank: 'assistantLeaderTrainerInCharge' }).beads, 3);
  assert.equal(leaderNeckwear(leader, { training: 'woodBadge', woodBadge: true }, { level: 'group', rank: 'sectionLeader' }).beads, 2);
});

test('領袖圖案細（Vercel 唔爆 storage）', () => {
  const files = [...new Set(leader.badges.flatMap((b) => [b.art?.file, ...(b.rows || []).flatMap((r) => [r.art.file, r.cap.file])]).filter(Boolean))];
  let total = 0;
  for (const f of files) {
    assert.ok(pub(f), f);
    const size = statSync(new URL(`../public${f}`, import.meta.url)).size;
    assert.ok(size < 60_000, `${f} ${size} bytes`);
    total += size;
  }
  assert.ok(total < 400_000, `total ${total}`);
});
