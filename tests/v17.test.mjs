// 一般場合勳條模式（手冊 P.190、P.194–195）同掛頸勳章掛低啲 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible, arrangeRibbons, ribbonsOn, ribbonUrls, NECK_DROP, STRAP_CROP } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';
import { guideKeys } from '../src/rulesGuide.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const rules = JSON.parse(text('src/data/leader_rules_v1.0.json'));
const i18n = text('src/i18n.jsx');
const zh = i18n.slice(i18n.indexOf('  zh: {'), i18n.indexOf('  en: {'));
const en = i18n.slice(i18n.indexOf('  en: {'));
const app = text('src/App.jsx');
const badge = (id) => rules.badges.find((b) => b.id === id);
const outfit = (u, extra = {}) => ({ gender: 'boy', uniform: `u${u}`, invested: true, ...extra });
const shown = (u, state, extra) => visible(placeFor(rules, outfit(u, extra)), state, { invested: true, level: 'group' });
const general = { occasion: 'general' };
const pngSize = (file) => {
  const buf = readFileSync(new URL(`../public${file}`, import.meta.url));
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};
const awardBadges = rules.badges.filter((b) => b.anchor.rack || b.anchor.part === 'neck');

test('規則資料仍然通過驗證（勳條圖要有來源、頁碼、px）', () => {
  assert.deepEqual(validateRules(rules), []);
  const broken = structuredClone(rules);
  delete broken.badges.find((b) => b.id === 'meritAward').choices.find((c) => c.id === 'meritCross').ribbon;
  assert.ok(validateRules(broken).some((e) => /meritCross 要有勳條圖/.test(e)));
});

test('勳條設定：禮服同恤衫（編號 1、3–6），晚禮服冇；每行 3 個（P.190、P.194）', () => {
  const R = rules.ribbons;
  assert.deepEqual(R.uniforms, ['u1', 'u3', 'u4', 'u5', 'u6']);
  assert.equal(R.perRow, 3);
  assert.equal(R.wCm, 3.6);
  assert.equal(Math.round((R.wCm / R.hCm) * 100) / 100, Math.round((160 / 48) * 100) / 100, '同勳條圖比例一樣');
  assert.match(R.zh.quote, /勳條與勳章及獎勵不可同時佩戴/);
  assert.match(R.zh.quote, /每行三個勳條；否則在上方開新一行並置中對齊/);
  assert.deepEqual(R.sources, [{ ref: 'UH', page: '185, 190, 194–195' }]);
  assert.equal(ribbonsOn(rules, 'u2', 'general'), false);
  assert.equal(ribbonsOn(rules, 'u3', 'formal'), false);
  assert.equal(ribbonsOn(rules, 'u3', 'general'), true);
});

test('每個勳章選項都有手冊相片下面嗰條勳條（160 × 48）；銅狼用用戶相片顏色', () => {
  let n = 0;
  for (const b of awardBadges) {
    const list = b.choices ? b.choices.filter((c) => c.art) : [b];
    for (const c of list) {
      const r = c.ribbon;
      assert.ok(r, `${b.id} ${c.id ?? ''} 冇勳條`);
      assert.ok(existsSync(new URL(`../public${r.file}`, import.meta.url)), r.file);
      assert.deepEqual(pngSize(r.file), r.px);
      assert.deepEqual(r.px, [160, 48]);
      if (c.id === 'bronzeWolf') assert.equal(r.user, true);
      else if (r.ref === 'ACR') assert.equal(r.user, true); // v19：用戶提供官方參考圖，勳條由綬帶顏色砌
      else assert.equal(r.ref, 'UH');
      n++;
    }
  }
  assert.equal(n, 56); // v19 +5：110 銀／銅、童心抗疫、同行未來、110 特別貢獻
  // 頁碼：英勇、獅 P.178；龍、功績 P.179；紀念 P.180；特殊貢獻 P.181–183；長期服務 P.185
  const page = (id, c) => (c ? badge(id).choices.find((x) => x.id === c) : badge(id)).ribbon.page;
  assert.equal(page('gallantry', 'gold'), '178');
  assert.equal(page('neckMedal', 'goldLion'), '178');
  assert.equal(page('neckMedal', 'goldDragon'), '179');
  assert.equal(page('meritAward', 'meritCross'), '179');
  assert.equal(page('diamondJubilee'), '180');
  assert.equal(page('centenary', 'silver'), '180');
  assert.equal(page('scoutCentre'), '181');
  assert.equal(page('specialContribution', 'ten'), '182');
  assert.equal(page('specialStar', 'sixteen'), '183');
  assert.equal(page('longService', 'six'), '185');
  assert.equal(new Set(ribbonUrls(rules)).size, 56);
});

