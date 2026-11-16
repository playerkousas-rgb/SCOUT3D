// 成年成員（領袖）規則、層級、職級、擺位測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, levelOk, arrangeRacks, DISC_CM, MINI } from '../src/three/badgeLayout.js';
import { layout, strapLayout, isSenior, leaderUniform, leaderLegwear, LEADER_VARIANTS, COLOURS, dressLayout, isDress } from '../src/three/body.js';
import { ranksFor, fixRank, rankRowOf, rankCap, resolveArt, leaderNeckwear, messCapOf, cleanName } from '../src/lib/picks.js';

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
  // v21：加咗獎章領袖標誌、公教章、飛行章等 10 個圖（約 75 KB），上限由 400 KB 調到 480 KB（dist 仍遠低於 guard S7 嘅 5 MB）
  // v22：加咗模範童軍肩帶相（約 20 KB），上限調到 520 KB
  // v29：紀念章示例換做 2026 大會操紀念章（約 20 KB，取代 1 KB 色塊），上限調到 540 KB；guard S7 dist 上限用戶批准調到 10 MB
  assert.ok(total < 540_000, `total ${total}`);
});


/* ---------- v11：編號 1 禮服、編號 2 晚禮服（手冊 P.57–62、P.187–197、P.206–211） ---------- */

const idsFor = (gender, uniform, state, extra = {}) =>
  visible(placeFor(leader, { gender, uniform, invested: true, ...extra }), state, { invested: true, level: 'group' }).map((p) => p.id);

test('禮服／晚禮服：下身、領呔、外套殼（手冊 P.58–62）', () => {
  assert.ok(isDress('u1') && isDress('u2') && !isDress('u3'));
  assert.equal(leaderUniform('girl', 'u1'), 'u1');
  const b1 = leaderLegwear('boy', 'u1');
  assert.ok(b1.tie && !b1.skirt && b1.laced && b1.dress === 'jacket');
  const g1 = leaderLegwear('girl', 'u1');
  assert.ok(g1.skirt && !g1.longSkirt && !g1.laced);
  const b2 = leaderLegwear('boy', 'u2');
  assert.ok(b2.bowTie && b2.stripe && !b2.tie && b2.dress === 'mess');
  const g2 = leaderLegwear('girl', 'u2');
  assert.ok(g2.longSkirt && g2.skirt && !g2.stripe);
  const L = layout('boy', 'leader');
  const D1 = dressLayout(L, 'u1');
  const D2 = dressLayout(L, 'u2');
  assert.ok(D1.bottom < L.B.waist, '禮服上衣長過褲頭');
  assert.ok(D2.cummerbund && D2.fleur && !D1.fleur, '只有晚禮服有腰封同翻領童軍徽');
  assert.ok(D1.w > L.B.torso.w && D1.d > L.B.torso.d);
});

test('禮服只戴指定嘅章；晚禮服只得金屬肩章同勳章（手冊 P.57、P.60）', () => {
  const state = { ...ALL_ON, metalEpaulette: true, nameTag: true, mourningBand: true, thanksBadge: true };
  const u1 = idsFor('boy', 'u1', state);
  for (const id of ['membership', 'hongKong', 'troop', 'epaulette', 'nameTag', 'mourningBand', 'thanksBadge']) assert.ok(u1.includes(id), id);
  for (const id of ['region', 'district', 'meritorious', 'metalEpaulette']) assert.ok(!u1.includes(id), id);
  const u2 = idsFor('boy', 'u2', state);
  assert.deepEqual([...new Set(u2)].sort(), ['metalEpaulette', 'thanksBadge']);
  const u3 = idsFor('boy', 'u3', state);
  // 勳章及獎勵（包括感謝章）編號 1–6 都戴得（用戶 2026-11-15）；金屬肩章、喪禮黑紗仍然只係禮服
  assert.ok(u3.includes('thanksBadge') && !u3.includes('metalEpaulette') && !u3.includes('mourningBand'));
  assert.equal(shownReason(leader, { gender: 'boy', uniform: 'u2', invested: true }, state, 'membership'), 'uniform');
});

