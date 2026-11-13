---
name: repo-setup
description: >-
  Use when creating or scaffolding a new GitHub repo, deciding which files a new
  repo must have, writing AGENTS.md, SCOPE.md or GLOSSARY.md, organising docs/
  chapters, or checking whether a repo follows its own documented standards.
  Triggers include 「開新 repo 要加乜」, 起手包, PREFLIGHT, 開局, 形式分類,
  兩軸 review, 「有冇混亂矛盾」 and 「問清楚需求」. Starts with a step-0 intake
  interview before any files are copied. Read this before the first commit.
---

# Repo Setup — 開新 repo 嘅 AGENT 入口

> **Model-invoked**（`description` 有 rich trigger，無 `disable-model-invocation`）。
> 借自 [mattpocock/skills](https://github.com/mattpocock/skills) 嘅 `AGENTS.md`／`SCOPE.md`／`GLOSSARY.md`／`.agents/invocation.md`／`code-review/SKILL.md`（**2026-11-02 讀原文**）。
> 呢份係**可執行指示**，唔係得個紀錄：AGENT 喺第一個 commit 之前要跟住做，唔好只當文件睇。
> 收納／觸發規則見 [`docs/skills/README.md`](../../../docs/skills/README.md)；理由見 [docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)。

## What

一句：將「一個新 repo 應該有乜、點分類、點驗」變成 AGENT 可以一步一步做嘅動作。**唔做**：唔寫 app code、唔裝 Claude／Codex plugin、唔抄 39KB prompt、唔替用戶揀授權。

### 開局步驟（照次序；同真理倉 README 🆕 6 步對齊）

0. **先主動問用戶**（[`INTAKE.md`](../../../INTAKE.md)）：借 [`external/grilling/SKILL.md`](../../external/grilling/SKILL.md)（實體檔，[原檔](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)）嘅方法 —— 一輪問晒「而家問得」嘅 frontier（形式／UI／身份／後台／Gemini／授權／定位），每條俾**建議答案**；**fact 自己查**（`ls`／讀模板／P1），**決定留畀用戶**；**用戶確認先好抄檔**。**喺任何 `cp`／`git init` 之前**。若用戶喺真理倉 README 已經答咗並確認，跳過呢步，唔好重複問。
1. 由 [`START.md`](../../../START.md) ⓪–④ 抄起手包：填 `{{...}}`、**先揀授權**先至將 `LICENSE-MIT.txt` 改名做 `LICENSE`、抄 5 支真理 script、`git init`、跑 [`PREFLIGHT`](../../../PREFLIGHT.md) gate（`exit 1` 即刻停手，8 個 check）。
2. 讀 [`AGENTS.md`](../../../AGENTS.md) → [`SCOPE.md`](../../../SCOPE.md) → [`GLOSSARY.md`](../../../GLOSSARY.md)。**將第 0 步嘅答案寫入 `SCOPE.md`**（做乜／唔做乜兩條 bar）+ README 第一句；一個事實只寫一次，用字跟 GLOSSARY。
3. **用第 0 步用戶確認嘅答案按形式揀**，唔好按內容／主題、唔好自己估（[docs/28](https://github.com/playerkousas-rgb/readme/blob/main/docs/28-repo-taxonomy.md)）：
   - 有 UI／要出畫面 → 明確**讀 `design-review` 呢份 skill** 並跟佢嘅望圖步驟（唔好只睇 `docs/design-review.md`）。
   - 有 `SKILL.md`／RAG／agent 工作流 → 留低 `skills/` 同 [`docs/skills/README.md`](../../../docs/skills/README.md)；新 skill 用 [`0000-template.md`](../../../docs/skills/0000-template.md)。
   - 有身份／有登入 → 加第 14 項 [`docs/system-basics.md`](../../../docs/system-basics.md)（帳號生命週期 + ADMIN 回報系統）。
   - 純工具／知識倉／資料管道／空殼 → 唔加 13a–13c、唔加第 14 項。
   - **13d PREFLIGHT、12 樣核心、5 份 SKILL.md 同 [`CATALOG.md`](../../CATALOG.md) 唔跟形式**，所有新 repo 都要。
4. 難逆轉嘅決定寫一段 ADR（[`docs/adr/0000-template.md`](../../../docs/adr/0000-template.md)）；已拒絕嘅一個決定一檔去 [`docs/out-of-scope/`](../../../docs/out-of-scope/README.md)。
5. 交付前做 **兩軸 review**，兩份報告分開寫、唔合併唔 rerank：
   - **Standards**：對返 `AGENTS.md`／`PLAYBOOK`／`docs/10`／`docs/README` 有冇硬違規；再對 Fowler 12 smells 做 labelled judgement call（有明文 repo 標準就 override）。
   - **Spec**：逐句 quote 用戶要求（**包括第 0 步嘅答案**），分「缺／做多咗／做咗但似錯」。
6. 最後再跑一次 PREFLIGHT ＋ `guard` ＋ `final_check`；新 `docs/NN-*.md` 要同步 `docs/README.md` 同根 `README.md` 索引。

## When

- 用戶開新 repo、問「要加乜」、提到起手包／開局／PREFLIGHT。
- 改 `AGENTS.md`／`SCOPE.md`／`GLOSSARY.md`／`docs/` 章節索引。
- 問「我啲 repo 係咪輕／有後台／Gemini」或者「成個 repo 有冇混亂矛盾」。
-  reviewing 一個改動（branch／PR／未 commit 嘅工作樹）是否符合 repo 自己嘅標準。

## Common questions

- **Q：用戶已經講清楚「做一個純前端、無登入嘅日期工具」，仲使問？** A：唔使重複問；但要將答案對返 `INTAKE.md` Q1–Q7，寫入 `SCOPE.md` 並同用戶確認一句「理解啱？」先好郁手。
- **Q：fact 可唔可以問用戶？** A：唔好。形式名、模板有乜檔、85 repo baseline、授權差異、ToS 要 AGENT 自己查（`grilling` 原文：finding facts is your job, never the user's）。
- **Q：冇 commit 點做 code-review 個 three-dot diff？** A：用 `git archive <base>` export 對工作樹，寫明「fixed point + 邊啲新／改／刪」；唔好扮有 diff。
- **Q：冇 sub-agent 點辦？** A：兩軸**分開兩份報告**寫，各自報總數同最差一項，唔揀單一贏家；寫明環境限制。
- **Q：可唔可以只抄 `docs/` 唔放 `skills/`？** A：可以 —— 呢份 skill 本身係俾「開局嗰個 AGENT」用；目標 repo 要唔要留低，按第 4 步嘅形式決定。
- **Q：點叫另一個 skill？** A：**明確指名**「讀 `design-review` 嘅 `SKILL.md` 並跟住做」，唔好用 `../other-skill/FILE.md` 深連結，亦唔好剩低一個 `/name` 當命令。

## It's working if

- [ ] **第 0 步問咗 + 用戶確認 + 答案寫入 `SCOPE.md`**（未確認就唔算完成）。
- [ ] `node scripts/preflight_v1.0.mjs . --json` 係 `ok: true`（8/8）。
- [ ] `node scripts/check_skills_v1.0.mjs .` 對呢份同 `design-review` 嘅 frontmatter 都 PASS。
- [ ] grep `{{` 零結果；`docs/README.md` 同根 `README.md` 都有新檔索引行。
- [ ] 兩軸 review 報告**分開**存在，各有一句最差項；冇扮跑過 browser／sub-agent／issue tracker。
- [ ] 授權係用戶揀咗先改 `LICENSE`，唔係 AGENT 自己揀。
