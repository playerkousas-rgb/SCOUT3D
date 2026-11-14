// 版號、版權、雙語一致性測試（V/W/L）· SCOUT3D · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION, COPYRIGHT } from '../src/version.js';
import { check, collectFiles } from '../scripts/i18n_check_v1.0.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('五處版號一致：meta／title／檔頭／APP_VERSION／頁尾', () => {
  assert.equal(APP_VERSION, 'v1.0');
  for (const f of ['shell/index_v1.0.html', 'index.html']) {
    const html = read(f);
    assert.match(html, /<meta name="app-version" content="v1\.0" \/>/);
    assert.match(html, /<title>[^<]*v1\.0<\/title>/);
    assert.match(html, /SCOUT3D v1\.0 — /);
    assert.match(html, /const APP_VERSION = 'v1\.0'/);
  }
  const i18n = read('src/i18n.jsx');
  assert.ok(i18n.includes("'footer.copy': '© SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM · SCOUT3D v1.0'"));
  assert.ok(read('package.json').includes('"version": "1.0.0"'));
  assert.ok(read('src/data/grasshopper_rules_v1.0.json').includes('"fileVersion": "v1.0"'));
  assert.ok(read('src/data/cub_rules_v1.0.json').includes('"fileVersion": "v1.0"'));
  assert.ok(read('src/data/districts_v1.0.json').includes('"fileVersion": "v1.0"'));
  assert.ok(read('src/data/scout_rules_v1.0.json').includes('"fileVersion": "v1.0"'));
  assert.ok(read('src/data/patrols_v1.0.json').includes('"fileVersion": "v1.0"'));
});

test('版權：meta + 可見頁尾 + 截圖角標', () => {
  assert.equal(COPYRIGHT, '© SCOUT SYSTEM');
  assert.match(read('index.html'), /<meta name="copyright" content="© SCOUT SYSTEM" \/>/);
  assert.ok(read('src/lib/screenshot.js').includes('`© SCOUT SYSTEM · ${APP_VERSION}`'));
});

test('index.html 由 shell/index_v1.0.html 產生而且同步', () => {
  const src = read('shell/index_v1.0.html');
  const out = read('index.html');
  assert.ok(out.includes('<!-- GENERATED from index_v1.0.html (v1.0)'));
  assert.equal(out.replace(/<!-- GENERATED from[^\n]*-->\n/, ''), src);
});

test('雙語：i18n 靜態檢查 0 FAIL', () => {
  const r = check(collectFiles(new URL('../src', import.meta.url).pathname), 'src');
  const fails = r.findings.filter((f) => f.level === 'FAIL');
  assert.deepEqual(fails, []);
});

test('免責聲明原句一字不改', () => {
  assert.ok(read('src/i18n.jsx').includes('實際穿著請以所屬童軍組織及單位最新指引為準'));
});
