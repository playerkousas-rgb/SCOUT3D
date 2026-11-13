---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

> **external bucket — 外部原文，唔好直接改**。下面正文係 [mattpocock/skills](https://github.com/mattpocock/skills) `skills/productivity/grilling/SKILL.md` 嘅 **verbatim 複製**（2,077 bytes，**2026-11-02 讀取**）；原 repo 授權 **MIT**（[LICENSE](https://github.com/mattpocock/skills/blob/main/LICENSE)）。本地改動一律放喺 [`INTAKE.md`](../../../INTAKE.md)，唔好改呢份原文。
> **唔好直接執行**：呢個環境無 Skill tool、無 sub-agent；原文叫 dispatch sub-agent 搵 fact，我哋做唔到。AGENT 跟 [`INTAKE.md`](../../../INTAKE.md) 嘅本地化版（一輪問晒 frontier、建議答案、fact 自己查、用戶確認先郁手）。收納約定見 [`docs/skills/README.md`](../../../docs/skills/README.md)，目錄見 [`CATALOG.md`](../../CATALOG.md)。

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

---

## 本地註記（非原文，2026-11-02）

- **點解放實體檔**：之前 `INTAKE.md` 只係文字引用外連，新 repo 嘅 AGENT 無網絡／只讀本地檔時搵唔到，會以為「講咗但無嘢」。而家 `external/` 有檔，`grilling` 亦喺 [`CATALOG.md`](../../CATALOG.md) 入咗目錄。
- **仍然唔係自動載入**：無 Skill tool／plugin harness；要 AGENT 主動讀。原文個 user-invoked 版 `grill-me`（`disable-model-invocation: true`，內容只係「Call the Skill tool with "grilling"」）**唔複製**，因為嗰個指令喺呢個環境無對應工具，放咗反而誤導。
- **唔好 promote**：`external/` 只作引用同溯源；要改方法改 [`INTAKE.md`](../../../INTAKE.md)／`repo-setup` 第 0 步，唔好改原文，亦唔好喺根 README 列出（見 [`docs/skills/README.md`](../../../docs/skills/README.md) §1）。
