// 規則資料回歸測試 · SCOUT3D · © SCOUT SYSTEM
// 鎖死已由文件確認嘅左右位置：改錯邊會即刻 fail。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';

const rules = JSON.parse(readFileSync(new URL('../src/data/grasshopper_rules_v1.0.json', import.meta.url), 'utf8'));
const badge = (id) => rules.badges.find((b) => b.id === id);

test('規則資料通過驗證', () => {
  assert.deepEqual(validateRules(rules), []);
});

test('穿著者角度：左右位置同手冊一致', () => {
  assert.equal(badge('membership').side, 'left');
  assert.equal(badge('progress').side, 'left');
  assert.equal(badge('grasshopperAward').side, 'left');
  assert.equal(badge('troop').side, 'right');
  assert.equal(badge('district').side, 'right');
  assert.equal(badge('meritorious').side, 'right');
  assert.equal(badge('commemorative').side, 'right');
});

test('文件列明嘅尺寸同距離', () => {
  assert.equal(badge('membership').size.wCm, 5);
  assert.equal(badge('progress').size.wCm, 2);
  assert.equal(badge('troop').anchor.fromShoulderCm, 2);
  assert.equal(badge('district').anchor.gapCm, 2);
});

test('未確認嘅項目一定標「待確認」', () => {
  // 進步獎章左右睇法：用戶 2026-11-14 確認（手冊插圖 = 衣服除下後望住袖外側），所以唔再係待確認
  assert.equal(badge('progress').status, 'documented');
  assert.ok(rules.review.userChecks.some((c) => c.item === 'progress' && c.date === '2026-11-14'));
  assert.equal(badge('grasshopperAward').status, 'pending');
  assert.equal(rules.schoolTop.status, 'pending');
  assert.equal(rules.review.status, 'pending');
  assert.equal(rules.review.lastChecked, null, '未有人核對之前唔可以填核對日期');
  assert.ok(!rules.badges.some((b) => b.status === 'verified'), 'v1.0 未經領袖核對，唔可以有 verified');
});

test('冇來源、冇頁碼、待確認冇原因都會被攔', () => {
  const bad = structuredClone(rules);
  const at = (id) => bad.badges.find((b) => b.id === id);
  at('membership').sources = [];
  at('grasshopperAward').pendingReason = null;
  at('progress').sources[0].page = '';
  at('troop').side = 'viewer-left';
  const errors = validateRules(bad);
  assert.ok(errors.some((e) => e.includes('冇來源')));
  assert.ok(errors.some((e) => e.includes('pendingReason')));
  assert.ok(errors.some((e) => e.includes('冇頁碼')));
  assert.ok(errors.some((e) => e.includes('side')));
});

test('verified 一定要有核對日期', () => {
  const bad = structuredClone(rules);
  bad.badges[0].status = 'verified';
  assert.ok(validateRules(bad).some((e) => e.includes('lastChecked')));
});
