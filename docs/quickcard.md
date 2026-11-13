# SCOUT3D — 一頁紙速查

> 完整版：[README.md](../README.md) · 邊界：[SCOPE.md](../SCOPE.md) · 術語：[GLOSSARY.md](../GLOSSARY.md)

## 開工三步

1. `npm install --include=dev && npm run dev`
2. `node scripts/guard.mjs`
3. 改完 `node scripts/final_check_v1.0.mjs --json`

## 五大鐵律

| | 一句 |
|---|---|
| S 瘦身 | 唔好用嘅嘢唔部署 |
| F 防呆 | fail closed、白名單、dry-run |
| A 安全 | secret 只留 server |
| W 版權 | 可見標示 + 標來源 |
| V 雙版號 | 檔名 ↔ 內文 ↔ 頁尾一致 |

## 出事

| 情況 | 第一步 |
|---|---|
| 疑似 key 外洩 | 即刻 rotate，唔好只刪 commit |
| 網站變肥 | 查 `node_modules`／`dist`／Playwright 有冇入 bundle |
| 資料靜靜咁唔更新 | 查 `error_sources`／零筆即失敗閘門 |
| 連結／錨點壞 | `node scripts/guard.mjs`（G10） |

## 唔好做

- 唔好喺前端寫死 key；唔好將 `authorization` header commit。
- 唔好每日 commit 可再生 scrape 資料；用 `data` 分支快照／artifact。
- 唔好將專案案例當通用規則。
