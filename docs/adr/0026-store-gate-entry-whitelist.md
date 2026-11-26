# ADR 0026 — 用頂層 entry-gate 做準入白名單

Status: accepted · 2026-11-26

本工具原本任何人打網址就用到；用戶要求按真理倉 `readme/docs/50`、`docs/51` 加入白名單，只可以由指定入口派發。決定用 `store_gate_v1.0.js` 嘅 `entry-gate`（`appKey: 'scout3d'`、`portalIds: ['appstore']`、`silentPortalIds: ['library']`、`allowStandalone: true`、`autoRedirectSeconds: 0`），加上 SG18 一鍵回跳主站讚好／收藏（slug `scout3d`）。

**點解唔係其他做法**：

- `iframe-only` 會令 Safari 儲存隔離、PWA 主畫面同既有語言／外觀偏好分家；本工具係頂層獨立 Vite SPA，所以用頂層跳板。
- 後端 HMAC 驗票／`/api/enter` 簽 Cookie：SG12 定案唔值得為入口管制起基建；本 repo 唯一 `/api` 只做 PIN 比較，冇寫入同外部額度。
- 寫死入口網址：入口 Origin 由真理倉 `PORTAL_REGISTRY` 統一維護，子 App 只引用 id；圖書館靜默放行但唔畫成掣（SG19）。

**後果**：直接打網址會見中文／英文提示卡，唔再直接入到 3D 畫面；已加主畫面嘅用家同由 APP STORE／圖書館撳入嘅用家冇感覺。前端閘門唔係保安邊界，`/api/export-pin` 仍然公開，保安維持靠 4 位 PIN 同 IP limiter。要改入口／暫時關站只改 `shell/index_v1.0.html` 嘅 `initStoreGate` 設定，唔好改閘門檔本身。