test('一般場合：勳章同掛頸勳章全部變勳條，唔會同勳章一齊出現', () => {
  const st = { neckMedal: 'goldLion', meritAward: 'goodService', gallantry: 'bronze' };
  for (const u of [1, 3, 4, 5, 6]) {
    const v = shown(u, st, general);
    const aw = v.filter((p) => ['neckMedal', 'meritAward', 'gallantry'].includes(p.id));
    assert.equal(aw.length, 3);
    assert.ok(aw.every((p) => p.kind === 'ribbon' && p.art.startsWith('/badges/ribbons/')), `u${u}`);
    // 重要禮儀場合：勳章，冇勳條
    const f = shown(u, st).filter((p) => ['neckMedal', 'meritAward', 'gallantry'].includes(p.id));
    assert.ok(f.every((p) => p.kind !== 'ribbon' && p.art.startsWith('/badges/awards/')));
  }
  // 晚禮服冇勳條：揀咗一般場合都係小型章
  const u2 = shown(2, st, general).filter((p) => p.id === 'meritAward');
  assert.equal(u2[0].kind, undefined);
  assert.equal(u2[0].mini, true);
});

test('勳條喺右胸袋袋蓋上方中央，緊貼袋蓋頂；三個一行並排（P.190、P.194）', () => {
  const { B, top } = layout('boy', 'leader');
  const v = shown(3, { meritAward: 'goodService', gallantry: 'bronze', longService: 'medal' }, general).filter((p) => p.kind === 'ribbon');
  assert.equal(v.length, 3);
  const flapTop = top - B.pocket.top;
  for (const p of v) {
    assert.equal(Math.round((p.y - p.h / 2 - flapTop) * 100) / 100, rules.ribbons.aboveFlapCm);
    assert.ok(p.x < 0, '佩戴者右');
  }
  const xs = v.map((p) => p.x).sort((a, b) => a - b);
  assert.equal(Math.round(((xs[0] + xs[2]) / 2) * 100) / 100, -B.pocket.x, '置中');
  assert.equal(Math.round((xs[1] - xs[0]) * 100) / 100, rules.ribbons.wCm, '緊貼串連');
});

test('P.194 例子：英勇銅十字章喺內側（佩戴者左），優良服務獎章喺外側', () => {
  const v = shown(3, { gallantry: 'bronze', meritAward: 'goodService' }, general).filter((p) => p.kind === 'ribbon');
  const g = v.find((p) => p.id === 'gallantry');
  const m = v.find((p) => p.id === 'meritAward');
  assert.ok(g.x > m.x, '內側 = 近中線 = x 大啲（右胸 x 係負數）');
  assert.equal(g.y, m.y);
});

test('P.194–195 例子：多出嚟嘅最高等級喺最上面一行並置中', () => {
  const mk = (id, order) => ({ key: id, id, order, w: 3.6, h: 1.08, rack: { grid: true, perRow: 3, cx: -9.4, inward: 1, bottom: 120 } });
  const seven = arrangeRibbons([mk('longService', 31), mk('scoutCentre', 23), mk('meritMedal', 11), mk('special', 28), mk('distinguished', 13), mk('good', 14), mk('metro', 18)]);
  const at = (id) => seven.find((p) => p.id === id);
  // P.195 例子三：功績榮譽獎章一個喺最上面；中間 優異、優良、大都會；底 童軍中心、特殊貢獻、長期服務（內 → 外）
  assert.equal(at('meritMedal').row, 0);
  assert.equal(at('meritMedal').x, -9.4, '單獨一個置中');
  assert.deepEqual(['distinguished', 'good', 'metro'].map((id) => at(id).row), [1, 1, 1]);
  assert.deepEqual(['scoutCentre', 'special', 'longService'].map((id) => at(id).row), [2, 2, 2]);
  assert.ok(at('distinguished').x > at('good').x && at('good').x > at('metro').x, '內側（x 大）最高');
  assert.ok(at('meritMedal').y > at('good').y && at('good').y > at('longService').y, '上面一行最高');
  // P.195 例子一：五個 → 上面兩個、下面三個；兩個嗰行置中
  const five = arrangeRibbons([mk('a', 13), mk('b', 14), mk('c', 17), mk('d', 18), mk('e', 23)]);
  const top2 = five.filter((p) => p.row === 0);
  assert.deepEqual(top2.map((p) => p.id).sort(), ['a', 'b']);
  assert.equal(Math.round(((top2[0].x + top2[1].x) / 2) * 100) / 100, -9.4);
});

