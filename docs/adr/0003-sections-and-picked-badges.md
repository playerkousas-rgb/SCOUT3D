# 0003 — 一個 app 兩個支部；區章、地域章、優異旅團章由用戶揀

SCOUT3D v1.0 · © SCOUT SYSTEM

- Status: accepted（2026-11-14）

加幼童軍時，用戶要求同一個 app 頂部切換「小童軍／幼童軍」，同埋區章、地域章要可以喺香港童軍總會網頁「地域及區」全部區入面揀，優異旅團章要輸入年份。所以規則資料分開每個支部一個 JSON（`src/data/grasshopper_rules_v1.0.json`、`cub_rules_v1.0.json`），由 `src/data/rules.js` 嘅 `SECTIONS` 統一入口；擺位（`badgeLayout.js`）同身形（`body.js`）都按 `rules.section.id` 計。會變嘅圖案唔寫死喺 JSON：章標 `dynamic`，真正圖案由 `src/lib/picks.js` 嘅 `resolveArt(badge, picks, districts)` 決定。

## 點解

- **地域章跟區自動轉**：手冊 P.95 地域章同區章一齊戴，揀咗區就知道屬邊個地域，唔使揀兩次，亦唔會揀錯配搭。總會總部屬下嘅區（例如銀禧區）網頁冇列地域章，模型就唔顯示，理由寫明（`noArt`），唔會自己作一個。
- **優異旅團章只換年份同顏色**：手冊 P.159 三個顏色嘅圖案一樣，只係年份唔同。所以用手冊三張圖（抹走年份）做底，喺 canvas 即場寫年份（`src/lib/meritCanvas.js`）；顏色 = `['紅','紫','藍'][(年 − 1999) mod 3]`，同 P.159 嘅 2016 藍、2017 紅、2018 紫吻合。唔使每年加圖。
- **區章圖檔放 repo**：scout.org.hk 喺 sandbox 連唔到，所以用 GitHub Actions（`fetch_district_badges.yml`，只可以手動觸發）下載，再壓細（49 個檔共約 218 KB，用戶唔想 Vercel 爆 storage）。

## Considered Options

- 每個支部一個 app／一條 URL：用戶明確要求同一個 app 切換。
- 區章、地域章分開兩個選單：可以揀出唔存在嘅配搭，否決。
- 每年預先整一張優異旅團章圖：無限加檔，同「同一設計」嘅事實唔一致，否決。

## Consequences

- `badgeById`、`sourceLines` 要傳 `rules`；冇全域 `RULES`。
- 加新支部 = 加一個 rules JSON + `body.js` 身形 + `SECTIONS` 一行；驗證（`validate.js`）同 `check_rules_v1.0.mjs` 會自動檢查。
- 區名單有變要改 `districts_v1.0.json` 再手動跑 workflow，跑完記得壓細（Pillow 原檔帶 EXIF／ICC，試過 490 KB）。
