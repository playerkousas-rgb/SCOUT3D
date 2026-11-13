#!/usr/bin/env node
// 由版本化源檔產生根目錄 index.html（docs/13 V4 部署拷貝）— SCOUT3D v1.0 · © SCOUT SYSTEM
// 用法：node scripts/sync_index_v1.0.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const VERSION = 'v1.0';
const SRC = 'shell/index_v1.0.html';
const OUT = 'index.html';

export function render(src) {
  const marker = `<!-- GENERATED from index_v1.0.html (v1.0) · 唔好直接改，改 ${SRC} 再跑 scripts/sync_index_v1.0.mjs -->`;
  return src.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n${marker}`);
}

const root = new URL('..', import.meta.url);
const src = readFileSync(new URL(SRC, root), 'utf8');
const want = render(src);
const outUrl = new URL(OUT, root);
const have = existsSync(outUrl) ? readFileSync(outUrl, 'utf8') : '';
if (process.argv.includes('--check')) {
  if (have !== want) {
    console.error(`✗ ${OUT} 同 ${SRC} 唔同步 — 跑 node scripts/sync_index_v1.0.mjs`);
    process.exit(1);
  }
  console.log(`✓ ${OUT} 同 ${SRC} 同步`);
} else if (have !== want) {
  writeFileSync(outUrl, want);
  console.log(`✓ 已由 ${SRC} 產生 ${OUT}`);
} else {
  console.log(`✓ ${OUT} 已經同步`);
}
