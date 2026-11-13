# INTAKE — 開新 REPO 之前，AGENT 要先問清楚

> **第 0 步，喺抄任何檔之前。** 方法原文 [`skills/external/grilling/SKILL.md`](skills/external/grilling/SKILL.md) **實體放咗喺本 repo**（[mattpocock/skills 原檔](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)，MIT，**2026-11-02 讀取**，2,077 bytes；見 [`skills/CATALOG.md`](skills/CATALOG.md)）：問到共同理解為止、每條問題俾**建議答案**、一輪問晒「而家問得」嘅嘢、fact 自己去查唔好問用戶、**用戶確認先好郁手**。下面係本地化版，**唔使上網都睇到**。
> 配套：[START.md](START.md) · [`repo-setup/SKILL.md`](skills/promoted/repo-setup/SKILL.md) · [PREFLIGHT.md](PREFLIGHT.md) · 真理倉 [docs/28](https://github.com/playerkousas-rgb/readme/blob/main/docs/28-repo-taxonomy.md) · [docs/32 §8](https://github.com/playerkousas-rgb/readme/blob/main/docs/32-consistency-audit.md)

---

## 點問（唔好連環追問）

1. **設計樹 + frontier**：一輪問晒「而家問得」嘅問題（唔使等第 1 題答案就已經可以問嘅），**編號 + 每條俾一個建議答案**；問法要令用戶答「係／照你講」就等於接受建議。
2. **等用戶答完先至下一輪**：第 2 輪只問被第 1 輪答案解鎖嘅問題（例：答咗「有登入」先問帳號／回報細節）。
3. **Fact 係 AGENT 自己查**，唔好問用戶：85 個 repo  baseline、`docs/28` 嘅形式名、模板有乜檔、[P1](https://github.com/playerkousas-rgb/readme/blob/main/PLAYBOOK.md) 相近產品／授權、ToS。用戶只負責**決定**。
4. **問完要寫低**，唔好只留喺對話：答案寫入 `SCOPE.md`（做乜／唔做乜兩條 bar）+ README 第一句定位；難逆轉嘅決定寫一段 [`docs/adr/0001-*.md`](docs/adr/0000-template.md)。
5. **用戶確認「係，理解啱」先好抄檔**；未確認唔好 `git init`、唔好揀授權、唔好改 `LICENSE`。
6. **唔好靠估**：答唔到就寫「未定／待用戶確認」，唔好自己揀個 default 當答案。

> ⚠️ **唔好問「你想用咩內容／主題分類」**：用戶明確講過要按**形式**分（輕／有後台／Gemini），唔係內容分類。下面 Q1–Q5 全部係形式問題。

---

## 第 1 輪：frontier（無前設，一過問）

```
❓ Q1 — 交付形式：呢個 repo 係邊種？
   單一 HTML／少檔靜態 · 靜態多檔／PWA · 框架 SPA／PWA · 後台靜態殼／多層系統 ·
   資料管道 · 知識／索引倉 · 空殼／預留
   ➡️ 建議：未講就當「框架 SPA／PWA」，但請用戶確認。
   → 對 [docs/28 §3](https://github.com/playerkousas-rgb/readme/blob/main/docs/28-repo-taxonomy.md) 8 種形式；決定 12 樣可簡化幾多。

❓ Q2 — 有冇 UI／要唔要出畫面？
   ➡️ 建議：有。有就加 13a，並由 repo-setup 明確叫 design-review SKILL.md。
   → 純工具／資料管道／知識倉答「無」就唔使 design-review。

❓ Q3 — 有冇身份／登入（帳號、角色、session）？
   ➡️ 建議：無。答「有」就係系統級，要設定層＋隱藏超管＋registry＋審計鏈，
      並加第 14 項 [docs/system-basics.md](docs/system-basics.md)（忘記密碼等 8 樣 + ADMIN 回報系統 8 樣）。

❓ Q4 — 有冇後台／server-side code？（Vercel /api、GAS .gs、Supabase）
   ➡️ 建議：無。有就要 .env.example、.vercelignore、零特權（EXTERNAL）、
      /api/proxy scope 檢查、AUDIT_LOG；純 vercel.json rewrite 唔當後台。

❓ Q5 — 係咪 Gemini／Canvas app？邊種結構 A 全開放／B 隱藏水印／C 腦殼分離？
   ➡️ 建議：唔係。係就要 [docs/09 C1 決策表](https://github.com/playerkousas-rgb/readme/blob/main/docs/09-gemini-canvas.md)，
      單一 HTML 硬上限 5MB（C13-g）；BYOK key 唔入 Git。

❓ Q6 — 授權揀邊個？MIT／Apache-2.0／其他／私人唔公開？
   ➡️ 建議：MIT（同真理倉一致），但**呢條一定要用戶自己揀**，AGENT 唔准代揀。
   → START.md ③「先揀授權先至將 LICENSE-MIT.txt 改名做 LICENSE」。

❓ Q7 — 一句定位 + 明確唔做乜 + 主要對象？
   ➡️ 建議：請用戶填一句，AGENT 唔好代寫。
   → 寫入 README 第一句同 SCOPE.md 兩條 bar；「唔做乜」去 docs/out-of-scope/。

---

## 第 2 輪：只問被解鎖嘅（唔好一開始就問）

| 如果第 1 輪答… | 先問 |
|---|---|
| Q3 = 有身份 | 邊個身份錨點／資料源？帳號點開（邀請定自助）？要唔要忘記密碼／MFA？ADMIN 回報系統收乜類別、保留幾耐？（[system-basics.md](docs/system-basics.md) §D 表） |
| Q4 = 有後台 | Vercel／GAS／Supabase 邊個？第三方 API／feed 有冇 ToS／rate limit？數據放邊、備份點做？ |
| Q2 = 有 UI | 係「頁面」定「app 屏幕」（dashboard／admin／收件箱）？目標寬度 390/768/1440 有冇得實測？有冇 brand 字体／色？（[design-review SKILL.md](skills/promoted/design-review/SKILL.md)） |
| Q5 = Gemini | A/B/C 邊種？有冇隱形水印／雙版號？交付檔係咪單一 HTML？ |
| 有 SKILL.md／RAG／agent 工作流 | 用 `promoted/in-progress/deprecated` 邊個 bucket？user- 定 model-invoked？（[docs/skills/README.md](docs/skills/README.md)） |
| 用戶話「改現有 repo」 | **唔使行 intake**，直接落真理倉 README §1 導覽；淨係問「想改乜」。 |

---

## 問完點落地（對照表）

| 用戶答案 | 起手包跟住點做 |
|---|---|
| Q1 形式 | [START.md](START.md) 12 樣 + [docs/28 §6](https://github.com/playerkousas-rgb/readme/blob/main/docs/28-repo-taxonomy.md) 各形式專屬檢查 |
| Q2 有 UI | 13a `docs/design-review.md` + 明確讀 `design-review` SKILL.md |
| Q3 有身份 | **第 14 項** `docs/system-basics.md` + 設定層／超管／registry／審計鏈 |
| Q4 有後台 | `.env.example`／`.vercelignore`／`EXTERNAL` 零特權／`api` 零依賴 |
| Q5 Gemini | docs/09 結構 + 5MB + W1/V2 雙版號 |
| Q6 授權 | 先揀先改 `LICENSE` |
| Q7 定位 | `README.md` 第一句 + `SCOPE.md`；已拒絕去 `docs/out-of-scope/` |

> **13d PREFLIGHT、5 份 SKILL.md 同 [`skills/CATALOG.md`](skills/CATALOG.md) 唔跟形式**：所有新 repo 都有，唔使問。
> **PREFLIGHT 係第 4 步，唔係第 0 步**：佢驗檔，唔驗「你估中用戶需求未」。問清楚先抄檔，唔好倒轉。

## 未核實／限制

- `external/grilling` 原文係 Claude／Codex skill（有 `grill-me` user-invoked 版，我哋**唔複製**，因為佢只係叫 Skill tool）；呢度只借**方法**，無 Skill tool、無 sub-agent，唔扮自動觸發。`external/` 檔案唔改、唔 promote（[`CATALOG.md`](skills/CATALOG.md) §1）。
- 問題入面嘅「建議答案」係**出發點**，唔係 default —— 用戶未確認就唔好當答咗。
- fact（85 repo 統計、形式名、模板檔）要 AGENT 自己 `ls`／讀檔查，唔好問用戶。