test('金屬職級肩章跟職級同季節；晚禮服硬帽編號（手冊 P.206–211）', () => {
  const b = badge('metalEpaulette');
  for (const r of leader.ranks) assert.ok(rankRowOf(b, r.id), `${r.id} 有金屬肩章`);
  for (const row of b.rows) {
    assert.ok(pub(row.art.summer.file) && pub(row.art.winter.file), row.cap);
    assert.ok(leader.messCaps.some((c) => c.id === row.cap), row.cap);
  }
  const s = resolveArt(b, { rank: 'sectionLeader', season: 'summer' }, null);
  const w = resolveArt(b, { rank: 'sectionLeader' }, null);
  assert.match(s.file, /summer/);
  assert.match(w.file, /winter/);
  assert.equal(messCapOf(leader, 'chiefScout', 'boy').code, 'LM01');
  assert.equal(messCapOf(leader, 'chiefScout', 'girl').code, 'LF01');
  assert.equal(messCapOf(leader, 'chiefCommissioner', 'boy').code, 'UM01');
  assert.equal(messCapOf(leader, 'sectionLeader', 'boy').code, 'UM05');
  assert.equal(messCapOf(leader, 'groupScoutLeader', 'girl').code, 'UF04');
});

test('名牌：清理輸入、冇輸入用手冊示例（手冊 P.128）', () => {
  const b = badge('nameTag');
  assert.equal(cleanName('  <童君好>\u0007 ', 8), '童君好');
  assert.equal(cleanName('一二三四五六七八九十', 8).length, 8);
  assert.equal(resolveArt(b, {}, null).kind, 'image');
  const art = resolveArt(b, { nameZh: '陳大文', nameEn: 'chan tai man' }, null);
  assert.deepEqual([art.kind, art.zh, art.en], ['nameTag', '陳大文', 'CHAN TAI MAN']);
});

test('勳章排：由內至外按等級，底部齊，四個或以上重疊、最高喺面（手冊 P.187、P.191–193）', () => {
  const state = { gallantry: 'gallantryBronze', meritAward: 'goodService', diamondJubilee: true };
  const pick = (st, uniform = 'u1') => visible(placeFor(leader, { gender: 'boy', uniform, invested: true }), st, { invested: true, level: 'group' }).filter((p) => p.rack);
  for (const b of leader.badges.filter((x) => x.group === 'awards' && x.choices)) {
    for (const c of b.choices.filter((c) => c.id !== 'none')) assert.ok(pub(c.art.file), `${b.id}/${c.id}`);
  }
  const ensure = (st) => {
    const out = {};
    for (const [k, v] of Object.entries(st)) {
      const b = badge(k);
      out[k] = v === true || !b.choices ? true : b.choices.some((c) => c.id === v) ? v : b.choices.find((c) => c.id !== 'none').id;
    }
    return out;
  };
  const three = pick(ensure(state));
  assert.equal(three.length, 3);
  const byOrder = [...three].sort((a, b) => a.order - b.order);
  // 右胸 = -X；內側 = 近中線 → 等級高嘅 x 大（較近 0）
  assert.ok(byOrder[0].x > byOrder[1].x && byOrder[1].x > byOrder[2].x, '由內側到外側');
  assert.ok(three.every((p) => !p.overlap));
  const bottoms = three.map((p) => Math.round((p.y - p.h / 2) * 100) / 100);
  assert.equal(new Set(bottoms).size, 1, '底部同一水平');
  const five = pick(ensure({ ...state, scoutCentre: true, longService: 'x' }));
  assert.equal(five.length, 5);
  assert.ok(five.every((p) => p.overlap));
  const top = [...five].sort((a, b) => b.z - a.z)[0];
  assert.equal(top.order, Math.min(...five.map((p) => p.order)), '最高等級喺最上面');
  const mini = pick(ensure(state), 'u2');
  assert.ok(mini.every((p) => p.mini), '晚禮服用小型勳章');
  const full = Object.fromEntries(three.map((p) => [p.id, p.h]));
  for (const p of mini) assert.ok(Math.abs(p.h - full[p.id] * MINI) < 0.01, p.id);
  assert.ok(DISC_CM > 3 && DISC_CM < 4.5);
});

test('晚禮服冇木章、冇領巾；禮服戴領帶（手冊 P.116）', () => {
  const n2 = leaderNeckwear(leader, { gender: 'boy', uniform: 'u2', training: 'woodBadge', woodBadge: true }, { level: 'group', rank: 'sectionLeader' });
  assert.ok(!n2.woodBadge, '晚禮服唔戴木章');
  const n1 = leaderNeckwear(leader, { gender: 'boy', uniform: 'u1', training: 'woodBadge', woodBadge: true }, { level: 'group', rank: 'sectionLeader' });
  assert.ok(n1.woodBadge, '禮服可以戴木章');
});
