# 03 — v1.0 交付前兩軸 review（Standards ／ Spec 分開）

> 2026-11-13 · 寫嘅人：AI 助手（自查，唔係第三方審查）。

## 軸 1：Standards（真理倉規矩）

| 規則 | 結果 | 證據 |
|---|---|---|
| S 細／快 | ✅ | `dist` ≈ 1.2 MB（< 5 MB S7）；three／r3f 分 chunk；3D 場景 lazy load |
| F 檔案／版號 | ✅ | `shell/index_v1.0.html`、`grasshopper_rules_v1.0.json`、`scout_watermark_codec_v1.0.mjs`；`tests/version.test.mjs` 驗 5 處版號一致 |
| A 安全 | ✅ | 無 key、無後端、無 `.env`（`.env.example` 只有註解）；`npm audit` 0 high；workflow 釘 SHA；水印解碼器 escape 後先入 innerHTML |
| W1 版權 | ✅ | `<meta name="copyright">`、header 註解、可見頁尾 `© SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM · SCOUT3D v1.0` |
| W2 截圖水印 | ✅ | 實際下載截圖解碼：`SCOUTSYSTEM|v2|S3D1|20261113|GRHP`，confidence 1 |
| W8 第三方 | ✅ | 手冊只摘要 + 頁碼；徽章示意圖自己畫；LICENSE 列明 HKSA 版權 |
| V 版號 | ✅ | v1.0 / package 1.0.0 / CHANGELOG |
| L 雙語 | ✅ | `i18n_check src` 0 FAIL 0 警告；95 個鍵中英對齊 |
| 圖標（docs/33） | ✅ | 9 個，guard G11 PASS |
| 授權 | ✅ | 用戶揀「保留版權」→ `LICENSE` all rights reserved、`package.json` `UNLICENSED` |
| Gate | ✅ | preflight ok、guard PASS、final_check、check_skills、`node --test`、`npm run build` |

## 軸 2：Spec（計劃書 [PLAN.md](PLAN.md) §4 / §10 MVP）

| 驗收項 | 結果 | 點驗 |
|---|---|---|
| 3D 公仔可以旋轉、縮放 | ✅ | OrbitControls；minDistance 防入模型、maxPolarAngle 防去地底 |
| 前／後／左／右預設視角 + 重設 | ✅ | 截圖 left / right / 背面 |
| 多個徽章可以開關 | ✅ | 7 種，進步獎章 0–4 步 |
| 撳徽章見名稱同位置描述，可聚焦 | ✅ | 3D 撳或清單撳；round1_troop / round1_prog |
| 桌面同手機 | ✅（模擬） | 390 / 768 / 1440；真機未試 |
| 顯示資料來源同規則版本 | ✅ | 頁尾 + 「來源」分頁 + 每項頁碼 |
| 免責聲明 | ✅ | 頁尾第一行 |
| 左右以穿著者角度 | ✅ | 視角掣寫「左側（穿著者）」；`tests/placement.test.mjs` 驗團員章喺 `+x` |
| 未確認嘅標「待確認」 | ✅ | 進步獎章、小草蜢獎章、學校上衣巾尾；`tests/rules.test.mjs` 驗冇 `verified` |
| 唔做帳號／網店／相片變公仔／全套徽章庫／STL | ✅ | [out-of-scope](out-of-scope/README.md) |

## 未過／未做

- **領袖核對**：見 [01-rules-review.md](01-rules-review.md)，要用戶本人逐項剔。
- 真手機實機測試未做。
- 徽章 3D 位置喺 `Figure.jsx` 用 `dims.js` 尺寸計，未直接讀 JSON `anchor`（JSON 用嚟顯示同驗證）。改位置要兩邊一齊改；而家冇測試自動對照兩邊（`tests/rules.test.mjs` 只驗 JSON 數值）。
