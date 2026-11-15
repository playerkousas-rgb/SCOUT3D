// 旅條序數、層級徽章、旅巾斜紋、匯出密碼同 STL 比例測試 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ordinalSuffix, troopNumber, resolveArt, ranksFor, rankCap, messCapOf, rankRowOf } from '../src/lib/picks.js';
import { neckerPalettes, stripeIndex, NECKER_THIRD } from '../src/lib/necker.js';
import { exportPin, scaleStl } from '../src/lib/export3d.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const leader = read('src/data/leader_rules_v1.0.json');
const districts = read('src/data/districts_v1.0.json');
const badge = (id) => leader.badges.find((b) => b.id === id);
const levelsOf = (id) => badge(id).levels ?? null;

test('旅條：英文序數自動轉（1ST、22ND、33RD、44TH、11TH–13TH）', () => {
  const cases = { 1: 'ST', 2: 'ND', 3: 'RD', 4: 'TH', 11: 'TH', 12: 'TH', 13: 'TH', 21: 'ST', 22: 'ND', 33: 'RD', 44: 'TH', 101: 'ST', 111: 'TH', 112: 'TH', 2222: 'ND' };
  for (const [n, s] of Object.entries(cases)) assert.equal(ordinalSuffix(Number(n)), s, `${n}`);
});

test('旅條：旅號輸入清理（攞第一組數字、最多 4 位、0 唔得）', () => {
  assert.equal(troopNumber('22'), 22);
  assert.equal(troopNumber('22nd'), 22);
  assert.equal(troopNumber('第33旅'), 33);
  assert.equal(troopNumber('123456'), 1234);
  assert.equal(troopNumber(''), null);
  assert.equal(troopNumber('0'), null);
  assert.equal(troopNumber(null), null);
});

test('旅條：輸入旅號之後用動態旅條；冇輸入用手冊示例', () => {
  const b = badge('troop');
  assert.equal(b.dynamic, 'troop');
  assert.deepEqual(resolveArt(b, { troopNo: '44' }, districts), { kind: 'troopTape', no: 44, suffix: 'TH', example: false });
  assert.equal(resolveArt(b, { troopNo: '' }, districts).kind, 'image');
});

test('層級：旅有旅條冇香港肩章；區、地域、總部只有香港肩章冇旅條', () => {
  assert.deepEqual(levelsOf('troop'), ['group']);
  assert.deepEqual([...levelsOf('hkTitle')].sort(), ['district', 'hq', 'region']);
});

test('層級：地域只戴地域章；總部唔戴區章、地域章', () => {
  assert.ok(levelsOf('region').includes('region'));
  assert.ok(!levelsOf('district').includes('region'));
  assert.ok(!levelsOf('region').includes('hq'));
  assert.ok(!levelsOf('district').includes('hq'));
  assert.deepEqual(levelsOf('ahq'), ['hq']);
});

test('地域層級：用戶直接揀地域，唔使揀區', () => {
  const b = badge('region');
  const withBadge = districts.regions.filter((r) => r.badge);
  assert.ok(withBadge.length >= 5);
  for (const r of withBadge) {
    const a = resolveArt(b, { level: 'region', regionId: r.id }, districts);
    assert.equal(a.file, r.badge.file);
    assert.equal(a.region.id, r.id);
  }
  assert.equal(resolveArt(b, { level: 'region' }, districts).kind, 'image'); // 未揀：示例
});

test('地域總監：地域層級第一個職級，肩章同助理香港總監一樣', () => {
  const ids = ranksFor(leader, 'region').map((r) => r.id);
  assert.equal(ids[0], 'regionalCommissioner');
  const A = 'assistantChiefCommissioner';
  const R = 'regionalCommissioner';
  assert.deepEqual(rankCap(leader, R), rankCap(leader, A));
  assert.deepEqual(messCapOf(leader, R), messCapOf(leader, A));
  for (const dyn of ['rank', 'metalRank']) {
    const b = leader.badges.find((x) => x.dynamic === dyn);
    assert.equal(rankRowOf(b, R)?.id, rankRowOf(b, A)?.id, dyn);
    assert.ok(rankRowOf(b, R), dyn);
  }
});

test('全部徽章已核對：冇待核對狀態', () => {
  for (const f of ['grasshopper', 'cub', 'scout', 'venture', 'rover', 'leader']) {
    const r = read(`src/data/${f}_rules_v1.0.json`);
    for (const b of r.badges) assert.equal(b.status, 'verified', `${f}.${b.id}`);
  }
});

test('旅巾：素色／斜紋（2、3 色）、左右分色', () => {
  const o = { neckerMain: '#a', neckerBorder: '#b' };
  assert.deepEqual(neckerPalettes(o).left, { pattern: 'plain', colours: ['#a', '#b'] });
  assert.deepEqual(neckerPalettes(o).right, neckerPalettes(o).left);
  const s3 = neckerPalettes({ ...o, neckerPattern: 'stripe' });
  assert.deepEqual(s3.left.colours, ['#a', '#b', NECKER_THIRD]);
  const s2 = neckerPalettes({ ...o, neckerPattern: 'stripe', neckerStripes: 2 });
  assert.deepEqual(s2.left.colours, ['#a', '#b']);
  const split = neckerPalettes({ ...o, neckerPattern: 'stripe', neckerSplit: true, neckerRMain: '#c', neckerRThird: '#d' });
  assert.equal(split.split, true);
  assert.deepEqual(split.right.colours, ['#c', '#b', '#d']);
  const fixed = neckerPalettes({ ...o, neckerPattern: 'stripe', neckerSplit: true }, '#123456');
  assert.deepEqual(fixed.left.colours, ['#123456', '#123456']);
  assert.equal(fixed.split, false);
});

test('旅巾斜紋：每條顏色輪流出現，左右鏡像', () => {
  const seen = new Set();
  for (let y = 0; y < 10; y += 0.4) seen.add(stripeIndex(0, y, 3));
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
  assert.equal(stripeIndex(2, 5, 3, 1), stripeIndex(-2, 5, 3, -1));
  assert.ok(stripeIndex(-50, -50, 3) >= 0);
});

test('匯出密碼：要 4 位數字先開 3D 匯出', () => {
  assert.equal(exportPin({ VITE_EXPORT_PIN: '1234' }), '1234');
  assert.equal(exportPin({ VITE_EXPORT_PIN: ' 0042 ' }), '0042');
  for (const v of ['', '123', '12345', 'abcd', undefined]) assert.equal(exportPin({ VITE_EXPORT_PIN: v }), null, String(v));
  assert.equal(exportPin(undefined), null);
});

test('STL：頂點按比例放大，法線唔變', () => {
  const view = new DataView(new ArrayBuffer(84 + 50));
  view.setUint32(80, 1, true);
  view.setFloat32(84, 1, true); // 法線
  for (let j = 0; j < 9; j++) view.setFloat32(84 + 12 + j * 4, j * 0.01, true);
  scaleStl(view, 100);
  assert.equal(view.getFloat32(84, true), 1);
  for (let j = 0; j < 9; j++) assert.ok(Math.abs(view.getFloat32(84 + 12 + j * 4, true) - j) < 1e-4);
});
