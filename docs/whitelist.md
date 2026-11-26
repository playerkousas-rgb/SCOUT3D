# SCOUT3D 準入白名單交接（SG1–SG19）

> 依真理倉 [`playerkousas-rgb/readme`](https://github.com/playerkousas-rgb/readme) [`docs/50`](https://github.com/playerkousas-rgb/readme/blob/main/docs/50-app-store-whitelist-and-shutdown.md)／[`docs/51`](https://github.com/playerkousas-rgb/readme/blob/main/docs/51-whitelist-rollout-list.md) 同 `templates/repo-starter/WHITELIST-HANDOFF.md`；2026-11-26 落閘。
> 設定值：`mode: 'entry-gate'`、`portalIds: ['appstore']`、`silentPortalIds: ['library']`、`allowStandalone: true`、`autoRedirectSeconds: 0`、`supportNudge` 關。SG18 slug `scout3d`（來源：`website/migrations/20261116-app-slug-seed.sql`，按正式 host `scout3d-gamma.vercel.app` 核對，唔係靠 repo 名猜）。

## 交接六題（掃全倉後如實答）

| # | 問題 | 答案 |
|:--:|---|---|
| 1 | 本機資料要跨日保留？ | 是，但**只係介面偏好**：`scout3d.lang`（`src/i18n.jsx`）、`scout3d.look`（`src/App.jsx`）；兩處都有 try/catch。冇用家自建重要紀錄，唔使用 `iframe`。 |
| 2 | PWA 加入主畫面？ | 是：`public/manifest.webmanifest` 的 `display: standalone`，所以 `allowStandalone: true`。 |
| 3 | Web Push 訂閱？ | 否：全倉冇 service worker、冇 `PushManager`、冇 `showNotification`；唔屬圖書館類，可以落閘。 |
| 4 | 後端／第三方 API 額度？ | 有 `/api/export-pin`（`api/` 兩個檔），只做 4 位 PIN 定時比較＋記憶體 limiter，唔寫庫、唔叫第三方、冇成本。按 SG12 唔加簽票基建；(`/api` 本身仍可被直接呼叫，保安只靠 PIN）。 |
| 5 | 用家今日點樣入？ | APP STORE 連結／圖書館連結／直接打網址／已加主畫面；落閘後第一、二、四種照入，第三種見提示卡。 |
| 6 | 屬邊類？ | 專業工具（制服同徽章位置對照）→ `portalIds` 收窄到 `['appstore']`；SG18 常駐「讚好／收藏」掣。 |

SCOUT3D 喺真理倉 `docs/51` 屬 **C 組**（有 `/api`），但 `/api` 只驗 PIN，符合「proxy／統計可以直接 `entry-gate`」嘅條件。

## 實際改咗乜

| 檔 | 改動 |
|---|---|
| `public/store_gate_v1.0.js` | 由真理倉 `templates/vercel/store_gate_v1.0.js` 原封不動抄入（`public/` 經 Vite build 複製去 `dist/` 根，即 Vercel `outputDirectory`）。SHA-256 由 `tests/whitelist.test.mjs` 鎖住；唔好喺本 repo 改邏輯。 |
| `shell/index_v1.0.html` → `index.html` | `<meta charset>` 之後、`<title>` 之前載入閘門＋`initStoreGate(...)`；`index.html` 由 `npm run sync` 產生。 |
| `src/App.jsx` | 頂欄加 `#storeSupportTop`（SG18），`getAppStoreUrl('scout3d')` 出網址；`window.ScoutStoreGate` 未載入就唔 render，唔出死連。 |
| `src/i18n.jsx` | 新字串 `store.support`／`store.supportAria`／`store.supportTitle`，中英同步。 |
| `src/styles.css` | `.support-btn` 樣式（≥40px 觸控、`:focus-visible` 跟全域規則、窄屏 360–430px 唔爆、列印隱藏、`[hidden]` 隱藏）。 |
| `tests/whitelist.test.mjs` | 5 組測試：模板 hash／head 順序／SG19 放行同攔截／PWA 通行證／SG18 掣。 |

## 本機開發

`npm run dev` 直接開 `http://localhost:5173/` 會見到白名單卡（閘門對所有非白名單 origin 一視同仁）。要睇 3D 畫面：喺該分頁 console 執行 `sessionStorage.setItem('scout3d.store_pass', '1')` 再重整；呢個係閘門自己嘅同分頁通行證（同由入口入過之後重整一樣），只喺本機該分頁有效，唔係改 production 設定。

## 驗收（本機模擬同真機分開，唔混）

| 項 | 本機模擬 | 真機實測 |
|---|:--:|:--:|
| APP STORE 撳入 → 正常，冇提示卡 | ✅（`evaluateStoreGate`，`matchedPortalId: appstore`） | ☐ 未做 |
| 圖書館撳入 → 正常，唔畫掣 | ✅（`matchedPortalId: library`） | ☐ 未做 |
| 直打網址 → 提示卡只出 1 粒 APP STORE 掣 | ✅（`missing-whitelist-entry`；實際畫面未截圖） | ☐ 未做 |
| 已加主畫面撳 icon → 直接入 | ✅（`standalone-pwa`） | ☐ 未做 |
| SG18 掣 → 開新分頁落到 `?app=scout3d` | ✅（網址由 `PORTAL_REGISTRY` 計出） | ☐ 未做 |
| SG18 掣喺 `ScoutStoreGate` 未載入時唔出現 | ✅（React 條件 render） | — |
| 列印／窄屏 360–430px | CSS 靜態檢查 ✅；actual 截圖未做 | ☐ 未做 |

> **誠實限制**：前端閘門（Referer + sessionStorage + DOM 遮罩）只擋一般用家直接打網址；DevTools／curl 可以偽造。涉及私隱或付費額度先要後端驗票，本工具冇呢類資料，所以按 SG12 唔做。真機（iPhone Safari／Android Chrome）跨站跳轉未實測，上線後要補；未做就唔好當已完成。
