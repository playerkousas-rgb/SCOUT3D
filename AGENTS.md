# AGENTS — SCOUT3D 開工邊界

> **Agent 第一行讀呢度。** 同 [README.md](README.md) 衝突時，以通用安全／防呆底線為先。

## 開工順序

> **開新 repo 嘅 AGENT（前置步 pre-step，喺下面開工順序之前）**：如果未問清楚用戶需求，先去 [`INTAKE.md`](INTAKE.md) 主動問（一輪問晒 + 建議答案 + 用戶確認），答案寫入 `SCOPE.md`；**唔好靠估**。方法原文 `grilling` 放咗喺 [`skills/external/grilling/SKILL.md`](skills/external/grilling/SKILL.md)（只作溯源，唔直接執行）。用戶喺真理倉 README 已經答咗並確認就跳過。真理倉 README 叫呢步做「第 0 步」，本檔下面個 `0.` 係**開工順序**第一步，兩者唔同層。

> **加新 skill**：一定要跟 [`skills/CATALOG.md`](skills/CATALOG.md) §2 四步（生檔 → 驗 frontmatter → **加目錄行 + 呢份 AGENTS.md 指名** → PREFLIGHT／consistency 綠）。`check_skills` 會自動對，漏即 FAIL。

0. **PREFLIGHT gate（開工順序第一步，未設定／未 commit 之前）**：`node scripts/preflight_v1.0.mjs . --json` → `ok: true` 先好郁；`exit 1` 就停手，唔好改檔、唔好 commit。詳見 [PREFLIGHT.md](PREFLIGHT.md)。
1. **讀 `repo-setup` 呢份 skill 並跟住做**：[`skills/promoted/repo-setup/SKILL.md`](skills/promoted/repo-setup/SKILL.md)。佢包辦 12 樣核心、按形式揀第 13／14 項、兩軸 review；**有 UI／要出畫面**再明確讀 [`design-review`](skills/promoted/design-review/SKILL.md)；**要加網頁／UI 動態**再明確讀 [`web-motion`](skills/promoted/web-motion/SKILL.md)（Motion Prompt 編號＋GSAP＋scroll 術語；編號庫原文見 [`motion-prompt`](skills/external/motion-prompt/SKILL.md)，只作溯源，施工跟 `web-motion`）。收納約定見 [`docs/skills/README.md`](docs/skills/README.md)。
   > ⚠️ **呢個係要你（AGENT）主動讀，唔係自動彈出嚟**：無 Skill tool／plugin harness。PREFLIGHT 只驗呢幾份 `SKILL.md` 存在、frontmatter 合格同**入咗 [`skills/CATALOG.md`](skills/CATALOG.md)**，**唔會代你執行**。做完要自己寫低三份證據：PREFLIGHT JSON、兩軸 review（Standards／Spec 分開）、有 UI 再加 `ROUND n` 望圖紀錄（無瀏覽器就寫明做唔到）。
2. 讀 [README.md](README.md)（5 分鐘入口）→ [SCOPE.md](SCOPE.md)（做乜／唔做乜）→ [GLOSSARY.md](GLOSSARY.md)（共用語言）。
3. 對 [docs/quickcard.md](docs/quickcard.md) 嘅一頁紙 checklist。
4. 通用規則去真理倉 [README](https://github.com/playerkousas-rgb/readme) 同 [PLAYBOOK](https://github.com/playerkousas-rgb/readme/blob/main/PLAYBOOK.md)；**唔好喺本 repo 複製第二份**。
5. 改動前後各跑一次 `node scripts/guard.mjs`；交付前 `node scripts/final_check_v1.0.mjs --json`。

## 本 repo 專屬（SCOUT3D）

- **徽章位置只可以跟文件**：改 [`src/data/grasshopper_rules_v1.0.json`](src/data/grasshopper_rules_v1.0.json)，每項要有 `sources`（文件 + 頁碼）；唔肯定就 `status: "pending"` + `pendingReason`，**唔好估**。`npm run check` 會攔。
- **左右一律以穿著者本人角度**：3D 座標穿著者左 = `+x`（人物面向 `+z`），見 [`src/three/body.js`](src/three/body.js)。
- **未經領袖核對唔可以標 `verified`**；核對人 = 專案負責人（用戶本人），核對完先填 `review.lastChecked`。
- 徽章圖案全部係 canvas 即場畫嘅**簡化示意圖**，唔好換成官方圖樣或 AI 仿製官方徽章（版權屬香港童軍總會）。
- `index.html` 由 [`shell/index_v1.0.html`](shell/index_v1.0.html) 產生：改 shell 再跑 `npm run sync`。

## 可改 / 唔好改

| 可改 | 唔好改（除非用戶明講 + 寫例外原因） |
|---|---|
| `src/`、`app/`、測試、文件 | 設定層唯一入口、registry、身份／授權邏輯 |
| 新增 `docs/NN-*.md`（要同步更新目錄） | 已定案嘅對外 contract／API schema |
| 修 bug、加測試 | 將 secret 由 server 搬去前端 |

## 鐵律捷徑

- **S**：唔好用嘅嘢一件都唔部署；交付檔 ≤5MB。
- **F**：fail closed、白名單、冪等、dry-run。
- **A**：secret 只留 server；所有授權 server-side 計；log 唔記 PII。
- **W**：每個交付檔有可見版權 + 第三方素材標來源。
- **V**：改交付檔 = 檔名版號 + 內文版號 + 頁尾一齊改，並寫 [CHANGELOG.md](CHANGELOG.md)。

## 做完要留低

- [CHANGELOG.md](CHANGELOG.md) 一行、`docs/adr/` 一份 ADR（只限難逆轉嘅決定）。
- 未核實事項寫「待查」，唔好當已完成；提 issue／PR 跟 [CONTRIBUTING.md](CONTRIBUTING.md)。
