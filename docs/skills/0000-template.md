# SKILL.md 範本（複製成 `skills/<bucket>/<name>/SKILL.md`）

> 收納／觸發規則見 [README.md](README.md)；檢查見 [docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)。
> 合咗兩個來源：[mattpocock/skills](https://github.com/mattpocock/skills) 嘅四段式 skill doc + [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) 嘅 strict frontmatter 規格（**2026-11-02 讀檔**）。

## 1. Frontmatter（照抄再改）

```md
---
name: my-skill-name
description: >-
  一句講做乜。Model-invoked 要保留 rich trigger：「當用戶想…／提到…／問…」；
  User-invoked 就只寫俾人睇嘅一句，唔好列 trigger。
---
```

| Key | 規則 | 點解 |
|---|---|---|
| `name` | kebab-case、`≤64` 字、**全 repo 唯一** | 撞名會被 drop／覆蓋 |
| `description` | 非空字串、`≤1024` 字 | agent harness 有長度上限 |
| `disable-model-invocation` | 只可以 `true`／`false`；唔寫 = model-invoked | 分「人撳」定「agent 自己攞」 |
| 所有值 | `word: word` **要 quote**；唔好用縮排 tab | strict YAML parser 會靜靜 drop 成個 skill |

> `>-` folded block 我哋嘅零依賴 checker 支援；`|`／巢狀 YAML／inline JSON **唔支援**，唔好寫。

## 2. 正文四段（固定）

```md
# My Skill Name

## What
一句：呢個 skill 做乜、唔做乜。

## When
- 邊種情況要用（model-invoked 寫 rich trigger）。
- 邊種情況**唔好**用，改去邊（寫清楚替代 skill／文件）。

## Common questions
- Q: … → A: …
- Q: … → A: …

## It's working if
- [ ] 輸出有 … 
- [ ] 無 … 
- [ ] `node scripts/guard.mjs` 全綠
```

## 3. 分層（progressive disclosure）

| 放邊 | 內容 |
|---|---|
| `SKILL.md` | 入口 + 幾時用 + 收貨條件；**短** |
| `references/` | 長文、例子、critique rubric |
| `library/` | JSON 數據（要 `JSON.parse` 到） |
| `scripts/` | `.mjs`（要 `node --check` 過） |
| `evals/` | 驗收 prompt + `expected_output`（人手／CI 對照） |

> 共用參考放喺**擁有佢**嗰個 skill；其他 skill 用「明確叫嗰個 skill」，唔好用 `../other-skill/FILE.md` 深連結。

## 4. 落檔前 checklist

```
[ ] name kebab-case、≤64、無撞名
[ ] description ≤1024、無未 quote 嘅「word: word」
[ ] 決定咗 user-invoked 定 model-invoked，description 寫法對應
[ ] 四段 What / When / Common questions / It's working if 齊
[ ] 放啱 bucket（promoted / in-progress / deprecated）
[ ] 已更新 bucket README（User-invoked / Model-invoked 兩組）
[ ] node scripts/check_skills_v1.0.mjs .  -> PASS
[ ] grep -rn '{{' .  -> 零結果
```