test('P.195 例子四：銅獅勳章（掛頸）都有勳條，喺最上面一行內側', () => {
  const v = shown(3, { neckMedal: 'bronzeLion', meritAward: 'meritCross', centenary: 'bronze', longService: 'one', sp100: 'silver' }, general).filter((p) => p.kind === 'ribbon');
  assert.equal(v.length, 5);
  const lion = v.find((p) => p.id === 'neckMedal');
  const cross = v.find((p) => p.id === 'meritAward');
  assert.equal(lion.row, 0);
  assert.equal(cross.row, 0);
  assert.ok(lion.x > cross.x, '銅獅（6）喺內側，功績榮譽十字章（9）喺外側');
  assert.equal(lion.art, '/badges/ribbons/neckMedal_bronzeLion.png');
  // 長期服務只戴最高年資（一個選項）
  assert.equal(v.filter((p) => p.id === 'longService').length, 1);
});

test('一般場合：嘉許笛繩、感謝章、服務段章照戴；服務段章仍然俾長期服務取代', () => {
  const v = shown(3, { commendation: 'high', thanksBadge: true, serviceBars: 'two' }, general);
  assert.ok(v.some((p) => p.id === 'commendation' && p.kind === 'lanyard'));
  assert.ok(v.some((p) => p.id === 'thanksBadge'));
  assert.ok(v.some((p) => p.id === 'serviceBars'));
  const w = shown(3, { serviceBars: 'two', longService: 'medal' }, general);
  assert.ok(!w.some((p) => p.id === 'serviceBars'));
});

test('掛頸勳章掛低啲：勳章向下移，綬帶由衣領拉落嚟（用戶 v17「要低D」）', () => {
  const { top } = layout('boy', 'leader');
  for (const u of [1, 2, 3, 4, 5, 6]) {
    const p = shown(u, { neckMedal: 'goldDragon' }).find((x) => x.id === 'neckMedal');
    const drop = NECK_DROP[`u${u}`] ?? NECK_DROP.default;
    const full = badge('neckMedal').choices.find((c) => c.id === 'goldDragon').art.px;
    const fullH = Math.min(9 / full[0], 13 / full[1]) * full[1];
    assert.equal(p.crop, 1 - STRAP_CROP);
    // 綬帶頂喺衣領（top + 0.3）
    assert.ok(Math.abs(p.y + p.h / 2 + p.strapCm - (top + 0.3)) < 0.02, `u${u}`);
    // 勳章底比以前（相片頂喺 top + 0.3）低咗 drop cm
    const oldBottom = top + 0.3 - fullH;
    assert.ok(Math.abs(p.y - p.h / 2 - (oldBottom - drop)) < 0.03, `u${u} 低咗 ${drop} cm`);
    assert.ok(drop >= 4);
  }
  assert.equal(NECK_DROP.default, 7);
  // 勳章喺胸袋袋蓋附近（P.186 插圖）
  const { B } = layout('boy', 'leader');
  const p = shown(3, { neckMedal: 'goldLion' }).find((x) => x.id === 'neckMedal');
  const flapTop = top - B.pocket.top;
  assert.ok(p.y - p.h / 2 < flapTop, '勳章底低過袋蓋頂');
});

test('介面：勳章及獎勵組有場合切換；規定頁有勳條規則；中英都有', () => {
  for (const k of ['badges.occasion', 'badges.occasionFormal', 'badges.occasionGeneral', 'badges.occasionFormalNote', 'badges.occasionGeneralNote']) {
    assert.ok(zh.includes(`'${k}'`), k);
    assert.ok(en.includes(`'${k}'`), k);
  }
  assert.ok(app.includes("onChange={(x) => setOutfit((o) => ({ ...o, occasion: x }))}"));
  assert.ok(app.includes("occasion: 'formal'"));
  assert.ok(guideKeys().includes('badges.occasionGeneralNote'));
  assert.match(zh, /勳條同勳章唔可以同時戴/);
});

