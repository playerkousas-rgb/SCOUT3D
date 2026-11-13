#!/usr/bin/env node
// SCOUT3D 規則資料檢查 — v1.0 · © SCOUT SYSTEM
// build 前跑：資料唔齊（冇來源／冇頁碼／待確認冇原因）就 fail，唔出貨。
import { readFileSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';

export const VERSION = 'v1.0';
const file = new URL('../src/data/grasshopper_rules_v1.0.json', import.meta.url);
const rules = JSON.parse(readFileSync(file, 'utf8'));
const errors = validateRules(rules);
const pending = rules.badges.filter((b) => b.status === 'pending').map((b) => b.id);
if (errors.length) {
  console.error(`✗ 規則資料有 ${errors.length} 個問題：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ 規則資料 ${rules.fileVersion} 通過（${rules.badges.length} 個徽章、${rules.garments.length} 件衣物）`);
console.log(`  核對狀態：${rules.review.status}；待確認：${pending.join(', ') || '無'}`);
