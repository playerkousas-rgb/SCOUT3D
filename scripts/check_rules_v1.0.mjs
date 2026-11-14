#!/usr/bin/env node
// SCOUT3D 規則資料檢查 — v1.0 · © SCOUT SYSTEM
// build 前跑：資料唔齊（冇來源／冇頁碼／待確認冇原因／圖案檔唔見咗）就 fail，唔出貨。
import { readFileSync, existsSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';

export const VERSION = 'v1.0';
const SECTIONS = ['grasshopper', 'cub', 'scout'];
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const pub = (file) => existsSync(new URL(`../public${file}`, import.meta.url));

let failed = 0;
for (const id of SECTIONS) {
  const rules = read(`src/data/${id}_rules_v1.0.json`);
  const errors = validateRules(rules);
  for (const b of rules.badges) {
    for (const a of Array.isArray(b.art) ? b.art : [b.art]) if (!pub(a.file)) errors.push(`${b.id}：圖案 ${a.file} 唔存在`);
  }
  if (errors.length) {
    failed += errors.length;
    console.error(`✗ ${rules.section.zh} 規則資料有 ${errors.length} 個問題：`);
    for (const e of errors) console.error(`  - ${e}`);
    continue;
  }
  const pending = rules.badges.filter((b) => b.status === 'pending').map((b) => b.id);
  console.log(`✓ ${rules.section.zh} 規則資料 ${rules.fileVersion} 通過（${rules.badges.length} 個徽章、${rules.garments.length} 件衣物）`);
  console.log(`  核對狀態：${rules.review.status}；待確認：${pending.join(', ') || '無'}`);
  if (rules.variants?.length) {
    console.log(`  制服款式：${rules.variants.map((v) => `${v.zh.name}（換 ${v.garments.length} 件）`).join('、')}`);
  }
}

// 海童軍帽帶圖案（手冊 P.102）
if (!pub('/badges/sea_scout_cap_tally.png')) {
  failed += 1;
  console.error('✗ 海童軍帽帶圖案 /badges/sea_scout_cap_tally.png 唔存在');
}

// 地域章、區章：每個圖案都要喺 public/ 入面
const d = read('src/data/districts_v1.0.json');
const missing = [];
let n = 0;
for (const r of d.regions) {
  if (r.badge && !pub(r.badge.file)) missing.push(r.badge.file);
  for (const x of r.districts) {
    n += 1;
    if (!pub(x.file)) missing.push(x.file);
  }
}
if (missing.length) {
  failed += missing.length;
  console.error(`✗ 地域章／區章圖案唔見咗：${missing.join(', ')}`);
} else {
  console.log(`✓ 地域及區 ${d.fileVersion}：${d.regions.length} 個地域、${n} 個區，圖案齊`);
}

// 童軍小隊章：32 隊，每隊都要有圖案同兩個隊色
const pt = read('src/data/patrols_v1.0.json');
const bad = pt.patrols.filter((p) => !pub(p.file) || !Array.isArray(p.hex) || p.hex.length !== 2 || !p.zh || !p.en || !p.colours?.zh || !p.colours?.en);
if (bad.length || pt.patrols.length !== 32) {
  failed += bad.length || 1;
  console.error(`✗ 小隊資料有問題（${pt.patrols.length} 隊）：${bad.map((p) => p.id).join(', ')}`);
} else {
  console.log(`✓ 童軍小隊 ${pt.fileVersion}：${pt.patrols.length} 隊，圖案齊`);
}
if (failed) process.exit(1);
