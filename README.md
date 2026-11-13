# SCOUT3D — 小童軍服裝 3D 預覽

> **一句話**：一個可以轉嚟轉去嘅 3D 公仔，示範香港童軍總會**小童軍**服裝點穿、團員章／進步獎章／旅章等應該戴喺邊；撳徽章就見到位置描述、原文摘要同文件頁碼。畀小童軍家長、新領袖同團長核對用。
> 類型（P1 三分類）：**工具**（無登入、無後端、無狀態） · 技術棧：Vite 6 + React 18 + three.js / React Three Fiber，部署 Vercel（`hkg1`）
> 非官方聲明：**非香港童軍總會官方工具**。位置屬示意，徽章圖案係簡化示意圖，唔係官方圖樣。實際穿著請以所屬童軍組織及單位最新指引為準。

更新日期：2026-11-13 · 負責：SCOUT SYSTEM · 授權：保留所有權利（`UNLICENSED`，見 [LICENSE](LICENSE)） · 版本：**SCOUT3D v1.0**

> ⚠️ **v1.0 狀態：依手冊整理・待領袖核對。** 所有位置由 AI 助手依文件整理，未經領袖逐項確認；`進步獎章` 左右排法、`小草蜢獎章` 位置、學校運動上衣巾尾排法標咗「待確認」。核對方法見 [docs/01-rules-review.md](docs/01-rules-review.md)。

---

## 5 分鐘

| 我想… | 去 |
|---|---|
| 即刻跑 | `npm install --include=dev && npm run dev` → <http://localhost:5173> |
| 出正式版 | `npm run build`（先驗規則資料，再 `vite build` 去 `dist/`） |
| 改徽章位置／規則 | [`src/data/grasshopper_rules_v1.0.json`](src/data/grasshopper_rules_v1.0.json) + [docs/01-rules-review.md](docs/01-rules-review.md) |
| 知規矩 | [AGENTS.md](AGENTS.md) · [SCOPE.md](SCOPE.md) · [GLOSSARY.md](GLOSSARY.md) |
| 一頁紙速查 | [docs/quickcard.md](docs/quickcard.md) |
| 原本計劃書 | [docs/PLAN.md](docs/PLAN.md) |
| 交付前檢查 | `node scripts/guard.mjs` + `node scripts/final_check_v1.0.mjs --json` |
| 出事 | [docs/quickcard.md §出事](docs/quickcard.md#出事) |
| 改版紀錄 | [CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) |
| 文件目錄 | [docs/README.md](docs/README.md) |

## 有乜做到（v1.0）

- 3D 公仔：滑鼠拖曳／手指旋轉，滾輪／雙指縮放；相機唔會入咗公仔，唔會去地底。
- 正面、背面、穿著者左、穿著者右四個預設視角 + 重設。
- 7 種徽章開關：團員章、進步獎章（0–4 步）、小草蜢獎章、旅章、區章、優異旅團章、活動紀念章。撳徽章（3D 或清單）→ 名稱、位置、原文摘要、佩戴條件、尺寸、來源頁碼，可以聚焦。
- 服裝：男孩／女孩、膚色、已宣誓／未宣誓、橙色活動服／單色有領／單色圓領、短袖／長袖、短褲／長褲、短襪／長襪、漁夫帽／鴨咀帽、背心、旅巾主色＋花邊、顏色巾圈、學校運動上衣模式。
- 「來源」分頁：文件版本、服裝規則摘要、唔可以戴嘅嘢、未宣誓規定、文件之間嘅分別。
- 中文／English 一鍵切換（右上角），記住選擇。
- 截圖：PNG，右下角 `© SCOUT SYSTEM · v1.0`、左下角「依手冊整理・待領袖核對」，加隱形水印（`SCOUTSYSTEM|v2|S3D1|<日期>|GRHP`），可以用 [`tools/drawscout_decoder_v1.0.html`](tools/drawscout_decoder_v1.0.html) 驗。

## 資料來源

| 代號 | 文件 | 用咗乜 |
|---|---|---|
| UH | 香港童軍總會《儀容與制服手冊》（網上版：<https://www.scout.org.hk/uniformhandbook>） | 小童軍服裝 p.23–24、巾圈 p.110、基本徽章 p.26、名牌 p.128、服務年星 p.129 |
| GSG | 《小童軍活動指引》（第三版，青少年活動署，2026 年 2 月） | 服裝 P.8–9、團員章 P.10、進步獎章 P.11–12、小草蜢獎章 P.12 |

手冊同指引內容**版權屬香港童軍總會**；本工具只作摘要引用並逐項列明出處，冇複製原圖。

## 呢個 repo 唔係乜

- 唔係官方規定，亦唔代替團長／領袖指示。
- 唔做帳號、網店、相片變公仔、全套徽章庫、STL 匯出；v1.0 只做**小童軍**支部。
- 詳細界線同「已拒絕嘅提議」：[SCOPE.md](SCOPE.md) · [`docs/out-of-scope/`](docs/out-of-scope/README.md)

## 目錄

```
README.md            入口
AGENTS.md            Agent 開工順序 / 邊界
SCOPE.md             做乜 / 唔做乜
GLOSSARY.md          共用語言（小童軍術語、穿著者左右）
CONTRIBUTING.md      點提 issue / PR
CHANGELOG.md         改版紀錄
LICENSE              保留所有權利
index.html           由 shell/index_v1.0.html 產生（唔好直接改）
shell/               版本化 HTML 源檔
src/data/            規則資料（JSON + 驗證）—— 同 3D 模型分開
src/three/           3D 公仔、徽章貼花、相機
src/lib/             截圖 + 水印 codec
public/icons/        9 個圖標（docs/33）
docs/                文件（見 docs/README.md）
scripts/             檢查同工具
tests/               node --test
tools/               本機用工具（水印解碼器，唔部署）
.github/workflows/   CI
```

## 驗收（交付前）

```
[x] 五大通用鐵律 S / F / A / W / V（見真理倉 PLAYBOOK）
[x] P1：研發前查過相近產品 + 自己現有方案（docs/02-p1-similar-products.md）
[x] 無真 key、無 .env、無大檔入 Git
[x] node scripts/repo_health_v1.0.mjs . 0 FAIL
[ ] 領袖逐項核對徽章位置（docs/01-rules-review.md）—— 未做
```

---

© SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM · SCOUT3D v1.0 · All rights reserved.