test('冇相嘅獎勵唔加（亞太基金）；110 周年紀念星章用戶決定唔加（v19 更新）', () => {
  const names = JSON.stringify(rules.badges.filter((b) => b.group === 'awards').map((b) => [b.zh.name, ...(b.choices || []).map((c) => c.zh.name)]));
  for (const n of ['亞太', '星章（110']) assert.ok(!names.includes(n), n);
  assert.ok(!names.includes('紀念星章'));
  const c = rules.conflicts.find((x) => x.id === 'medalPrecedenceGaps');
  assert.match(c.zh, /已逐頁睇過 P\.177–200/);
  for (const n of ['110 周年紀念章', '童心抗疫', '同行未來', '亞太區童軍基金', '110 周年紀念星章']) assert.ok(c.zh.includes(n), n);
  assert.ok(!rules.conflicts.some((x) => x.id === 'ribbonsGeneral'), '勳條已經做咗');
});

test('民政及青年事務局局長嘉許（P.198）：銀＝青年義務領袖、金＝義務領袖；左胸袋袋蓋右方；晚禮服左襟領童軍徽下面', () => {
  const b = badge('shaCommendation');
  assert.equal(b.group, 'awards');
  assert.deepEqual(b.uniforms, ['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
  assert.deepEqual(b.choices.map((c) => c.id), ['none', 'youth', 'adult']);
  assert.deepEqual(b.sources, [{ ref: 'UH', page: '198' }]);
  assert.match(b.zh.quote, /佩戴在上衣左胸袋袋蓋右方位置/);
  assert.match(b.zh.quote, /此項嘉許不設勳條/);
  for (const c of b.choices.filter((x) => x.art)) assert.deepEqual(pngSize(c.art.file), c.art.px);
  const { B } = layout('boy', 'leader');
  for (const u of [1, 3, 4, 5, 6]) {
    const p = shown(u, { shaCommendation: 'youth' }).find((x) => x.id === 'shaCommendation');
    assert.equal(p.art, '/badges/awards/shaYouth.png');
    assert.ok(p.x > 0, '佩戴者左胸袋');
    assert.ok(p.x < B.pocket.x, '袋蓋右方 = 近中線');
    assert.ok(p.x - p.w / 2 >= B.pocket.x - B.pocket.w / 2 - 0.01, '仲喺袋蓋入面');
  }
  const u2 = shown(2, { shaCommendation: 'adult' }).find((x) => x.id === 'shaCommendation');
  const thanks = shown(2, { thanksBadge: true }).find((x) => x.id === 'thanksBadge');
  assert.equal(u2.x, -thanks.x, '同感謝章對稱：左襟領童軍徽下面');
  // 冇勳條：一般場合照戴原本個章
  const g = shown(3, { shaCommendation: 'adult' }, general).find((x) => x.id === 'shaCommendation');
  assert.equal(g.kind, undefined);
  assert.equal(g.art, '/badges/awards/shaAdult.png');
  assert.equal(b.ribbon, undefined);
});

test('軟帽帽章戴喺帽身上（用戶 v17：以前低到好似戴喺頭髮上）', () => {
  const blocky = text('src/three/Blocky.jsx');
  const beret = blocky.slice(blocky.indexOf('function ScoutBeret'), blocky.indexOf('function RankCapBadge'));
  // 帽章喺帽身 group 入面（跟帽身一齊側），底邊喺帽身底（膠邊頂）上面
  assert.ok(beret.includes('<group position={CROWN} rotation={[-0.06, 0, 0.16]}>'));
  assert.ok(beret.indexOf('<RankCapBadge') > beret.indexOf('<group position={CROWN}'));
  assert.ok(beret.includes('bottom: -crown[1] / 2 + 0.15'));
  assert.ok(!beret.includes('bandY - 1.2'), '舊位置（膠邊下面）已拎走');
  assert.ok(!/position=\{\[eyeX, bandY, /.test(beret), '童軍帽章唔再喺膠邊中間');
});

test('用戶第五輪決定記錄低', () => {
  const c = rules.review.userChecks.find((x) => x.item === 'awardsRound5');
  assert.ok(c);
  assert.match(c.zh, /感謝章喺編號 3–6 顯示正確/);
  assert.match(rules.conflicts.find((x) => x.id === 'medalPrecedenceGaps').zh, /用戶決定唔加/);
  assert.match(rules.conflicts.find((x) => x.id === 'otherAwards').zh, /民政及青年事務局局長嘉許 P\.198 已加/);
});
