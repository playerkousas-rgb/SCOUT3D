// SCOUT3D 準入白名單（store_gate v1.0 / SG1–SG19）— © SCOUT SYSTEM
// 真理倉 playerkousas-rgb/readme docs/50、docs/51；閘門檔由 templates/vercel/store_gate_v1.0.js 原封不動抄入 public/。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const gateSrc = read('../public/store_gate_v1.0.js');
const shell = read('../shell/index_v1.0.html');
const generated = read('../index.html');
const app = read('../src/App.jsx');
const i18n = read('../src/i18n.jsx');
const css = read('../src/styles.css');
const manifest = JSON.parse(read('../public/manifest.webmanifest'));

// 真理倉模板 v1.0 嘅 SHA-256；改咗一個字都要重新由模板同步，唔好喺子 repo 自己改邏輯。
const GATE_SHA256 = '5b222329392bc901482688b8a9296a4bf0488a929fe8b481a656cd915b5c6162';

const cjs = { exports: {} };
vm.runInNewContext(gateSrc, { URL, module: cjs, exports: cjs.exports });
const Gate = cjs.exports;

function headConfig(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const charset = head.search(/<meta charset="UTF-8"\s*\/?>/);
  const src = head.indexOf('<script src="/store_gate_v1.0.js"></script>');
  const init = head.indexOf('initStoreGate({');
  const title = head.indexOf('<title>');
  assert.ok(charset >= 0 && charset < src, 'charset 要喺 gate script 前面');
  assert.ok(src > 0 && src < init, '先載入 /store_gate_v1.0.js，再呼叫 initStoreGate');
  assert.ok(init > 0 && init < title, 'initStoreGate 要喺 <title> 之前（唔好等 DOMContentLoaded）');
  const literal = head.match(/initStoreGate\((\{[\s\S]*?\})\);/)?.[1];
  assert.ok(literal, 'head 有 initStoreGate({...}) 設定');
  // vm 出嚟嘅物件屬另一個 realm，deepEqual 要轉返普通物件。
  return { head, options: JSON.parse(vm.runInNewContext(`JSON.stringify(${literal})`)) };
}

const { head, options } = headConfig(shell);
const EXPECTED = {
  appKey: 'scout3d',
  mode: 'entry-gate',
  portalIds: ['appstore'],
  silentPortalIds: ['library'],
  allowStandalone: true,
  autoRedirectSeconds: 0,
};

test('store_gate_v1.0.js 同真理倉模板一字不差（public/ 係 Vercel 實際發佈根目錄）', () => {
  assert.equal(createHash('sha256').update(gateSrc).digest('hex'), GATE_SHA256);
  assert.equal(Gate.VERSION, 'v1.0');
  assert.ok(!head.includes('scoutappstore.vercel.app'), '唔准喺子 App 寫死主站網址');
  assert.ok(!head.includes('scout-circulars.vercel.app'), '唔准喺子 App 寫死圖書館網址');
});

test('shell 同產生嘅 index.html 都用 SG19 標準設定，兩邊一致', () => {
  assert.deepEqual(options, EXPECTED);
  assert.deepEqual(headConfig(generated).options, EXPECTED);
  assert.match(generated, /<script src="\/store_gate_v1\.0\.js"><\/script>/);
});

test('由 APP STORE 或圖書館（silent）入 → 放行；直打網址 → 攔截', () => {
  const fromStore = Gate.evaluateStoreGate(options, {
    referrer: 'https://scoutappstore.vercel.app/?app=scout3d',
    selfOrigin: 'https://scout3d-gamma.vercel.app',
  });
  assert.equal(fromStore.allowed, true);
  assert.equal(fromStore.reason, 'referrer-whitelist');
  assert.equal(fromStore.matchedPortalId, 'appstore');
  assert.equal(fromStore.grantSessionPass, true);
  assert.equal(fromStore.passKey, 'scout3d.store_pass');

  const fromLibrary = Gate.evaluateStoreGate(options, {
    referrer: 'https://scout-circulars.vercel.app/',
    selfOrigin: 'https://scout3d-gamma.vercel.app',
  });
  assert.equal(fromLibrary.allowed, true);
  assert.equal(fromLibrary.matchedPortalId, 'library', '圖書館靜默放行但照報入口');

  const direct = Gate.evaluateStoreGate(options, {
    referrer: '',
    selfOrigin: 'https://scout3d-gamma.vercel.app',
  });
  assert.equal(direct.allowed, false);
  assert.equal(direct.reason, 'missing-whitelist-entry');

  // F5/A9：前綴偽造唔可以當白名單
  const spoof = Gate.evaluateStoreGate(options, {
    referrer: 'https://scoutappstore.vercel.app.evil.com/',
    selfOrigin: 'https://scout3d-gamma.vercel.app',
  });
  assert.equal(spoof.allowed, false);
});

test('已加主畫面 PWA 同同分頁通行證照樣放行（SG2／SG7）', () => {
  const standalone = Gate.evaluateStoreGate(options, { standalone: true, referrer: '' });
  assert.equal(standalone.allowed, true);
  assert.equal(standalone.reason, 'standalone-pwa');

  const pass = Gate.evaluateStoreGate(options, {
    referrer: '',
    hasSessionPass: true,
    selfOrigin: 'https://scout3d-gamma.vercel.app',
  });
  assert.equal(pass.allowed, true);
  assert.equal(pass.reason, 'session-pass');
  assert.equal(manifest.display, 'standalone');
});

test('SG18 讚好／收藏掣用 PORTAL_REGISTRY 出網址，雙語同步，唔寫死／唔直連 Supabase', () => {
  assert.match(app, /getAppStoreUrl\('scout3d'\)/);
  assert.match(app, /id="storeSupportTop"/);
  assert.match(app, /target="_blank"/);
  assert.match(app, /rel="noopener"/);
  assert.ok(!/scoutappstore\.vercel\.app|supabase|bump_(hearts|stars)/.test(app));
  for (const key of ['store.support', 'store.supportAria', 'store.supportTitle']) {
    assert.ok(i18n.includes(`'${key}'`), `${key} 要有雙語字串`);
  }
  assert.match(css, /\.support-btn\[hidden\]\s*\{\s*display:\s*none !important/);
  assert.match(css, /@media print\s*\{[^}]*\.support-btn/s);
  assert.equal(Gate.getAppStoreUrl('scout3d'), 'https://scoutappstore.vercel.app/?app=scout3d');
});
