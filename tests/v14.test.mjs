// 旅巾斜紋闊度、服裝／徽章分頁冇小備註、「規定」分頁同來源分頁測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRIPE_W, stripeIndex } from '../src/lib/necker.js';
import { RULES_GUIDE, guideFor, guideKeys, itemFor } from '../src/rulesGuide.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(text(p));
const app = text('src/App.jsx');
const i18n = text('src/i18n.jsx');
const zh = i18n.slice(i18n.indexOf('  zh: {'), i18n.indexOf('  en: {'));
const en = i18n.slice(i18n.indexOf('  en: {'));
const SECTIONS = ['grasshopper', 'cub', 'scout', 'venture', 'rover', 'leader'];

/** 由 `function name(` 抽到下一個頂層 function／註解分隔 */
const fnBody = (name) => {
  const a = app.indexOf(`function ${name}(`);
  assert.ok(a > 0, name);
  const rest = app.slice(a + 10);
  const b = rest.search(/\n(?:function |\/\* ---------- |export default )/);
  return app.slice(a, a + 10 + b);
};

test('旅巾斜紋：每條間條闊 3.2 cm（v13 1.6 嘅一倍，條數減一半）', () => {
  assert.equal(STRIPE_W, 3.2);
  // 同一斜線方向行 3.2 cm 先轉一次色
  assert.equal(stripeIndex(0, 0.1, 2), stripeIndex(0, 3.1, 2));
  assert.notEqual(stripeIndex(0, 0.1, 2), stripeIndex(0, 3.3, 2));
});

