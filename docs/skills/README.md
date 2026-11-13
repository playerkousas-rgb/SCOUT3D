# skills/ — 收納同觸發（開局可選）

> **第 13 項（13b/13c，按形式加）**：只喺 repo 真係有 agent skill／RAG 知識包先加，見 [docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)。
> 借自 [mattpocock/skills](https://github.com/mattpocock/skills) 嘅 `AGENTS.md`／`.agents/invocation.md`（bucket + 觸發者）＋ [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) 嘅 `check-skills.yml` **檢查內容**（frontmatter／UTF-8／syntax），但**唔借佢個 `on: push` 觸發時機** —— 改由 AGENT 開局前跑 [PREFLIGHT](../../PREFLIGHT.md)。**2026-11-02 讀檔**。
> **我哋唔係 plugin 生態**：唔整 `.claude-plugin/`、`.codex-plugin/`、marketplace.json。但**唔等於無 skill** —— `skills/promoted/` 有真正嘅 `SKILL.md`，`skills/external/` 有外部原文，全部列入唯一目錄 [`skills/CATALOG.md`](../../skills/CATALOG.md)。

## 0. 唯一目錄：[`skills/CATALOG.md`](../../skills/CATALOG.md)

> **所有 `SKILL.md` 嘅名／路徑／bucket／邊個呼叫／幾時用，一律以 [`CATALOG.md`](../../skills/CATALOG.md) 為準**，呢度唔再抄第二份表（一個事實只寫一次）。而家 5 份：`repo-setup`、`design-review`、`web-motion`（promoted）＋ `grilling`、`motion-prompt`（external 原文）。
> **加新 SKILL 四步**喺 [`CATALOG.md §2`](../../skills/CATALOG.md)：生檔 → 驗 frontmatter → **加一行落目錄 + `AGENTS.md` 指名** → PREFLIGHT／consistency 綠先 commit。`check_skills` 同 `consistency` 會自動對，漏一行即 FAIL，**唔靠 AGENT 記得**。
> **點樣「用」**：[`AGENTS.md`](../../AGENTS.md) 開工順序第 1 步寫明要讀 `repo-setup` 並跟住做；`repo-setup` 會**明確指名**叫 `design-review`，唔靠 `../` 深連結（[mattpocock `.agents/invocation.md`](https://github.com/mattpocock/skills/blob/main/.agents/invocation.md)）。**呢個環境無 Skill tool／plugin harness**，所以係「AGENT 讀 SKILL.md 當 prompt 執行」，唔係 harness 自動注入 —— 唔好扮自動觸發。

## 1. 四個 bucket（新嘢放邊）

| 狀態 | 放邊 | 入唔入根 README／CI |
|---|---|---|
| 已採用 | `promoted/` | ✅ 要 |
| 測試中 | `in-progress/` | ❌ 唔好 |
| 棄用 | `deprecated/` | ❌ 但要留連結 |
| **外部原文** | **`external/`** | ❌ **只作引用＋溯源**；verbatim + MIT 出處，唔改、唔 promote、唔執行 |

> `promoted/` 先至可以喺 [根 README](../../README.md) 列出；`external/` 一律唔列。一個決定一個檔，已拒絕嘅去 [`docs/out-of-scope/`](../out-of-scope/README.md)，同 [SCOPE.md](../../SCOPE.md) 嘅兩條 bar 一齊用。**所有 bucket 都要入 [`CATALOG.md`](../../skills/CATALOG.md)**。

## 2. 最重要嗰條軸：**邊個可以呼叫**

| | User-invoked | Model-invoked |
|---|---|---|
| 點觸發 | **只限人打佢個名** | model 或人都可以 |
| frontmatter | `disable-model-invocation: true` | 唔寫呢個 key |
| `description` 寫法 | **俾人睇**：一句講做乜，**唔好**列「Use when the user says…」 | **俾 model 睇**：保留 rich trigger phrasing（「當用戶想…／提到…／問…」） |
| 收貨測試 | — | 「model 自己攞嚟用會唔會有用？」 |

- 一個 skill 只可以喺兩邊其中一邊；**user-invoked 唔可以被另一個 skill 呼叫**，要寫「叫用戶自己去跑」。
- `README`／bucket README 分 **User-invoked**／**Model-invoked** 兩組列。
- 我哋無 Claude／Codex harness，呢條軸當**文件約定**用：寫低邊個係俾人撳、邊個係 agent 自己攞，唔好靠估。三份 promoted skill 都係 model-invoked（rich trigger `description`、無 `disable-model-invocation`）。

## 3. 一份 SKILL.md = 一個入口（progressive disclosure）

- `SKILL.md` 只載入口 + 幾時用；長文、`references/`、數據檔另外放。
- 正文四段固定：**What / When / Common questions / It's working if**（範本：[0000-template.md](0000-template.md)）。
- skill 之間要靠「明確叫嗰個 skill」，唔好用 `../other-skill/FILE.md` 深連結；共用參考放喺擁有佢嗰個 skill 入面。
- `{{...}}` placeholder 要清（`grep -rn '{{' .` 零結果先 commit）。

## 4. 點解要 AGENT 開局前驗 frontmatter

> Claude Code／Codex 用 strict YAML parser；一個未 quote 嘅 `word: word` 就令成個 skill **靜靜被 drop**，唔報錯。所以唔可以靠人手望，**亦唔應該等 push 之後先由 CI 話你知**。

| 檢查 | 點跑 |
|---|---|
| frontmatter 合格 **＋ 每份都入咗 `skills/CATALOG.md`**（kebab-case ≤64、description ≤1024、唯一名、boolean flag、manifest 路徑存在） | `node scripts/check_skills_v1.0.mjs .` |
| 文字檔 UTF-8 無雙重編碼 | [`PREFLIGHT.md`](../../PREFLIGHT.md) 嘅 `utf8` check |
| `.mjs` 全部 parse 到 | PREFLIGHT 嘅 `syntax` check（`node --check`） |
| 連結／錨點 | `node scripts/guard.mjs`（G10） |
| **一次過行晒 + 未 commit 就擋** | `node scripts/preflight_v1.0.mjs . --json` |

> 真理倉 [`scripts/check_skills_v1.0.mjs`](https://github.com/playerkousas-rgb/readme/blob/main/scripts/check_skills_v1.0.mjs) 係**零依賴**；taste-skill 原版要 `npm install yaml@2.6.1` + 一條每次 push 嘅 workflow，我哋兩樣都唔引入（S 規則），改由 **AGENT 喺設定 repo 前**跑 PREFLIGHT。

## 未核實

- 「user/model-invoked」嘅 `disable-model-invocation`／`agents/openai.yaml` 係 **Claude Code／Codex 專屬行為**，我哋無嗰個 harness，未實測；當文件約定用。**未加** `agents/openai.yaml`（無 Codex 實測）；要喺 Codex picker 出現就要補。
- [`skills/CATALOG.md`](../../skills/CATALOG.md) 係**目錄＋文件約定**，唔係 manifest；無 Skill tool 自動載入，未喺 Claude Code／Codex 實測。`external/grilling` 原文叫 dispatch sub-agent 搵 fact，呢個環境做唔到。
- **3 份** `SKILL.md` 嘅 frontmatter 已用 taste-skill 原檔 `tests/frontmatter.mjs` + `yaml@2.6.1` 實跑合格（2026-11-02；攤平 `external/grilling` 後 `ok - 3 skills load`；原版測試只掃 `skills/*/` 一層，所以我哋自己個 `check_skills` 係全倉遞歸）。**2026-11-06 加** `web-motion` + `external/motion-prompt` 後，`node scripts/check_skills_v1.0.mjs .` 驗 5 份全過；`external/motion-prompt` 嘅 upstream 含 `scripts/motion-prompt.mjs`（未喺 Claude／Codex 實測）；正式 skill **點載入**喺 Claude／Codex 仍需嗰個 harness 先至驗到。
- 247 站／盲測／Chrome inspector 係 taste-skill 自己嘅講法，未覆核；見 [設計檢查](../design-review.md) §未核實。
