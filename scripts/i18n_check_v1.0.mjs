#!/usr/bin/env node
/**
 * i18n_check_v1.0.mjs — 雙語介面 L2–L5 靜態檢查（docs/44-bilingual-ui.md）
 *
 * 用法：
 *   node scripts/i18n_check_v1.0.mjs <file.html|file.jsx|file.js>
 *   node scripts/i18n_check_v1.0.mjs <目錄>            # 遞迴掃 .html/.js/.jsx/.mjs/.ts/.tsx
 *   node scripts/i18n_check_v1.0.mjs <path> --json
 *
 * 零 dependency（S1）。抄 4 個 BOOK（SCOUTBOOK／CUBSBOOK／ROVERBOOK／VSBOOK）
 * web/src/i18n.jsx 嘅形狀做靜態比對：一鍵切換、data-lang + lang、localStorage try/catch、
 * 字典兩邊鍵一致、缺譯 fall back。
 *
 * ⚠️ 呢支係「有做英文嗰陣驗做得啱唔啱」，唔係「迫所有 app 做英文」：
 *   L 只為 2026-11-08 之後新開嘅 app 而設，現有 repo 唔追溯（用戶定案）。
 *   完全搵唔到雙語實作 → WARN（提醒 L1 雙閘判定／豁免要寫 EXCEPTION），**唔會 FAIL**。
 *   L1 字串量、翻譯質素、撳掣行為、螢幕閱讀器讀音全部驗唔到，要人手（docs/44 L6）。
 *
 * 只讀檔，唔執行被檢查嘅碼、唔改檔、唔上網。
 * 退出碼：0 = 無 FAIL；1 = 有 FAIL；2 = 用法錯。
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

export const VERSION = 'v1.0';

const SKIP = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache', 'Unselected files']);
const CODE_EXT = new Set(['.html', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

const findings = [];
const add = (level, id, msg) => findings.push({ level, id, msg });
const fail = (id, msg) => add('FAIL', id, msg);
const warn = (id, msg) => add('WARN', id, msg);
const pass = (id, msg) => add('PASS', id, msg);
const info = (id, msg) => add('INFO', id, msg);

/** 收集目錄下面嘅碼檔（單一檔就直接用） */
export function collectFiles(target) {
  const st = statSync(target);
  if (st.isFile()) return [{ name: path.basename(target), text: readFileSync(target, 'utf8') }];
  const out = [];
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      if (SKIP.has(n)) continue;
      const p = path.join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      // 排除測試檔同檢查器自己：佢哋含 data-lang-toggle 等樣式字串，會被誤當實作
      else if (CODE_EXT.has(path.extname(n)) && !n.endsWith('.test.mjs') && !/^i18n_check_v[\d.]+\.mjs$/.test(n))
        out.push({ name: path.relative(target, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') });
    }
  };
  walk(target);
  return out;
}

/** 由 `start` 嘅第一個 { 開始括號配對，抽出整個 block（畀字典用，唔 eval） */
function braceBlock(src, start) {
  const open = src.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  return null;
}

/** 抽 `key: { ... }` 形式嘅語言表，回傳 key → value */
function langTable(block, lang) {
  const m = new RegExp(`(?:^|[\\s,{])['"]?${lang}['"]?\\s*:\\s*\\{`).exec(block);
  if (!m) return null;
  const body = braceBlock(block, m.index + m[0].length - 1);
  if (body === null) return null;
  const table = new Map();
  // 兩種鍵都認：引號鍵（'action.save':）同裸鍵（save:）；值只收字串字面值
  for (const kv of body.matchAll(/(?:^|[,{\s])['"]?([A-Za-z0-9_.\-]+)['"]?\s*:\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/g))
    table.set(kv[1], kv[3]);
  return table;
}

/** 註解唔當 UI 字串（否則「中文模式顯示 EN」呢類解說會假陽性） */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ').replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * @param {string|Array<{name:string,text:string}>} input 單一檔內容，或一組檔
 * @param {string} filename 顯示用名
 */
export function check(input, filename = '(input)') {
  findings.length = 0; // 每次獨立，唔累積上一次
  const files = Array.isArray(input) ? input : [{ name: filename, text: String(input) }];
  const raw = files.map((f) => f.text).join('\n');
  const src = stripComments(raw);
  const label = Array.isArray(input) ? `${filename}（${files.length} 個檔）` : filename;

  /* ---- L0：呢度有冇雙語實作？冇就唔迫（L 係可豁免規則） ---- */
  const hasDict = /(?:const|let|var)\s+(?:DICT|STRINGS|MESSAGES|translations)\b/.test(src) || langTable(src, 'zh') !== null;
  const hasBi = /\bbi\s*\(\s*\w+\s*,/.test(src) || /\buseLang\s*\(/.test(src) || /LangProvider/.test(src);
  const hasToggle = /data-lang-toggle/.test(src) || /chipbtn--lang/.test(src) || /onClick\s*=\s*\{\s*toggle\s*\}/.test(src);
  const hasLangAttr = /data-lang/.test(src);

  if (!hasDict && !hasBi && !hasToggle && !hasLangAttr) {
    warn('L1/scope', '搵唔到雙語實作 — L 只適用於 2026-11-08 之後新開嘅 app（舊 app 唔追溯，可以直接忽略呢個提示）；新 app 而兩個閘都達標就要做英文，唔做要喺 PR／SCOPE 寫 `EXCEPTION: L1 — 原因 — 補償`（docs/44-bilingual-ui.md）');
    info('LIMIT', '呢支只驗靜態結構；L1 字串量、翻譯質素、撳掣行為、列印、螢幕閱讀器要人手（docs/44 L6）');
    return { file: label, findings, ok: true };
  }

  /* ---- L2：右上角一鍵切換 ---- */
  if (!hasToggle) fail('L2/toggle', '有字典／語言狀態但搵唔到切換掣 — 要 `data-lang-toggle`（vanilla）或 `onClick={toggle}`／`chipbtn--lang`（React），放右上角，唔好收埋入選單');
  else if (!/aria-label/.test(src)) fail('L2/aria', '語言掣冇 aria-label — 螢幕閱讀器淨係讀到「EN」，唔知撳會點');
  else pass('L2/toggle', '有切換掣 + aria-label');

  if (/title\s*=/.test(src) || /setAttribute\(\s*['"]title['"]/.test(src)) pass('L2/title', '有 title 提示');
  else warn('L2/title', '語言掣冇 title，滑鼠停留冇提示（L2 建議 title 同 aria-label 同步）');

  // 掣要顯示「目標語言」：`? 'EN' :` 即係顯示當前語言（ROVERBOOK 嗰種，唔跟）
  if (/\?\s*['"]EN['"]\s*:/.test(src))
    warn('L2/label', '掣似乎顯示「當前語言」（英文模式顯示 EN）— L2 定案係顯示目標語言：中文模式顯示 EN，英文模式顯示 中文');

  if (/<select[^>]*data-lang-toggle/i.test(src))
    warn('L2/oneclick', '得兩種語言用下拉選單係多餘一步，L2 要一個掣直接切換');

  /* ---- L3：狀態保存 + lang 屬性 ---- */
  const setsDataLang = /setAttribute\(\s*['"]data-lang['"]/.test(src) || /documentElement\.dataset\.lang\s*=/.test(src);
  const setsLang = /setAttribute\(\s*['"]lang['"]/.test(src) || /documentElement\.lang\s*=/.test(src);
  if (!setsDataLang) fail('L3/data-lang', '切換時冇設 `data-lang` — CSS 冇辦法做乾淨分離（L4）');
  if (!setsLang) fail('L3/lang', '切換時冇設 `<html lang>` — 螢幕閱讀器讀音同 SEO 會留住錯語言（L3）');
  if (setsDataLang && setsLang) pass('L3/attrs', 'data-lang + lang 兩個都有設');

  if (/setAttribute\(\s*['"]lang['"]\s*,\s*['"]zh['"]/.test(src) || /lang\s*=\s*['"]zh-CN['"]|lang\s*=\s*['"]zh-Hans['"]/.test(src))
    warn('L3/lang-value', '中文 lang 值建議 `zh-Hant-HK`（BOOK 做法）或 `zh-Hant`，唔好淨係 `zh`／簡體值');

  const storeUses = [...src.matchAll(/localStorage\s*\.\s*(?:getItem|setItem|removeItem)/g)];
  if (!storeUses.length) {
    warn('L3/persist', '冇用 localStorage 記住語言 — 重整頁面會跳返預設（L3）');
  } else {
    // heuristic：前後 300 字內要有 try / catch（Safari 私隱模式會 throw）
    const unguarded = storeUses.filter((m) => {
      const before = src.slice(Math.max(0, m.index - 300), m.index);
      const after = src.slice(m.index, m.index + 300);
      return !/\btry\s*\{/.test(before) || !/\bcatch\b/.test(after);
    });
    if (unguarded.length) fail('L3/store-throw', `${unguarded.length} 處 localStorage 冇 try/catch — 私隱模式會 throw 成個 app 炸（L3 / C13 safeStore）`);
    else pass('L3/store-throw', `${storeUses.length} 處 localStorage 全部有 try/catch`);

    const keys = [...src.matchAll(/localStorage\s*\.\s*(?:getItem|setItem)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const constKey = /LANG_KEY\s*=\s*['"]([^'"]+)['"]/.exec(src)?.[1];
    const allKeys = [...keys, ...(constKey ? [constKey] : [])];
    if (allKeys.length && allKeys.every((k) => k.includes('.'))) pass('L3/key', `語言 key 有 app 前綴（${[...new Set(allKeys)].join(', ')}）`);
    else if (allKeys.length) warn('L3/key', '語言 key 冇 app 前綴（例 `scoutbook.lang`）— 同一 domain 幾個 app 會互相踩');
  }

  if (/navigator\.language/.test(src))
    warn('L3/default', '用咗 navigator.language 自動決定語言 — L3 跟 BOOK：預設中文，用戶自己撳');

  /* ---- L4／L5：字典兩邊一致、缺譯 fall back、唔硬塞並排 ---- */
  const zh = langTable(src, 'zh');
  const en = langTable(src, 'en');
  if (zh && en && (zh.size || en.size)) {
    const onlyZh = [...zh.keys()].filter((k) => !en.has(k));
    const onlyEn = [...en.keys()].filter((k) => !zh.has(k));
    if (onlyZh.length) fail('L4/dict-keys', `英文字典缺 ${onlyZh.length} 個鍵：${onlyZh.slice(0, 6).join(', ')}${onlyZh.length > 6 ? '…' : ''}`);
    if (onlyEn.length) fail('L4/dict-keys', `中文字典缺 ${onlyEn.length} 個鍵：${onlyEn.slice(0, 6).join(', ')}${onlyEn.length > 6 ? '…' : ''}`);
    const empty = [...en.entries()].filter(([, v]) => !v.trim()).map(([k]) => k);
    if (empty.length) fail('L4/dict-empty', `英文字典有 ${empty.length} 個空值：${empty.slice(0, 6).join(', ')} — 切英文會出空白（L5）`);
    if (!onlyZh.length && !onlyEn.length && !empty.length) pass('L4/dict', `字典兩邊鍵一致、冇空值（${zh.size} 條）`);
    if (zh.size > 300) warn('L1/strings', `字典有 ${zh.size} 條（>300 字串閘）— 可以豁免，但要喺 PR 寫 EXCEPTION: L1 同實際數字`);
    else info('L1/strings', `字典 ${zh.size} 條（字串閘 ≤300）；呢個只係字典計數，唔等於全部 UI 字串，L1 要人手確認`);
  } else if (hasDict) {
    warn('L4/dict', '搵到字典但抽唔到 zh／en 兩邊對照 — 人手確認鍵一致同冇空英文值（L4）');
  }

  const biCalls = [...src.matchAll(/\bbi\s*\(\s*\w+\s*,\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(['"])((?:\\.|(?!\3)[^\\])*)\3/g)];
  if (biCalls.length) {
    const noEn = biCalls.filter((m) => !m[4].trim()).length;
    if (noEn) warn('L5/fallback', `${noEn} 個 bi() 冇英文 arg — BOOK 做法會 fall back 中文（唔會空白），但即係未譯埋，人手跟進`);
    else pass('L5/bi', `${biCalls.length} 個 bi() 呼叫中英兩邊都有值`);
  }
  if ((hasBi || hasDict) && !/\?\?/.test(src) && !/\|\|/.test(src) && !/isEn\s*\?/.test(src) && !/lang\s*===\s*['"]en['"]\s*\?/.test(src))
    warn('L5/fallback', '搵唔到缺譯 fall back（`??`／三元判斷）— 英文模式遇到未譯鍵應該顯示中文，唔好空白（L5）');

  // 硬塞「日期 Date」：直接掃已剝註解源碼（唔逐個引號配對 — HTML 屬性混 JS 會錯位）。
  // 只捉「中文 + 空格 + 似翻譯嘅英文詞」；全大寫縮寫（QR／JSON／API）係中文句子正常用法，
  // 唔當並排。代價：「或 OR」呢類全大寫連接詞捉唔到，要人手望（L6）。
  const mixed = [...new Set([...src.matchAll(/[\u4e00-\u9fff]{1,10}[ \t]+(?![A-Z]{2,}\b)[A-Za-z][a-z]+(?:[ \t]+[A-Za-z][a-z]+)?/g)]
    .map((m) => m[0].trim()))];
  if (mixed.length) warn('L4/mixed', `${mixed.length} 個疑似中英硬塞字串（例：${mixed.slice(0, 3).map((s) => `「${s.trim().slice(0, 24)}」`).join('、')}）— 螢幕要一次一種語言，用 bi()／data-i18n 拆開；列印並排係例外（L4）`);
  else pass('L4/mixed', '冇掃到中英硬塞字串');

  info('LIMIT', '靜態檢查只認結構：撳掣有冇換字、F5 記唔記得、窄螢幕爆唔爆版、螢幕閱讀器讀音全部要人手實測（docs/44 L6）');

  return { file: label, findings, ok: !findings.some((f) => f.level === 'FAIL') };
}

/* ---- CLI ---- */
const isCli = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.basename(new URL(import.meta.url).pathname));
if (isCli) {
  const target = process.argv[2];
  if (!target) {
    console.log('用法：node scripts/i18n_check_v1.0.mjs <檔案或目錄> [--json]');
    process.exit(2);
  }
  if (!existsSync(target)) { console.error(`搵唔到 ${target}`); process.exit(2); }
  let r;
  try { r = check(collectFiles(target), target); }
  catch (e) { console.error(`讀唔到 ${target}：${e.message}`); process.exit(2); }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const icon = { FAIL: '✗', WARN: '!', PASS: '✓', INFO: '·' };
    console.log(`\n雙語介面 L 靜態檢查 ${VERSION} — ${r.file}\n`);
    for (const f of r.findings) console.log(`  ${icon[f.level]} [${f.id}] ${f.msg}`);
    const n = r.findings.filter((f) => f.level === 'FAIL').length;
    const w = r.findings.filter((f) => f.level === 'WARN').length;
    console.log(`\n${n ? `❌ I18N CHECK FAIL — ${n} 項要修（${w} 個警告）` : `✅ I18N CHECK PASS — 0 FAIL（${w} 個警告）`}\n`);
  }
  process.exit(r.ok ? 0 : 1);
}