test('服裝、徽章分頁：唔再顯示小備註（note 段落、Switch note）', () => {
  for (const f of ['NeckerColours', 'OutfitTab', 'CubOutfitTab', 'ScoutOutfitTab', 'LeaderOutfitTab', 'BadgesTab', 'LevelRankPicker']) {
    const body = fnBody(f);
    assert.ok(!/className="note/.test(body), `${f} 仲有 note 段落`);
    assert.ok(!/\snote=\{/.test(body), `${f} 仲有 note prop`);
  }
  assert.ok(!/function Switch\([^)]*note/.test(app), 'Switch 唔再收 note');
});

test('規定分頁：分頁列有「規定」，中英都有字', () => {
  assert.ok(app.includes("['rules', t('tab.rules')]"));
  assert.ok(app.includes("tab === 'rules' && <RulesTab"));
  assert.ok(zh.includes("'tab.rules': '規定'"));
  assert.ok(en.includes("'tab.rules': 'Rules'"));
});

test('規定分頁：六個支部都有列點，用到嘅 key 中英齊', () => {
  for (const s of SECTIONS) assert.ok(RULES_GUIDE[s]?.length >= 3, s);
  for (const k of guideKeys()) {
    assert.ok(zh.includes(`    '${k}':`), `zh 缺 ${k}`);
    assert.ok(en.includes(`    '${k}':`), `en 缺 ${k}`);
  }
});

test('規定分頁：搬走嘅備註全部有喺「規定」度出現', () => {
  const keys = new Set(guideKeys());
  const moved = [
    'outfit.investedNote', 'outfit.investedNoteCub', 'outfit.investedNoteScout', 'outfit.investedNoteVenture', 'outfit.investedNoteRover',
    'outfit.schoolNote', 'outfit.schoolUH', 'outfit.schoolGSG', 'outfit.vestNote', 'outfit.stepNote', 'outfit.scoutWoggle',
    'outfit.cubHatNote', 'outfit.sweaterNoteGreen', 'outfit.sweaterNoteNavy', 'outfit.sweaterNoteVenture', 'outfit.sweaterNoteRover', 'outfit.sweaterNoteLeader',
    'outfit.ventureLegwearNote', 'outfit.roverLegwearNote', 'outfit.ventureTrousersOn', 'outfit.roverTrousersOn', 'outfit.tieNote', 'outfit.tieNoteRover',
    'outfit.dressOneStyle', 'outfit.instructorNoHardHat', 'outfit.ventureLeaderNote', 'outfit.eveningNeckNote', 'outfit.dressTieNote',
    'outfit.woggleNote', 'outfit.woggleNoteTrainer', 'outfit.woodBadgeNote', 'outfit.woodBadgeEvening',
    'badges.tip', 'badges.tipCub', 'badges.tipScout', 'badges.tipVenture', 'badges.tipRover', 'badges.tipLeader',
    'badges.awardsNote', 'badges.awardsMiniNote', 'pick.nameNote', 'pick.regionAuto',
  ];
  for (const v of ['land', 'sea', 'air']) moved.push(`outfit.leaderNote_${v}`, `outfit.leaderTieNote_${v}`);
  for (const n of ['unit', 'association', 'gilwell']) moved.push(`outfit.neckerNote_${n}`);
  for (const p of ['scout', 'sea', 'air', 'venture', 'ventureSea', 'ventureAir', 'rover', 'roverSea', 'roverAir', 'cub'])
    for (const g of ['Boy', 'Girl']) moved.push(`outfit.${p}Note${g}`);
  for (const h of ['scoutHat', 'seaHat', 'airHat', 'ventureHat', 'ventureSeaHat', 'ventureAirHat', 'roverHat', 'roverSeaHat', 'roverAirHat', 'leaderHat', 'leaderHardHat', 'leaderSeaHat', 'leaderAirHat', 'leaderMessHat'])
    moved.push(`outfit.${h}Note`);
  for (const k of moved) assert.ok(keys.has(k), `規定分頁冇 ${k}`);
});

test('規定分頁：海／空款式只顯示自己嘅項目', () => {
  const sea = guideFor('scout', 'sea').flatMap((g) => g.items);
  assert.ok(sea.includes('outfit.seaHatNote'));
  assert.ok(!sea.includes('outfit.scoutHatNote'));
  assert.ok(!sea.includes('outfit.airHatNote'));
  assert.ok(sea.includes('outfit.sweaterNoteNavy'));
  assert.equal(itemFor({ k: 'x', v: ['sea', 'air'] }, 'land'), null);
  // 冇款式嘅支部全部顯示
  assert.ok(guideFor('cub', undefined).flatMap((g) => g.items).includes('outfit.cubHatNote'));
});

test('規定分頁：領袖嘅層級同制服編號說明由規則資料讀，每項都有中英文', () => {
  const leader = json('src/data/leader_rules_v1.0.json');
  const items = RULES_GUIDE.leader.flatMap((g) => g.items);
  assert.ok(items.some((x) => x.json === 'levels'));
  assert.ok(items.some((x) => x.json === 'uniforms'));
  for (const x of [...leader.levels, ...leader.uniforms]) {
    assert.ok(x.zh?.note && x.en?.note, x.id);
  }
});

test('規定文字：木章說明唔再靠職級 {n}，冇「用戶確認」字樣', () => {
  assert.ok(!/'outfit\.woodBadgeNote': '[^'\n]*\{n\}/.test(i18n));
  assert.ok(!/用戶確認|user confirmed|confirmed by the user/.test(i18n));
});

test('來源分頁：只列制服手冊、小童軍活動指引同各支部訓練綱要', () => {
  const body = fnBody('SourcesTab');
  const m = app.match(/const DOCUMENTS = \[([\s\S]*?)\]\.map/);
  assert.ok(m);
  const ids = [...m[1].matchAll(/\['(\w+)', '(\w+)'\]/g)].map((x) => x[1]);
  assert.deepEqual(ids, ['UH', 'GSG', 'CTS', 'STS', 'VTS', 'RTS']);
  assert.ok(!body.includes('RULES.sources'));
  for (const [k, sec] of [...m[1].matchAll(/\['(\w+)', '(\w+)'\]/g)].map((x) => [x[1], x[2]])) {
    const src = json(`src/data/${sec}_rules_v1.0.json`).sources[k];
    assert.ok(src?.zh && src?.en && src?.edition?.zh && src?.edition?.en, k);
  }
});
